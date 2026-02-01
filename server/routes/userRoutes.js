const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/multerConfig');

// GET user by ID
router.get('/:id', userController.getUserById);

// PUT user by ID - accepts picture file
router.put('/:id', verifyToken, upload.single('picture'), userController.updateUserById);

// POST change password
router.post('/:id/change-password', verifyToken, userController.changePassword);

module.exports = router;