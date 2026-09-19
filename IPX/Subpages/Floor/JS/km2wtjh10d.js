const scriptURL = "https://script.google.com/macros/s/AKfycbwJ5q8o6yCZux1zj9avpaDA1ljA-rNxLW66ixwvNNKG9Fa0GhIElzx661d_9TAdY-nI/exec";

const form = document.getElementById("contactForm");
const submitBtn = form.querySelector(".send-btn");
const overlay = document.getElementById("thankYouOverlay");
const closeBtn = document.getElementById("closeThankYou");

function setLoading(isLoading) {
  submitBtn.setAttribute("aria-busy", isLoading ? "true" : "false");
  submitBtn.textContent = isLoading ? "Sending..." : "✈ Send Message";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  fd.append("Page Title", document.title);
  fd.append("Page URL", location.href);

  setLoading(true);

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      body: fd
    });

    if (!res.ok) throw new Error("Failed");

    form.reset();
    showThankYou();

  } catch (err) {
    console.error(err);
    alert("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
});

function showThankYou() {
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function hideThankYou() {
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

closeBtn.addEventListener("click", hideThankYou);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) hideThankYou();
});