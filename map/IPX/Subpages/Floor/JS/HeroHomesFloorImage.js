/* Select the nearest floor render before ky0nwmerow.js loads the full JPG. */
(function () {
    'use strict';

    const TOWER_FOLDERS = {
        'Tower-9.html': 'Floor_9',
        'Tower-10.html': 'Floor_10',
        'Tower-11.html': 'Floor_11',
        'Tower-12.html': 'Floor_12',
        'Tower-C-12-A.html': 'Floor_12A'
    };
    // Available Floor_<number>.webp / .jpg pairs in each tower's image folder.
    const AVAILABLE_FLOORS = [1, 5, 10, 15, 20, 25, 30];
    const img = document.getElementById('mainImage');
    const folder = TOWER_FOLDERS[location.pathname.split('/').pop()];
    if (!img || !folder) return;

    const params = new URLSearchParams(location.search);
    const requested = Number(params.get('floor') || sessionStorage.getItem('selectedFloor') ||
        sessionStorage.getItem('heroHomesFloor') || 1);
    const selectedFloor = Number.isFinite(requested) && requested >= 1 ? requested : 1;
    // The lower floor wins an equal-distance tie because the list is ascending.
    const imageFloor = AVAILABLE_FLOORS.reduce((nearest, floor) =>
        Math.abs(floor - selectedFloor) < Math.abs(nearest - selectedFloor) ? floor : nearest,
        AVAILABLE_FLOORS[0]);
    const base = `images/${folder}/Floor_${imageFloor}`;

    // Only the image uses the nearest render; navigation keeps the actual floor.
    img.dataset.imageFloor = String(imageFloor);
    img.dataset.full = `${base}.jpg`;
    img.src = `${base}.webp`;
})();
