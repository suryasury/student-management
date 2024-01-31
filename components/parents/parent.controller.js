const httpStatus = require("http-status");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const error = require("../../helpers/errorHandler");
const validatePassword = require("../../helpers/validatePassword");
const generateAccesToken = require("../../helpers/generateAccessToken");
const hashPassword = require("../../helpers/hashPassword");

exports.login = async (req, res) => {
  try {
    let admissionNo = req.body.admissionNo;
    let password = req.body.password;

    let userDetails = await prisma.students.findFirst({
      where: {
        admission_number: admissionNo,
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
          .send({ message: "Student not found", success: false, data: {} });
      }
      let isValidPassword = validatePassword(password, userDetails.password);
      if (isValidPassword) {
        let jwtToken = generateAccesToken({
          userId: userDetails.id,
          email: userDetails?.email || "",
          userType: "parent",
          schoolId: userDetails.school_id,
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
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      message: "Internal server error. Please try again",
      success: false,
      data: {},
    });
  }
};

exports.getFeesDetails = async (req, res) => {
  try {
    let studentId = parseInt(req.user.userId);
    let feesDetails = await prisma.fees_details.findMany({
      where: {
        student_id: studentId,
      },
      include: {
        academic_year: true,
        fees_transactions: true,
        standard: true,
      },
      orderBy: {
        term: "asc",
      },
    });
    res.status(httpStatus.OK).send({
      message: "Fees details fetched successfully.",
      success: true,
      data: feesDetails,
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

exports.getStudentDetails = async (req, res) => {
  try {
    let studentId = parseInt(req.user.userId);
    let userDetails = await prisma.students.findFirst({
      where: {
        id: studentId,
      },
      include: {
        school: true,
        standard: true,
      },
    });
    delete userDetails.password;
    res.status(httpStatus.OK).send({
      message: "User details fetched successfully.",
      success: true,
      data: userDetails,
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

exports.resetPasssword = async (req, res) => {
  try {
    let studentId = parseInt(req.user.userId);
    let password = req.body.password;
    let hashedPassword = hashPassword(password);
    await prisma.students.update({
      where: {
        id: studentId,
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
