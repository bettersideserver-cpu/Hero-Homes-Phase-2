// Disable right-click
document.addEventListener("contextmenu", function (e) {
    alert("Don't try right-click!");
    e.preventDefault();
}, false);

// Disable certain keys
document.addEventListener("keydown", function (e) {
    // F12
    if (e.key === "F12") {
        alert("Don't try to inspect element!");
        e.preventDefault();
    }

    // Ctrl+Shift+I (Inspect)
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") {
        alert("Don't try to inspect element!");
        e.preventDefault();
    }

    // Ctrl+U (View source)
    if (e.ctrlKey && e.key.toLowerCase() === "u") {
        alert("Don't try to view source!");
        e.preventDefault();
    }

    // Ctrl+C (Copy)
    if (e.ctrlKey && e.key.toLowerCase() === "c") {
        alert("Don't copy!");
        e.preventDefault();
    }

    // Ctrl+V (Paste)
    if (e.ctrlKey && e.key.toLowerCase() === "v") {
        alert("Don't paste!");
        e.preventDefault();
    }
});
