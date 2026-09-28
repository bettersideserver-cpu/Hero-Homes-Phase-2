/* Hero Homes — mobile background/SVG lock-in-sync fix
 *
 * Problem: on mobile the background photo (object-fit: cover) and the
 * apartment SVG overlay (preserveAspectRatio="xMidYMid slice") were each
 * being cropped to fill the screen by TWO DIFFERENT browser algorithms.
 * They only line up when the photo's real pixel aspect ratio is exactly
 * the same as the SVG viewBox aspect ratio — any difference (or any
 * mobile aspect ratio far from that) makes the SVG hotspots drift away
 * from the rooms in the photo, and makes the photo look "stuck"/mis-cropped
 * as the viewport changes (rotation, browser chrome show/hide, etc).
 *
 * Fix: don't let the browser crop image and SVG independently. Size one
 * shared "stage" (#contentWrapper) so its own aspect ratio always equals
 * the SVG viewBox aspect ratio, scaled up with cover-math to fill the
 * screen, then centered. The photo and the SVG both stretch to fill that
 * exact same box with NO internal cropping of their own — so they can
 * never disagree about where anything is.
 */
(function () {
  'use strict';

  var BREAKPOINT = 600; // matches the existing @media (max-width: 600px) rules

  var svg, wrapper, cutout, img;
  var rafId = null;

  function cacheEls() {
    svg = document.querySelector('.Cutout svg');
    wrapper = document.getElementById('contentWrapper');
    cutout = document.querySelector('.Cutout');
    img = document.getElementById('mainImage');
  }

  function isMobileWidth() {
    return window.innerWidth <= BREAKPOINT;
  }

  function setImportant(el, props) {
    if (!el) return;
    for (var k in props) {
      if (Object.prototype.hasOwnProperty.call(props, k)) {
        el.style.setProperty(k, props[k], 'important');
      }
    }
  }

  function clearStage() {
    if (!wrapper) return;
    ['position', 'top', 'left', 'width', 'height', 'transform'].forEach(function (p) {
      wrapper.style.removeProperty(p);
    });
    if (img) ['width', 'height', 'object-fit', 'transform'].forEach(function (p) { img.style.removeProperty(p); });
    if (cutout) ['position', 'top', 'left', 'width', 'height', 'transform'].forEach(function (p) { cutout.style.removeProperty(p); });
    if (svg) {
      ['width', 'height', 'max-width', 'max-height', 'transform'].forEach(function (p) { svg.style.removeProperty(p); });
      svg.removeAttribute('data-hh-forced-par');
    }
  }

  function sync() {
    if (!svg || !wrapper) return;

    if (!isMobileWidth()) {
      clearStage();
      return;
    }

    var vb = svg.viewBox && svg.viewBox.baseVal;
    var baseW = (vb && vb.width) || 3840;
    var baseH = (vb && vb.height) || 5830;

    var vv = window.visualViewport;
    var vw = vv ? vv.width : window.innerWidth;
    var vh = vv ? vv.height : window.innerHeight;

    // "cover" math against the SVG's own coordinate system
    var scale = Math.max(vw / baseW, vh / baseH);
    var stageW = baseW * scale;
    var stageH = baseH * scale;
    var left = (vw - stageW) / 2;
    var top = (vh - stageH) / 2;

    setImportant(wrapper, {
      position: 'fixed',
      width: stageW + 'px',
      height: stageH + 'px',
      left: left + 'px',
      top: top + 'px',
      transform: 'none'
    });

    // Photo fills the stage exactly — the stage (not the img) does the
    // "cover" cropping now, so the image needs no cropping of its own.
    setImportant(img, {
      width: '100%',
      height: '100%',
      'object-fit': 'fill',
      transform: 'none'
    });

    setImportant(cutout, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      transform: 'none'
    });

    // SVG fills the same stage 1:1 with its native viewBox, no independent
    // slicing — so every path lands exactly where it was drawn.
    setImportant(svg, {
      width: '100%',
      height: '100%',
      'max-width': 'none',
      'max-height': 'none',
      transform: 'none'
    });
    if (svg.getAttribute('preserveAspectRatio') !== 'none') {
      svg.setAttribute('data-hh-original-par', svg.getAttribute('preserveAspectRatio') || 'xMidYMid slice');
      svg.setAttribute('preserveAspectRatio', 'none');
    }
  }

  function scheduleSync() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(sync);
  }

  function boot() {
    cacheEls();
    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', scheduleSync);
  window.addEventListener('resize', scheduleSync);
  window.addEventListener('orientationchange', function () {
    // fire a couple of times — iOS/Android settle their innerHeight/
    // address-bar height a beat after the orientationchange event
    setTimeout(scheduleSync, 60);
    setTimeout(scheduleSync, 300);
    setTimeout(scheduleSync, 700);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleSync);
    window.visualViewport.addEventListener('scroll', scheduleSync);
  }

  var mainImg = document.getElementById('mainImage');
  if (mainImg) {
    if (mainImg.complete && mainImg.naturalWidth) {
      scheduleSync();
    } else {
      mainImg.addEventListener('load', scheduleSync);
    }
  }
})();