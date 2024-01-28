const express = require("express");
const router = express.Router();
const teachersController = require("../components/teachers/teacher.controller");
const { verifyAccessToken } = require("../middlewares");

router.post("/login", teachersController.login);
router.get(
  "/dashboard/sections",
  verifyAccessToken,
  teachersController.getStaffSections
);
router.get(
  "/sections/students/list/:sectionId",
  verifyAccessToken,
  teachersController.getStaffSectionStudents
);
router.get(
  "/sections/students/:studentId",
  verifyAccessToken,
  teachersController.getStaffStudentDetails
);

module.exports = router;
