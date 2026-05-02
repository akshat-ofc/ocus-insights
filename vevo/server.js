/**
 * Minimal backend: creates Razorpay orders, verifies payment signatures,
 * returns the real PDF path (never trust the browser for the file URL).
 *
 * Run from project root: cd vevo && npm install && npm start
 * Production: put this behind HTTPS on ocus-insights.in (same host as the site, or set CORS_ORIGINS).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const crypto = require('crypto');
const express = require('express');
const path = require('path');

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const PORT = Number(process.env.PORT) || 8787;

// CORS Allowlist with improved matching
const CORS_ALLOWLIST = (process.env.CORS_ORIGINS ||
  'https://ocus-insights.in,https://www.ocus-insights.in,http://ocus-insights.in,http://www.ocus-insights.in,https://ocus-insights.github.io')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)
  .concat([
    'http://localhost:8787',
    'http://127.0.0.1:8787',
    'http://localhost:5500',   // VS Code Live Server
    'http://127.0.0.1:5500',
    'http://localhost:3000',
  ]);

/** Amounts in paise (INR). ₹1 = 100 paise */
const PRODUCTS = {
  'stoic-6': {
    amount: 5000,
    name: 'The Stoic 6',
    file: '/files/the-stoic-6.pdf',
  },
  'linkedin-power': {
    amount: 10000,
    name: 'Unlock The Power Of LinkedIn',
    file: '/files/unlock-the-power-of-linkedin.pdf',
  },
  'ai-side-hustle-2026': {
    amount: 10000,
    name: 'AI Side Hustle Guide 2026',
    file: '/files/AI_Side_Hustle_Guide_2026.pdf',
  },
};

function assertConfig() {
  if (!KEY_ID || !KEY_SECRET) {
    console.error(
      'Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET. Ensure environment variables are set on Render.'
    );
    // Don't exit in production if we want to at least see logs
  }
}

function basicAuthHeader() {
  return 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
}

async function razorpayCreateOrder(body) {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.description || data.message || 'Order creation failed';
    throw new Error(msg);
  }
  return data;
}

async function razorpayFetchOrder(orderId) {
  const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { Authorization: basicAuthHeader() },
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.description || data.message || 'Could not load order';
    throw new Error(msg);
  }
  return data;
}

assertConfig();

const app = express();
const siteRoot = path.join(__dirname, '..');

// Debugging middleware for all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Browser cross-origin calls
app.use('/api', function (req, res, next) {
  const origin = req.headers.origin;
  
  if (origin) {
    const normalizedOrigin = origin.trim().toLowerCase();
    if (CORS_ALLOWLIST.includes(normalizedOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      console.warn(`Blocked CORS request from unauthorized origin: ${origin}`);
      // Even if blocked, we should still handle OPTIONS correctly for the browser to show the 403
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(204).end();
      }
      return res.status(403).json({ error: 'Origin not allowed', ok: false });
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: '32kb' }));

app.post('/api/create-order', async (req, res) => {
  try {
    const productId = req.body && req.body.productId;
    const product = PRODUCTS[productId];
    if (!product) {
      return res.status(400).json({ error: 'Unknown product' });
    }

    const order = await razorpayCreateOrder({
      amount: product.amount,
      currency: 'INR',
      receipt: `ocus_${productId}_${Date.now()}`,
      notes: {
        productId,
      },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: KEY_ID,
      name: product.name,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ ok: false, error: 'Missing payment fields' });
    }

    const expected = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ ok: false, error: 'Invalid signature' });
    }

    const order = await razorpayFetchOrder(razorpay_order_id);
    const productId = order.notes && order.notes.productId;
    const product = productId ? PRODUCTS[productId] : null;
    if (!product) {
      return res.status(400).json({ ok: false, error: 'Order has no valid product' });
    }

    return res.json({
      ok: true,
      downloadUrl: product.file,
      productName: product.name,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message || 'Server error' });
  }
});

app.use(express.static(siteRoot));

// Final 404 handler for debugging
app.use((req, res) => {
  console.warn(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Site + API: http://127.0.0.1:${PORT}  (also http://localhost:${PORT})`);
});
