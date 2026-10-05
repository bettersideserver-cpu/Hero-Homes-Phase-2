/* Hero Homes — shared tower information panel.
 * EDIT THE SAMPLE DETAILS BELOW. Values are placeholders, not verified areas.
 * Each key is the HTML filename. Keep carpetArea as text; "sq ft" is added by the panel.
 * Tower_A shows towers 9/10; Tower_B shows 11; Tower_C shows 12/12A.
 */
(() => {
  'use strict';

  const DETAILS = {
    'Tower_A.html':      { name: 'Towers 9 & 10',  apartment: '3 & 4 BHK', carpetArea: '1,412 \u2013 2,131' },
    'Tower_B.html':      { name: 'Tower 11',       apartment: '3 BHK',     carpetArea: '1,412 \u2013 2,131' },
    'Tower_C.html':      { name: 'Towers 12 & 12A', apartment: '3 & 4 BHK', carpetArea: '1,412 \u2013 2,131' },
    'Tower-9.html':      { name: 'Tower 9',        apartment: '4 BHK',     carpetArea: '1,412 \u2013 2,131' },
    'Tower-10.html':     { name: 'Tower 10',       apartment: '3 BHK',     carpetArea: '1,412 \u2013 2,131' },
    'Tower-11.html':     { name: 'Tower 11',       apartment: '4 BHK',     carpetArea: '2,595' },
    'Tower-12.html':     { name: 'Tower 12',       apartment: '3 BHK',     carpetArea: '1,412 \u2013 2,131' },
    'Tower-C-12-A.html': { name: 'Tower 12A',      apartment: '4 BHK',     carpetArea: '1,412 \u2013 2,131' }
  };

  function init() {
    const details = DETAILS[decodeURIComponent(location.pathname).split('/').pop()];
    if (!details || document.getElementById('hhTowerDetails')) return;

    const mobile = window.matchMedia('(max-width: 768px)');
    const isFloor = /\/Floor\//i.test(location.pathname);
    const widget = document.createElement('div');
    widget.id = 'hhTowerDetails';
    widget.className = 'hh-tower-details';
    widget.innerHTML = `
      <button class="hh-details-toggle" type="button" aria-label="Show tower details"
        aria-controls="hhTowerDetailsPanel" aria-expanded="false">
        <span class="hh-details-info" aria-hidden="true">i</span>
        <svg class="hh-details-cross" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </button>
      <aside class="hh-details-panel" id="hhTowerDetailsPanel" aria-labelledby="hhTowerDetailsName">
        <p class="hh-details-eyebrow"><span aria-hidden="true"></span>Residence details</p>
        <h2 class="hh-details-name" id="hhTowerDetailsName"></h2>
        <dl class="hh-details-facts">
          <div class="hh-details-fact"><dt>Apartment</dt><dd class="hh-details-apartment"></dd></div>
          <div class="hh-details-fact"><dt>Carpet area</dt><dd><span class="hh-details-area"></span><span class="hh-details-unit">sq ft</span></dd></div>
        </dl>
        <div class="hh-details-footer"><span>HERO HOMES</span><span>PHASE 2</span></div>
      </aside>`;
    widget.querySelector('.hh-details-name').textContent = details.name;
    widget.querySelector('.hh-details-apartment').textContent = details.apartment;
    widget.querySelector('.hh-details-area').textContent = details.carpetArea;

    document.body.classList.add('hh-has-tower-details');
    document.body.classList.toggle('hh-details-floor-page', isFloor);
    document.body.appendChild(widget);

    const toggle = widget.querySelector('.hh-details-toggle');
    const panel = widget.querySelector('.hh-details-panel');
    let open = false;

    function setOpen(value, restoreFocus = false) {
      open = mobile.matches && value;
      widget.classList.toggle('is-open', open);
      document.body.classList.toggle('hh-details-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close tower details' : 'Show tower details');
      panel.setAttribute('aria-hidden', String(mobile.matches && !open));
      panel.inert = mobile.matches && !open;
      if (restoreFocus && mobile.matches) toggle.focus({ preventScroll: true });
    }

    function positionFloorControls() {
      if (isFloor && !mobile.matches) {
        document.body.style.setProperty('--hh-details-controls-top', `${Math.ceil(panel.getBoundingClientRect().bottom) + 14}px`);
      }
    }

    toggle.addEventListener('click', () => setOpen(!open));
    document.addEventListener('pointerdown', event => {
      if (open && !widget.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (open && event.key === 'Escape') {
        event.preventDefault();
        setOpen(false, true);
      }
    });
    // A focused toggle should not remain hidden after rotating to desktop width.
    mobile.addEventListener('change', () => {
      const hadFocus = widget.contains(document.activeElement);
      setOpen(false);
      if (!mobile.matches && hadFocus) {
        panel.tabIndex = -1;
        panel.focus({ preventScroll: true });
      } else if (mobile.matches && hadFocus) toggle.focus({ preventScroll: true });
      positionFloorControls();
    });
    if (isFloor && 'ResizeObserver' in window) new ResizeObserver(positionFloorControls).observe(panel);
    window.addEventListener('resize', positionFloorControls);
    setOpen(false);
    positionFloorControls();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
