window.addEventListener('DOMContentLoaded', () => {
    const img = document.getElementById('mainImage');
    if (!img) return;

    const fullSrc = img.getAttribute('data-full');
    if (!fullSrc) return;

    // Preload the high-res without blocking render
    const hi = new Image();
    hi.decoding = 'async';
    hi.src = fullSrc;

    // Prefer decode() for a jank-free swap
    const done = () => {
        // swap to high-res
        img.src = fullSrc;
        img.classList.add('is-loaded');
    };

    if ('decode' in hi) {
        hi.decode().then(done).catch(done);
    } else {
        hi.onload = done;
        hi.onerror = done; // if it fails, at least drop the blur
    }
});