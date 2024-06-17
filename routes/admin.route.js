const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/admin.controller");
const { verifyAccessToken } = require("../middlewares");
const multer = require("multer");
const webhooksController = require("../controllers/admin/webhooks.controller");
const multerUpload = multer();

router.post("/login", adminController.login);
router.post("/create", verifyAccessToken, adminController.createAdmin);
router.post("/update", verifyAccessToken, adminController.updateAdminDetails);
router.delete(
  "/delete/:adminId",
  verifyAccessToken,
  adminController.deleteAdmin,
);
router.get("/details", verifyAccessToken, adminController.getAdminDetails);
router.get("/list", verifyAccessToken, adminController.getAdminList);
router.get(
  "/academic-year",
  verifyAccessToken,
  adminController.getAcademicYearList,
);
router.post("/create-staffs", verifyAccessToken, adminController.createStaffs);
router.post(
  "/student/create",
  verifyAccessToken,
  adminController.createStudent,
);
router.post(
  "/student/update",
  verifyAccessToken,
  adminController.updateStudentDetails,
);
router.post(
  "/standard/create",
  verifyAccessToken,
  adminController.createStandards,
);
router.get("/standard/list", verifyAccessToken, adminController.getAllSections);
router.get(
  "/standard/list/minified",
  verifyAccessToken,
  adminController.getAllSectionMinified,
);
router.post(
  "/standard/update",
  verifyAccessToken,
  adminController.updateStandardTeacher,
);
router.get("/staffs/list", verifyAccessToken, adminController.getStaffList);
router.get(
  "/staffs/list/minified",
  verifyAccessToken,
  adminController.getStaffListMinified,
);
router.post(
  "/staffs/update",
  verifyAccessToken,
  adminController.updateStaffDetails,
);
router.delete(
  "/staffs/delete/:teacherId",
  verifyAccessToken,
  adminController.deleteStaffDetails,
);
router.post(
  "/teacher-standard/add",
  verifyAccessToken,
  adminController.addStaffToStandard,
);
router.delete(
  "/teacher-standard/remove/:standardId",
  verifyAccessToken,
  adminController.removeStaffFromStandard,
);
router.get("/student/list", verifyAccessToken, adminController.getStudentList);
router.get(
  "/student/list/download",
  verifyAccessToken,
  adminController.downloadStudentList,
);
router.delete(
  "/student/delete/:studentId",
  verifyAccessToken,
  adminController.deleteStudent,
);
router.patch(
  "/student/activate/:studentId",
  verifyAccessToken,
  adminController.markStudentActive,
);
router.post(
  "/master/upload/student",
  verifyAccessToken,
  multerUpload.single("file"),
  adminController.masterUploadStudents,
);
router.post("/forgot-password", adminController.forgotPassword);
router.patch("/reset-password/:token", adminController.resetPassword);
router.patch(
  "/password/reset",
  verifyAccessToken,
  adminController.resetPasswordWithAuth,
);
router.post(
  "/record-fees/offline",
  verifyAccessToken,
  adminController.recordOfflineFees,
);
router.post(
  "/student/fees/create",
  verifyAccessToken,
  adminController.createFeesDetails,
);
router.post(
  "/student/fees/update",
  verifyAccessToken,
  adminController.updateFeesDetails,
);
router.delete(
  "/student/fees/delete/:feesId",
  verifyAccessToken,
  adminController.deleteFeesForStudent,
);
router.get(
  "/fees/transactions/history",
  verifyAccessToken,
  adminController.transactionHistory,
);
router.get(
  "/fees/transactions/history/download",
  verifyAccessToken,
  adminController.transactionHistoryDownload,
);
router.get(
  "/fees/details/:feesId",
  verifyAccessToken,
  adminController.getFeesDetailsById,
);

router.post("/fees/payment/webhook", adminController.paymentWebHooks);
router.post(
  "/fees/payment/lyra/webhook",
  webhooksController.paymentWebHooksLyra,
);
router.get(
  "/download/csv/master/template",
  adminController.downloadMasterTemplate,
);
router.get(
  "/dashboard/metrics/overview",
  verifyAccessToken,
  adminController.dashBoardMerticsOverview,
);

module.exports = router;
