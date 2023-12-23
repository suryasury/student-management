const express = require("express");
const router = express.Router();
const adminController = require("../components/admin/admin.controller");
const { verifyAccessToken } = require("../middlewares");

router.post("/login", adminController.login);
router.post("/create", verifyAccessToken, adminController.createAdmin);
router.get("/list", verifyAccessToken, adminController.getAdminList);
router.post("/create-staffs", verifyAccessToken, adminController.createStaffs);
router.post(
  "/create-standard",
  verifyAccessToken,
  adminController.createStandards
);
router.get(
  "/standars/list",
  verifyAccessToken,
  adminController.getStandardList
);
router.get("/staffs/list", verifyAccessToken, adminController.getStaffList);
router.post(
  "/teacher-standard/add",
  verifyAccessToken,
  adminController.addStaffToStandard
);
router.delete(
  "/teacher-standard/remove/:standardId",
  verifyAccessToken,
  adminController.removeStaffFromStandard
);

module.exports = router;
