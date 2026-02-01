const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { verifyToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/multerConfig');

console.log('\n=== Employee Routes Setup ===');

// Protect all routes
router.use(verifyToken);

// Employee CRUD routes
router.get('/', employeeController.getAllProfiles); // This now supports ?department_id=X
router.get('/role/:role', employeeController.getProfilesByRole);
router.get('/department/:departmentId', employeeController.getProfilesByDepartment); // Alternative route
router.post('/', employeeController.createProfile);
router.get('/:Employee_id', employeeController.getProfile);
router.put('/:Employee_id', upload.single('Profile_image'), employeeController.updateProfile);
router.delete('/:Employee_id', employeeController.deleteProfile);

console.log('Employee routes setup complete');

module.exports = router;