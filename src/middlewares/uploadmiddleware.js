const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {

    const allowedfile = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    ]
    if (allowedfile.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('invalid file type. only images are allowed.'));
    }
};


const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = upload;