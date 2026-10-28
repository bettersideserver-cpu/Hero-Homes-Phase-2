/* Residence types and sizes use the existing tower-detail values approved for this selector. */
(() => {
    'use strict';
    const TYPES = {
        '3': { label: '3 BHK', area: '1,412 sq ft', towers: ['10', '12'] },
        '4': { label: '4 BHK', area: '2,131 – 2,595 sq ft', towers: ['9', '11', '12A'] }
    };
    const TOWER_AREAS = { '9': '2,131', '10': '1,412', '11': '2,595', '12': '1,412', '12A': '2,131' };
    const scriptBase = new URL('../', document.currentScript.src);

    function init() {
        if (document.getElementById('hhResidenceSelector') || document.getElementById('hhSelectedTower')) return;
        const params = new URLSearchParams(location.search);
        const paths = [...document.querySelectorAll('.Cutout path[data-name][data-link]')];
        const towerPaths = paths.filter(path => /^Tower_(9|10|11|12|12A)$/.test(path.dataset.name));
        const floorPaths = paths.filter(path => /^(?:(9|10|11|12|12A)_)?Floor_\d+$/.test(path.dataset.name));
        const floorTower = path => path.dataset.name.match(/^(9|10|11|12|12A)_Floor_/)?.[1]
            || path.dataset.link.match(/Tower-(?:C-)?(9|10|11|12|12A)\.html(?:$|[?#])/)?.[1];
        if (!towerPaths.length && !floorPaths.length) return;
        // History navigation can restore focus to the SVG that opened the next page.
        // Clear that stale focus so returning does not draw a box around the tower.
        window.addEventListener('pageshow', () => {
            const focused = document.activeElement;
            if (paths.includes(focused)) focused.blur();
        });
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = new URL('JS/CSS/HeroHomesResidenceSelector.css', scriptBase).href;
        document.head.appendChild(css);

        // Paired tower views retain the exact tower chosen on the project view.
        if (!towerPaths.length) {
            const selectedTower = params.get('tower');
            const matching = floorPaths.filter(path => floorTower(path) === selectedTower);
            if (!selectedTower || !matching.length) return;
            floorPaths.forEach(path => path.classList.toggle('hh-residence-match', matching.includes(path)));
            const banner = document.createElement('div');
            banner.id = 'hhSelectedTower';
            const label = document.createElement('span');
            label.textContent = `Tower ${selectedTower} selected · Choose a floor`;
            const clear = document.createElement('button');
            clear.type = 'button';
            clear.textContent = 'Show all';
            clear.addEventListener('click', () => {
                floorPaths.forEach(path => path.classList.remove('hh-residence-match'));
                const url = new URL(location.href);
                url.searchParams.delete('tower');
                url.searchParams.delete('bhk');
                history.replaceState(null, '', url);
                banner.remove();
            });
            banner.append(label, clear);
            document.body.appendChild(banner);
            return;
        }

        const widget = document.createElement('aside');
        widget.id = 'hhResidenceSelector';
        widget.setAttribute('aria-label', 'Choose a residence type');
        widget.innerHTML = `<button class="hh-residence-toggle" type="button" aria-expanded="false" aria-controls="hhResidencePanel">Find your home <span aria-hidden="true">⌄</span></button>
            <div id="hhResidencePanel"><div class="hh-residence-heading"><span>FIND YOUR HOME</span><button type="button" class="hh-residence-reset">Show all</button></div>
            <div class="hh-residence-options" role="group" aria-label="Apartment type and super area"></div>
            <p class="hh-residence-status" role="status">Select a home type to see its towers.</p><div class="hh-residence-towers" aria-label="Matching towers"></div>
            </div>`;
        document.body.appendChild(widget);
        const options = widget.querySelector('.hh-residence-options');
        const list = widget.querySelector('.hh-residence-towers');
        const status = widget.querySelector('.hh-residence-status');
        const toggle = widget.querySelector('.hh-residence-toggle');
        const panel = widget.querySelector('#hhResidencePanel');
        const mobile = window.matchMedia('(max-width: 768px)');
        let selectedType = null;
        let expanded = false;
        const links = new Map();

        function setExpanded(open) {
            expanded = open;
            panel.hidden = mobile.matches && !expanded;
            toggle.setAttribute('aria-expanded', String(!panel.hidden));
        }
        toggle.addEventListener('click', () => setExpanded(!expanded));
        mobile.addEventListener('change', () => {
            const hadFocus = panel.contains(document.activeElement);
            setExpanded(false);
            if (hadFocus && panel.hidden) toggle.focus();
        });
        widget.addEventListener('keydown', event => {
            if (event.key === 'Escape' && mobile.matches) { setExpanded(false); toggle.focus(); }
        });
        setExpanded(false);

        function setContext(tower) {
            try {
                sessionStorage.setItem('selectedTower', tower);
                sessionStorage.setItem('heroHomesTower', tower);
                for (const key of ['selectedFloor', 'heroHomesFloor', 'selectedUnit', 'heroHomesUnit']) sessionStorage.removeItem(key);
            } catch (_) { /* The URL also carries the exact tower when storage is unavailable. */ }
        }

        function render(type) {
            selectedType = TYPES[type] ? type : null;
            const selected = TYPES[selectedType];
            for (const button of options.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.bhk === selectedType));
            list.replaceChildren();
            links.clear();
            towerPaths.forEach(path => {
                const tower = path.dataset.name.replace('Tower_', '');
                const matches = !selected || selected.towers.includes(tower);
                path.classList.toggle('hh-residence-match', !!selected && matches);
                path.classList.toggle('hh-residence-muted', !matches);
                path.setAttribute('aria-disabled', String(!matches));
                path.setAttribute('tabindex', matches ? '0' : '-1');
                path.setAttribute('role', 'link');
                path.setAttribute('aria-label', `Explore Tower ${tower}`);
                const link = document.createElement('a');
                const url = new URL(path.dataset.link, location.href);
                url.searchParams.set('tower', tower);
                if (selectedType) url.searchParams.set('bhk', selectedType);
                link.href = url.href;
                link.dataset.tower = tower;
                const name = document.createElement('strong');
                name.textContent = `Tower ${tower}`;
                const area = document.createElement('span');
                area.textContent = `${TOWER_AREAS[tower]} sq ft`;
                const arrow = document.createElement('span');
                arrow.className = 'hh-residence-arrow';
                arrow.setAttribute('aria-hidden', 'true');
                arrow.textContent = '→';
                link.append(name, area, arrow);
                link.addEventListener('click', () => setContext(tower));
                links.set(path, link);
                if (selected && matches) list.appendChild(link);
            });
            status.textContent = selected ? `${selected.towers.length} towers highlighted · Select a tower` : 'Select a home type to see its towers.';
            const url = new URL(location.href);
            if (selectedType) url.searchParams.set('bhk', selectedType);
            else url.searchParams.delete('bhk');
            history.replaceState(null, '', url);
        }

        for (const [type, details] of Object.entries(TYPES)) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.bhk = type;
            button.setAttribute('aria-pressed', 'false');
            const name = document.createElement('strong');
            name.textContent = details.label;
            const area = document.createElement('span');
            area.textContent = details.area;
            button.append(name, area);
            button.addEventListener('click', () => render(type));
            options.appendChild(button);
        }
        widget.querySelector('.hh-residence-reset').addEventListener('click', () => render(null));
        towerPaths.forEach(path => {
            // Replace the older delayed group navigation with the exact selected-tower link.
            path.addEventListener('click', event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (path.getAttribute('aria-disabled') !== 'true') links.get(path)?.click();
            }, true);
            path.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); path.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
            });
        });
        window.addEventListener('popstate', () => render(new URLSearchParams(location.search).get('bhk')));
        render(params.get('bhk'));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
