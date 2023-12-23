const httpStatus = require("http-status");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const error = require("../../helper/errorHandler");
const hashPassword = require("../../helper/hashPassword");
const validatePassword = require("../../helper/validatePassword");
const generateAccesToken = require("../../helper/generateAccessToken");

exports.createAdmin = async (req, res) => {
  try {
    let password = hashPassword(req.body.password);
    let result = await prisma.admins.create({
      data: {
        name: req.body.name,
        password: req.body.password,
        school_id: req.body.school_id,
        email: req.body.email,
        password: password,
      },
    });
    res.status(200).send({
      success: true,
      message: "Admin created successfully.",
      data: result,
    });
  } catch (err) {
    error(err, res);
  }
};

exports.createStaffs = async (req, res) => {
  try {
    let password = hashPassword(req.body.password);
    let result = await prisma.teachers.create({
      data: {
        name: req.body.name,
        password: req.body.password,
        school_id: req.body.school_id,
        email: req.body.email,
        password: password,
        need_password_reset: true,
      },
    });
    res.status(200).send({
      success: true,
      message: "Staff created successfully.",
      data: result,
    });
  } catch (err) {
    error(err, res);
  }
};

exports.createStandards = async (req, res) => {
  try {
    let result = await prisma.standards.create({
      data: {
        standard: req.body.standard,
        section: req.body.section,
        school_id: req.body.school_id,
      },
    });
    res.status(200).send({
      success: true,
      message: "Admins fetched successfully.",
      data: result,
    });
  } catch (err) {
    error(err, res);
  }
};

exports.getStandardList = async (req, res) => {
  try {
    let timeZoneOffset = req.headers.timezoneoffset;
    let result =
      await prisma.$queryRaw`SELECT id, standard, section, CONVERT_TZ(created_at, "+00:00", ${timeZoneOffset}) as created_at FROM standards WHERE is_deleted = 0`;
    res.status(200).send({
      success: true,
      message: "Standard list fetched successfully",
      data: result,
    });
  } catch (err) {
    error(err, res);
  }
};

exports.getAdminList = async (req, res) => {
  try {
    let timeZoneOffset = req.headers.timezoneoffset;
    let result =
      await prisma.$queryRaw`SELECT name, email, id, is_active, CONVERT_TZ(created_at, "+00:00", ${timeZoneOffset}) as created_at FROM admins where is_deleted = 0`;
    res.status(200).send({
      success: true,
      message: "Admin list fetched successfully",
      data: result,
    });
  } catch (err) {
    error(err, res);
  }
};

exports.getStaffList = async (req, res) => {
  try {
    let timeZoneOffset = req.headers.timezoneoffset;
    let result =
      await prisma.$queryRaw`SELECT id, name, email, is_active, CONVERT_TZ(created_at, "+00:00", ${timeZoneOffset}) as created_at FROM teachers where is_deleted = 0`;
    res.status(200).send({
      success: true,
      message: "Staff list fetched successfully.",
      data: result,
    });
  } catch (err) {
    error(err, res);
  }
};

exports.getStaffList = async (req, res) => {
  try {
    let timeZoneOffset = req.headers.timezoneoffset;
    let result =
      await prisma.$queryRaw`SELECT id, name, email, is_active, CONVERT_TZ(created_at, "+00:00", ${timeZoneOffset}) as created_at FROM teachers where is_deleted = 0`;
    res.status(200).send({
      success: true,
      message: "Staff list fetched successfully.",
      data: result,
    });
  } catch (err) {
    error(err, res);
  }
};

exports.addStaffToStandard = async (req, res) => {
  try {
    await prisma.teacher_standards.create({
      data: {
        teacher_id: req.body.teacherId,
        standard_id: req.body.standardId,
        school_id: req.body.schoolId,
      },
    });
    res.status(200).send({
      success: true,
      message: "Teacher added to the section successfully",
      data: {},
    });
  } catch (err) {
    error(err, res);
  }
};

exports.removeStaffFromStandard = async (req, res) => {
  try {
    await prisma.teacher_standards.delete({
      where: {
        id: parseInt(req.params.standardId),
      },
    });
    res.status(200).send({
      success: true,
      message: "Teacher removed from the section successfully",
      data: {},
    });
  } catch (err) {
    error(err, res);
  }
};

exports.login = async (req, res) => {
  try {
    let email = req.body.email;
    let password = req.body.password;

    let userDetails = await prisma.admins.findFirst({
      where: {
        email: email,
        is_deleted: false,
      },
    });
    if (userDetails) {
      if (!userDetails.is_active) {
        res
          .status(httpStatus.FORBIDDEN)
          .send({ message: "Access denied", success: false, data: {} });
      }
      let isValidPassword = validatePassword(password, userDetails.password);
      if (isValidPassword) {
        let jwtToken = generateAccesToken({
          userId: userDetails.id,
          email: userDetails.email,
          userType: "admin",
        });
        delete userDetails.password;
        userDetails.accessToken = jwtToken;
        res.status(httpStatus.OK).send({
          message: "Logged in successfully",
          success: true,
          data: userDetails,
        });
      } else {
        res.status(httpStatus.UNAUTHORIZED).send({
          message: "Invalid credentials. Please try again",
          success: true,
          data: {},
        });
      }
    } else {
      res.status(httpStatus.NOT_FOUND).send({
        message: "User not found or invaild user",
        success: false,
        data: {},
      });
    }
  } catch (err) {
    error(err, res);
  }
};
