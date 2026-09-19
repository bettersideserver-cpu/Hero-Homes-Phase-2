window.addEventListener('DOMContentLoaded', () => {
    const tip = document.getElementById('floorTip');
    const paths = document.querySelectorAll('.Cutout path');
    if (!tip || !paths.length) return;

    let currentTarget = null;
    const OFFSET_Y = 16; // how far above the cursor the tooltip sits
    const PADDING = 8;   // viewport padding so it never clips

    function labelFor(el) {
        return el.getAttribute('data-name') || el.id || 'Floor';
    }

    function positionTipAt(x, y) {
        // place roughly above cursor
        tip.style.left = x + 'px';
        tip.style.top = (y - OFFSET_Y) + 'px';

        // keep fully on-screen (considering transform: translate(-50%, -100%))
        const r = tip.getBoundingClientRect();
        const halfW = r.width / 2;

        let clampedX = x;
        clampedX = Math.max(halfW + PADDING, clampedX);
        clampedX = Math.min(window.innerWidth - halfW - PADDING, clampedX);

        let clampedY = y - OFFSET_Y; // already above cursor
        const tipH = r.height;
        // since we translateY(-100%), the visible top = clampedY - tipH
        const visibleTop = clampedY - tipH;
        if (visibleTop < PADDING) {
            // if too close to top, move it below the cursor instead
            tip.style.transform = 'translate(-50%, 8px)'; // small gap below cursor
            clampedY = y;
        } else {
            tip.style.transform = 'translate(-50%, -100%)';
        }

        tip.style.left = clampedX + 'px';
        tip.style.top = clampedY + 'px';
    }

    function showTip(el, e) {
        tip.textContent = labelFor(el);
        tip.classList.add('is-visible');
        tip.setAttribute('aria-hidden', 'false');
        positionTipAt(e.clientX, e.clientY);
    }

    function hideTip() {
        tip.classList.remove('is-visible');
        tip.setAttribute('aria-hidden', 'true');
        currentTarget = null;
    }

    paths.forEach(p => {
        p.addEventListener('mouseenter', (e) => {
            currentTarget = p;
            showTip(p, e);
        });
        p.addEventListener('mousemove', (e) => {
            if (currentTarget === p) positionTipAt(e.clientX, e.clientY);
        });
        p.addEventListener('mouseleave', hideTip);
    });

    // safety: if user scrolls/resizes while hovering, keep following last cursor pos
    window.addEventListener('scroll', () => tip.classList.contains('is-visible') && tip.style.top);
    window.addEventListener('resize', () => tip.classList.contains('is-visible') && tip.style.left);
    window.addEventListener('orientationchange', () => hideTip());
});