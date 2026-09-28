document.addEventListener("DOMContentLoaded", () => {
      const closeCard = document.getElementById("closeCard");

      if (closeCard) {
        closeCard.addEventListener("click", () => {
          // 🔹 Change this path to wherever you want the button to take you
          window.location.href = "/index.html";
          // Example: "../index.html" or "../Subpages/Tower_A.html"
        });
      }
    });