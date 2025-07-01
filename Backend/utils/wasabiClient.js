const AWS = require("aws-sdk");
const mime = require("mime-types"); // ✅ fixed

const wasabiClient = new AWS.S3({
  accessKeyId: process.env.WASABI_ACCESS_KEY,
  secretAccessKey: process.env.WASABI_SECRET_KEY,
  region: process.env.WASABI_REGION,
  endpoint: process.env.WASABI_ENDPOINT,
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

const uploadToWasabi = async (buffer, key, bucket, expiresIn = 3600) => {
  const mimeType = mime.lookup(key) || 'application/octet-stream'; // ✅ fixed usage

  await wasabiClient
    .upload({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
    .promise();

  const signedUrl = await wasabiClient.getSignedUrlPromise("getObject", {
    Bucket: bucket,
    Key: key,
    Expires: expiresIn,
  });

  return signedUrl;
};

module.exports = { wasabiClient, uploadToWasabi };
