/* ============================================================
   MELISSA — script.js  (B&W Vintage / Page-Router Edition)

   Architecture: viewport-locked pages, no scrolling.
   Navigation triggers GSAP crossfade between full-viewport panels.
   Global video layer persists across all views.

   Requires: GSAP 3 core (CDN)
============================================================ */

/* ────────────────────────────────────────────────────────
   FEATURE DETECTION
──────────────────────────────────────────────────────── */
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasHover       = window.matchMedia('(hover: hover)').matches;

/* ────────────────────────────────────────────────────────
   UTILITY
──────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

/* ────────────────────────────────────────────────────────
   STATE
──────────────────────────────────────────────────────── */
let currentPage = 'home';
let isTransitioning = false;
let introComplete = false;

/* ────────────────────────────────────────────────────────
   CUSTOM CURSOR (desktop only)
──────────────────────────────────────────────────────── */
function initCursor() {
  if (!hasHover) return;

  const dot  = $('.cursor-dot');
  const ring = $('.cursor-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    gsap.set(dot, { x: mx, y: my });
  }, { passive: true });

  (function lerp() {
    rx += (mx - rx) * 0.11;
    ry += (my - ry) * 0.11;
    gsap.set(ring, { x: rx, y: ry });
    requestAnimationFrame(lerp);
  })();

  // Hover detection (re-bind after page transitions)
  function bindHoverTargets() {
    $$('a, button, .g-item, .card, .service-row').forEach((el) => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
  }
  bindHoverTargets();
}

/* ────────────────────────────────────────────────────────
   INTRO — text mask entrance (from Prechod na my story)
   Letters stagger in, tagline fades, then reveal home page
──────────────────────────────────────────────────────── */
function runIntro() {
  const intro   = $('#intro');
  const tagline = $('.intro-tagline');
  if (!intro) return;

  if (prefersReduced) {
    intro.style.display = 'none';
    introComplete = true;
    document.body.dataset.page = 'home';
    revealNav();
    animatePageContent('home');
    return;
  }

  // Fade in tagline, hold, then fade out whole intro
  gsap.to(tagline, {
    opacity: 1,
    y: 0,
    duration: 0.7,
    delay: 0.8,
    ease: 'power3.out',
    onComplete: () => {
      gsap.to(intro, {
        opacity: 0,
        duration: 0.8,
        delay: 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          intro.style.display = 'none';
          introComplete = true;
          document.body.dataset.page = 'home';
          revealNav();
          animatePageContent('home');
        }
      });
    }
  });
}

/* ────────────────────────────────────────────────────────
   NAV — reveal + bind navigation
──────────────────────────────────────────────────────── */
function revealNav() {
  const nav = $('#nav');
  if (!nav) return;

  if (prefersReduced) {
    gsap.set(nav, { opacity: 1, y: 0 });
  } else {
    gsap.to(nav, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out'
    });
  }
}

function initNavigation() {
  // Desktop nav links
  $$('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page && page !== currentPage) navigateTo(page);
    });
  });

  // Logo
  const logo = $('.nav-logo');
  if (logo) {
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage !== 'home') navigateTo('home');
    });
  }

  // Service rows → navigate to contact
  $$('.service-row[data-page]').forEach((row) => {
    row.addEventListener('click', () => {
      const page = row.dataset.page;
      if (page && page !== currentPage) navigateTo(page);
    });
  });
}

/* ────────────────────────────────────────────────────────
   MOBILE MENU
──────────────────────────────────────────────────────── */
function initMobileMenu() {
  const burger = $('#navBurger');
  const menu   = $('#mobileMenu');
  if (!burger || !menu) return;

  function closeMenu() {
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
  }

  function openMenu() {
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
  }

  burger.addEventListener('click', () => {
    burger.classList.contains('is-open') ? closeMenu() : openMenu();
  });

  $$('.mobile-menu-link', menu).forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      closeMenu();
      if (page && page !== currentPage) {
        setTimeout(() => navigateTo(page), 150);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.classList.contains('is-open')) {
      closeMenu();
    }
  });
}

/* ────────────────────────────────────────────────────────
   PAGE ROUTER — crossfade transition
   Fades out current page, swaps visibility, fades in target.
──────────────────────────────────────────────────────── */
function navigateTo(targetPage) {
  if (isTransitioning || !introComplete) return;
  if (targetPage === currentPage) return;

  isTransitioning = true;

  const currentEl = $(`#page-${currentPage}`);
  const targetEl  = $(`#page-${targetPage}`);
  if (!currentEl || !targetEl) {
    isTransitioning = false;
    return;
  }

  // Update nav active state
  $$('.nav-link').forEach((l) => l.classList.toggle('active', l.dataset.page === targetPage));
  $$('.mobile-menu-link').forEach((l) => l.classList.toggle('active', l.dataset.page === targetPage));

  // Reset scroll on page-inner
  const targetInner = $('.page-inner', targetEl);
  if (targetInner) targetInner.scrollTop = 0;

  if (prefersReduced) {
    currentEl.classList.remove('active');
    gsap.set(currentEl, { opacity: 0, visibility: 'hidden' });
    targetEl.classList.add('active');
    gsap.set(targetEl, { opacity: 1, visibility: 'visible' });
    currentPage = targetPage;
    document.body.dataset.page = targetPage;
    isTransitioning = false;
    animatePageContent(targetPage);
    return;
  }

  // Crossfade transition — fade out current, swap, fade in target
  const tl = gsap.timeline({
    onComplete: () => {
      isTransitioning = false;
      animatePageContent(targetPage);
    }
  });

  tl.to(currentEl, { opacity: 0, duration: 0.35, ease: 'power2.in' });
  tl.call(() => {
    currentEl.classList.remove('active');
    gsap.set(currentEl, { visibility: 'hidden' });
    targetEl.classList.add('active');
    gsap.set(targetEl, { visibility: 'visible', opacity: 0 });
    // Sync both JS state and DOM attribute at the same moment
    currentPage = targetPage;
    document.body.dataset.page = targetPage;
  });
  tl.to(targetEl, { opacity: 1, duration: 0.45, ease: 'power2.out' });
}

/* ────────────────────────────────────────────────────────
   PAGE CONTENT REVEAL
   Instantly shows all content after transition — no fly-in animations.
   Heading hover binding still applied.
──────────────────────────────────────────────────────── */
function animatePageContent(page) {
  const pageEl = $(`#page-${page}`);
  if (!pageEl) return;

  // Instantly reveal eyebrow
  const eyebrow = $('.eyebrow', pageEl);
  if (eyebrow) gsap.set(eyebrow, { opacity: 1, x: 0 });

  // Animate heading chars in + bind hover on completion
  const heading = $('.section-heading', pageEl);
  if (heading) animateHeading(heading);

  // Page-specific instant reveals
  switch (page) {
    case 'home':     revealHome(pageEl);     break;
    case 'about':    revealAbout(pageEl);    break;
    case 'gallery':  revealGallery(pageEl);  break;
    case 'services': revealServices(pageEl); break;
    case 'contact':  revealContact(pageEl);  break;
  }
}

/* ────────────────────────────────────────────────────────
   HEADING CHARACTER ANIMATION (concept-five from animácia textov)
   Entrance: chars fade in via GSAP.
   Hover: even/odd displacement via CSS class, resets on mouseleave.
──────────────────────────────────────────────────────── */
function animateHeading(heading) {
  if (!heading) return;
  const chars = $$('.char', heading);
  if (!chars.length) return;

  heading.classList.remove('hovered', 'settled');

  if (prefersReduced) {
    chars.forEach(c => { c.style.opacity = '1'; });
    bindHeadingHover(heading);
    return;
  }

  // Entrance: stagger chars in (opacity only, no displacement)
  gsap.fromTo(chars,
    { opacity: 0, y: 18 },
    {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.03,
      ease: 'power3.out',
      delay: 0.15,
      onComplete: () => bindHeadingHover(heading)
    }
  );
}

function bindHeadingHover(heading) {
  if (!hasHover || heading._hoverBound) return;
  heading._hoverBound = true;

  heading.addEventListener('mouseenter', () => {
    heading.classList.remove('settled');
    heading.classList.add('hovered');
  });

  heading.addEventListener('mouseleave', () => {
    heading.classList.remove('hovered');
    heading.classList.add('settled');
  });
}

/* ────────────────────────────────────────────────────────
   HOME PAGE REVEAL
──────────────────────────────────────────────────────── */
function revealHome(pageEl) {
  gsap.set($$('.title-char', pageEl), { opacity: 1, y: 0 });
  const roles  = $('.home-roles', pageEl);
  const bottom = $('.home-bottom', pageEl);
  if (roles)  gsap.set(roles,  { opacity: 1, y: 0 });
  if (bottom) gsap.set(bottom, { opacity: 1 });
}

/* ────────────────────────────────────────────────────────
   ABOUT PAGE REVEAL
──────────────────────────────────────────────────────── */
function revealAbout(pageEl) {
  const img   = $('.about-img-wrap', pageEl);
  const bio   = $('.about-bio', pageEl);
  const stats = $('.about-stats', pageEl);
  [img, bio, stats].filter(Boolean).forEach(el => gsap.set(el, { opacity: 1, x: 0, y: 0 }));

  // Stat counters (kept as the one remaining number animation)
  $$('.stat-val', pageEl).forEach((el) => {
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;
    if (prefersReduced) { el.textContent = target; return; }
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target, duration: 1.6, ease: 'power1.out',
      onUpdate() { el.textContent = Math.round(obj.val); }
    });
  });

  // About image error fallback
  const aboutImg = $('.about-img', pageEl);
  if (aboutImg) {
    aboutImg.addEventListener('error', () => {
      aboutImg.classList.add('is-hidden');
      const wrap = aboutImg.closest('.about-img-wrap');
      if (wrap) wrap.classList.add('img-placeholder');
    }, { once: true });
  }
}

/* ────────────────────────────────────────────────────────
   GALLERY PAGE REVEAL
──────────────────────────────────────────────────────── */
function revealGallery(pageEl) {
  const items = $$('.g-item', pageEl);
  items.forEach((item) => {
    item.classList.add('revealed');
    const img = $('img', item);
    if (img) {
      img.addEventListener('error', () => {
        img.classList.add('is-hidden');
        item.classList.add('img-placeholder');
      }, { once: true });
    }
  });
}

function initGallery() {
  const lightbox     = $('#lightbox');
  const lightboxImg  = $('#lightboxImg');
  const lightboxNum  = $('#lightboxNum');
  const lightboxCat  = $('#lightboxCat');
  const lightboxClose = $('#lightboxClose');
  if (!lightbox) return;

  // Click gallery item → open lightbox
  $$('.g-item').forEach((item) => {
    item.addEventListener('click', () => {
      const img = $('img', item);
      const num = item.dataset.index;
      const cat = $('.g-item-cat', item);
      if (!img) return;

      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      if (lightboxNum) lightboxNum.textContent = `0${num}`;
      if (lightboxCat) lightboxCat.textContent = cat ? cat.textContent : '';

      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');

      if (!prefersReduced) {
        gsap.fromTo(lightboxImg,
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 0.5, delay: 0.1, ease: 'power3.out' }
        );
        const info = $('.lightbox-info', lightbox);
        if (info) {
          gsap.fromTo(info,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4, delay: 0.25, ease: 'power3.out' }
          );
        }
      } else {
        gsap.set(lightboxImg, { opacity: 1, scale: 1 });
        const info = $('.lightbox-info', lightbox);
        if (info) gsap.set(info, { opacity: 1, y: 0 });
      }
    });
  });

  // Close lightbox
  function closeLightbox() {
    if (!prefersReduced) {
      gsap.to(lightboxImg, {
        opacity: 0, scale: 0.95,
        duration: 0.3,
        ease: 'power2.in'
      });
      gsap.to(lightbox, {
        delay: 0.15,
        duration: 0.01,
        onComplete: () => {
          lightbox.classList.remove('is-open');
          lightbox.setAttribute('aria-hidden', 'true');
        }
      });
    } else {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
    }
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

  // Click background to close
  const lightboxBg = $('.lightbox-bg', lightbox);
  if (lightboxBg) lightboxBg.addEventListener('click', closeLightbox);

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
      closeLightbox();
    }
  });
}

/* ────────────────────────────────────────────────────────
   SERVICES PAGE REVEAL
──────────────────────────────────────────────────────── */
function revealServices(pageEl) {
  $$('.service-row', pageEl).forEach(r => r.classList.add('revealed'));
}

/* ────────────────────────────────────────────────────────
   CONTACT PAGE REVEAL + magnetic tilt
──────────────────────────────────────────────────────── */
function revealContact(pageEl) {
  const card   = $('#card');
  const social = $('.contact-social', pageEl);

  if (card)   card.classList.add('revealed');
  if (social) gsap.set(social, { opacity: 1, y: 0 });
}

function initCard() {
  const card = $('#card');
  if (!card || !hasHover) return;

  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top  - r.height / 2;
    gsap.to(card, {
      x: x * 0.06,
      y: y * 0.06,
      rotateX: -y * 0.025,
      rotateY:  x * 0.025,
      duration: 0.5,
      ease: 'power3.out'
    });
  }, { passive: true });

  card.addEventListener('mouseleave', () => {
    gsap.to(card, {
      x: 0, y: 0,
      rotateX: 0, rotateY: 0,
      duration: 0.8,
      ease: 'power4.out'
    });
  });
}

/* ────────────────────────────────────────────────────────
   HOME VIDEO FALLBACK
──────────────────────────────────────────────────────── */
function initHomeVideo() {
  const video = $('#global-video');
  if (!video) return;

  const source = $('source', video);
  if (source) {
    source.addEventListener('error', () => video.classList.add('is-hidden'));
  }
  video.addEventListener('error', () => video.classList.add('is-hidden'));
}

/* ────────────────────────────────────────────────────────
   KEYBOARD NAVIGATION
──────────────────────────────────────────────────────── */
function initKeyboardNav() {
  const pageOrder = ['home', 'about', 'gallery', 'services', 'contact'];

  document.addEventListener('keydown', (e) => {
    // Don't navigate if lightbox is open or intro hasn't finished
    if (!introComplete) return;
    const lightbox = $('#lightbox');
    if (lightbox && lightbox.classList.contains('is-open')) return;
    const mobileMenu = $('#mobileMenu');
    if (mobileMenu && mobileMenu.classList.contains('is-open')) return;

    const idx = pageOrder.indexOf(currentPage);
    if (idx === -1) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = pageOrder[idx + 1];
      if (next) navigateTo(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = pageOrder[idx - 1];
      if (prev) navigateTo(prev);
    }
  });
}

/* ────────────────────────────────────────────────────────
   INIT
──────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initHomeVideo();
  initNavigation();
  initMobileMenu();
  initGallery();
  initCard();
  initKeyboardNav();
  runIntro();
});
