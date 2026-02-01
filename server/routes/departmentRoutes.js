const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.get("/", verifyToken, departmentController.getAllDepartments);
router.post("/", verifyToken, departmentController.createDepartment);
router.get("/:identifier", verifyToken, departmentController.getDepartment);
router.put("/:identifier", verifyToken, departmentController.updateDepartment);
router.delete("/:identifier", verifyToken, departmentController.deleteDepartment);

module.exports = router;
