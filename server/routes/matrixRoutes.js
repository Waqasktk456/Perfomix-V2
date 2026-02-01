// routes/matrixRoutes.js
const express = require('express');
const router = express.Router();
const matrixController = require('../controllers/matrixController');
const { verifyToken } = require("../middlewares/authMiddleware");

router.post('/',verifyToken,matrixController.createMatrix);
router.get('/',verifyToken,matrixController.getAllMatrices);
router.put('/:matrix_id',verifyToken, matrixController.updateMatrix);
router.get('/:matrix_id',verifyToken, matrixController.getMatrixById);
router.delete('/:matrix_id',verifyToken, matrixController.deleteMatrix);

module.exports = router;