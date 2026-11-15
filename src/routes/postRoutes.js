const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const upload = require('../middlewares/upload');
const { isAuthenticated } = require('../middlewares/authMiddleware');

const uploadPostImage = (req, res, next) => {
    upload.single('image')(req, res, (error) => {
        if (!error) return next();
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        res.status(status).send(error.message);
    });
};

router.get('/posts/create', isAuthenticated, postController.getCreatePost);
router.post('/posts/create', isAuthenticated, uploadPostImage, postController.storePost);
router.get('/posts/:id', postController.getPost);
router.post('/posts/:id/like', isAuthenticated, postController.toggleLike);
router.post('/posts/:id/comments', postController.createComment);

module.exports = router;