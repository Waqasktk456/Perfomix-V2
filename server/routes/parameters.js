// routes/parameterRoutes.js
const express = require('express');
const router = express.Router();
const parameterController = require('../controllers/parameterController');
const {verifyToken}=require('../middlewares/authMiddleware')

router.post('/',verifyToken, parameterController.createParameter);
router.get('/',verifyToken, parameterController.getAllParameters);
router.put('/:parameter_id',verifyToken, parameterController.updateParameter); // NEW: Update route

module.exports = router;