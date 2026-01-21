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
const scanFileWithOPSWAT = require("./opswatScan");

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS setup for both local dev and production frontend
const allowedOrigins = [
  "http://localhost:5173", // Vite dev
  "https://chijimalwaredetection.netlify.app", 
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Allow tools like Postman
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy: Origin not allowed"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

// Routes
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ SafeScan backend running..." });
});

app.use("/api/scan", require("./routes/scanRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/uploads", uploadRoutes);
app.use("/api/pdf", require("./routes/pdf"));

// Example scan/upload routes remain unchanged...
// [keep your existing /api/scans and /api/upload logic]

// Get all uploads
app.get("/api/uploads", async (req, res) => {
  try {
    const uploads = await Upload.find().sort({ scannedAt: -1 });
    res.json(uploads);
  } catch (err) {
    console.error("❌ Error in /api/uploads:", err);
    res.status(500).json({ error: "Server error" });
  }
});

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
