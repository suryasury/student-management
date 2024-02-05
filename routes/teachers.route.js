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
router.get("/details", verifyAccessToken, teachersController.getUserDetails);
router.get(
  "/section/details/:sectionId",
  verifyAccessToken,
  teachersController.getSectionDetails
);
router.get(
  "/student/details/:studentId",
  verifyAccessToken,
  teachersController.getStudentDetails
);
router.post(
  "/forgot-password",
  verifyAccessToken,
  teachersController.forgotPassword
);
router.patch(
  "/reset-password",
  verifyAccessToken,
  teachersController.resetPassword
);
router.patch(
  "/password/reset",
  verifyAccessToken,
  teachersController.resetPasswordWithAuth
);
module.exports = router;
