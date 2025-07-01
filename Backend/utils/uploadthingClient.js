const { UTApi } = require('uploadthing/server');

const utapi = new UTApi({
  apiKey: process.env.UPLOADTHING_TOKEN, // ✅ Securely use your token here
});

module.exports = { utapi };
