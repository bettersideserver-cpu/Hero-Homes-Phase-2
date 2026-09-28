window.addEventListener('DOMContentLoaded', () => {
    const img = document.getElementById('mainImage');
    if (!img) return;

    // Low-resolution image is shown immediately.
    const lowSrc = img.getAttribute('src');
    const fullSrc = img.getAttribute('data-full');

    if (!lowSrc || !fullSrc || lowSrc === fullSrc) return;

    // Keep the low-res image visible while the full-resolution image
    // downloads and decodes completely in the background.
    const hi = new Image();
    hi.decoding = 'async';
    hi.fetchPriority = 'high';

    hi.onload = async () => {
        try {
            // Wait until the browser has decoded the full image.
            if (hi.decode) {
                await hi.decode();
            }
        } catch (e) {
            // The image is already loaded; a decode failure should not
            // prevent the swap.
        }

        // Swap only after the full-resolution image is ready.
        img.src = fullSrc;
        img.classList.add('is-loaded');
    };

    // If the full image fails, keep the low-res image on screen.
    hi.onerror = () => {
        console.warn('Full-resolution image failed to load:', fullSrc);
    };

    // Start the full-resolution download in the background.
    hi.src = fullSrc;
});
