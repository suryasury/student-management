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
  parentsController.resetPasssword
);
//pending in parent controller
//  1. need to add payment webhooks api

module.exports = router;
