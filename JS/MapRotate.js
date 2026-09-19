// JS/MapRotate.js
// ================================================================
// Companion to JS/CSS/Map-Rotate.css
//
// Job 1: keep --vw / --vh in sync with the REAL viewport — but ONLY on
//        browsers without dvh support.
//
//        Three ways to measure a mobile viewport, and two are traps:
//          100vh                 - excludes browser chrome, so the frame
//                                  overflows behind the toolbar.
//          visualViewport.height - SHRINKS while the toolbar is visible, so
//                                  the frame is sized to the small slice and
//                                  leaves dead space once the toolbar hides.
//                                  This caused the uneven bottom gap.
//          100dvh                - the browser keeps it correct across
//                                  toolbar show/hide on its own. Correct.
//
//        So when dvh is supported we set NOTHING and let Map-Rotate.css's
//        @supports block own --vw/--vh. Writing them here would defeat it:
//        these are inline styles on :root and would beat the stylesheet.
//
// Job 2: after the frame resizes, tell DotPin.js to re-measure.
//        DotPin already listens for `resize`, so one synthetic event
//        re-anchors every pin to the image.
// ================================================================
(function () {
    "use strict";

    var root = document.documentElement;

    // Feature-detect once. When true, CSS handles sizing entirely.
    var HAS_DVH = !!(window.CSS && CSS.supports && CSS.supports("height", "100dvh"));

    function syncViewportVars() {
        // dvh-capable browser: leave --vw/--vh to the CSS @supports block.
        if (HAS_DVH) return;

        // Legacy fallback. innerWidth/innerHeight are the LAYOUT viewport and
        // stay stable as the toolbar collapses; visualViewport is deliberately
        // NOT used here because it tracks the shrinking visible slice.
        var w = Math.round(window.innerWidth || root.clientWidth);
        var h = Math.round(window.innerHeight || root.clientHeight);

        root.style.setProperty("--vw", w + "px");
        root.style.setProperty("--vh", h + "px");
    }

    // Is the map currently rotated? Handy for other scripts / debugging.
    function isRotated() {
        return window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;
    }

    function refresh() {
        syncViewportVars();
        root.classList.toggle("map-is-rotated", isRotated());

        // Let DotPin.js re-measure against the new frame size.
        // rAF x2 so the browser has finished laying the frame out first.
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                window.dispatchEvent(new Event("resize"));
            });
        });
    }

    syncViewportVars();
    root.classList.toggle("map-is-rotated", isRotated());

    window.addEventListener("resize", syncViewportVars, { passive: true });

    window.addEventListener("orientationchange", function () {
        // iOS reports stale dimensions immediately after the event.
        setTimeout(refresh, 60);
        setTimeout(refresh, 320);
    }, { passive: true });

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncViewportVars, { passive: true });
    }

    // Re-run once the map image has decoded (natural size drives the pin math).
    var img = document.getElementById("mainImage");
    if (img) {
        if (img.complete) refresh();
        else img.addEventListener("load", refresh, { once: true });
    }

    window.addEventListener("pageshow", refresh);

    // Expose for manual use, e.g. MapRotate.setAngle(-90)
    window.MapRotate = {
        isRotated: isRotated,
        refresh: refresh,
        setAngle: function (deg) {
            root.style.setProperty("--map-rotate", deg + "deg");
            refresh();
        }
    };
})();
