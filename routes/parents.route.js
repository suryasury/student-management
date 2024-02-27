const express = require("express");
const router = express.Router();
const parentsController = require("../components/parents/parent.controller");
const { verifyAccessToken } = require("../middlewares");

router.post("/login", parentsController.login);
router.get(
  "/student/details",
  verifyAccessToken,
  parentsController.getStudentDetails
);
router.get(
  "/fees/details",
  verifyAccessToken,
  parentsController.getFeesDetails
);
router.patch(
  "/password/reset",
  verifyAccessToken,
  parentsController.resetPasswordWithAuth
);
router.post("/forgot-password", parentsController.forgotPassword);
router.patch("/reset-password/:token", parentsController.resetPassword);
router.get("/initiate/payment/:feesId", parentsController.initiatePayment);
router.post("/payments/webhooks", parentsController.initiatePayment);
//pending in parent controller
//  1. need to add payment webhooks api

module.exports = router;
