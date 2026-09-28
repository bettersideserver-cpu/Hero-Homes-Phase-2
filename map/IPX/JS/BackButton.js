document.addEventListener("DOMContentLoaded", () => {
  const closeCard = document.getElementById("closeCard");
  if (closeCard) {
    closeCard.addEventListener("click", () => {
      history.back();
    });
  }
});
