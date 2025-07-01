const wasabi = require("../utils/wasabiClient");

exports.testWasabiConnection = async (req, res) => {
  const testFileContent = Buffer.from("This is a test file to check Wasabi connection.");
  const fileName = "test-file.txt";

  const params = {
    Bucket: process.env.WASABI_BUCKET,
    Key: `test/${fileName}`,
    Body: testFileContent,
    ACL: "public-read",
    ContentType: "text/plain",
  };

  try {
    console.log("🔄 Uploading test file to Wasabi...");
    await wasabi.putObject(params).promise();

    const fileUrl = `${process.env.WASABI_ENDPOINT}/${process.env.WASABI_BUCKET}/test/${fileName}`;
    console.log("Test file uploaded to Wasabi:", fileUrl);
    res.status(200).json({
      message: "✅ Test file uploaded to Wasabi successfully!",
      fileUrl,
    });
  } catch (err) {
    console.error("Wasabi upload failed:", err);
    res.status(500).json({ error: "Failed to upload test file to Wasabi.", details: err.message });
  }
};
