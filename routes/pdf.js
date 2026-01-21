const express = require("express");
const PDFDocument = require("pdfkit");
const Upload = require("../models/Upload");
const router = express.Router();

router.get("/report/:id", async (req, res) => {
  try {
    const file = await Upload.findById(req.params.id);
    if (!file) return res.status(404).send("File not found");

    const doc = new PDFDocument();
    res.setHeader("Content-disposition", `attachment; filename="report.pdf"`);
    res.setHeader("Content-type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(18).text("VirusTotal Scan Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Status: ${file.status}`);
    doc.text(`Malicious: ${file.malicious}`);
    doc.text(`Suspicious: ${file.suspicious}`);
    doc.text(`SHA256: ${file.virusTotalHash}`);
    doc.text(`Scan Time: ${file.scannedAt}`);
    doc.moveDown();

    if (file.virusTotalLink) {
      doc.text(`Report Link: ${file.virusTotalLink}`, {
        link: file.virusTotalLink,
        underline: true,
      });
    }

    if (file.detections?.length) {
      doc.moveDown();
      doc.fontSize(14).text("Detected Threats:");
      file.detections.forEach((det, i) => {
        doc.fontSize(12).text(`${i + 1}. ${det.engine}: ${det.threat}`);
      });
    }

    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).send("Failed to generate PDF");
  }
});

module.exports = router;
