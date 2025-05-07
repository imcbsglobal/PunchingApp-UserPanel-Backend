// scripts/migrateImagesToCloudinary.js
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");
const { cloudinary } = require("../config/cloudinary");

// Path to your uploads directory
const uploadsDir = path.join(__dirname, "..", "uploads");

async function migrateImages() {
  console.log("Starting migration of images to Cloudinary...");

  try {
    // Get all records with photo_filename but no photo_url
    const { rows } = await pool.query(
      `SELECT id, photo_filename FROM punch_records 
       WHERE photo_filename IS NOT NULL AND photo_url IS NULL`
    );

    console.log(`Found ${rows.length} records to migrate.`);

    for (const record of rows) {
      const { id, photo_filename } = record;
      const localFilePath = path.join(uploadsDir, photo_filename);

      // Check if the file exists locally
      if (!fs.existsSync(localFilePath)) {
        console.log(`File not found for record ${id}: ${localFilePath}`);
        continue;
      }

      try {
        // Upload to Cloudinary
        console.log(`Uploading ${localFilePath} to Cloudinary...`);
        const result = await cloudinary.uploader.upload(localFilePath, {
          folder: "punch-app",
        });

        // Update database with Cloudinary URL and public ID
        await pool.query(
          `UPDATE punch_records 
           SET photo_url = $1, photo_filename = $2 
           WHERE id = $3`,
          [result.secure_url, result.public_id, id]
        );

        console.log(`Successfully migrated record ${id}`);
      } catch (uploadError) {
        console.error(`Error uploading file for record ${id}:`, uploadError);
      }
    }

    console.log("Migration completed!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

migrateImages();
