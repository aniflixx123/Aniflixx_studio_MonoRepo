// utils/vercelClient.js
const { put } = require('@vercel/blob');
const { v4: uuidv4 } = require('uuid');

const uploadToVercelBlob = async (buffer, originalName) => {
  const filename = `${Date.now()}_${uuidv4()}_${originalName.replace(/\s+/g, '_')}`;

  const blob = await put(filename, buffer, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
};

module.exports = { uploadToVercelBlob };
