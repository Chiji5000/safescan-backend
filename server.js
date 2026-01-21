// server.js

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { format } = require("date-fns");
const fs = require("fs");
const path = require("path");

const connectDB = require("./config/db");
const Upload = require("./models/Upload");
const verifyToken = require("./middleware/verifyToken");
const uploadRoutes = require("./routes/upload");
const scanFileWithOPSWAT = require("./opswatScan"); // ✅ Import OPSWAT

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());
app.use("/uploads", express.static("uploads")); // Serve uploaded files

// Multer storage
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname}`;
    cb(null, filename);
  },
});
const upload = multer({ storage });

console.log(`🕒 Started at ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`);
console.log(`🆔 Session UUID: ${uuidv4()}`);

// Home route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ SafeScan backend running..." });
});

// Routes
app.use("/api/scan", require("./routes/scanRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/uploads", uploadRoutes);
app.use("/api/pdf", require("./routes/pdf"));

// 🔓 Public scan route (No auth)
app.post("/api/scans", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const result = await scanFileWithOPSWAT(req.file.path);

    const newUpload = new Upload({
      filename: req.file.filename,
      originalName: req.file.originalname,
      filepath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      status: result.status === "malicious" ? "Malicious" : "Safe",
      scannedAt: new Date(),
      malicious: result.malicious,
      suspicious: result.suspicious || 0,
      detections: result.threats || [],
    });

    await newUpload.save();

    res.status(200).json({
      message: "✅ File scanned",
      file: {
        filename: newUpload.filename,
        originalName: newUpload.originalName,
        filepath: newUpload.filepath,
        fileType: newUpload.fileType,
        fileSize: newUpload.fileSize,
        status: newUpload.status,
        scannedAt: newUpload.scannedAt,
        malicious: newUpload.malicious,
        suspicious: newUpload.suspicious,
        detections: newUpload.detections,
      },
    });
  } catch (err) {
    console.error("❌ Error in /api/scans:", err);
    res.status(500).json({ error: "Upload or scan failed" });
  }
});

// 🔐 Authenticated scan route (JWT)
app.post(
  "/api/upload",
  verifyToken,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const result = await scanFileWithOPSWAT(req.file.path);

      const newUpload = new Upload({
        filename: req.file.filename,
        originalName: req.file.originalname,
        filepath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        status: result.status === "malicious" ? "Malicious" : "Safe",
        scannedAt: new Date(),
        malicious: result.malicious,
        suspicious: result.suspicious || 0,
        detections: result.threats || [],
        userId: req.user?.id || null,
      });

      await newUpload.save();

      res.status(200).json({
        message: "✅ File uploaded and scanned",
        file: {
          filename: newUpload.filename,
          originalName: newUpload.originalName,
          filepath: newUpload.filepath,
          fileType: newUpload.fileType,
          fileSize: newUpload.fileSize,
          status: newUpload.status,
          scannedAt: newUpload.scannedAt,
          malicious: newUpload.malicious,
          suspicious: newUpload.suspicious,
          detections: newUpload.detections,
        },
      });
    } catch (err) {
      console.error("❌ Error in /api/upload:", err);
      res.status(500).json({ error: "Upload or scan failed" });
    }
  }
);

// 🧾 Get all uploads
app.get("/api/uploads", async (req, res) => {
  try {
    const uploads = await Upload.find().sort({ scannedAt: -1 });
    res.json(uploads);
  } catch (err) {
    console.error("❌ Error in /api/uploads:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Serve uploads folder statically (optional but useful)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// File download route
app.get("/api/uploads/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "uploads", filename);
  res.download(filePath, filename, (err) => {
    if (err) {
      console.error("File download error:", err);
      res.status(404).send("File not found.");
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
