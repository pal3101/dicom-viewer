require('dotenv/config');
const fs = require('fs');
const path = require('path');
const cloudbase = require('@cloudbase/node-sdk');
const dicomParser = require('dicom-parser');
const FormData = require('form-data');
const http = require('http');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node upload-test-dicom.js <dicom-file-path>');
  process.exit(1);
}

const app = cloudbase.init({
  env: process.env.CLOUDBASE_ENV_ID,
  secretId: process.env.TENCENTCLOUD_SECRETID,
  secretKey: process.env.TENCENTCLOUD_SECRETKEY,
});

async function main() {
  const buffer = fs.readFileSync(filePath);

  // Parse DICOM metadata
  const dataSet = dicomParser.parseDicom(buffer);
  const studyInstanceUID = dataSet.string('x0020000d') || '';
  const seriesInstanceUID = dataSet.string('x0020000e') || '';
  const sopInstanceUID = dataSet.string('x00080018') || '';

  console.log('StudyInstanceUID:', studyInstanceUID);
  console.log('SeriesInstanceUID:', seriesInstanceUID);
  console.log('SOPInstanceUID:', sopInstanceUID);

  // Upload to CloudBase storage
  const cloudPath = `dicom/${studyInstanceUID}/${seriesInstanceUID}/${path.basename(filePath)}`;
  console.log('Uploading to CloudBase:', cloudPath);

  const uploadResult = await app.uploadFile({
    cloudPath,
    fileContent: buffer,
  });

  console.log('Upload result:', uploadResult);
  const fileID = uploadResult.fileID;

  if (!fileID) {
    console.error('Upload failed: no fileID');
    process.exit(1);
  }

  // Call backend API to index metadata
  const form = new FormData();
  form.append('file', buffer, { filename: path.basename(filePath), contentType: 'application/dicom' });
  form.append('fileID', fileID);

  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/upload',
    method: 'POST',
    headers: form.getHeaders(),
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Backend response:', data);
      const result = JSON.parse(data);
      if (result.status === 'success' || result.status === 'duplicate') {
        console.log('Indexed successfully!');
      } else {
        console.error('Indexing failed:', result);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Backend request failed:', err.message);
    process.exit(1);
  });

  form.pipe(req);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
