const httpStatus = require("http-status");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const error = require("../../helpers/errorHandler");
const validatePassword = require("../../helpers/validatePassword");
const generateAccesToken = require("../../helpers/generateAccessToken");
const csv = require("fast-csv");
const hashPassword = require("../../helpers/hashPassword");
const emailService = require("../../utils/emailService");
const fs = require("fs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    let email = req.body.email;
    let password = req.body.password;

    let userDetails = await prisma.teachers.findFirst({
      where: {
        email: email,
        is_deleted: false,
        is_active: true,
      },
      include: {
        school: true,
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
          userType: "teacher",
          schoolId: userDetails.school_id,
        });
        delete userDetails.password;
        userDetails.accessToken = jwtToken;
        return res.status(httpStatus.OK).send({
          message: "Logged in successfully",
          success: true,
          data: userDetails,
        });
      } else {
        return res.status(httpStatus.UNAUTHORIZED).send({
          message: "Invalid credentials. Please try again",
          success: true,
          data: {},
        });
      }
    } else {
      return res.status(httpStatus.NOT_FOUND).send({
        message: "User not found or invaild user",
        success: false,
        data: {},
      });
    }
  } catch (err) {
    return error(
      {
        statusCode: httpStatus.UNAUTHORIZED,
        message: "Internal server error. Please try again after sometime",
        error: err,
      },
      res
    );
  }
};

exports.getStaffSections = async (req, res) => {
  try {
    let staffId = parseInt(req.user.userId);
    let result = await prisma.teacher_standards.findMany({
      where: {
        teacher_id: staffId,
        is_active: true,
        is_deleted: false,
        school_id: parseInt(req.user.schoolId),
      },
      include: {
        standard: true,
      },
      orderBy: [
        {
          standard: {
            standard: "asc",
          },
        },
        {
          standard: {
            section: "asc",
          },
        },
      ],
    });
    res.status(httpStatus.OK).send({
      message: "Sections fetched successfully",
      success: true,
      data: result,
    });
  } catch (err) {
    console.log("Error", err);
    return error(
      {
        statusCode: httpStatus.UNAUTHORIZED,
        message: "Internal server error. Please try again after sometime",
        error: err,
      },
      res
    );
  }
};

exports.getStaffSectionStudents = async (req, res) => {
  try {
    let sectionId = parseInt(req.params.sectionId);
    let termId = req.query.term ? parseInt(req.query.term) : "";
    let paymentStatus = req.query.status || "";
    let searchFilter = req.query.search || "";
    let whereConditions = {
      standard_id: sectionId,
      is_active: true,
      is_deleted: false,
    };
    if (termId) {
      whereConditions.fees_details = {
        some: {
          term: {
            equals: termId,
          },
        },
      };
    }
    if (paymentStatus) {
      const isPaid = paymentStatus === "paid";
      whereConditions.fees_details = {
        some: {
          ...whereConditions?.fees_details?.some,
          is_paid: {
            equals: isPaid,
          },
        },
      };
    }
    if (searchFilter) {
      whereConditions.OR = [
        {
          admission_number: {
            startsWith: searchFilter,
          },
        },
        {
          name: {
            contains: searchFilter,
          },
        },
      ];
    }
    let result = await prisma.students.findMany({
      where: whereConditions,
      include: {
        standard: true,
        fees_details: {
          include: {
            fees_transactions: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    res.status(httpStatus.OK).send({
      message: "Sections fetched successfully",
      success: true,
      data: result,
    });
  } catch (err) {
    console.log("error", err);
    return error(
      {
        statusCode: httpStatus.UNAUTHORIZED,
        message: "Internal server error. Please try again after sometime",
        error: err,
      },
      res
    );
  }
};

exports.getStaffStudentDetails = async (req, res) => {
  try {
    let studentId = parseInt(req.params.studentId);
    let schoolId = parseInt(req.user.schoolId);
    let result = await prisma.students.findMany({
      where: {
        id: studentId,
        is_active: true,
        is_deleted: false,
        school_id: schoolId,
      },
      include: {
        standard: true,
        fees_details: {
          include: {
            fees_transactions: true,
            academic_year: {
              where: {
                is_active: true,
                is_deleted: false,
              },
            },
          },
        },
      },
    });
    res.status(httpStatus.OK).send({
      message: "student details fetched successfully",
      success: true,
      data: result,
    });
  } catch (err) {
    console.log("error", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      message: "Internal server error. Please try again after sometimes",
      success: false,
      data: {},
    });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    let userId = parseInt(req.user.userId);
    let result = await prisma.students.findUnique({
      where: {
        id: userId,
      },
      include: {
        school: true,
      },
    });
    delete result.password;
    res.status(httpStatus.OK).send({
      message: "User details fetched successfully",
      success: true,
      data: result,
    });
  } catch (err) {
    console.log("error", err);
    return error(
      {
        statusCode: httpStatus.UNAUTHORIZED,
        message: "Internal server error. Please try again after sometime",
        error: err,
      },
      res
    );
  }
};

exports.getSectionDetails = async (req, res) => {
  try {
    let sectionId = parseInt(req.params.sectionId);
    let result = await prisma.standards.findUnique({
      where: {
        id: sectionId,
      },
    });
    res.status(httpStatus.OK).send({
      message: "Section detail fetched successfully",
      success: true,
      data: result,
    });
  } catch (err) {
    console.log("Error", err);
    return error(
      {
        statusCode: httpStatus.UNAUTHORIZED,
        message: "Internal server error. Please try again after sometime",
        error: err,
      },
      res
    );
  }
};

exports.getStudentDetails = async (req, res) => {
  try {
    let studentId = parseInt(req.params.studentId);
    let userDetails = await prisma.students.findFirst({
      where: {
        id: studentId,
      },
      include: {
        standard: true,
        fees_details: {
          include: {
            fees_transactions: true,
          },
          orderBy: {
            term: "asc",
          },
        },
      },
    });
    delete userDetails.password;
    res.status(httpStatus.OK).send({
      message: "Student details fetched successfully.",
      success: true,
      data: userDetails,
    });
  } catch (err) {
    console.log(err);
    return error(
      {
        statusCode: httpStatus.UNAUTHORIZED,
        message: "Internal server error. Please try again after sometime",
        error: err,
      },
      res
    );
  }
};

exports.resetPasswordWithAuth = async (req, res) => {
  try {
    let teacherId = parseInt(req.user.userId);
    let password = req.body.password;
    let hashedPassword = hashPassword(password);
    await prisma.teachers.update({
      where: {
        id: teacherId,
      },
      data: {
        password: hashedPassword,
      },
    });
    res.status(httpStatus.OK).send({
      message: "Password resetted successfully.",
      success: true,
      data: {},
    });
  } catch (err) {
    console.log(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      message: "Internal server error. Please try again",
      success: false,
      data: {},
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    let email = req.body.email;
    let userDetails = await prisma.teachers.findUnique({
      where: {
        email: email,
      },
    });
    if (!userDetails) {
      return res.status(httpStatus.NOT_FOUND).send({
        message: "Invalid email or email not found",
        success: false,
        data: {},
      });
    }
    let template = fs.readFileSync(
      "emailTemplates/forgotPassword.html",
      "utf-8"
    );
    let token = generateAccesToken(
      {
        userId: userDetails.id,
        email: userDetails.email,
        userType: "teacher",
        schoolId: userDetails.school_id,
      },
      "30m"
    );
    let html = template
      .replace("{{name}}", userDetails.name)
      .replace(
        /{{resetLink}}/g,
        process.env.RESET_PASSWORD_FRONTEND_HOST + token
      );
    await emailService.sendEmail({
      from: process.env.SMTP_EMAIL,
      to: "surya.ucea@gmail.com",
      subject: "Reset password",
      html: html,
    });
    res.status(httpStatus.OK).send({
      message:
        "Reset password link has been sent to your email. Kindly check the email and proceed further",
      success: true,
      data: { token },
    });
  } catch (err) {
    console.log(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      message: "Error sending email. Please try again after sometime",
      success: false,
      data: {},
      error: err,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    let token = req.params.token;
    let password = req.body.password;
    if (!token) {
      res.status(httpStatus.CONFLICT).send({
        message: "Reset password link is invalid or expired",
        success: false,
        data: {},
      });
    }
    const jwtSecret = process.env.JWT_SECRET;
    let jwtData = jwt.verify(token, jwtSecret, (err, payload) => {
      if (err) {
        return {
          error: err,
          data: {},
          success: false,
        };
      }
      return { data: payload, success: true };
    });
    if (jwtData.success) {
      let userData = JSON.parse(jwtData.data.data);
      let hashedPassword = hashPassword(password);
      await prisma.teachers.update({
        data: {
          password: hashedPassword,
        },
        where: {
          id: parseInt(userData.userId),
        },
      });
      res.status(httpStatus.OK).send({
        message: "Password changed successfully. ",
        success: true,
        data: {},
      });
    } else {
      res.status(httpStatus.CONFLICT).send({
        message: "Reset password link expired",
        success: true,
        data: {},
      });
    }
  } catch (err) {
    console.log(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      message: err.message,
      success: false,
      data: {},
      error: err,
    });
  }
};
