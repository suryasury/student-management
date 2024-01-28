const httpStatus = require("http-status");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const error = require("../../helpers/errorHandler");
const validatePassword = require("../../helpers/validatePassword");
const generateAccesToken = require("../../helpers/generateAccessToken");
const csv = require("fast-csv");

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
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      message: "Internal server error. Please try again after sometimes",
      success: false,
      data: {},
    });
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
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      message: "Internal server error. Please try again after sometimes",
      success: false,
      data: {},
    });
  }
};

exports.getStaffSectionStudents = async (req, res) => {
  try {
    let sectionId = parseInt(req.params.sectionId);
    let termId = req.query.term ? parseInt(req.query.term) : "";
    let paymentStatus = req.query.status || "";
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
    let result = await prisma.students.findMany({
      where: whereConditions,
      include: {
        standard: true,
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
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      message: "Internal server error. Please try again after sometimes",
      success: false,
      data: {},
    });
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
