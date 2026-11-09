const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const upload = require('../middlewares/upload');
const { isAuthenticated } = require('../middlewares/authMiddleware'); // Importar el middleware

router.get('/', postController.getHome);

// RUTAS PROTEGIDAS (Añadimos isAuthenticated antes del controlador)
router.get('/posts/create', isAuthenticated, postController.getCreatePost);
router.post('/posts', isAuthenticated, upload.single('image'), postController.storePost);

module.exports = router;