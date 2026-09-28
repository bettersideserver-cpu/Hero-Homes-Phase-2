(() => {
  const container = document.querySelector('.pan-container');
    const img = document.getElementById('panImage');

    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;

    // To keep smooth transform state
    let currentX = 0;
    let currentY = 0;

    function updateTransform() {
        img.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px))`;
  }

  container.addEventListener('mousedown', e => {
        isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    container.style.cursor = 'grabbing';
  });

  window.addEventListener('mouseup', () => {
        isPanning = false;
    container.style.cursor = 'grab';
  });

  window.addEventListener('mousemove', e => {
    if (!isPanning) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
  });

  // Touch support
  container.addEventListener('touchstart', e => {
        isPanning = true;
    const touch = e.touches[0];
    startX = touch.clientX - translateX;
    startY = touch.clientY - translateY;
  });

  container.addEventListener('touchend', () => (isPanning = false));

  container.addEventListener('touchmove', e => {
    if (!isPanning) return;
    const touch = e.touches[0];
    translateX = touch.clientX - startX;
    translateY = touch.clientY - startY;
    updateTransform();
  });

})();

