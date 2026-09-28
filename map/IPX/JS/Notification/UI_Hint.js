(function () {
    const HINT_VISIBLE_MS = 3500; // how long it stays visible (3.5s)
    const hint = document.getElementById('ui-hint');

    if (!hint) return;

    // Show only once per session
    if (!sessionStorage.getItem('ui_hint_shown')) {
        // Make visible
        hint.classList.add('is-visible');

        const hide = () => {
            hint.classList.add('is-gone');
            setTimeout(() => hint.remove(), 400);
        };

        // Auto-hide
        setTimeout(hide, HINT_VISIBLE_MS);

        // Allow user to dismiss early
        hint.addEventListener('click', hide, { once: true });

        // Mark as shown
        sessionStorage.setItem('ui_hint_shown', '1');
    }
})();