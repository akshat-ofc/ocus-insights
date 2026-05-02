/**
 * Razorpay Checkout — payments run only on https://ocus-insights.in (and www).
 * API calls use the same origin (paths like /api/...) unless you set:
 *   window.OCUS_PAYMENTS_API = 'https://…'   (must still be your real site / API host)
 */
(function () {
  const PAY_BUTTON_SELECTOR = '.ebook-card__buy[data-razorpay-product]';

  function isProductionPaymentsHost() {
    var h = (location.hostname || '').toLowerCase();
    return h === 'ocus-insights.in' || h === 'www.ocus-insights.in';
  }

  function isLocalhost() {
    var h = (location.hostname || '').toLowerCase();
    return h === 'localhost' || h === '127.0.0.1';
  }

  /**
   * Returns the API base URL, or null if payments should be blocked.
   * On production: uses OCUS_PAYMENTS_API (Render URL) or same-origin.
   * On localhost: uses OCUS_PAYMENTS_API if explicitly set (local dev).
   */
  function getPaymentsApiBase() {
    var explicitApi = typeof window.OCUS_PAYMENTS_API === 'string' && window.OCUS_PAYMENTS_API.trim()
      ? window.OCUS_PAYMENTS_API.replace(/\/$/, '')
      : null;

    if (isProductionPaymentsHost()) {
      return explicitApi !== null ? explicitApi : '';
    }
    if (isLocalhost() && explicitApi) {
      return explicitApi;
    }
    return null;
  }


  function apiUrl(path) {
    var base = getPaymentsApiBase();
    if (base === null) return path;
    return base ? base + path : path;
  }

  function publicFileUrl(path) {
    if (!path) return path;
    if (/^https?:\/\//i.test(path)) return path;
    var base = getPaymentsApiBase();
    if (base === null) return path;
    return base ? base + path : path;
  }

  function loadRazorpayScript() {
    return new Promise(function (resolve, reject) {
      if (window.Razorpay) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error('Could not load Razorpay checkout script'));
      };
      document.body.appendChild(s);
    });
  }

  function openCheckoutForProduct(productId) {
    return loadRazorpayScript().then(function () {
      return fetch(apiUrl('/api/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: productId }),
      }).then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) {
            throw new Error(data.error || 'Could not start payment');
          }
          return data;
        });
      });
    }).then(function (order) {
      return new Promise(function (resolve, reject) {
        var options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'Ocus Insights',
          description: order.name,
          order_id: order.orderId,
          handler: function (response) {
            resolve(response);
          },
          modal: {
            ondismiss: function () {
              reject(new Error('Payment window closed'));
            },
          },
          theme: { color: '#0f766e' },
        };

        var rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          reject(new Error((resp.error && resp.error.description) || 'Payment failed'));
        });
        rzp.open();
      });
    }).then(function (response) {
      return fetch(apiUrl('/api/verify-payment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      }).then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok || !data.ok) {
            throw new Error((data && data.error) || 'Verification failed');
          }
          return data;
        });
      });
    }).then(function (verified) {
      try {
        sessionStorage.setItem(
          'ocus_download',
          JSON.stringify({
            url: publicFileUrl(verified.downloadUrl),
            name: verified.productName || '',
            ts: Date.now(),
          })
        );
      } catch (e) {
        /* sessionStorage blocked — still try direct navigation */
      }
      window.location.href = '/download.html';
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest(PAY_BUTTON_SELECTOR);
    if (!btn) return;
    e.preventDefault();
    var productId = btn.getAttribute('data-razorpay-product');
    if (!productId) return;

    if (getPaymentsApiBase() === null) {
      alert('Purchases are only available on ocus-insights.in.');
      return;
    }

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = 'Please wait…';

    openCheckoutForProduct(productId).catch(function (err) {
      alert(err.message || 'Something went wrong');
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = label;
    });
  });
})();
