/* ═══════════════════════════════════════════════════════════════════
   PlotBrand.js — pins the animated brand logo to the site-plan outline
   -------------------------------------------------------------------
   The logo is anchored to MAP GEOGRAPHY (so it tracks the plot as the
   map is resized) but drawn at a FIXED PIXEL SIZE (so it stays legible
   on small phones).

   Why JS is needed at all: on desktop the map image is letterboxed
   inside .image-wrapper (image box [0,83,1440,734] vs wrapper
   1440x900), so a plain `top: 60.32%` would resolve against the
   WRAPPER and miss the plot. getImageBox() below resolves percentages
   against the visible IMAGE box instead.

   The box math intentionally mirrors getImageBox()/positionPins() in
   DotPin.js — same offsetWidth/offsetLeft approach, which is
   rotation-proof (getBoundingClientRect returns screen-space
   axis-aligned values and swaps w/h under the mobile 90deg rotation).
   Keep the two in step if either is edited.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
    "use strict";

    var IMAGE_SELECTOR = "#mainImage";
    var BRAND_SELECTOR = ".plot-brand";

    // Default anchor = right-middle of Index.html's "Hero Home - Phase 2"
    // path bbox, as a percentage of the map. That bbox is x 8.11-18.46%,
    // y 53.22-67.41%; the x is nudged just outside the right edge so the
    // connector starts clear of the glowing outline instead of on top of it.
    var DEFAULT_ANCHOR = { x: 15.9, y: 50.32 };

    /* The one media condition that means "mobile portrait". Declared once and
       reused by readAnchor() and declaredSide(), and kept byte-identical to
       the query Brand-Logo.css uses for its mobile size vars, so CSS and JS
       can never disagree about which mode they are in. */
    var MOBILE_MQ = "(max-width: 768px) and (orientation: portrait)";

    function isMobilePortrait() {
        return !!(window.matchMedia && window.matchMedia(MOBILE_MQ).matches);
    }

    // Every page has a different plot shape, so the anchor is per-page:
    // put data-anchor-x / data-anchor-y on .plot-brand to override.
    // zoommap.html's plot is a diagonal band (bbox x 22.25-54.37%,
    // y 26.59-52.54%), so it uses its own values.
    //
    // data-anchor-x-mobile / data-anchor-y-mobile override again in mobile
    // portrait. This exists because the map rotates 90deg on mobile, so a
    // screen-space direction ("put the logo to the left") runs through the
    // map along a completely different bearing than it does on desktop. With
    // the desktop anchor kept, the requested mobile side ran lengthwise ALONG
    // the diagonal outline and could not be cleared by any connector length
    // (measured: hits plateau at 2-3 while the plate starts leaving the
    // screen). Moving the anchor to a different point on the plot perimeter
    // is what makes the requested side land on empty field instead.
    function readAnchor() {
        var brand = document.querySelector(BRAND_SELECTOR);
        if (!brand) return DEFAULT_ANCHOR;

        var x = parseFloat(brand.getAttribute("data-anchor-x"));
        var y = parseFloat(brand.getAttribute("data-anchor-y"));

        if (isMobilePortrait()) {
            var mx = parseFloat(brand.getAttribute("data-anchor-x-mobile"));
            var my = parseFloat(brand.getAttribute("data-anchor-y-mobile"));
            if (isFinite(mx)) x = mx;
            if (isFinite(my)) y = my;
        }

        return {
            x: isFinite(x) ? x : DEFAULT_ANCHOR.x,
            y: isFinite(y) ? y : DEFAULT_ANCHOR.y
        };
    }

    var ANCHOR = DEFAULT_ANCHOR;

    /* readAnchor() now depends on a media query, so the anchor has to be
       re-read whenever we reposition -- otherwise rotating the phone or
       crossing the 768px breakpoint keeps the anchor for the mode we just
       left. setAnchor() (console / future trigger) must still win, so an
       explicit override latches this off. */
    var ANCHOR_OVERRIDDEN = false;

    function getImageBox(img, wrapper) {
        var naturalW = img.naturalWidth || Number(img.getAttribute("width")) || 8192;
        var naturalH = img.naturalHeight || Number(img.getAttribute("height")) || 4175;
        var aspect = naturalW / naturalH;

        var imgW = img.offsetWidth || wrapper.clientWidth;
        var imgH = img.offsetHeight || wrapper.clientHeight;

        var visibleW = imgW;
        var visibleH = imgH;

        // contain-style fitting, so coordinates stay attached to the image
        if (imgW / imgH > aspect) {
            visibleH = imgH;
            visibleW = visibleH * aspect;
        } else {
            visibleW = imgW;
            visibleH = visibleW / aspect;
        }

        return {
            left: img.offsetLeft + (imgW - visibleW) / 2,
            top: img.offsetTop + (imgH - visibleH) / 2,
            width: visibleW,
            height: visibleH
        };
    }

    function position() {
        var img = document.querySelector(IMAGE_SELECTOR);
        var brand = document.querySelector(BRAND_SELECTOR);
        if (!img || !brand) return;

        var wrapper = img.closest(".image-wrapper");
        if (!wrapper) return;

        // re-read so the mobile-portrait anchor tracks the breakpoint
        if (!ANCHOR_OVERRIDDEN) ANCHOR = readAnchor();

        var box = getImageBox(img, wrapper);
        var wrapperW = wrapper.offsetWidth || wrapper.clientWidth || 1;
        var wrapperH = wrapper.offsetHeight || wrapper.clientHeight || 1;

        var xPx = box.left + (ANCHOR.x / 100) * box.width;
        var yPx = box.top + (ANCHOR.y / 100) * box.height;

        brand.style.left = ((xPx / wrapperW) * 100).toFixed(5) + "%";
        brand.style.top = ((yPx / wrapperH) * 100).toFixed(5) + "%";
        chooseSide(brand);
        brand.classList.add("is-placed");
        startAnimation(brand);
    }

    /* ── which side of the anchor does the plate sit on? ──────────────
       Hard requirement: the logo must never cover the plot outline.
       A single fixed side cannot satisfy that at every viewport --
       zoommap.html's band runs diagonally, so laying the plate out
       leftward is clear of it on desktop but crosses it once the map
       rotates 90deg for mobile portrait (measured: 12 of 121 sampled
       points inside the outline at 390x844), and at 820x1180 the
       leftward assembly ran 8px off the left edge of the screen.

       So the side is chosen by measurement, every layout pass. The page
       states a preference with data-side; we try that first and keep it
       unless the other side scores better.

       Overlap is tested with path.isPointInFill() in the path's own user
       space via getScreenCTM().inverse(). getBoundingClientRect() is
       useless here -- on a diagonal band it returns an axis-aligned box
       that hugely overstates coverage and reports a false collision.
       ──────────────────────────────────────────────────────────────── */
    var SIDES = ["right", "left", "up", "down"];

    // UI that must not be covered either. Missing selectors are just skipped,
    // so the same list is safe on both pages.
    var OBSTACLES = [".prop-address", ".top-controls", "#backBtn", "#ui-hint",
        ".panel-toggle", "#panelToggleBtn"];

    function applySide(brand, side) {
        for (var i = 0; i < SIDES.length; i++) {
            brand.classList.toggle("plot-brand--" + SIDES[i], SIDES[i] === side);
        }
        void brand.offsetWidth;                  // force reflow before measuring
    }

    function scoreSide(brand) {
        var body = brand.querySelector(".plot-brand__body");
        if (!body) return 0;
        var r = body.getBoundingClientRect();
        if (!r.width || !r.height) return 0;

        // 1. how far the assembly spills out of the viewport, in px
        var off = Math.max(0, -r.left) + Math.max(0, -r.top) +
            Math.max(0, r.right - window.innerWidth) +
            Math.max(0, r.bottom - window.innerHeight);

        // 2. how much of it lands ON THE PLOT OUTLINE, as a sampled point
        //    count. This is the constraint the user stated explicitly.
        var hits = 0;
        var path = document.querySelector(".Cutout path");
        if (path && path.isPointInFill && window.DOMPoint) {
            var ctm = path.getScreenCTM();
            if (ctm) {
                var inv = ctm.inverse();
                var M = 6;                       // safety margin around the plate
                var L = r.left - M, T = r.top - M;
                var W = r.width + 2 * M, H = r.height + 2 * M;
                for (var i = 0; i <= 8; i++) {
                    for (var j = 0; j <= 8; j++) {
                        var p = new DOMPoint(L + W * i / 8, T + H * j / 8)
                            .matrixTransform(inv);
                        try { if (path.isPointInFill(p)) hits++; } catch (e) { }
                    }
                }
            }
        }

        // 3. overlap area against the fixed UI, in px^2
        var ui = 0;
        for (var k = 0; k < OBSTACLES.length; k++) {
            var el = document.querySelector(OBSTACLES[k]);
            if (!el || !el.offsetParent) continue;
            var o = el.getBoundingClientRect();
            var ow = Math.min(r.right, o.right) - Math.max(r.left, o.left);
            var oh = Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top);
            if (ow > 0 && oh > 0) ui += ow * oh;
        }

        // Covering the outline is the hard "no", so weight it far above
        // clipping the screen edge or clipping a UI card.
        return hits * 100000 + off * 50 + ui;
    }

    /* The preferred side differs between desktop and mobile, because the map
       rotates for mobile portrait and what reads as "beside the plot" changes
       with it. data-side-mobile overrides data-side under exactly the same
       media condition Brand-Logo.css uses for its mobile vars, so the two
       can never disagree about which mode they are in. */
    function declaredSide(brand) {
        var mob = brand.getAttribute("data-side-mobile");
        if (isMobilePortrait() && mob) return mob.toLowerCase();
        return (brand.getAttribute("data-side") || "right").toLowerCase();
    }

    function chooseSide(brand) {
        var declared = declaredSide(brand);
        // declared preference first, then the rest, so a clean declared fit wins
        var order = [declared].concat(SIDES.filter(function (s) {
            return s !== declared;
        }));

        /* Score each candidate AFTER shrinking its connector to fit. Scoring
           the un-shrunk assembly used to discard a direction for a few px of
           spill that fitToViewport() would have absorbed anyway -- which is
           how the requested side lost to a fallback at 360x640. Outline hits
           are unaffected by the gap on the axes that matter, so this only
           changes which side wins on the soft penalties. */
        var best = order[0], bestScore = Infinity;
        for (var i = 0; i < order.length; i++) {
            applySide(brand, order[i]);
            fitToViewport(brand);
            var s = scoreSide(brand);
            if (s < bestScore) { bestScore = s; best = order[i]; }
            if (bestScore === 0) break;          // clean fit, stop looking
        }
        applySide(brand, best);
        brand.setAttribute("data-side-used", best);
        fitToViewport(brand);
    }

    /* Last resort: at 820x1180 the anchor sits only 178px from the left
       edge while the leftward assembly is ~186px wide, so the plate clipped
       8px off screen -- and every other direction crossed the outline, which
       is the worse failure. Rather than hardcode a smaller gap into the
       tablet breakpoint, shorten the connector by just enough to fit. The
       dot stays on the anchor and the plate stays the same size; only the
       gap gives. Floored so the connector never vanishes entirely. */
    var GAP_FLOOR = 8;

    /* Deliberately 0, i.e. "must be on screen" and nothing more. An 8px
       cosmetic inset was tried so the leftward plate on Index.html mobile
       wouldn't sit ~1px off the left edge, and it backfired: the only way to
       gain the inset is to shorten the connector, which drags the plate back
       toward the dot -- and the dot sits just off the outline, so the plate
       crept ONTO the outline (0/121 -> 2/121 at 390x844). Keeping the
       outline clear is the stated hard constraint; the edge margin is not. */
    var SCREEN_INSET = 0;

    function fitToViewport(brand) {
        brand.style.removeProperty("--brand-gap");
        var body = brand.querySelector(".plot-brand__body");
        if (!body) return;

        var gap = parseFloat(getComputedStyle(brand).getPropertyValue("--brand-gap"));
        if (!isFinite(gap)) return;

        for (var pass = 0; pass < 6; pass++) {
            var r = body.getBoundingClientRect();
            var spill = Math.max(
                Math.max(0, SCREEN_INSET - r.left), Math.max(0, SCREEN_INSET - r.top),
                Math.max(0, r.right - (window.innerWidth - SCREEN_INSET)),
                Math.max(0, r.bottom - (window.innerHeight - SCREEN_INSET))
            );
            if (spill <= 0.5 || gap <= GAP_FLOOR) break;
            gap = Math.max(GAP_FLOOR, gap - Math.max(2, Math.ceil(spill)));
            brand.style.setProperty("--brand-gap", gap + "px");
            void brand.offsetWidth;
        }
    }

    /* ── animation gate ─────────────────────────────────────────────
       The logo SVG is INLINED in the page and ships with every
       animation rule scoped under `.go`, so with no JS it simply shows
       the finished mark. We add `.go` only once the logo is genuinely
       on screen — i.e. after the map image has loaded AND the anchor
       has been resolved (.is-placed) AND the opacity fade-in has
       started. Previously the logo was an <img>, whose animation
       auto-started the moment the 25 KB file arrived (~120 ms) and
       finished by ~2.9 s — long before the 8192px Map.jpg landed and
       the logo faded in on a real phone. That is why it looked static
       on device but animated on a fast desktop.
       ─────────────────────────────────────────────────────────────── */
    var started = false;

    function startAnimation(brand) {
        if (started) return;
        var svg = brand.querySelector(".plot-brand__svg");
        if (!svg) return;                       // static-fallback markup
        var img = document.querySelector(IMAGE_SELECTOR);
        if (img && !img.complete) return;       // wait for the map
        if (!brand.classList.contains("is-placed")) return;
        started = true;
        // one frame after the fade-in begins, so the first keyframes are
        // painted while the logo is already becoming visible
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                svg.classList.add("go");
            });
        });
    }

    function schedule() {
        requestAnimationFrame(function () {
            requestAnimationFrame(position);
        });
    }

    function init() {
        ANCHOR = readAnchor();
        position();
        schedule();

        if (document.querySelector(IMAGE_SELECTOR)) {
            var img = document.querySelector(IMAGE_SELECTOR);
            if (img.complete) schedule();
            else img.addEventListener("load", schedule, { once: true });
        }

        window.addEventListener("resize", position, { passive: true });
        window.addEventListener("orientationchange", schedule, { passive: true });
        window.addEventListener("pageshow", schedule, { passive: true });

        // iOS reports stale metrics right after an orientation flip
        window.addEventListener("orientationchange", function () {
            setTimeout(position, 60);
            setTimeout(position, 320);
        }, { passive: true });

        if (window.ResizeObserver) {
            var wrapper = document.querySelector(".image-wrapper");
            if (wrapper) new ResizeObserver(position).observe(wrapper);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }

    window.PlotBrand = {
        refresh: position,
        /* replay the intro from the console / a future trigger */
        replay: function () {
            var svg = document.querySelector(".plot-brand__svg");
            if (!svg) return;
            svg.classList.remove("go");
            void svg.getBoundingClientRect();
            requestAnimationFrame(function () { svg.classList.add("go"); });
        },
        setAnchor: function (x, y) {
            ANCHOR_OVERRIDDEN = true;   // stop position() re-reading the attributes
            if (Number.isFinite(x)) ANCHOR.x = x;
            if (Number.isFinite(y)) ANCHOR.y = y;
            position();
        }
    };
})();
