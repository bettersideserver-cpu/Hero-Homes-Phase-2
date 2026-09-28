// const paths = document.querySelectorAll('.Cutout path');

// paths.forEach(path => {
//     const link = path.getAttribute('data-link');

//     if (link) {
//         path.addEventListener('click', () => {

//             // optional feedback
//             // path.style.opacity = "0.6";

//             setTimeout(() => {
//                 window.location.href = link;
//             }, 800);
//         });
//     }
// });

// paths.forEach(path => {
//     const link = path.getAttribute('data-link');

//     if (link) {
//         path.addEventListener('click', () => {

//             // remove all previous
//             paths.forEach(p => p.classList.remove('selected'));

//             // add selected
//             path.classList.add('selected');

//             // 🔒 disable hover effect after click
//             paths.forEach(p => p.style.pointerEvents = "none");

//             setTimeout(() => {
//                 window.location.href = link;
//             }, 800);
//         });
//     }
// });



const paths = document.querySelectorAll('.Cutout path');

paths.forEach(path => {

    const link = path.getAttribute('data-link');

    if (!link) return;

    path.addEventListener('click', () => {

        const floorNumber =
            path.id.replace('Floor_', '').padStart(2, '0');

        sessionStorage.setItem(
            "selectedFloor",
            floorNumber
        );

        paths.forEach(p => p.classList.remove('selected'));
        path.classList.add('selected');

        paths.forEach(p => p.style.pointerEvents = "none");

        setTimeout(() => {
            window.location.href = link;
        }, 800);
    });

});