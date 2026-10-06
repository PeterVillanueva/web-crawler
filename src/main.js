import * as THREE from 'three';
import gsap from 'gsap';
import barba from '@barba/core';
import { createSpider } from './spider.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const curtain = document.querySelector('.transition-curtain');
const COVER_OFFSET = 101;
const COVER_DURATION = 0.72;
const REVEAL_DURATION = 0.82;
const WIPE_EASE = 'power4.inOut';

let disposePage = () => {};

function initPage(container) {
  const namespace = container.dataset.barbaNamespace;
  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav === namespace) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (namespace === 'playground') disposePage = createSpider(container, { THREE, gsap, reducedMotion });
  else disposePage = () => {};
}

function parkCurtain() {
  if (!curtain) return;
  gsap.set(curtain, { y: 0, yPercent: COVER_OFFSET });
}

function coverCurtain() {
  if (!curtain) return Promise.resolve();
  return gsap.fromTo(curtain, { y: 0, yPercent: COVER_OFFSET }, {
    y: 0,
    yPercent: 0,
    duration: reducedMotion ? 0 : COVER_DURATION,
    ease: WIPE_EASE,
    overwrite: 'auto',
  });
}

function revealCurtain() {
  if (!curtain) return Promise.resolve();
  return gsap.to(curtain, {
    y: 0,
    yPercent: -COVER_OFFSET,
    duration: reducedMotion ? 0 : REVEAL_DURATION,
    ease: WIPE_EASE,
    overwrite: 'auto',
  });
}

function releaseTransition() {
  parkCurtain();
  document.documentElement.classList.remove('is-transitioning');
}

function hashId(url) {
  const hash = typeof url === 'string' ? new URL(url, location.href).hash : url?.hash;
  const raw = String(hash || '').replace(/^#/, '');
  try {
    return decodeURIComponent(raw);
  } catch (error) {
    console.error('[transition] Invalid URL hash', error);
    return '';
  }
}

function isSamePageHash(href) {
  const target = new URL(href, location.href);
  return target.origin === location.origin
    && target.pathname === location.pathname
    && target.search === location.search
    && target.hash.length > 1;
}

barba.hooks.before(() => {
  document.documentElement.classList.add('is-transitioning');
});

barba.hooks.after(() => {
  releaseTransition();
});

barba.init({
  preventRunning: true,
  timeout: 8000,
  requestError() {
    releaseTransition();
  },
  prevent({ el, href }) {
    if (!(el instanceof HTMLAnchorElement) || !href) return false;
    if (el.hasAttribute('download') || el.target === '_blank' || el.closest('[data-barba-prevent]')) return true;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return true;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return true;
    return isSamePageHash(href);
  },
  transitions: [{
    name: 'follow-the-thread',
    once({ next }) {
      parkCurtain();
      initPage(next.container);
    },
    async leave({ current }) {
      current.container.setAttribute('aria-hidden', 'true');
      try {
        await coverCurtain();
        disposePage();
        gsap.set(current.container, {
          autoAlpha: 0,
          position: 'absolute',
          inset: 0,
          width: '100%',
        });
      } catch (error) {
        releaseTransition();
        throw error;
      }
    },
    async enter({ next }) {
      try {
        window.scrollTo(0, 0);
        initPage(next.container);
        next.container.removeAttribute('aria-hidden');
        await revealCurtain();
        parkCurtain();
        const id = hashId(next.url);
        const target = id ? document.getElementById(id) : null;
        if (target) target.scrollIntoView();
        else next.container.focus({ preventScroll: true });
      } catch (error) {
        releaseTransition();
        throw error;
      }
    },
  }],
});
