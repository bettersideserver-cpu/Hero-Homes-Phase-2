const container = document.querySelector('.lobby-top');
const content = container.querySelector('.content-wrapper');

let isDragging = false;
let startX = 0, startY = 0;
let currentX = 0, currentY = 0;
let offsetX = 0, offsetY = 0;
let scale = 1;
const minScale = 1;
const maxScale = 3;

let initialDistance = 0;
let initialScale = 1;
let animationFrame;

// Mouse events
container.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    container.style.cursor = 'grabbing';
});

container.addEventListener('mouseup', () => {
    isDragging = false;
    offsetX = currentX;
    offsetY = currentY;
    container.style.cursor = 'grab';
});

container.addEventListener('mouseleave', () => {
    isDragging = false;
    offsetX = currentX;
    offsetY = currentY;
    container.style.cursor = 'grab';
});

container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    currentX = offsetX + deltaX;
    currentY = offsetY + deltaY;
    updateTransform();
});

// Touch events
container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        isDragging = false;
        initialDistance = getTouchDistance(e.touches);
        initialScale = scale;
    }
}, { passive: false });

container.addEventListener('touchmove', (e) => {
    e.preventDefault();

    if (e.touches.length === 1 && isDragging) {
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;
        currentX = offsetX + deltaX;
        currentY = offsetY + deltaY;
        updateTransform();
    } else if (e.touches.length === 2) {
        const newDistance = getTouchDistance(e.touches);
        let newScale = initialScale * (newDistance / initialDistance);
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        scale = newScale;
        updateTransform();
    }
}, { passive: false });

container.addEventListener('touchend', () => {
    isDragging = false;
    offsetX = currentX;
    offsetY = currentY;
}, { passive: true });

// Mouse wheel zoom
container.addEventListener('wheel', (e) => {
    e.preventDefault();

    const zoomSpeed = 0.3;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = rect.width / 2 + currentX;
    const centerY = rect.height / 2 + currentY;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;

    let newScale = scale;
    if (e.deltaY < 0) {
        newScale = Math.min(scale + zoomSpeed, maxScale);
    } else {
        newScale = Math.max(scale - zoomSpeed, minScale);
    }

    currentX -= (dx / scale) * (newScale - scale);
    currentY -= (dy / scale) * (newScale - scale);

    scale = newScale;
    offsetX = currentX;
    offsetY = currentY;

    updateTransform();
}, { passive: false });

// Helper function: distance between two fingers
function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Apply transform to content-wrapper
function updateTransform() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(() => {
        content.style.transform = `translate(calc(-50% + ${currentX}px), ${currentY}px) scale(${scale})`;
    });
}

