/* Contact menu uses the existing enquiry modal and its existing form. */
(() => {
    function init() {
        document.querySelectorAll('[data-contact-form]').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                const overlay = document.getElementById('enquiryOverlay');
                if (!overlay) return;
                const menu = document.getElementById('menuBtn');
                if (menu?.classList.contains('is-open')) menu.click();
                const enquiry = document.querySelector('#enquiryBtn, #openEnquiry');
                if (enquiry) enquiry.click();
                else { overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false'); }
                overlay.querySelector('input:not([type="hidden"]), select, textarea')?.focus();
            });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
