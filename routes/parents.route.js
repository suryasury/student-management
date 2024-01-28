const express = require("express");
const router = express.Router();
const parentsController = require("../components/parents/parent.controller");
const { verifyAccessToken } = require("../middlewares");

router.post("/login", parentsController.login);
router.get(
  "/fees/details",
  verifyAccessToken,
  parentsController.getFeesDetails
);

//pending in parent controller
//  1. need to add payment webhooks api
//  2.
// router.use("/api/teachers");
// router.use("/api/parents");

module.exports = router;
