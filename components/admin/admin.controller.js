const httpStatus = require("http-status");
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const error = require("../../helpers/errorHandler");
const hashPassword = require("../../helpers/hashPassword");
const validatePassword = require("../../helpers/validatePassword");
const generateAccesToken = require("../../helpers/generateAccessToken");
const csv = require("fast-csv");
const getCurrentAcademicYear = require("../../utils/getCurrentAcademicYear");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const emailService = require("../../utils/emailService");
const moment = require("moment");

exports.createAdmin = async (req, res) => {
  try {
    let adminDetails = req.body;
    let password = hashPassword(req.body.mobileNumber);
    let schoolId = parseInt(req.user.schoolId);
    let checkExistingRecord = await prisma.admins.findUnique({
      where: {
        adminUniqueIdentifier: {
          email: adminDetails.email,
          school_id: schoolId,
        },
      },
    });
    if (checkExistingRecord) {
      return res.status(httpStatus.CONFLICT).send({
        success: true,
        message: "Email already exists.",
        data: {},
      });
    } else {
      await prisma.admins.create({
        data: {
          name: adminDetails.name,
          password: password,
          school_id: schoolId,
          email: adminDetails.email,
          password: password,
          mobileNumber: adminDetails.mobileNumber,
        },
      });
      return res.status(httpStatus.OK).send({
        success: true,
        message: "Admin created successfully.",
        data: {},
      });
    }
  } catch (err) {
    console.log("err", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.updateAdminDetails = async (req, res) => {
  try {
    let adminDetails = req.body;
    await prisma.admins.update({
      where: {
        id: adminDetails.id,
      },
      data: {
        name: adminDetails.name,
        mobileNumber: adminDetails.mobileNumber,
      },
    });
    return res.status(httpStatus.OK).send({
      success: true,
      message: "Admin details updated successfully.",
      data: {},
    });
  } catch (err) {
    error(err, res);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.getAdminDetails = async (req, res) => {
  try {
    let adminId = parseInt(req.user.userId);
    let result = await prisma.admins.findUnique({
      where: {
        id: adminId,
        is_active: true,
        is_deleted: false,
      },
      select: {
        name: true,
        email: true,
      },
    });
    return res.status(httpStatus.OK).send({
      success: true,
      message: "Admin details fetched successfully.",
      data: result,
    });
  } catch (err) {
    console.log("err", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    let adminId = parseInt(req.params.adminId);
    await prisma.admins.delete({
      where: {
        id: adminId,
      },
    });
    return res.status(httpStatus.OK).send({
      success: true,
      message: "Admin deleted successfully.",
      data: {},
    });
  } catch (err) {
    console.log("err", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.deleteStaffDetails = async (req, res) => {
  try {
    let teacherId = parseInt(req.params.teacherId);
    let schoolId = parseInt(req.user.schoolId);
    let teacherDetails = await prisma.teachers.findUnique({
      where: {
        id: teacherId,
      },
    });
    if (teacherDetails) {
      let mappedSections = await prisma.teacher_standards.findMany({
        where: {
          teacher_id: teacherDetails.id,
          school_id: schoolId,
        },
      });
      if (mappedSections.length > 0) {
        await Promise.all(
          mappedSections.map(async (sectionMapping) => {
            try {
              await prisma.teacher_standards.delete({
                where: {
                  teacherStandardUniqueIdentifiers: {
                    school_id: schoolId,
                    standard_id: sectionMapping.standard_id,
                    teacher_id: teacherDetails.id,
                  },
                },
              });
            } catch (err) {
              throw err;
            }
          })
        );
      }
      await prisma.teachers.delete({
        where: {
          id: teacherId,
        },
      });
      return res.status(httpStatus.OK).send({
        success: true,
        message: "Staff deleted successfully.",
        data: {},
      });
    } else {
      return res.status(httpStatus.NOT_FOUND).send({
        success: true,
        message: "Data not found.",
        data: {},
      });
    }
  } catch (err) {
    console.log("error", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.updateStaffDetails = async (req, res) => {
  try {
    let schoolId = parseInt(req.user.schoolId);
    let teacherDetails = await prisma.teachers.update({
      where: {
        id: parseInt(req.body.id),
      },
      data: {
        teacherId: req.body.teacherId,
        name: req.body.teacherName,
        email: req.body.teacherEmail,
        mobile_number: req.body.teacherMobileNumber,
      },
    });
    let sectionIdArray = req.body.sections;
    let removedSections = req.body.removedSections;

    await Promise.all(
      removedSections.map(async (sectionId) => {
        try {
          await prisma.teacher_standards.delete({
            where: {
              teacherSchoolIdentifiers: {
                school_id: schoolId,
                standard_id: sectionId,
              },
            },
          });
        } catch (err) {
          throw err;
        }
      })
    );

    await Promise.all(
      sectionIdArray.map(async (sectionId) => {
        try {
          await prisma.teacher_standards.upsert({
            where: {
              teacherSchoolIdentifiers: {
                school_id: schoolId,
                standard_id: sectionId,
              },
            },
            update: {
              teacher_id: teacherDetails.id,
            },
            create: {
              school_id: schoolId,
              standard_id: sectionId,
              teacher_id: teacherDetails.id,
            },
          });
        } catch (err) {
          throw err;
        }
      })
    );
    res.status(httpStatus.OK).send({
      success: true,
      message: "Staff details updated successfully.",
      data: {},
    });
  } catch (err) {
    console.log("err", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.createStaffs = async (req, res) => {
  try {
    let password = hashPassword(req.body.teacherMobileNumber);
    let schoolId = parseInt(req.user.schoolId);
    const checkIsUserExist = await prisma.teachers.findFirst({
      where: {
        school_id: schoolId,
        OR: [
          {
            email: req.body.teacherEmail,
          },
          {
            teacherId: req.body.teacherId,
          },
        ],
      },
    });
    if (checkIsUserExist) {
      return res.status(httpStatus.CONFLICT).send({
        success: true,
        message: "A teacher with this email or ID already exists.",
        data: {},
      });
    }
    let teacherDetails = await prisma.teachers.create({
      data: {
        teacherId: req.body.teacherId,
        name: req.body.teacherName,
        school_id: schoolId,
        email: req.body.teacherEmail,
        password: password,
        need_password_reset: true,
        mobile_number: req.body.teacherMobileNumber,
      },
    });
    let sectionIdArray = req.body.sections;
    await Promise.all(
      sectionIdArray.map(async (sectionId) => {
        try {
          await prisma.teacher_standards.upsert({
            where: {
              teacherSchoolIdentifiers: {
                school_id: schoolId,
                standard_id: sectionId,
              },
            },
            update: {
              teacher_id: teacherDetails.id,
            },
            create: {
              school_id: schoolId,
              standard_id: sectionId,
              teacher_id: teacherDetails.id,
            },
          });
        } catch (err) {
          throw err;
        }
      })
    );
    res.status(httpStatus.OK).send({
      success: true,
      message: "Staff created successfully.",
      data: {},
    });
  } catch (err) {
    console.log("err", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.deleteFeesForStudent = async (req, res) => {
  try {
    let feesId = parseInt(req.params.feesId);
    let feesDetails = await prisma.fees_details.findUnique({
      where: {
        id: feesId,
      },
    });
    if (feesDetails) {
      if (feesDetails.is_paid) {
        return res.status(httpStatus.CONFLICT).send({
          success: true,
          message:
            "The fee you are attempting to delete has already been paid. Deletion cannot be performed.",
          data: {},
        });
      } else {
        await prisma.fees_details.delete({
          where: {
            id: feesId,
          },
        });
        return res.status(httpStatus.OK).send({
          success: true,
          message: "Fees Details deleted successfully.",
          data: {},
        });
      }
    } else {
      return res.status(httpStatus.NOT_FOUND).send({
        success: true,
        message: "Data not found.",
        data: {},
      });
    }
  } catch (err) {
    console.log("error", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.getFeesDetailsById = async (req, res) => {
  try {
    let feesId = parseInt(req.params.feesId);
    let result = await prisma.fees_details.findUnique({
      where: {
        id: feesId,
      },
      include: {
        student: true,
        fees_transactions: true,
        standard: true,
      },
    });
    return res.status(httpStatus.OK).send({
      success: true,
      message: "Fees details fetched successfully.",
      data: result,
    });
  } catch (err) {
    console.log("err", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.transactionHistory = async (req, res) => {
  try {
    let schoolId = parseInt(req.user.schoolId);
    let sectionId = req.query.section ? parseInt(req.query.section) : "";
    let termId = req.query.term ? parseInt(req.query.term) : "";
    let academicYear = req.query.academicYear
      ? parseInt(req.query.academicYear)
      : "";
    let searchFilter = req.query.search || "";
    let fromDate = req.query.from || "";
    let toDate = req.query.to || "";
    let limit = parseInt(req.query.limit || 10);
    let page = parseInt(req.query.page || 1);
    let skip = limit * (page - 1);
    let whereCondition = {
      school_id: schoolId,
    };
    if (fromDate && toDate) {
      whereCondition.created_at = {
        gte: new Date(moment(fromDate).startOf("day").utc().toISOString()),
        lte: new Date(moment(toDate).endOf("day").utc().toISOString()),
      };
    }
    if (termId) {
      whereCondition.fees_detail = {
        term: termId,
      };
    }
    if (academicYear) {
      whereCondition.fees_detail = {
        ...whereCondition?.fees_detail,
        academic_year_id: academicYear,
      };
    }
    if (sectionId) {
      whereCondition.fees_detail = {
        ...whereCondition?.fees_detail,
        standard_id: sectionId,
      };
    }

    if (searchFilter) {
      whereCondition.fees_detail = {
        ...whereCondition?.fees_detail,
        student: {
          OR: [
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
          ],
        },
      };
    }

    let [feesTransactions, count] = await prisma.$transaction([
      prisma.fees_transaction.findMany({
        where: whereCondition,
        include: {
          fees_detail: {
            include: {
              academic_year: true,
              student: true,
              standard: true,
            },
          },
        },
        skip: skip,
        take: limit,
        orderBy: [
          {
            created_at: "desc",
          },
        ],
      }),
      prisma.fees_transaction.count({
        where: whereCondition,
      }),
    ]);

    return res.status(httpStatus.OK).send({
      success: true,
      message: "Transactions fetched successfully.",
      data: {
        feesTransactions,
        count,
      },
    });
  } catch (err) {
    console.log("error", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.updateFeesDetails = async (req, res) => {
  try {
    let feesId = parseInt(req.params.feesId);
    await prisma.fees_details.update({
      where: {
        id: feesDetails.id,
      },
      data: {
        total_amount: feesDetails.total_amount,
        sc_fees: feesDetails.sc_fees,
        due_date: feesDetails.due_date,
      },
    });
    res.status(httpStatus.OK).send({
      success: true,
      message: "Fees Details updated successfully.",
      data: {},
    });
  } catch (err) {
    console.log("error", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.updateFeesDetails = async (req, res) => {
  try {
    let feesDetails = req.body;
    await prisma.fees_details.update({
      where: {
        id: feesDetails.id,
      },
      data: {
        total_amount: feesDetails.total_amount,
        sc_fees: feesDetails.sc_fees,
        due_date: feesDetails.due_date,
      },
    });
    res.status(httpStatus.OK).send({
      success: true,
      message: "Fees Details updated successfully.",
      data: {},
    });
  } catch (err) {
    console.log("error", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.createFeesDetails = async (req, res) => {
  try {
    let feesDetails = req.body;
    let schoolId = parseInt(req.user.schoolId);
    let schoolDetails = await prisma.schools.findUnique({
      where: {
        id: schoolId,
      },
    });
    let academicYearDetails = getCurrentAcademicYear(
      schoolDetails.academic_year_start_month,
      schoolDetails.academic_year_end_month
    );

    let academicYear = await prisma.academic_years.upsert({
      where: {
        acdyUniqueIdentifier: {
          ...academicYearDetails,
          school_id: schoolId,
        },
      },
      update: {
        ...academicYearDetails,
        is_active: true,
        is_deleted: false,
      },
      create: {
        ...academicYearDetails,
        school_id: schoolId,
      },
    });
    await prisma.fees_details.create({
      data: {
        term: feesDetails.term,
        total_amount: feesDetails.total_amount,
        is_paid: feesDetails.is_paid,
        sc_fees: feesDetails.sc_fees,
        due_date: feesDetails.due_date,
        student: {
          connect: { id: feesDetails.id },
        },
        standard: {
          connect: { id: feesDetails.section },
        },
        school: {
          connect: { id: schoolId },
        },
        academic_year: {
          connect: { id: academicYear.id },
        },
      },
    });
    res.status(httpStatus.OK).send({
      success: true,
      message: "Term fees created successfully.",
      data: {},
    });
  } catch (err) {
    console.log("error", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.updateStudentDetails = async (req, res) => {
  try {
    let studentData = req.body;
    let schoolId = parseInt(req.user.schoolId);
    let academicYear = await prisma.academic_years.findFirst({
      orderBy: {
        created_at: "desc",
      },
    });
    let result = await prisma.students.update({
      where: {
        id: parseInt(studentData.id),
      },
      data: {
        name: studentData.studentName,
        father_name: studentData.fathersName,
        mother_name: studentData?.mothersName || "",
        parent_email: studentData.parentEmail,
        primary_mobile_no: studentData.parentMobileNumber,
        alternate_mobile_number: studentData?.alternateMobileNumber || "",
        standard_id: studentData.section,
        email: studentData.parentEmail,
        academic_year_id: academicYear.id,
      },
    });

    await prisma.fees_details.updateMany({
      where: {
        school_id: schoolId,
        academic_year_id: academicYear.id,
        student_id: result.id,
        is_paid: false,
      },
      data: {
        standard_id: studentData.section,
      },
    });

    res.status(httpStatus.OK).send({
      success: true,
      message: "Student details updated successfully.",
      data: result,
    });
  } catch (err) {
    console.log("error", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.createStudent = async (req, res) => {
  try {
    let studentData = req.body;
    let schoolId = parseInt(req.user.schoolId);
    let existingStudentCheck = await prisma.students.findFirst({
      where: {
        admission_number: studentData.admissionNumber,
        school_id: schoolId,
      },
    });
    if (existingStudentCheck) {
      let status = "INACTIVE";
      if (existingStudentCheck.is_active) {
        status = "ACTIVE";
      }
      return res.status(httpStatus.CONFLICT).send({
        success: true,
        message: `Student already exists. Status - ${status}`,
        data: {},
      });
    }
    let schoolDetails = await prisma.schools.findUnique({
      where: {
        id: schoolId,
      },
    });
    let academicYearDetails = getCurrentAcademicYear(
      schoolDetails.academic_year_start_month,
      schoolDetails.academic_year_end_month
    );

    let academicYear = await prisma.academic_years.upsert({
      where: {
        acdyUniqueIdentifier: {
          ...academicYearDetails,
          school_id: schoolId,
        },
      },
      update: {
        ...academicYearDetails,
        is_active: true,
        is_deleted: false,
      },
      create: {
        ...academicYearDetails,
        school_id: schoolId,
      },
    });
    let hashedPassword = hashPassword(studentData.parentMobileNumber);
    let studentDetails = await prisma.students.create({
      data: {
        admission_number: studentData.admissionNumber,
        name: studentData.studentName,
        father_name: studentData.fathersName,
        mother_name: studentData?.mothersName || "",
        parent_email: studentData.parentEmail,
        primary_mobile_no: studentData.parentMobileNumber,
        alternate_mobile_number: studentData?.alternateMobileNumber || "",
        standard_id: studentData.section,
        password: hashedPassword,
        school_id: schoolId,
        academic_year_id: academicYear.id,
        email: studentData.parentEmail,
      },
    });

    let termFeesData = [];

    if (studentData.termOneFees) {
      termFeesData.push({
        term: 1,
        total_amount: studentData.termOneFees,
        is_paid: false,
        sc_fees: studentData.termOneSCFees,
        due_date: studentData.termOneDueDate,
      });
    }
    if (studentData.termTwoFees) {
      termFeesData.push({
        term: 2,
        total_amount: studentData.termTwoFees,
        is_paid: false,
        sc_fees: studentData.termTwoSCFees,
        due_date: studentData.termTwoDueDate,
      });
    }
    if (studentData.termThreeFees) {
      termFeesData.push({
        term: 3,
        total_amount: studentData.termThreeFees,
        is_paid: false,
        sc_fees: studentData.termThreeSCFees,
        due_date: studentData.termThreeDueDate,
      });
    }

    await Promise.all(
      termFeesData.map(async (fee) => {
        try {
          await prisma.fees_details.create({
            data: {
              ...fee,
              student: {
                connect: { id: studentDetails.id },
              },
              standard: {
                connect: { id: studentData.section },
              },
              school: {
                connect: { id: schoolId },
              },
              academic_year: {
                connect: { id: academicYear.id },
              },
            },
          });
        } catch (err) {
          throw err;
        }
      })
    );
    res.status(httpStatus.OK).send({
      success: true,
      message: "Student created successfully.",
      data: {},
    });
  } catch (err) {
    console.log("error", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.createStandards = async (req, res) => {
  try {
    let schoolId = parseInt(req.user.schoolId);
    let standardData = req.body;
    let existingSS = await prisma.standards.findFirst({
      where: {
        school_id: schoolId,
        standard: standardData.standard,
        section: standardData.section,
        is_active: true,
        is_deleted: false,
      },
    });

    if (existingSS) {
      res.status(httpStatus.CONFLICT).send({
        success: true,
        message: "Standard and section combination already exists.",
        data: {},
      });
    } else {
      let result = await prisma.standards.upsert({
        where: {
          standardsUniqueConstrain: {
            standard: req.body.standard,
            section: req.body.section,
            school_id: schoolId,
          },
        },
        create: {
          standard: req.body.standard,
          section: req.body.section,
          school_id: schoolId,
        },
        update: {
          is_active: true,
          is_deleted: false,
        },
      });
      if (standardData.teacherId) {
        await prisma.teacher_standards.create({
          data: {
            standard_id: result.id,
            teacher_id: parseInt(standardData.teacherId),
            school_id: schoolId,
          },
        });
      }
      res.status(httpStatus.OK).send({
        success: true,
        message: "Standard and section created successfully.",
        data: {},
      });
    }
  } catch (err) {
    console.log("err", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.getStandardList = async (req, res) => {
  try {
    let timeZoneOffset = req.headers.timezoneoffset;
    let result =
      await prisma.$queryRaw`SELECT id, standard, section, CONVERT_TZ(created_at, "+00:00", ${timeZoneOffset}) as created_at FROM standards WHERE is_deleted = 0`;
    res.status(httpStatus.OK).send({
      success: true,
      message: "Standard list fetched successfully",
      data: result,
    });
  } catch (err) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.getAdminList = async (req, res) => {
  try {
    let schoolId = parseInt(req.user.schoolId);
    let searchFilter = req.query.search || "";
    let limit = parseInt(req.query.limit || 10);
    let page = parseInt(req.query.page || 1);
    let skip = limit * (page - 1);
    let whereCondition = {
      is_active: true,
      is_deleted: false,
      school_id: schoolId,
    };
    if (searchFilter) {
      whereCondition.OR = [
        {
          name: {
            contains: searchFilter,
          },
        },
        {
          email: {
            contains: searchFilter,
          },
        },
      ];
    }
    let [adminList, count] = await prisma.$transaction([
      prisma.admins.findMany({
        skip: skip,
        take: limit,
        where: whereCondition,
      }),
      prisma.admins.count({
        where: whereCondition,
      }),
    ]);
    res.status(httpStatus.OK).send({
      success: true,
      message: "Admin list fetched successfully",
      data: {
        adminList,
        count,
      },
    });
  } catch (err) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.getAcademicYearList = async (req, res) => {
  try {
    let result = await prisma.academic_years.findMany({
      where: {
        is_active: true,
        is_deleted: false,
      },
    });
    res.status(httpStatus.OK).send({
      success: true,
      message: "Academic year list fetched successfully",
      data: result,
    });
  } catch (err) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};
exports.getStaffListMinified = async (req, res) => {
  try {
    let schoolId = parseInt(req.user.schoolId);
    let teachersList = await prisma.teachers.findMany({
      where: {
        school_id: schoolId,
        is_active: true,
        is_deleted: false,
      },
      select: {
        id: true,
        name: true,
        teacherId: true,
      },
    });
    res.status(httpStatus.OK).send({
      success: true,
      message: "Staff minified list fetched successfully.",
      data: teachersList,
    });
  } catch (err) {
    console.log("Error", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.getStaffList = async (req, res) => {
  try {
    let searchFilter = req.query.search || "";
    let limit = parseInt(req.query.limit || 10);
    let page = parseInt(req.query.page || 1);
    let skip = limit * (page - 1);
    let section = req.query.section && parseInt(req.query.section);
    let whereCondition = {
      school_id: parseInt(req.user.schoolId),
      is_deleted: false,
      is_active: true,
    };
    if (section) {
      whereCondition.standards = {
        some: {
          standard_id: {
            equals: section,
          },
        },
      };
    }
    if (searchFilter) {
      whereCondition.OR = [
        {
          name: {
            contains: searchFilter,
          },
        },
        {
          email: {
            contains: searchFilter,
          },
        },
        {
          teacherId: {
            startsWith: searchFilter,
          },
        },
      ];
    }
    let [teachersList, count] = await prisma.$transaction([
      prisma.teachers.findMany({
        skip: skip,
        take: limit,
        where: whereCondition,
        include: {
          standards: {
            include: {
              standard: true,
            },
          },
        },
      }),
      prisma.teachers.count({
        where: whereCondition,
      }),
    ]);
    res.status(httpStatus.OK).send({
      success: true,
      message: "Staff list fetched successfully.",
      data: {
        teachersList,
        count,
      },
    });
  } catch (err) {
    console.log("Error", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
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
    res.status(httpStatus.OK).send({
      success: true,
      message: "Teacher added to the section successfully",
      data: {},
    });
  } catch (err) {
    error(err, res);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.removeStaffFromStandard = async (req, res) => {
  try {
    await prisma.teacher_standards.delete({
      where: {
        id: parseInt(req.params.standardId),
      },
    });
    res.status(httpStatus.OK).send({
      success: true,
      message: "Teacher removed from the section successfully",
      data: {},
    });
  } catch (err) {
    error(err, res);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};

exports.recordOfflineFees = async (req, res) => {
  try {
    let recordedFees = req.body;
    let schoolId = parseInt(req.user.schoolId);
    let feedDetails = await prisma.fees_details.update({
      where: {
        id: parseInt(recordedFees.feesDetailsId),
      },
      data: {
        is_paid: true,
        payed_through: "Offline",
      },
    });
    await prisma.fees_transaction.create({
      data: {
        school_id: schoolId,
        payment_mode: recordedFees.paymentMode,
        transaction_id: recordedFees.referenceNumber,
        fee_detail_id: feedDetails.id,
        transaction_date: new Date(),
        utr_number: recordedFees.referenceNumber,
        amount_paid:
          feedDetails.total_amount + Number(feedDetails.sc_fees || 0),
      },
    });
    res.status(httpStatus.OK).send({
      message: "Fees recorded successfully",
      success: true,
      data: {},
    });
  } catch (err) {
    console.log("Error", err);
    return error(
      {
        statusCode: httpStatus.UNAUTHORIZED,
        message:
          err.message ||
          "Internal server error. Please try again after sometime",
        error: err,
      },
      res
    );
  }
};

exports.getAllSectionMinified = async (req, res) => {
  try {
    let schoolId = parseInt(req.user.schoolId);
    let result = await prisma.standards.findMany({
      where: {
        school_id: schoolId,
        is_active: true,
        is_deleted: false,
      },
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

exports.updateStandardTeacher = async (req, res) => {
  try {
    let schoolId = parseInt(req.user.schoolId);
    let staffData = req.body;
    let result = await prisma.teacher_standards.upsert({
      where: {
        standard_id: staffData.id,
        school_id: schoolId,
      },
      update: {
        teacher_id: staffData.teacherId,
      },
      create: {
        teacher_id: staffData.teacherId,
        standard_id: staffData.id,
        school_id: schoolId,
      },
    });
    res.status(httpStatus.OK).send({
      message: "Teacher mapped to the section successfully",
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

exports.getAllSections = async (req, res) => {
  try {
    let limit = parseInt(req.query.limit || 10);
    let page = parseInt(req.query.page || 1);
    let skip = limit * (page - 1);
    let schoolId = parseInt(req.user.schoolId);
    let [standardList, count] = await prisma.$transaction([
      prisma.standards.findMany({
        skip: skip,
        take: limit,
        where: {
          school_id: schoolId,
          is_active: true,
          is_deleted: false,
        },
        include: {
          teacher_standards: {
            include: {
              teacher: true,
            },
          },
          _count: {
            select: {
              students: true,
            },
          },
        },
        orderBy: [
          {
            standard: "asc",
          },
          {
            section: "asc",
          },
        ],
      }),
      prisma.standards.count({
        where: {
          school_id: schoolId,
          is_active: true,
          is_deleted: false,
        },
      }),
    ]);
    res.status(httpStatus.OK).send({
      message: "Sections fetched successfully",
      success: true,
      data: {
        standardList,
        count,
      },
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

exports.deleteStudent = async (req, res) => {
  try {
    let studentId = parseInt(req.params.studentId);
    let result = await prisma.students.update({
      where: {
        id: studentId,
      },
      data: {
        is_active: false,
        is_deleted: true,
      },
    });
    res.status(httpStatus.OK).send({
      message: "Student deleted successfully",
      success: true,
      data: result,
    });
  } catch (err) {
    console.log("Error", err);
    return error(
      {
        statusCode: httpStatus.UNAUTHORIZED,
        message:
          err.message ||
          "Internal server error. Please try again after sometime",
        error: err,
      },
      res
    );
  }
};

exports.getStudentList = async (req, res) => {
  try {
    let sectionId = req.query.section ? parseInt(req.query.section) : "";
    let termId = req.query.term ? parseInt(req.query.term) : "";
    let paymentStatus = req.query.status || "";
    let searchFilter = req.query.search || "";
    let limit = parseInt(req.query.limit || 10);
    let page = parseInt(req.query.page || 1);
    let skip = limit * (page - 1);
    let whereConditions = {
      is_active: true,
      is_deleted: false,
    };
    if (sectionId) {
      whereConditions.standard_id = sectionId;
    }
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
    let academicYear = await prisma.academic_years.findFirst({
      orderBy: {
        created_at: "desc",
      },
    });
    let [studentList, count] = await prisma.$transaction([
      prisma.students.findMany({
        skip: skip,
        take: limit,
        where: whereConditions,
        include: {
          standard: true,
          fees_details: {
            ...(academicYear?.id
              ? {
                  where: {
                    academic_year_id: academicYear.id,
                  },
                }
              : {}),
            include: {
              fees_transactions: true,
            },
          },
        },
        orderBy: {
          admission_number: "asc",
        },
      }),
      prisma.students.count({
        where: whereConditions,
      }),
    ]);

    res.status(httpStatus.OK).send({
      message: "Sections fetched successfully",
      success: true,
      data: { studentList, count },
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

exports.masterUploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({
        success: false,
        message: "Need a file to upload!!.",
        data: {},
      });
    }
    let schoolId = req.user.schoolId;
    let schoolDetails = await prisma.schools.findFirst({
      where: {
        id: schoolId,
      },
    });
    const buffer = req.file.buffer;
    const data = buffer.toString();
    const rows = [];
    await csv
      .parseString(data, { headers: true })
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", async () => {
        if (rows.length === 0) {
          return res.status(httpStatus.CONFLICT).send({
            success: false,
            message: "Sheet should not be empty",
            data: {},
          });
        } else {
          try {
            await Promise.allSettled(
              rows.map((row) => {
                new Promise(async (resolve, reject) => {
                  try {
                    let standardData = await prisma.standards.upsert({
                      where: {
                        standardsUniqueConstrain: {
                          standard: row.standard.toUpperCase(),
                          section: row.section.toUpperCase(),
                          school_id: parseInt(req.user.schoolId),
                        },
                      },
                      update: {
                        standard: row.standard.toUpperCase(),
                        section: row.section.toUpperCase(),
                        is_active: true,
                        is_deleted: false,
                      },
                      create: {
                        standard: row.standard.toUpperCase(),
                        section: row.section.toUpperCase(),
                        school_id: parseInt(req.user.schoolId),
                        is_active: true,
                        is_deleted: false,
                      },
                    });
                    let academicYearDetails = getCurrentAcademicYear(
                      schoolDetails.academic_year_start_month,
                      schoolDetails.academic_year_end_month
                    );
                    let academicYear = await prisma.academic_years.upsert({
                      where: {
                        acdyUniqueIdentifier: {
                          ...academicYearDetails,
                          school_id: parseInt(req.user.schoolId),
                        },
                      },
                      update: {
                        ...academicYearDetails,
                        is_active: true,
                        is_deleted: false,
                      },
                      create: {
                        ...academicYearDetails,
                        school_id: parseInt(req.user.schoolId),
                      },
                    });
                    let studentDetails = await prisma.students.upsert({
                      where: {
                        studentSchoolIdentifier: {
                          admission_number: row.admissionNo,
                          school_id: parseInt(req.user.schoolId),
                        },
                      },
                      update: {
                        name: row.studentName,
                        father_name: row.fathersName,
                        mother_name: row.mothersName,
                        primary_mobile_no: row.parentsMobileNo,
                        alternate_mobile_number:
                          row.parentsAlternateMobileNo || null,
                        parent_email: row.parentsEmail,
                        email: row.parentsEmail,
                        standard_id: standardData.id,
                        academic_year_id: academicYear.id,
                        password: hashPassword(row.parentsMobileNo),
                        is_deleted: false,
                        is_active: true,
                      },
                      create: {
                        name: row.studentName,
                        father_name: row.fathersName,
                        mother_name: row.mothersName,
                        primary_mobile_no: row.parentsMobileNo,
                        alternate_mobile_number:
                          row.parentsAlternateMobileNo || null,
                        parent_email: row.parentsEmail,
                        standard_id: standardData.id,
                        password: row.parentsMobileNo,
                        school_id: parseInt(req.user.schoolId),
                        admission_number: row.admissionNo,
                        academic_year_id: academicYear.id,
                        password: hashPassword(row.parentsMobileNo),
                        email: row.parentsEmail,
                      },
                    });
                    let termOne = {};
                    let termTwo = {};
                    let termThree = {};
                    if (row["term-1-fees"]) {
                      termOne.total_amount = parseInt(row["term-1-fees"]);
                      termOne.term = 1;
                      termOne.sc_fees = parseInt(row["term-1-sc"]);
                      if (row["term-1-dueDate"]) {
                        let [date, month, year] =
                          row["term-1-dueDate"].split("/");
                        termOne.due_date = `${year}/${month}/${date}`;
                      }
                    }
                    if (row["term-2-fees"]) {
                      termTwo.total_amount = parseInt(row["term-2-fees"]);
                      termTwo.term = 2;
                      termTwo.sc_fees = parseInt(row["term-2-sc"]) || 0;
                      if (row["term-2-dueDate"]) {
                        let [date, month, year] =
                          row["term-2-dueDate"].split("/");
                        termTwo.due_date = `${year}/${month}/${date}`;
                      }
                    }
                    if (row["term-3-fees"]) {
                      termThree.total_amount = parseInt(row["term-3-fees"]);
                      termThree.term = 3;
                      termThree.sc_fees = parseInt(row["term-3-sc"]) || 0;
                      if (row["term-3-dueDate"]) {
                        let [date, month, year] =
                          row["term-3-dueDate"].split("/");
                        termThree.due_date = `${year}/${month}/${date}`;
                      }
                    }
                    let feesPromiseArray = [];
                    if (Object.keys(termOne).length > 0) {
                      feesPromiseArray.push(termOne);
                    }
                    if (Object.keys(termTwo).length > 0) {
                      feesPromiseArray.push(termTwo);
                    }
                    if (Object.keys(termThree).length > 0) {
                      feesPromiseArray.push(termThree);
                    }
                    await Promise.allSettled(
                      feesPromiseArray.map((fee) => {
                        new Promise(async (resolve, reject) => {
                          try {
                            await prisma.fees_details.upsert({
                              where: {
                                studentFeesUniqueIndex: {
                                  student_id: studentDetails.id,
                                  term: fee.term,
                                  academic_year_id: academicYear.id,
                                  school_id: parseInt(req.user.schoolId),
                                },
                                // is_paid: false,
                              },
                              update: {
                                ...fee,
                                academic_year_id: academicYear.id,
                                standard_id: standardData.id,
                                student_id: studentDetails.id,
                                due_date: new Date(fee.due_date).toISOString(),
                              },
                              create: {
                                ...fee,
                                school_id: parseInt(req.user.schoolId),
                                academic_year_id: academicYear.id,
                                standard_id: standardData.id,
                                student_id: studentDetails.id,
                                due_date: new Date(fee.due_date).toISOString(),
                              },
                            });
                            resolve("success");
                          } catch (err) {
                            reject(err);
                          }
                        });
                      })
                    );
                    resolve("success");
                  } catch (err) {
                    reject(err);
                  }
                });
              })
            );
            return res.status(httpStatus.OK).send({
              success: true,
              message: "Students data uploaded successfully",
              data: {},
            });
          } catch (err) {
            return res.status(httpStatus.CONFLICT).send({
              success: false,
              message:
                err.message ||
                "Error while uploading student data. Please try again",
              data: {},
            });
          }
        }
      });
  } catch (err) {
    error(err, res);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
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
        return res
          .status(httpStatus.FORBIDDEN)
          .send({ message: "Access denied", success: false, data: {} });
      }
      let isValidPassword = validatePassword(password, userDetails.password);
      if (isValidPassword) {
        let jwtToken = generateAccesToken({
          userId: userDetails.id,
          email: userDetails.email,
          userType: "admin",
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
    console.log("err", err);
    error(err, res);
    // res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
    //   success: true,
    //   message: "Internal server error. Please try again later.",
    //   data: {},
    //   error: err,
    // });
  }
};

exports.resetPasswordWithAuth = async (req, res) => {
  try {
    let userId = parseInt(req.user.userId);
    let password = req.body.password;
    let hashedPassword = hashPassword(password);
    await prisma.admins.update({
      where: {
        id: userId,
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
    let userDetails = await prisma.admins.findUnique({
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
        userType: "admin",
        schoolId: userDetails.school_id,
      },
      "30m"
    );
    let html = template
      .replace("{{name}}", userDetails.name)
      .replace(
        /{{resetLink}}/g,
        process.env.RESET_PASSWORD_FRONTEND_HOST_ADMIN + token
      );
    // await emailService.sendEmail({
    //   from: process.env.SMTP_EMAIL,
    //   to: userDetails.email,
    //   subject: "Reset password",
    //   html: html,
    // });
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
      await prisma.admins.update({
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

// exports.getStaffList = async (req, res) => {
//   try {
//     let timeZoneOffset = req.headers.timezoneoffset;
//     let result =
//       await prisma.$queryRaw`SELECT id, name, email, is_active, CONVERT_TZ(created_at, "+00:00", ${timeZoneOffset}) as created_at FROM teachers where is_deleted = 0`;
//     res.status(200).send({
//       success: true,
//       message: "Staff list fetched successfully.",
//       data: result,
//     });
//   } catch (err) {
//     error(err, res);
//   }
// };
