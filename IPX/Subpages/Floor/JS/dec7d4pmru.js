const paths = document.querySelectorAll('.Cutout path');
paths.forEach(path => {
  const link = path.getAttribute('data-link');
  const isHoldUnit = path.id === 'Appartment_x5F_1' || path.id === 'Appartment_x5F_2';
  if (!link || isHoldUnit) return;
  path.addEventListener('click', () => {
    path.classList.add('selected');
    setTimeout(() => { window.location.href = link; }, 800);
  });
});
