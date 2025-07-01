const FormData = require('form-data');
const axios = require('axios');

class CloudflareImagesService {
  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.accountHash = process.env.CLOUDFLARE_IMAGES_HASH;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1`;
  }

  async uploadImage(buffer, filename) {
    try {
      const formData = new FormData();
      formData.append('file', buffer, filename);
      
      const response = await axios.post(this.baseUrl, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          ...formData.getHeaders()
        }
      });

      const imageId = response.data.result.id;
      return {
        id: imageId,
        url: `https://imagedelivery.net/${this.accountHash}/${imageId}/profile`
      };
    } catch (error) {
      console.error('❌ Upload failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new CloudflareImagesService();