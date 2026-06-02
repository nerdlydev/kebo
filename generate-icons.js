import fs from 'fs';
import sharp from 'sharp';

const sizes = [16, 32, 48, 96, 128];
const svgBuffer = fs.readFileSync('./assets/icon.svg');

Promise.all(
  sizes.map(size =>
    sharp(svgBuffer)
      .resize(size, size)
      .toFile(`./assets/icon-${size}.png`)
  )
).then(() => {
  console.log('Icons generated successfully.');
}).catch(err => {
  console.error('Error generating icons:', err);
});
