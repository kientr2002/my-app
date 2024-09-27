const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to generate a timestamp string
function getCurrentTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Serve the list of uploaded files on GET /upload
app.get('/upload', (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');

  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory: ' + err);
    }

    let fileList = files.map(file => `<li><a href="/uploads/${file}">${file}</a></li>`).join('');
    const html = `
      <h1>Uploaded Files</h1>
      <ul>${fileList}</ul>
    `;

    res.send(html);
  });
});

// Handle file uploads with timestamp renaming
app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const uploadedFile = req.files.file;

  // Generate new filename with the current timestamp
  const timestamp = getCurrentTimestamp();
  const newFileName = `${timestamp}_firmware.bin`;
  const uploadPath = path.join(__dirname, 'uploads', newFileName);

  uploadedFile.mv(uploadPath, (err) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.send(`File uploaded and renamed to ${newFileName}`);
  });
});

// Serve the most recent firmware file on GET /latest-firmware
app.get('/latest-firmware', (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');

  // Get list of files in the uploads directory
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory: ' + err);
    }

    if (files.length === 0) {
      return res.status(404).send('No firmware files found.');
    }

    // Find the latest file by modification date
    let latestFile = files.reduce((latest, file) => {
      const latestFilePath = path.join(uploadDir, latest);
      const filePath = path.join(uploadDir, file);
      const latestStat = fs.statSync(latestFilePath);
      const fileStat = fs.statSync(filePath);
      return fileStat.mtime > latestStat.mtime ? file : latest;
    });

    const latestFilePath = path.join(uploadDir, latestFile);
    res.download(latestFilePath, (err) => {
      if (err) {
        return res.status(500).send('Error sending file: ' + err);
      }
    });
  });
});

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Listen on all available network interfaces and port 4000
app.listen(4000, '192.168.1.7', () => {
  console.log('Server started on http://192.168.1.7:4000');
  console.log('Make sure to use your computer\'s IP address (not localhost) to access this server from other devices.');
});
