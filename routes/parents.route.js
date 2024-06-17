const express = require("express");
const router = express.Router();
const parentsController = require("../controllers/parents/parent.controller");
const { verifyAccessToken } = require("../middlewares");

router.post("/login", parentsController.login);
router.get(
  "/student/details",
  verifyAccessToken,
  parentsController.getStudentDetails,
);
router.get(
  "/fees/details",
  verifyAccessToken,
  parentsController.getFeesDetails,
);
router.patch(
  "/password/reset",
  verifyAccessToken,
  parentsController.resetPasswordWithAuth,
);
router.post("/forgot-password", parentsController.forgotPassword);
router.patch("/reset-password/:token", parentsController.resetPassword);
router.post("/initiate/payment", parentsController.createPaymentOrder);
router.post(
  "/fees/payment/verify",
  verifyAccessToken,
  parentsController.verifyPayment,
);
router.get(
  "/fees/payment/status/:orderId",
  verifyAccessToken,
  parentsController.checkPaymentStatus,
);
module.exports = router;
