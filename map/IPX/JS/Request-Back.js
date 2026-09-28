document.addEventListener("DOMContentLoaded", () => {
    const requestBtn = document.querySelector('.jumpchip.is-accent:last-of-type'); // Your "Request Call Back" button
    const overlay = document.getElementById("callbackOverlay");
    const closeBtn = document.getElementById("callbackCloseBtn");

    if (requestBtn && overlay && closeBtn) {
        // Show modal
        requestBtn.addEventListener("click", (e) => {
            e.preventDefault();
            overlay.style.display = "flex";
            overlay.setAttribute("aria-hidden", "false");
        });

        // Hide modal
        closeBtn.addEventListener("click", () => {
            overlay.style.display = "none";
            overlay.setAttribute("aria-hidden", "true");
        });

        // Close when clicking outside modal
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                overlay.style.display = "none";
                overlay.setAttribute("aria-hidden", "true");
            }
        });
    }
});