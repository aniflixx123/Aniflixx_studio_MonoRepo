const Clarifai = require("clarifai");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const clarifai = new Clarifai.App({ apiKey: process.env.CLARIFAI_API_KEY });

async function extractFrames(videoBuffer) {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(__dirname, "../tmp");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir); // ✅ Fix ENOENT
    }

    const tempVideoPath = path.join(outputDir, `${uuidv4()}.mp4`);
    fs.writeFileSync(tempVideoPath, videoBuffer);

    ffmpeg(tempVideoPath)
      .on("end", () => {
        const files = fs.readdirSync(outputDir)
          .filter(f => f.endsWith(".jpg"))
          .map(f => path.join(outputDir, f));
        resolve(files.slice(0, 3)); // max 3 frames
      })
      .on("error", reject)
      .screenshots({
        count: 3,
        folder: outputDir,
        filename: "%03d.jpg",
        size: "640x?"
      });
  });
}

async function isAnimeFrame(imagePath) {
  const base64 = fs.readFileSync(imagePath, { encoding: "base64" });
  const res = await clarifai.models.predict("anime", { base64 });
  const concepts = res.outputs[0].data.concepts;
  const animeScore = concepts.find(c => c.name === "anime")?.value || 0;
  return animeScore > 0.7;
}

async function validateAnimeReel(videoBuffer) {
  try {
    const frames = await extractFrames(videoBuffer);
    let animeCount = 0;

    for (const frame of frames) {
      const isAnime = await isAnimeFrame(frame);
      if (isAnime) animeCount++;
    }

    frames.forEach(f => fs.unlinkSync(f)); // cleanup
    return animeCount >= 2;
  } catch (err) {
    console.error("Anime validation error:", err);
    return false;
  }
}

module.exports = { validateAnimeReel };
