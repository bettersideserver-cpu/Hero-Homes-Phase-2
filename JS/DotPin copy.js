// JS/DotPin.js
// ================================================================
// INDEPENDENT IMAGE DOTS — EVERYTHING IS CONTROLLED HERE.
// No HTML controls. No SVG element IDs are required.
//
// IMAGE COORDINATES:
// x/y are PERCENTAGES of the visible image area.
// x: 0 = left, 50 = center, 100 = right
// y: 0 = top, 50 = center, 100 = bottom.
//
// EACH DOT CAN HAVE ITS OWN:
//   x, y
//   logo src
//   logo scale
//   logo offsetX / offsetY
//   dot size
//   dot color
//   dot border color / width
//   pulse on/off
//   link
//   selectedSvg src / width / offsetX / offsetY
//
// Every dot is ready to show a selected SVG on click.
// To ADD a dot: copy one object in pins[]
// To DELETE a dot: delete its object
// To MOVE a dot: change x/y
// To CHANGE its logo: change logo.src
// ================================================================
(function () {
    "use strict";


    // Embedded site-outline SVG. Add/edit named paths in Map-01.svg and keep the
    // matching pathId on each dot's selectedSvg configuration.
    // Selected SVG source — replaced with the latest Eldeco SVG.
    const SELECTED_SVG_SOURCE = "<svg xmlns=\"http://www.w3.org/2000/svg\" xml:space=\"preserve\" id=\"Layer_1\" x=\"0\" y=\"0\" viewBox=\"0 0 8192 4176\"><style>.st0{fill:none;stroke:red;stroke-width:14;stroke-miterlimit:10}</style><path id=\"Ananta_Enclave\" d=\"M1021.5 1986.5 1096 1798l1096 3 28.5-74.5\" class=\"st0\"/><path id=\"Elgin\" d=\"m4690 1779-2498 22-1096-3-121 284\" class=\"st0\"/><path id=\"DPS_School\" d=\"m4579 1383 432 391-3915 24-118 296\" class=\"st0\"/><path id=\"Sri_Ram_Public_School\" d=\"m4961 619 160 682-149 460-3873 33-120.3 294\" class=\"st0\"/><path id=\"Sunveiw\" d=\"m5954 3568 82-243 135-240 368-540 154-262c-514.5-349.6-1087.5-523.9-1725-505l-3882 44-120 286\" class=\"st0\"/></svg>";

    const PATH_ID_BY_PIN = {
        "Ananta Enclave": "Ananta_Enclave",
        "Elgin Cafe": "Elgin",
        "DPS School": "DPS_School",
        "Sri Ram Public School": "Sri_Ram_Public_School",
        "Sunview Enclave": "Sunveiw"
    };

    // ================================================================
    // GLOBAL SELECTED-SVG CONTROLS — EDIT ONCE FOR ALL DOTS
    // ================================================================
    const SELECTED_SVG_GLOBAL = {
        // Line/path thickness for every selected SVG
        width: 8,
        // Path color for every selected SVG
        color: "red",
        // Overall opacity for every selected SVG
        opacity: 1
    };

    const CONFIG = {
        imageSelector: "#mainImage",
        layerSelector: "#dotPinLayer",

        // Default values. A dot can override any of these individually.
        defaults: {
            logo: {
                src: "dot-logo.svg",
                scale: 1,
                offsetX: 0,
                offsetY: -12
            },
            text: {
                content: "Cm Infinia",
                fontSize: 14,
                fontWeight: "600",
                color: "#ffffff",
                offsetX: 0,
                offsetY: 0,
                gap: 6
            },
            dot: {
                size: 15,
                color: "#ff6a00",
                borderColor: "rgba(255,255,255,.95)",
                borderWidth: 2,
                pulse: true
            }
        },

        // ============================================================
        // EDIT YOUR DOTS HERE
        // ============================================================
        pins: [
           
           
            {
                id: "Elgin Cafe",
                x: 56,
                y: 44,

                // SVG shown when this dot is clicked. Global SVG width/color are controlled above.
                selectedSvg: {
                    pathId: "Elgin",
                    width: 100,
                    offsetX: 0,
                    offsetY: 0
                },

                logo: {
                    src: "asset/companylogo/eligen-cafe.jpg",
                    scale: 1.2,
                    offsetX: 0,
                    offsetY: 60
                },

                text: {

                    content: "Elgin Cafe",

                    fontSize: 14,

                    fontWeight: "600",

                    color: "#ffffff",

                    offsetX: 0,

                    offsetY: -20,

                    gap: 6

                },

                dot: {
                    size: 15,
                    color: "#ff6a00",
                    borderColor: "rgba(255,255,255,.95)",
                    borderWidth: 2,
                    pulse: true
                },
                info: {
                    name: "Elgin Cafe",
                    distance: "500 m",
                    time: "1"
                },

                // Optional. Remove or leave empty if this dot should not navigate.
                link: ""
            },
  
             
            {
                id: "Sunview Enclave",
                x: 70,
                y: 88,

                // SVG shown when this dot is clicked. Global SVG width/color are controlled above.
                selectedSvg: {
                    pathId: "Sunveiw",
                    width: 100,
                    offsetX: 0,
                    offsetY: 0
                },

                logo: {
                    src: "asset/companylogo/SunView.png",
                    scale: 2,
                    offsetX: 0,
                    offsetY: -60
                },

                text: {

                    content: "Sunview Enclave",

                    fontSize: 14,

                    fontWeight: "600",

                    color: "#ffffff",

                    offsetX: 0,

                    offsetY: -90,

                    gap: 6

                },

                dot: {
                    size: 15,
                    color: "#ff6a00",
                    borderColor: "rgba(255,255,255,.95)",
                    borderWidth: 2,
                    pulse: true
                },
                info: {
                    name: "Sunview Enclave",
                    distance: "500 m",
                    time: "1"
                },

                // Optional. Remove or leave empty if this dot should not navigate.
                link: ""
            },

       {
                id: "DPS School",
                x: 57,
                y: 30,

                // SVG shown when this dot is clicked. Global SVG width/color are controlled above.
                selectedSvg: {
                    pathId: "DPS_School",
                    width: 100,
                    offsetX: 0,
                    offsetY: 0
                },

                logo: {
                    src: "asset/companylogo/delhi-public.jpg",
                    scale: 1.1,
                    offsetX: 0,
                    offsetY: -65
                },

                text: {

                    content: "DPS School",

                    fontSize: 14,

                    fontWeight: "600",

                    color: "#ffffff",

                    offsetX: 0,

                    offsetY: -60,

                    gap: 6

                },

                dot: {
                    size: 15,
                    color: "#ff6a00",
                    borderColor: "rgba(255,255,255,.95)",
                    borderWidth: 2,
                    pulse: true
                },
                info: {
                    name: "DPS School",
                    distance: "500 m",
                    time: "1"
                },

                // Optional. Remove or leave empty if this dot should not navigate.
                link: ""
            },

             {
                id: "Sri Ram Public School",
                x: 59,
                y: 15,

                // SVG shown when this dot is clicked. Global SVG width/color are controlled above.
                selectedSvg: {
                    pathId: "Sri_Ram_Public_School",
                    width: 100,
                    offsetX: 0,
                    offsetY: 0
                },

                logo: {
                    src: "asset/companylogo/ShriRamGlobalSchool.png",
                    scale: 1.1,
                    offsetX: 0,
                    offsetY: -50
                },

                text: {

                    content: "Sri Ram Public School",

                    fontSize: 14,

                    fontWeight: "600",

                    color: "#ffffff",

                    offsetX: 0,

                    offsetY: -53,

                    gap: 6

                },

                dot: {
                    size: 15,
                    color: "#ff6a00",
                    borderColor: "rgba(255,255,255,.95)",
                    borderWidth: 2,
                    pulse: true
                },
                info: {
                    name: "Sri Ram Public School",
                    distance: "500 m",
                    time: "1"
                },

                // Optional. Remove or leave empty if this dot should not navigate.
                link: ""
            },

               {
                id: "Ananta Enclave",
                x: 29,
                y: 34,

                // SVG shown when this dot is clicked. Global SVG width/color are controlled above.
                selectedSvg: {
                    pathId: "Ananta_Enclave",
                    width: 100,
                    offsetX: 0,
                    offsetY: 0
                },

                logo: {
                    src: "asset/companylogo/Ananta-enclave.jpg",
                    scale: 2,
                    offsetX: 0,
                    offsetY: -80
                },

                text: {

                    content: "Ananta Enclave",

                    fontSize: 14,

                    fontWeight: "600",

                    color: "#ffffff",

                    offsetX: 0,

                    offsetY: -90,

                    gap: 6

                },

                dot: {
                    size: 15,
                    color: "#ff6a00",
                    borderColor: "rgba(255,255,255,.95)",
                    borderWidth: 2,
                    pulse: true
                },
                info: {
                    name: "Ananta Enclave",
                    distance: "500 m",
                    time: "1"
                },

                // Optional. Remove or leave empty if this dot should not navigate.
                link: ""
            },
            // ========================================================
            // EXAMPLE DOT — copy this format for every new dot
            // ========================================================
            // {
            //     id: "Hospital",
            //     x: 44,
            //     y: 48,
            //
            //     logo: {
            //         src: "hospital-logo.png",
            //         scale: 1.25,
            //         offsetX: 3,
            //         offsetY: -25
            //     },
            //
            //     dot: {
            //         size: 13,
            //         color: "#e53935",
            //         borderColor: "#ffffff",
            //         borderWidth: 2,
            //         pulse: true
            //     },
            //
            //     link: "map/IPX/svg/hospital.html"
            // },
            //
            // {
            //     id: "School",
            //     x: 70,
            //     y: 63,
            //     logo: {
            //         src: "school-logo.svg",
            //         scale: 0.9,
            //         offsetX: -5,
            //         offsetY: -20
            //     },
            //     dot: {
            //         size: 11,
            //         color: "#1976d2",
            //         pulse: false
            //     },
            //     link: ""
            // }
        ]
    };

    // ---------------------------------------------------------------
    // Layout-space geometry.
    //
    // IMPORTANT: this deliberately uses offsetWidth/offsetHeight/offsetLeft/
    // offsetTop instead of getBoundingClientRect().
    //
    // getBoundingClientRect() returns the SCREEN-SPACE axis-aligned bounding
    // box, so as soon as an ancestor is rotated (see JS/MapRotate.js, which
    // rotates the whole map 90deg on mobile portrait) it reports swapped
    // width/height and every pin lands in the wrong place.
    //
    // offset* values are pre-transform layout values, so they are identical
    // whether the map is rotated or not. Pins stay glued to the image.
    // ---------------------------------------------------------------
    function getImageBox(img, wrapper) {
        const naturalW = img.naturalWidth || Number(img.getAttribute("width")) || 4096;
        const naturalH = img.naturalHeight || Number(img.getAttribute("height")) || 2286;
        const aspect = naturalW / naturalH;

        // The img box in layout pixels (its own offsetParent is .image-wrapper,
        // which is a positioned element, so offsetLeft/Top are relative to it).
        const imgW = img.offsetWidth || wrapper.clientWidth;
        const imgH = img.offsetHeight || wrapper.clientHeight;

        let visibleW = imgW;
        let visibleH = imgH;

        // Handles contain-style image fitting so coordinates remain attached to the image.
        if (imgW / imgH > aspect) {
            visibleH = imgH;
            visibleW = visibleH * aspect;
        } else {
            visibleW = imgW;
            visibleH = visibleW / aspect;
        }

        return {
            left: img.offsetLeft + (imgW - visibleW) / 2,
            top: img.offsetTop + (imgH - visibleH) / 2,
            width: visibleW,
            height: visibleH,
            naturalW,
            naturalH
        };
    }

    // Wrapper size in layout pixels (again: rotation-proof, unlike getBoundingClientRect).
    function getWrapperSize(wrapper) {
        return {
            width: wrapper.offsetWidth || wrapper.clientWidth || 1,
            height: wrapper.offsetHeight || wrapper.clientHeight || 1
        };
    }

    function positionPins() {
        const img = document.querySelector(CONFIG.imageSelector);
        const layer = document.querySelector(CONFIG.layerSelector);
        const wrapper = img ? img.closest(".image-wrapper") : null;
        if (!img || !layer || !wrapper) return;

        const box = getImageBox(img, wrapper);
        const wrapperSize = getWrapperSize(wrapper);

        positionSelectedOverlay();

        CONFIG.pins.forEach((pinConfig) => {
            const pin = layer.querySelector(`[data-pin-id="${CSS.escape(String(pinConfig.id))}"]`);
            if (!pin) return;

            const x = Number(pinConfig.x);
            const y = Number(pinConfig.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;

            const xPct = Math.max(0, Math.min(100, x));
            const yPct = Math.max(0, Math.min(100, y));

            const xPx = box.left + (xPct / 100) * box.width;
            const yPx = box.top + (yPct / 100) * box.height;

            pin.style.left = `${((xPx / wrapperSize.width) * 100).toFixed(5)}%`;
            pin.style.top = `${((yPx / wrapperSize.height) * 100).toFixed(5)}%`;
        });
    }

    function numberOr(value, fallback) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    let selectedOverlay = null;

    function ensureSelectedOverlay() {
        const layer = document.querySelector(CONFIG.layerSelector);
        if (!layer) return null;

        if (selectedOverlay) return selectedOverlay;

        const wrapper = document.querySelector(CONFIG.imageSelector)?.closest(".image-wrapper");
        if (!wrapper) return null;

        const holder = document.createElement("div");
        holder.className = "dot-pin-selected-overlay";
        holder.setAttribute("aria-hidden", "true");
        holder.style.display = "none";
        holder.style.position = "absolute";
        holder.style.left = "0";
        holder.style.top = "0";
        holder.style.width = "0px";
        holder.style.height = "0px";
        holder.style.zIndex = "999";
        holder.style.pointerEvents = "none";
        holder.style.overflow = "visible";

        // Use the latest Eldeco SVG as the selected overlay source.
        const sourceText = SELECTED_SVG_SOURCE;
        const sourceDoc = new DOMParser().parseFromString(sourceText, "image/svg+xml");
        const sourceSvg = sourceDoc.documentElement;
        const svgEl = document.importNode(sourceSvg, true);
        svgEl.removeAttribute("id");
        svgEl.classList.add("dot-pin-selected-overlay__svg");
        svgEl.setAttribute("viewBox", "0 0 8192 4176");
        svgEl.setAttribute("preserveAspectRatio", "none");
        svgEl.style.display = "block";
        svgEl.style.position = "absolute";
        svgEl.style.left = "0";
        svgEl.style.top = "0";
        svgEl.style.width = "100%";
        svgEl.style.height = "100%";
        svgEl.style.overflow = "visible";
        svgEl.style.pointerEvents = "none";

        holder.appendChild(svgEl);
        wrapper.appendChild(holder);
        selectedOverlay = holder;

        holder._svg = svgEl;
        holder._paths = Array.from(svgEl.querySelectorAll("path"));

        return holder;
    }

    function showSelectedPath(pathId, settings) {
        window.__dotPinPendingPathId = pathId;

        const holder = ensureSelectedOverlay();
        if (!holder) return;

        holder._paths.forEach((path) => {
            path.style.display = path.id === pathId ? "" : "none";
        });

        if (!pathId) {
            holder.style.display = "none";
            return;
        }

        const target = holder._paths.find((path) => path.id === pathId);
        if (!target) {
            holder.style.display = "none";
            return;
        }

        // Global appearance controls apply to EVERY selected SVG/path.
        // Individual dot settings may still control offset/other positioning.
        const opacity = Math.max(0, Math.min(1, numberOr(
            SELECTED_SVG_GLOBAL.opacity,
            settings && settings.opacity != null ? settings.opacity : 1
        )));
        const strokeWidth = Math.max(0, numberOr(SELECTED_SVG_GLOBAL.width, 18));
        const strokeColor = SELECTED_SVG_GLOBAL.color || "#000000";

        holder._paths.forEach((path) => {
            path.style.opacity = String(opacity);
            path.style.stroke = strokeColor;
            path.style.strokeWidth = `${strokeWidth}px`;
            path.style.strokeLinecap = "round";
            path.style.strokeLinejoin = "round";
            path.style.fill = "none";
        });

        holder.style.setProperty("--selected-svg-offset-x", `${numberOr(settings?.offsetX, 0)}px`);
        holder.style.setProperty("--selected-svg-offset-y", `${numberOr(settings?.offsetY, 0)}px`);
        holder.style.display = "block";
    }

    function hideSelectedPlace() {
        if (selectedOverlay) {
            selectedOverlay.style.display = "none";
        }

        const layer = document.querySelector(CONFIG.layerSelector);
        if (layer) {
            layer.querySelectorAll(".dot-pin.is-selected").forEach((p) => {
                p.classList.remove("is-selected");
            });
        }

        const card = document.getElementById("dotPinInfoCard");
        if (card) {
            card.classList.remove("is-visible");
        }
    }

    function positionSelectedOverlay() {
        const img = document.querySelector(CONFIG.imageSelector);
        const layer = document.querySelector(CONFIG.layerSelector);
        const wrapper = img ? img.closest(".image-wrapper") : null;
        if (!img || !layer || !wrapper || !selectedOverlay) return;

        const box = getImageBox(img, wrapper);

        selectedOverlay.style.left = `${box.left}px`;
        selectedOverlay.style.top = `${box.top}px`;
        selectedOverlay.style.width = `${box.width}px`;
        selectedOverlay.style.height = `${box.height}px`;
    }

    function createPin(pinConfig, index) {
        const layer = document.querySelector(CONFIG.layerSelector);
        if (!layer) return;

        const logoSettings = {
            ...CONFIG.defaults.logo,
            ...(pinConfig.logo || {})
        };
        const dotSettings = {
            ...CONFIG.defaults.dot,
            ...(pinConfig.dot || {})
        };

        const pin = document.createElement("div");
        pin.className = "dot-pin";
        pin.dataset.pinId = String(pinConfig.id);
        pin.style.zIndex = String(20 + index);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "dot-pin__button";
        button.setAttribute("aria-label", String(pinConfig.id));
        button.title = String(pinConfig.id);

        // Per-dot logo controls.
        const logo = document.createElement("img");
        logo.className = "dot-pin__logo";
        logo.src = logoSettings.src || CONFIG.defaults.logo.src;
        logo.alt = "";
        logo.draggable = false;
        // The logo itself is clickable too. This is important when the logo is
        // visually offset from the dot; its own pixels should still select the pin.
        logo.style.pointerEvents = "auto";
        logo.style.cursor = "pointer";
        logo.style.setProperty("--logo-scale", String(numberOr(logoSettings.scale, 1)));
        button.style.setProperty("--logo-scale", String(numberOr(logoSettings.scale, 1)));
        logo.style.setProperty("--logo-offset-x", `${numberOr(logoSettings.offsetX, 0)}px`);
        logo.style.setProperty("--logo-offset-y", `${numberOr(logoSettings.offsetY, -12)}px`);

        // Per-dot text controls. Text is positioned below the rendered logo.
        const textSettings = {
            ...CONFIG.defaults.text,
            ...(pinConfig.text || {})
        };

        const label = document.createElement("span");
        label.className = "dot-pin__text";
        label.textContent = textSettings.content || String(pinConfig.id);
        label.style.setProperty("--text-font-size", `${Math.max(1, numberOr(textSettings.fontSize, 14))}px`);
        label.style.setProperty("--text-font-weight", String(textSettings.fontWeight || "600"));
        label.style.setProperty("--text-color", textSettings.color || "#ffffff");
        label.style.setProperty("--text-offset-x", `${numberOr(textSettings.offsetX, 0)}px`);
        label.style.setProperty("--text-offset-y", `${numberOr(textSettings.offsetY, 0)}px`);
        label.style.setProperty("--text-gap", `${Math.max(0, numberOr(textSettings.gap, 6))}px`);

        // Per-dot dot controls.
        const dot = document.createElement("span");
        dot.className = "dot-pin__dot";
        dot.setAttribute("aria-hidden", "true");
        dot.style.setProperty("--dot-size", `${Math.max(1, numberOr(dotSettings.size, 15))}px`);
        dot.style.setProperty("--dot-color", dotSettings.color || "#ff6a00");
        dot.style.setProperty("--dot-border-color", dotSettings.borderColor || "rgba(255,255,255,.95)");
        dot.style.setProperty("--dot-border-width", `${Math.max(0, numberOr(dotSettings.borderWidth, 2))}px`);

        if (dotSettings.pulse === false) {
            button.classList.add("dot-pin--no-pulse");
        }

        button.appendChild(logo);
        button.appendChild(label);
        button.appendChild(dot);
        pin.appendChild(button);

        // The selected SVG is a named path from Map-01.svg. The complete SVG
        // is rendered in one responsive overlay fitted to the visible map image.
        const selectedSvgConfig = pinConfig.selectedSvg;
        const selectedPathId = selectedSvgConfig && selectedSvgConfig.pathId
            ? selectedSvgConfig.pathId
            : PATH_ID_BY_PIN[String(pinConfig.id)];

        layer.appendChild(pin);

        // One selection handler is shared by BOTH the dot and the logo.
        // This guarantees that clicking the visible logo selects the same SVG.
        const selectThisPin = (event) => {
            event.preventDefault();
            event.stopPropagation();

            // Selecting a dot/logo always replaces the previous selection.
            layer.querySelectorAll(".dot-pin.is-selected").forEach((p) => {
                p.classList.remove("is-selected");
            });

            if (window.showDotPinInfo) {
                const info = pinConfig.info || {
                    name: String(pinConfig.id),
                    distance: "—",
                    time: "—"
                };
                window.showDotPinInfo(info);
            }

            showSelectedPath(selectedPathId, selectedSvgConfig);
            pin.classList.add("is-selected");
        };

        button.addEventListener("click", selectThisPin);
        logo.addEventListener("click", selectThisPin);

        if (pinConfig.link) {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                window.location.href = pinConfig.link;
            });
        }
    }

    function ensureDotPinInfoCard() {
        let card = document.getElementById("dotPinInfoCard");
        if (card) return card;

        card = document.createElement("aside");
        card.id = "dotPinInfoCard";
        card.className = "dot-pin-info-card";
        card.setAttribute("aria-live", "polite");
        card.innerHTML = `
            <button type="button" class="dot-pin-info-card__close" aria-label="Close RCM Farm information">×</button>
            <div class="dot-pin-info-card__eyebrow">NEARBY PLACE</div>
            <div class="dot-pin-info-card__name"></div>
            <div class="dot-pin-info-card__details">
                <div class="dot-pin-info-card__detail">
                    <span class="dot-pin-info-card__label">DISTANCE</span>
                    <strong class="dot-pin-info-card__distance"></strong>
                </div>
                <div class="dot-pin-info-card__detail">
                    <span class="dot-pin-info-card__label">TIME</span>
                    <strong class="dot-pin-info-card__time"></strong>
                </div>
            </div>
        `;
        document.body.appendChild(card);

        const close = card.querySelector(".dot-pin-info-card__close");
        close.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            hideSelectedPlace();
        });

        return card;
    }

    // CONFIG stores time as a bare number ("1"), which rendered as an
    // unitless "TIME 1" in the card. Append the unit when the value is just a
    // number, and leave anything already carrying a unit ("5 min", "1 hr")
    // untouched so the config stays free-form.
    function formatTime(value) {
        if (value == null || value === "") return "—";
        const text = String(value).trim();
        if (!text) return "—";
        return /^[\d.]+$/.test(text) ? `${text} min` : text;
    }

    window.showDotPinInfo = function (info) {
        const card = ensureDotPinInfoCard();
        card.querySelector(".dot-pin-info-card__name").textContent = info.name || "Place";
        card.querySelector(".dot-pin-info-card__distance").textContent = info.distance || "—";
        card.querySelector(".dot-pin-info-card__time").textContent = formatTime(info.time);
        card.classList.add("is-visible");
    };

    function init() {
        const img = document.querySelector(CONFIG.imageSelector);
        const layer = document.querySelector(CONFIG.layerSelector);
        if (!img || !layer) return;

        layer.innerHTML = "";
        CONFIG.pins.forEach(createPin);
        ensureSelectedOverlay();
        ensureDotPinInfoCard();

        // Clicking anywhere outside a dot/logo closes the active SVG and panel.
        // The logo is inside the dot button, so clicking either the dot OR its logo
        // is treated as a selection and will not close it.
        document.addEventListener("click", (event) => {
            const target = event.target;
            if (target && target.closest && target.closest(".dot-pin__button")) return;
            if (target && target.closest && target.closest("#dotPinInfoCard")) return;
            hideSelectedPlace();
        });

        const reposition = () => requestAnimationFrame(positionPins);
        if (img.complete) reposition();
        else img.addEventListener("load", reposition, { once: true });

        window.addEventListener("resize", reposition, { passive: true });
        window.addEventListener("orientationchange", reposition, { passive: true });

        if (window.ResizeObserver) {
            const observer = new ResizeObserver(reposition);
            const wrapper = img.closest(".image-wrapper");
            if (wrapper) observer.observe(wrapper);
        }

        setTimeout(reposition, 150);
        setTimeout(reposition, 600);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
