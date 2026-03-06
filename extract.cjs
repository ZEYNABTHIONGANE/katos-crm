const Vibrant = require('node-vibrant');

Vibrant.from('src/assets/LOGO-KATOS(2).png').getPalette()
  .then((palette) => {
    console.log("Vibrant:", palette.Vibrant?.hex);
    console.log("DarkVibrant:", palette.DarkVibrant?.hex);
    console.log("LightVibrant:", palette.LightVibrant?.hex);
    console.log("Muted:", palette.Muted?.hex);
    console.log("DarkMuted:", palette.DarkMuted?.hex);
    console.log("LightMuted:", palette.LightMuted?.hex);
  })
  .catch(err => console.error(err));
