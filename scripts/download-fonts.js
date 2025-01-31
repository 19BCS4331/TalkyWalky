const fs = require('fs');
const https = require('https');
const path = require('path');

const fontsToDownload = [
  {
    name: 'Poppins-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf'
  },
  {
    name: 'Poppins-Medium.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Medium.ttf'
  },
  {
    name: 'Poppins-SemiBold.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-SemiBold.ttf'
  },
  {
    name: 'Poppins-Bold.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf'
  }
];

const downloadFont = (url, filename) => {
  const fontPath = path.join(__dirname, '..', 'assets', 'fonts', filename);
  const file = fs.createWriteStream(fontPath);

  https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${filename}`);
    });
  }).on('error', (err) => {
    fs.unlink(filename);
    console.error(`Error downloading ${filename}: ${err.message}`);
  });
};

// Create fonts directory if it doesn't exist
const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Download all fonts
fontsToDownload.forEach(font => {
  downloadFont(font.url, font.name);
});
