const mongoose = require("mongoose");

const UploadSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  filepath: String,
  fileType: String,
  fileSize: Number,
  status: String,
  malicious: Number,
  suspicious: Number,
  detections: Array,
  scannedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

module.exports = mongoose.model("Upload", UploadSchema);
