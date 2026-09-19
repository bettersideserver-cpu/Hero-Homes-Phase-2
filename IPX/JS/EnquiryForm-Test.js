const scriptURL = 'https://script.google.com/macros/s/AKfycbykULHsW8RgnC0oerKvuUHtF5a3jQEamMZT0VWM0UO5j0RFkGsbVaHHDZsogk5fgEhW6Q/exec';

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

        const fd = new FormData(form);
        fd.append("page_title", document.title);
        fd.append("page_url", location.href);
        fd.append("page_path", location.pathname);
        fd.append("referrer", document.referrer || "");
        fd.append("tower", sessionStorage.getItem("lastTower") || "");
        fd.append("floor_name", sessionStorage.getItem("lastFloorName") || "");
        fd.append("floor_link", sessionStorage.getItem("lastFloorLink") || "");

        const params = new URLSearchParams(location.search);
        ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(k => {
            if (params.has(k)) fd.append(k, params.get(k));
        });

        setFormBusy(true);
        submitBtn.textContent = 'Submitting...';

        try {
            await fetch(scriptURL, { method: "POST", mode: "no-cors", body: fd });
        } catch (err) {
            console.error(err);
        } finally {
            submitBtn.textContent = '✅ Submitted!';
            form.reset();
            setTimeout(() => {
                hideEnquiryOverlay();
                submitBtn.removeAttribute('aria-busy');
                submitBtn.textContent = 'Request a Call Back';
                setFormBusy(false);
            }, 2000);
        }
    });

})();