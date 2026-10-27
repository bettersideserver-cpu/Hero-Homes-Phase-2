(() => {
    const base = new URL('gallery/', document.currentScript.src);
    const images = Array.from({length: 6}, (_, i) => new URL(`gallery-${String(i + 1).padStart(2, '0')}.jpg`, base).href);
    function init() {
        const overlay = document.getElementById('galleryOverlay');
        if (!overlay || overlay.dataset.ready) return;
        overlay.dataset.ready = 'true';
        overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'galleryHeading'); overlay.setAttribute('aria-hidden', 'true');
        const heading = document.createElement('h2'); heading.id = 'galleryHeading'; heading.className = 'gallery-heading';
        heading.innerHTML = '<small>HERO HOMES · PHASE 2</small>Gallery'; overlay.prepend(heading);
        const image = document.getElementById('galleryImage'), thumbs = document.getElementById('galleryThumbs');
        const closeButton = document.getElementById('galleryClose');
        closeButton.setAttribute('aria-label', 'Close gallery');
        document.getElementById('galleryPrev').setAttribute('aria-label', 'Previous image');
        document.getElementById('galleryNext').setAttribute('aria-label', 'Next image');
        document.getElementById('galleryTotal').textContent = images.length;
        const counter = overlay.querySelector('.gallery-counter'); counter.setAttribute('aria-live', 'polite');
        const error = document.createElement('p'); error.className = 'gallery-error'; error.hidden = true;
        error.textContent = 'This image could not load. Try another image.'; overlay.querySelector('.gallery-main').append(error);
        image.addEventListener('error', () => { error.hidden = false; image.style.visibility = 'hidden'; });
        image.addEventListener('load', () => { error.hidden = true; image.style.visibility = ''; });
        let index = 0, opener, previousOverflow, inertNodes = [], startX;
        thumbs.replaceChildren();
        const buttons = images.map((src, i) => {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'gallery-thumb';
            button.setAttribute('aria-label', `View image ${i + 1}`);
            const thumbnail = document.createElement('img'); thumbnail.src = src; thumbnail.alt = ''; button.append(thumbnail);
            button.onclick = () => go(i); thumbs.append(button); return button;
        });
        function go(i) {
            index = (i + images.length) % images.length; error.hidden = true; image.style.visibility = '';
            image.src = images[index]; image.alt = `Hero Homes gallery image ${index + 1}`;
            document.getElementById('galleryCurrent').textContent = index + 1;
            buttons.forEach((button, j) => { button.classList.toggle('is-active', j === index); button.setAttribute('aria-pressed', String(j === index)); });
            buttons[index].scrollIntoView?.({block: 'nearest', inline: 'nearest'});
        }
        function open(event) {
            event.preventDefault(); if (overlay.classList.contains('is-open')) return;
            opener = event.currentTarget; previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden'; overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false');
            inertNodes = [...document.body.children].filter(el => el !== overlay && !el.contains(overlay) && !el.inert && !['SCRIPT','STYLE','LINK'].includes(el.tagName));
            inertNodes.forEach(el => el.inert = true); go(index); closeButton.focus();
        }
        function close() {
            overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = previousOverflow || ''; inertNodes.forEach(el => el.inert = false); inertNodes = [];
            opener?.focus();
        }
        closeButton.onclick = close;
        document.getElementById('galleryPrev').onclick = () => go(index - 1);
        document.getElementById('galleryNext').onclick = () => go(index + 1);
        document.querySelectorAll('[data-open-gallery]').forEach(button => button.addEventListener('click', open));
        overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
        document.addEventListener('keydown', event => {
            if (!overlay.classList.contains('is-open')) return;
            if (event.key === 'Escape') { event.preventDefault(); close(); }
            if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
            if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
            if (event.key === 'Tab') {
                const controls = [...overlay.querySelectorAll('button')]; const first = controls[0], last = controls.at(-1);
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        });
        image.addEventListener('touchstart', event => { startX = event.changedTouches[0].clientX; }, {passive: true});
        image.addEventListener('touchend', event => { const delta = event.changedTouches[0].clientX - startX; if (Math.abs(delta) > 50) go(index + (delta < 0 ? 1 : -1)); }, {passive: true});
        go(0);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
