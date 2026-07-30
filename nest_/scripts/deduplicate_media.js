const fs = require("fs");
const path = require("path");

function main() {
  console.log("Starting Media Deduplication & Single Source of Truth Alignment...");

  const uploadsDir = path.join(__dirname, "..", "uploads");
  const canonicalFile = "5ce4b2a5ef3e31b510f5d53923a23a46d.mp4";
  const duplicateFiles = [
    "884d7106bf1c6ca3a19a33861173ec74c.mp4",
    "facd4044261b1126a926deeeaf9c326d.mp4"
  ];

  console.log("Canonical File Reference: " + canonicalFile);

  for (const dupFile of duplicateFiles) {
    const dupPath = path.join(uploadsDir, dupFile);
    if (fs.existsSync(dupPath)) {
      const stats = fs.statSync(dupPath);
      fs.unlinkSync(dupPath);
      console.log("SUCCESS: Removed duplicate file " + dupFile + " from disk (" + (stats.size / 1024 / 1024).toFixed(2) + " MB reclaimed)");
    } else {
      console.log("File " + dupFile + " not found on disk or already removed.");
    }
  }

  console.log("Media Deduplication Completed Successfully!");
}

main();

