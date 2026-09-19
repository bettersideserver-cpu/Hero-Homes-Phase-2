const playBtn = document.getElementById('playWalkthroughBtn');
const overlay = document.getElementById('videoOverlay');
const video = document.getElementById('walkthroughVideo');

// Cross-browser fullscreen helpers
function enterFullscreen(el) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

function exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
}

// Detect if device is iPhone
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// 🔹 Play button click handler
if (playBtn) {
    playBtn.addEventListener('click', () => {
        overlay.style.display = 'flex';
        requestAnimationFrame(() => overlay.classList.add('active'));

        // ✅ For iPhones, don't requestFullscreen (Safari handles it automatically)
        if (!isIOS) enterFullscreen(video);

        video.play();
    });
}

// 🔹 When video ends normally
video.addEventListener('ended', () => {
    cleanupOverlay();
});

// 🔹 When fullscreen is exited manually (for non-iOS)
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        cleanupOverlay();
    }
});

// 🔹 🟢 Special fix for iPhones
video.addEventListener('webkitendfullscreen', () => {
    console.log('📱 iOS fullscreen ended');
    cleanupOverlay();
});

// 🔹 Click outside video closes it early
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
        video.pause();
        cleanupOverlay();
    }
});

// 🔹 Central cleanup function
function cleanupOverlay() {
    video.pause();
    video.currentTime = 0;
    overlay.classList.remove('active');
    setTimeout(() => (overlay.style.display = 'none'), 400);
    exitFullscreen();
}
