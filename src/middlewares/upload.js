const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento en disco
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Carpeta donde se guardarán las imágenes (asegúrate de que exista public/uploads)
        cb(null, path.join(__dirname, '../../public/uploads'));
    },
    filename: (req, file, cb) => {
        // Generar un nombre único: timestamp + número aleatorio + extensión original
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro opcional para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB opcional
});

module.exports = upload;