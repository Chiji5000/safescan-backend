// opswatScan.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const OPSWAT_API_KEY = "6456db3ec38647d0853314e79a43e5e3"; // Use your actual API key

async function scanFileWithOPSWAT(filePath) {
  const filename = path.basename(filePath);

  try {
    const fileBuffer = fs.readFileSync(filePath);

    // Step 1: Upload the file
    const uploadRes = await axios.post(
      "https://api.metadefender.com/v4/file",
      fileBuffer,
      {
        headers: {
          apikey: OPSWAT_API_KEY,
          "Content-Type": "application/octet-stream",
        },
      }
    );

    const data_id = uploadRes?.data?.data_id;
    if (!data_id) {
      throw new Error("Upload failed: data_id missing");
    }

    // Step 2: Poll for result
    let result = null;
    for (let i = 0; i < 10; i++) {
      const res = await axios.get(
        `https://api.metadefender.com/v4/file/${data_id}`,
        { headers: { apikey: OPSWAT_API_KEY } }
      );

      const progress = res?.data?.scan_results?.progress_percentage;

      if (progress === 100) {
        result = res.data;
        break;
      }

      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!result) {
      return { status: "error", message: "Scan timed out" };
    }

    const engines = result.scan_results.scan_details;
    const threats = [];

    for (const engine in engines) {
      const finding = engines[engine];
      if (finding.threat_found && finding.threat_found !== "") {
        threats.push({
          engine,
          threat: finding.threat_found,
        });
      }
    }

    return {
      status: threats.length ? "malicious" : "clean",
      malicious: threats.length,
      suspicious: 0,
      threats,
    };
  } catch (error) {
    console.error("OPSWAT scan error:", error?.response?.data || error.message);
    return {
      status: "error",
      message:
        error?.response?.data?.error?.messages?.[0] ||
        error.message ||
        "Unknown error",
    };
  }
}

module.exports = scanFileWithOPSWAT;
