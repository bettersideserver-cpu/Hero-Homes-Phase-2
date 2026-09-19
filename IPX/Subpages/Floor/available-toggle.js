/* Hero Homes — custom floor dropdown + AVAILABLE ON/OFF + OFF-SVG navigation */
(function () {
  'use strict';

  const towerMap = {
    'Tower-9.html': '9',
    'Tower-10.html': '10',
    'Tower-11.html': '11',
    'Tower-12.html': '12',
    'Tower-C-12-A.html': '12A'
  };

  const file = location.pathname.split('/').pop();
  const tower = towerMap[file] || '';
  const params = new URLSearchParams(location.search);

  const currentFloor = Math.max(
    1,
    Math.min(
      32,
      parseInt(
        params.get('floor') ||
        sessionStorage.getItem('selectedFloor') ||
        '1',
        10
      ) || 1
    )
  );

  function buildControls() {
    if (document.getElementById('hhFloorControls')) return;

    const controls = document.createElement('div');
    controls.id = 'hhFloorControls';

    /* Custom floor dropdown */
    const dropdown = document.createElement('div');
    dropdown.id = 'hhFloorDropdown';

    const floorButton = document.createElement('button');
    floorButton.id = 'hhFloorSelect';
    floorButton.type = 'button';
    floorButton.setAttribute('aria-haspopup', 'listbox');
    floorButton.setAttribute('aria-expanded', 'false');

    const floorLabel = document.createElement('span');
    floorLabel.id = 'hhFloorLabel';
    floorLabel.textContent = 'FLOOR ' + String(currentFloor).padStart(2, '0');

    const arrow = document.createElement('span');
    arrow.id = 'hhFloorArrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '⌄';

    floorButton.append(floorLabel, arrow);

    const menu = document.createElement('div');
    menu.id = 'hhFloorMenu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'Select floor');
    menu.hidden = true;

    for (let i = 1; i <= 32; i++) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'hhFloorOption';
      option.setAttribute('role', 'option');
      option.dataset.floor = String(i);
      option.textContent = 'FLOOR ' + String(i).padStart(2, '0');

      if (i === currentFloor) {
        option.classList.add('is-selected');
        option.setAttribute('aria-selected', 'true');
      } else {
        option.setAttribute('aria-selected', 'false');
      }

      option.addEventListener('click', () => goFloor(i));
      menu.appendChild(option);
    }

    floorButton.addEventListener('click', () => {
      const opening = menu.hidden;
      menu.hidden = !opening;
      floorButton.setAttribute('aria-expanded', String(opening));
    });

    document.addEventListener('click', (event) => {
      if (!dropdown.contains(event.target)) {
        menu.hidden = true;
        floorButton.setAttribute('aria-expanded', 'false');
      }
    });

    dropdown.append(floorButton, menu);

    /* AVAILABLE switch — starts OFF */
    const row = document.createElement('div');
    row.id = 'hhAvailableRow';

    const label = document.createElement('span');
    label.id = 'hhAvailableLabel';
    label.textContent = 'AVAILABLE';

    const sw = document.createElement('label');
    sw.id = 'hhAvailableSwitch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'hhAvailableToggle';
    input.checked = false;

    const slider = document.createElement('span');
    slider.id = 'hhAvailableSlider';

    sw.append(input, slider);
    row.append(label, sw);

    controls.append(dropdown, row);
    document.body.appendChild(controls);

    input.addEventListener('change', () => setMode(input.checked));

    /* Ensure availability is OFF on page open */
    setMode(false);
  }

  function goFloor(f) {
    const floor = String(parseInt(f, 10) || 1);

    sessionStorage.setItem('selectedFloor', floor);
    sessionStorage.setItem('heroHomesFloor', floor);

    const u = new URL(location.href);
    u.searchParams.set('floor', floor);

    if (tower) u.searchParams.set('tower', tower);

    location.href = u.href;
  }

  function setMode(on) {
    const apartments = document.querySelectorAll('.Cutout path[data-link]');

    apartments.forEach((path) => {
      path.style.setProperty('display', on ? '' : 'none', 'important');
      path.style.setProperty(
        'visibility',
        on ? 'visible' : 'hidden',
        'important'
      );
    });

    const off = document.getElementById('availableOffLayer');

    if (off) {
      off.style.setProperty('display', on ? 'none' : 'block', 'important');
    }
  }

  function unitFromId(id) {
    const match = String(id || '').trim().match(/^(?:_)?(1|2)\b/);
    return match ? match[1] : null;
  }

  function installOffNavigation() {
    const off = document.getElementById('availableOffLayer');
    if (!off) return;

    off.querySelectorAll(
      'path, polygon, rect, circle, ellipse, polyline'
    ).forEach((shape) => {
      if (shape.dataset.hhNavInstalled === '1') return;
      shape.dataset.hhNavInstalled = '1';

      shape.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        const unit = unitFromId(shape.id);
        if (!unit) return;

        sessionStorage.setItem('selectedTower', tower);
        sessionStorage.setItem('heroHomesTower', tower);
        sessionStorage.setItem('selectedFloor', String(currentFloor));
        sessionStorage.setItem('heroHomesFloor', String(currentFloor));
        sessionStorage.setItem('selectedUnit', unit);

        const target = document.querySelector(
          '.Cutout path[data-link][id="Appartment ' + unit + '"]'
        );

        const base = target && target.getAttribute('data-link');
        if (!base) return;

        const u = new URL(base, location.href);
        u.searchParams.set('tower', tower);
        u.searchParams.set('floor', String(currentFloor));
        u.searchParams.set('unit', unit);

        location.href = u.href;
      });
    });
  }

  function init() {
    buildControls();
}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
/* Show room name while hovering over an OFF-layer SVG shape */
(function () {
    function initRoomTooltips() {
        const offLayer = document.getElementById('availableOffLayer');
        if (!offLayer) return;

        let tooltip = document.getElementById('hhRoomTooltip');

        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'hhRoomTooltip';
            tooltip.setAttribute('role', 'tooltip');
            document.body.appendChild(tooltip);
        }

        offLayer.querySelectorAll(
            'path, polygon, rect, circle, ellipse, polyline'
        ).forEach(function (shape) {
            if (shape.dataset.hhTooltipInstalled === '1') return;
            shape.dataset.hhTooltipInstalled = '1';

            const roomName = (shape.id || '')
                .trim()
                .replace(/^\d+\s+/, '')
                .replace(/_/g, ' ')
                .trim();

            if (!roomName) return;

            shape.addEventListener('pointerenter', function (event) {
                tooltip.textContent = roomName;
                tooltip.style.display = 'block';
                moveTooltip(event);
            });

            shape.addEventListener('pointermove', moveTooltip);

            shape.addEventListener('pointerleave', function () {
                tooltip.style.display = 'none';
            });
        });

        function moveTooltip(event) {
            if (tooltip.style.display === 'none') return;

            const gap = 14;
            let left = event.clientX + gap;
            let top = event.clientY + gap;

            if (left + tooltip.offsetWidth > window.innerWidth - 8) {
                left = event.clientX - tooltip.offsetWidth - gap;
            }

            if (top + tooltip.offsetHeight > window.innerHeight - 8) {
                top = event.clientY - tooltip.offsetHeight - gap;
            }

            tooltip.style.left = Math.max(8, left) + 'px';
            tooltip.style.top = Math.max(8, top) + 'px';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRoomTooltips);
    } else {
        initRoomTooltips();
    }
})();