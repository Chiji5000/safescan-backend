const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Scan = require("../models/Scan");
const Upload = require("../models/Upload"); // ✅ Make sure this exists
const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + path.extname(file.originalname);
    cb(null, filename);
  },
});

const upload = multer({ storage });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const filePath = req.file.path;

    // Simulate scan result
    const scanResult = Math.random() > 0.2 ? "Safe" : "Infected";

    // ✅ Save scan result to database
    const scan = new Scan({
      filename: req.file.filename,
      path: filePath,
      result: scanResult,
      createdAt: new Date(),
    });
    await scan.save();

    // ✅ Save upload record to Uploads collection
    const uploadRecord = new Upload({
      filename: req.file.originalname,
      storedName: req.file.filename,
      filePath,
      scanResult,
      uploadedAt: new Date(),
    });
    await uploadRecord.save(); // <-- THIS saves to DB

    res
      .status(200)
      .json({ message: "Scanned successfully", status: scanResult });
  } catch (err) {
    console.error("Upload & Scan error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
