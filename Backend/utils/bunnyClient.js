const axios = require('axios');

const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD;
const BUNNY_STORAGE_HOST = process.env.BUNNY_STORAGE_HOST; // e.g., https://ny.storage.bunnycdn.com
const BUNNY_PUBLIC_CDN = process.env.BUNNY_PUBLIC_CDN;     // e.g., https://aniflixx.b-cdn.net

const uploadToBunny = async (fileBuffer, fileName) => {
  const uploadUrl = `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${fileName}`;

  try {
    const response = await axios.put(uploadUrl, fileBuffer, {
      headers: {
        AccessKey: BUNNY_STORAGE_PASSWORD,
        'Content-Type': 'video/mp4',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    console.log('✅ Bunny upload complete:', fileName);
    return `${BUNNY_PUBLIC_CDN}/${fileName}`;
  } catch (error) {
    console.error('❌ Bunny upload failed:', error?.response?.data || error.message);
    throw new Error('Bunny upload error: ' + error.message);
  }
};

module.exports = { uploadToBunny };
