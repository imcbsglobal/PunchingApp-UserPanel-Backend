// config/fileStorage.js
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const schedule = require("node-schedule");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
fs.ensureDirSync(uploadsDir);

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `punch-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Configure file filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

// Create upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Set up automatic cleanup job to run daily at midnight
const setupCleanupJob = () => {
  schedule.scheduleJob("0 0 * * *", async () => {
    try {
      console.log("Running scheduled image cleanup...");
      const files = await fs.readdir(uploadsDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        const fileAgeInDays =
          (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        // Delete files older than 10 days
        if (fileAgeInDays > 10) {
          await fs.unlink(filePath);
          console.log(`Deleted old image: ${file}`);
        }
      }
      console.log("Image cleanup completed");
    } catch (error) {
      console.error("Error during image cleanup:", error);
    }
  });
};

// Helper function to delete a specific image
const deleteImage = async (filename) => {
  try {
    if (!filename) return;

    const filePath = path.join(uploadsDir, filename);
    const exists = await fs.pathExists(filePath);

    if (exists) {
      await fs.unlink(filePath);
      console.log(`Manually deleted image: ${filename}`);
    }
  } catch (error) {
    console.error(`Error deleting image ${filename}:`, error);
  }
};

// Temporary test function - add this to fileStorage.js
// const testCleanup = async () => {
//   try {
//     console.log("Running test image cleanup...");
//     const files = await fs.readdir(uploadsDir);
//     const now = Date.now();

//     // For testing, we'll pretend files are older than they are
//     for (const file of files) {
//       const filePath = path.join(uploadsDir, file);
//       console.log(`Would delete: ${file}`);
//       // Uncomment to actually delete: await fs.unlink(filePath);
//     }
//     console.log("Test cleanup completed");
//   } catch (error) {
//     console.error("Error during test cleanup:", error);
//   }
// };

module.exports = {
  upload,
  setupCleanupJob,
  deleteImage,
  uploadsDir,
  //testCleanup, // Export the test function for manual testing
};
