const multer = require('multer');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('path');

const uploadDirectory = path.join(__dirname, '../../public/uploads');
const imageExtensions = {
    'image/gif': '.gif',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        fs.mkdir(uploadDirectory, { recursive: true }, (error) => cb(error, uploadDirectory));
    },
    filename: (_req, file, cb) => {
        cb(null, `${crypto.randomUUID()}${imageExtensions[file.mimetype]}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (Object.hasOwn(imageExtensions, file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes JPG, PNG, GIF o WEBP'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;