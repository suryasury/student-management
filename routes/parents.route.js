const express = require("express");
const router = express.Router();
const parentsController = require("../components/parents/parent.controller");

router.post("/login", parentsController.login);
// router.use("/api/teachers");
// router.use("/api/parents");

module.exports = router;
