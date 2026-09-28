
(function () {
    // TODO: replace with your target number in international format (no + or 00)
    const PHONE_NUMBER = "918556958000"; // e.g. 919812345678

    const fab = document.getElementById('waFab');
    const label = document.getElementById('waLabel');

    if (!fab) return;

    // Build the message dynamically at click time.
    function buildWhatsAppMessage() {
        // Page info
        const title = document.title || '';
        const url = location.href;

        // If user opened infoCard, prefer that title
        let infoTitle = '';
        try {
            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle && modalTitle.textContent && modalTitle.textContent.trim() && modalTitle.textContent.trim() !== '~') {
                infoTitle = modalTitle.textContent.trim();
            }
        } catch (err) {
            /* ignore */
        }

        // You can expand this to include form fields, price, selected unit, etc.
        // const infoPart = infoTitle ? `Regarding: ${infoTitle}\n` : '';
        const message = `Hi, I am interested in this property:\n${title}\n${url}\n\nContact me.`;
        return encodeURIComponent(message);
    }

    // Open WhatsApp (uses wa.me short link which works on mobile and desktop)
    function openWhatsApp() {
        if (!PHONE_NUMBER || PHONE_NUMBER === "PHONE_NUMBER") {
            alert('Please set PHONE_NUMBER in the script to the destination WhatsApp number (international format, no +).');
            return;
        }
        const text = buildWhatsAppMessage();
        const url = `https://wa.me/${PHONE_NUMBER}?text=${text}`;
        // open in new tab
        window.open(url, '_blank', 'noopener');
    }

    // Click
    fab.addEventListener('click', openWhatsApp);

    // Small UX: show label on hover / long-press
    fab.addEventListener('mouseenter', () => label.classList.add('show'));
    fab.addEventListener('mouseleave', () => label.classList.remove('show'));
    fab.addEventListener('touchstart', () => label.classList.add('show'));
    fab.addEventListener('touchend', () => setTimeout(() => label.classList.remove('show'), 800));
})();
