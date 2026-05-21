
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
//const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "noteflow_files",
    allowed_formats: ["jpg", "png", "pdf", "docx"]
  }
});

const upload = multer({ storage });

module.exports = upload;
