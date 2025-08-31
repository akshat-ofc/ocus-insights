// =============== DOM ELEMENTS ===============
const preloader = document.getElementById('preloader');
const header = document.getElementById('header');
const navMenu = document.getElementById('nav-menu');
const navToggle = document.getElementById('nav-toggle');
const navClose = document.getElementById('nav-close');
const navLinks = document.querySelectorAll('.nav__link');
const postsGrid = document.getElementById('ebooks-grid');
const scrollArrow = document.getElementById('scroll-to-testimonials');

// =============== SCROLL TO TESTIMONIALS ===============
if (scrollArrow) {
    scrollArrow.addEventListener('click', () => {
        const testimonialsSection = document.getElementById('testimonials');
        if (testimonialsSection) {
            testimonialsSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
}

// =============== PRELOADER ===============
window.addEventListener('load', () => {
  setTimeout(() => {
    if (preloader) {
      preloader.style.opacity = '0';
      setTimeout(() => {
        preloader.style.display = 'none';
      }, 500);
    }
  }, 1000);
});

// =============== HEADER SCROLL EFFECT ===============
window.addEventListener('scroll', () => {
  if (header) {
    if (window.scrollY >= 50) {
      header.classList.add('scroll-header');
    } else {
      header.classList.remove('scroll-header');
    }
  }
});

// =============== MOBILE NAVIGATION ===============
if (navToggle) {
  navToggle.addEventListener('click', () => {
    if (navMenu) {
      navMenu.classList.add('show-menu');
    }
  });
}

if (navClose) {
  navClose.addEventListener('click', () => {
    if (navMenu) {
      navMenu.classList.remove('show-menu');
    }
  });
}

// Close menu when clicking on nav links
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (navMenu) {
      navMenu.classList.remove('show-menu');
    }
  });
});

// =============== ACTIVE NAVIGATION ===============
window.addEventListener('scroll', () => {
  const sections = document.querySelectorAll('section[id]');
  const scrollY = window.pageYOffset;

  sections.forEach(section => {
    const sectionHeight = section.offsetHeight;
    const sectionTop = section.offsetTop - 150;
    const sectionId = section.getAttribute('id');
    const navLink = document.querySelector(`.nav__link[href*="${sectionId}"]`);

    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      navLinks.forEach(link => link.classList.remove('active'));
      if (navLink) navLink.classList.add('active');
    }
  });
});

// =============== SMOOTH SCROLLING ===============
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offsetTop = target.offsetTop - 70;
      
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  });
});

// =============== EBOOK BUY BUTTON ANIMATION ===============
document.querySelectorAll('.ebook-card__buy').forEach(function(btn) {
  let animating = false;
  
  // Set consistent font size for the button initially
  btn.style.fontSize = '1.5rem'; // Adjust this value to match your desired size
  
  btn.addEventListener('mouseenter', function() {
    if (animating) return;
    animating = true;
    
    var originalText = btn.getAttribute('data-original-text') || btn.textContent;
    // Store original text if not already stored
    if (!btn.getAttribute('data-original-text')) {
      btn.setAttribute('data-original-text', originalText);
    }
    
    // Create a span for animation if not already present
    if (!btn.querySelector('.btn-text')) {
      var span = document.createElement('span');
      span.className = 'btn-text';
      span.textContent = originalText;
      span.style.fontSize = '1rem'; // Match the button's font size
      btn.textContent = '';
      btn.appendChild(span);
    }
    
    var textSpan = btn.querySelector('.btn-text');
    // Animate text out
    anime({
      targets: textSpan,
      translateX: -40,
      opacity: 0,
      duration: 400,
      easing: 'easeInOutQuad',
      complete: function() {
        textSpan.textContent = '$';
        textSpan.style.transform = 'translateX(40px)';
        textSpan.style.opacity = 0;
        textSpan.style.color = '#10b981'; // Green color for dollar sign
        textSpan.style.fontSize = '1rem'; // Maintain same font size
        // Animate dollar sign in
        anime({
          targets: textSpan,
          translateX: 0,
          opacity: 1,
          duration: 400,
          easing: 'easeInOutQuad',
          complete: function() {
            animating = false;
          }
        });
      }
    });
  });
  
  btn.addEventListener('mouseleave', function() {
    var originalText = btn.getAttribute('data-original-text') || 'Invest';
    var textSpan = btn.querySelector('.btn-text');
    if (textSpan && textSpan.textContent === '$') {
      anime({
        targets: textSpan,
        translateX: 40,
        opacity: 0,
        duration: 400,
        easing: 'easeInOutQuad',
        complete: function() {
          textSpan.textContent = originalText;
          textSpan.style.transform = 'translateX(-40px)';
          textSpan.style.opacity = 0;
          textSpan.style.color = ''; // Reset to default color
          textSpan.style.fontSize = '1rem'; // Maintain same font size
          anime({
            targets: textSpan,
            translateX: 0,
            opacity: 1,
            duration: 400,
            easing: 'easeInOutQuad',
          });
        }
      });
    }
  });
});

// =============== INTERSECTION OBSERVER FOR ANIMATIONS ===============
function observePostCards() {
  const postCards = document.querySelectorAll('.post-card, .ebook-card');
  
  if (!postCards.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('animate');
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  postCards.forEach(card => {
    observer.observe(card);
  });
}

// =============== BENEFITS SECTION ANIMATIONS ===============
function observeBenefitCards() {
  const benefitCards = document.querySelectorAll('.benefit-card');
  
  if (!benefitCards.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px 0px -100px 0px'
  });

  benefitCards.forEach(card => {
    observer.observe(card);
  });
}

// =============== INITIALIZE APPLICATION ===============
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize animations
    observePostCards();
    observeBenefitCards();
    
    // Initialize lazy loading for images
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              imageObserver.unobserve(img);
            }
          }
        });
      });
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  } catch (error) {
    console.error('Error initializing main page:', error);
  }
});
