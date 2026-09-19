(function () {
    const HINT_VISIBLE_MS = 3500;
    const hint = document.getElementById('ui-hint');
    if (!hint) return;

    hint.classList.add('is-visible');

    const hide = () => {
        hint.classList.add('is-gone');
        setTimeout(() => hint.remove(), 400);
    };

    setTimeout(hide, HINT_VISIBLE_MS);
    hint.addEventListener('click', hide, { once: true });
})();