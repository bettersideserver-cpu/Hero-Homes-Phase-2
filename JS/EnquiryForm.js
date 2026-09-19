const scriptURL1 = 'https://script.google.com/macros/s/AKfycbx-LKN11CGP5Ot6DDVbLCpAzUK9GQR_8JIuo3H7_pXfX-W1zXg04QQXEBb79Cu_Fb3fzg/exec';// cm
const scriptURL2 = 'https://script.google.com/macros/s/AKfycbzK8mD3jIf-PV3SYlCTpShqk4dYqNyvJX9Ki-Hu01KrVTY6Iq1AA7mOCBQ_Tn5mJsbJaw/exec';// betterside

(function handleEnquiryForm() {
    const form      = document.getElementById("enquiryForm");
    const submitBtn = form?.querySelector(".submit");
    if (!form) return;

    function setFormBusy(isBusy) {
        if (!submitBtn) return;
        submitBtn.setAttribute("aria-busy", isBusy ? "true" : "false");
        [...form.elements].forEach(el => el.disabled = isBusy);
    }

    function showEnquiryOverlay() {
        const overlay = document.getElementById('enquiryOverlay');
        const openBtn = document.getElementById('openEnquiry');
        if (!overlay) return;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        if (openBtn) openBtn.classList.add('is-hidden');
    }

    function hideEnquiryOverlay() {
        const overlay = document.getElementById('enquiryOverlay');
        const openBtn = document.getElementById('openEnquiry');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (openBtn) openBtn.classList.remove('is-hidden');
    }

    (function () {
        const overlay  = document.getElementById('enquiryOverlay');
        const openBtn  = document.getElementById('openEnquiry');
        const closeBtn = document.getElementById('closeBtn');
        if (!overlay || !openBtn || !closeBtn) return;

        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showEnquiryOverlay();
        });
        closeBtn.addEventListener('click', hideEnquiryOverlay);
        overlay.addEventListener('click', (e) => {
            if (!e.target.closest('.modal')) hideEnquiryOverlay();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideEnquiryOverlay();
        });
    })();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = form.phone.value.trim();
    if (!/^[0-9]{10}$/.test(phone)) {
        alert('Please enter a valid 10-digit phone number.');
        return;
    }

    const email = form.email.value.trim();
    if (!email.includes('@') || !email.includes('.')) {
        alert('Please enter a valid email address.');
        return;
    }

    const captcha = grecaptcha.getResponse();
    if (!captcha) {
        alert('Please complete the captcha.');
        return;
    }

    const fd = new FormData(form);

    setFormBusy(true);
    submitBtn.textContent = 'Submitting...';

    try {
        await Promise.all([
            fetch(scriptURL1, { method: "POST", mode: "no-cors", body: fd }),
            fetch(scriptURL2, { method: "POST", mode: "no-cors", body: fd })
        ]);
    } catch (err) {
        console.error(err);
    } finally {
        submitBtn.textContent = '✅ Submitted!';
        form.reset();
        grecaptcha.reset();
        setTimeout(() => {
            hideEnquiryOverlay();
            submitBtn.removeAttribute('aria-busy');
            submitBtn.textContent = 'Request a Call Back';
            setFormBusy(false);
        }, 2000);
    }
});

})();