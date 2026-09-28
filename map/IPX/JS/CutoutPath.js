// Hero Homes floor navigation: use the displayed floor name first.
(function () {
  const paths = document.querySelectorAll(".Cutout path[data-link]");

  paths.forEach((path) => {
    path.style.pointerEvents = "all";
    path.style.cursor = "pointer";

    path.addEventListener("click", () => {
      const name = path.getAttribute("data-name") || "";
      const link = path.getAttribute("data-link") || "";

      // Example: "12_Floor_24" -> 24; "Floor_08" -> 8
      const nameMatch = name.match(/(?:^|_)Floor[_ -]?(\d+)$/i);
      let floor = nameMatch ? Number(nameMatch[1]) : Number(path.getAttribute("floorNumber"));

      // Example: "Floor/Tower-12.html" -> 12; "Tower_B.html" -> B
      const linkMatch = link.match(/Tower[-_]?([A-Z]|\d+A?)\.html(?:$|[?#])/i);
      let tower = linkMatch ? linkMatch[1] : "";

      // Fallback for names like "12_Floor_24"
      if (!tower) {
        const towerMatch = name.match(/^(.+?)_Floor[_ -]?\d+$/i);
        if (towerMatch) tower = towerMatch[1];
      }

      tower = String(tower).replace(/^Tower[-_ ]?/i, "").trim();

      if (!tower || !Number.isInteger(floor) || floor < 1 || floor > 32) {
        console.warn("Floor navigation stopped:", { name, link, tower, floor });
        return;
      }

      sessionStorage.setItem("selectedTower", tower);
      sessionStorage.setItem("selectedFloor", String(floor));
      sessionStorage.setItem("heroHomesTower", tower);
      sessionStorage.setItem("heroHomesFloor", String(floor));

      paths.forEach((p) => p.classList.remove("selected"));
      path.classList.add("selected");

      const target = new URL(link, window.location.href);
      target.searchParams.set("floor", String(floor));

      window.location.href = target.href;
    });
  });
})();