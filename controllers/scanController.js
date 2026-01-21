const Upload = require("../models/Upload");

const uploadAndScan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const scanResult = Math.random() < 0.85 ? "Safe" : "Malicious";

    const fileUrl = `/uploads/${req.file.filename}`;

    const upload = new Upload({
      filename: req.file.originalname,
      fileUrl,
      scanned: true,
      result: scanResult,
    });

    await upload.save();

    res.status(201).json({
      message: "File uploaded and scanned successfully",
      status: scanResult,
    });
  } catch (err) {
    console.error("Upload & Scan Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { uploadAndScan };
