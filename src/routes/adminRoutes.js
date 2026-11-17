const express = require('express');
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(isAdmin);
router.get('/', adminController.getDashboard);
router.post('/categories', adminController.createCategory);
router.post('/users/:id/block', adminController.toggleUserBlock);
router.post('/users/:id/delete', adminController.deleteUser);
router.post('/comments/:id/delete', adminController.deleteComment);
router.post('/posts/:id/delete', adminController.deletePost);

module.exports = router;
