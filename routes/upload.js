const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Upload = require("../models/Upload");
const scanFileWithOPSWAT = require("../opswatScan");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const result = await scanFileWithOPSWAT(file.path);

    if (result.status === "error") {
      return res.status(500).json({ error: result.message });
    }

    const newUpload = new Upload({
      filename: file.filename,
      originalName: file.originalname,
      filepath: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
      status: result.status === "malicious" ? "Malicious" : "Safe",
      scannedAt: new Date(),
      malicious: result.malicious,
      suspicious: result.suspicious,
      detections: result.threats,
    });

    await newUpload.save();

    res.status(200).json({
      message: "File scanned successfully",
      file: {
        id: newUpload._id,
        filename: newUpload.filename,
        status: newUpload.status,
        malicious: newUpload.malicious,
        suspicious: newUpload.suspicious,
        detections: newUpload.detections,
      },
    });
  } catch (err) {
    console.error("Upload scan error:", err);
    res.status(500).json({ error: "File scan failed" });
  }
});

module.exports = router;
