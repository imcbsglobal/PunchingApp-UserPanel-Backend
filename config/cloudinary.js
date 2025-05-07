// config/cloudinary.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const path = require("path");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup CloudinaryStorage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "punch-app",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

// Configure multer to use Cloudinary storage
const uploadToCloudinary = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only .png, .jpg and .jpeg formats are allowed!"));
  },
});

// Function to delete image from Cloudinary
const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
};

// Extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;

  // Extract path after the last slash and before the file extension
  const matches = url.match(/\/v\d+\/([^/]+)\.\w+$/);
  if (matches && matches[1]) {
    return matches[1];
  }
  return null;
};

module.exports = {
  uploadToCloudinary,
  deleteCloudinaryImage,
  getPublicIdFromUrl,
  cloudinary,
};
