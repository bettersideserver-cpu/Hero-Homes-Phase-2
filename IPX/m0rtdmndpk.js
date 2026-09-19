const panoramaImage = new PANOLENS.ImagePanorama("../images/garden.jpg");
const imageContainer = document.querySelector(".image-container");

panoramaImage.rotation.y = -Math.PI / 2 + -.1;

const viewer = new PANOLENS.Viewer({
  container: imageContainer,
  autoRotate: false,
  autoRotateSpeed: 0.1,
  controlBar: false,
});

viewer.add(panoramaImage);
