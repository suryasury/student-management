const express = require("express");
const adminRoutes = require("./admin.route");
const parentRoute = require("./parents.route");
const teacherRoute = require("./teachers.route");

const app = express();

app.use("/api/admin", adminRoutes);
app.use("/api/teachers", teacherRoute);
app.use("/api/parents", parentRoute);

module.exports = app;
