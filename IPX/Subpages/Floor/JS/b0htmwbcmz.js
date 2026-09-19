// JS/b0htmwbcmz.js
(function () {
    function initTowerPins(opts) {
        const svg = document.querySelector(opts.svgSelector || '.Cutout svg');
        const layer = document.querySelector(opts.layerSelector || '#hsLayer');
        if (!svg || !layer) return;

        // purge previous pins so re-inits don’t duplicate
        layer.querySelectorAll('.tower-pin').forEach(n => n.remove());

        const [VB_W, VB_H] = opts.viewBox || [3840, 5830];
        const paths = svg.querySelectorAll('path');
        const posMap = (opts.positions || {});

        paths.forEach(path => {
            const id = path.id || path.getAttribute('data-name') || 'Pin';
            const label = (path.getAttribute('data-name') || id).replaceAll('_', ' ');

            // Manual position override if provided: { left:%, top:% }
            let leftPct, topPct;
            if (posMap[id]) {
                leftPct = posMap[id].left;
                topPct = posMap[id].top;
            } else {
                // fallback: center of path bbox
                const b = path.getBBox();
                leftPct = ((b.x + b.width / 2) / VB_W) * 100;
                topPct = ((b.y + b.height / 2) / VB_H) * 100;
            }

            // Build pin
            const pin = document.createElement('div');
            pin.className = 'tower-pin';
            pin.style.left = leftPct + '%';
            pin.style.top = topPct + '%';

            const stack = document.createElement('div');
            stack.className = 'tower-pin__stack';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tower-pin__btn';
            btn.title = label;
            btn.innerHTML = '<span class="tower-pin__dot"></span>';

            const name = document.createElement('div');
            name.className = 'tower-pin__label';
            name.textContent = label;

            // Click pin = click path (reuses your modal logic)
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                path.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            });

            stack.appendChild(btn);
            stack.appendChild(name);
            pin.appendChild(stack);
            layer.appendChild(pin);
        });
    }

    window.initTowerPins = initTowerPins;
})();
