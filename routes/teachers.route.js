const express = require("express");
const router = express.Router();
const teachersController = require("../components/teachers/teacher.controller");

router.post("/login", teachersController.login);
// router.use("/api/teachers");
// router.use("/api/parents");

module.exports = router;
