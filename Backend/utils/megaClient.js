const fs = require('fs');
const { Storage } = require('megajs');

const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;

const uploadToMega = async (buffer, fileName) => {
  return new Promise((resolve, reject) => {
    const storage = new Storage({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD,
    });

    storage.on('ready', () => {
      const uploadStream = storage.upload({
        name: fileName,
        allowUploadBuffering: true, // ✅ FIX: Allow internal buffering
      });

      uploadStream.end(buffer);

      uploadStream.on('complete', (file) => {
        const link = file.link();
        console.log('✅ MEGA Upload Complete:', link);
        resolve(link);
      });

      uploadStream.on('error', (err) => {
        console.error('❌ MEGA Upload Error:', err);
        reject(err);
      });
    });

    storage.on('error', (err) => {
      console.error('❌ MEGA Login Error:', err);
      reject(err);
    });
  });
};

module.exports = { uploadToMega };
