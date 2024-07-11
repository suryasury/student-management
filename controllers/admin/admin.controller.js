const httpStatus = require("http-status");
const { PrismaClient } = require("@prisma/client");
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
let crypto = require("crypto");
const path = require("path");
const { createObjectCsvWriter } = require("csv-writer");

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
          }),
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
      }),
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
      }),
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
      }),
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

exports.transactionHistoryDownload = async (req, res) => {
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

    let feesTransactions = await prisma.fees_transaction.findMany({
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
      orderBy: [
        {
          created_at: "desc",
        },
      ],
    });

    if (feesTransactions.length === 0) {
      return res.status(httpStatus.CONFLICT).send({
        success: false,
        message: "No transaction found for selected filter to download",
        data: {},
      });
    }

    const months = {
      1: {
        long: "January",
        short: "JAN",
      },
      2: {
        long: "February",
        short: "FEB",
      },
      3: {
        long: "March",
        short: "MAR",
      },
      4: {
        long: "April",
        short: "APR",
      },
      5: {
        long: "May",
        short: "MAY",
      },
      6: {
        long: "June",
        short: "JUN",
      },
      7: {
        long: "July",
        short: "JUL",
      },
      8: {
        long: "August",
        short: "AUG",
      },
      9: {
        long: "September",
        short: "SEP",
      },
      10: {
        long: "October",
        short: "OCT",
      },
      11: {
        long: "November",
        short: "NOV",
      },
      12: {
        long: "December",
        short: "DEC",
      },
    };

    let academicYears = await prisma.academic_years.findMany();

    let academicYearMap = {};

    academicYears.forEach((academicYear) => {
      academicYearMap[academicYear.id] =
        (months[academicYear.academic_month_from].short +
          " " +
          academicYear.academic_year_from || "NA") +
        " - " +
        (months[academicYear.academic_month_to].short +
          " " +
          academicYear.academic_year_to || "NA");
    });

    let headers = [
      {
        id: "admissionNumber",
        title: "Admission Number",
      },
      {
        id: "name",
        title: "Student Name",
      },
      {
        id: "term",
        title: "Term",
      },
      {
        id: "academicYear",
        title: "Academic Year",
      },
      {
        id: "standard",
        title: "Standard & section",
      },
      {
        id: "amountPaid",
        title: "Amount Paid(RS.)",
      },
      {
        id: "paidVia",
        title: "Payed Through",
      },
      {
        id: "paymentMethod",
        title: "Mode of Payment",
      },
      {
        id: "referenceNo",
        title: "Reference Number",
      },
      {
        id: "paymentDate",
        title: "Payment Date",
      },
    ];

    let data = feesTransactions.map((feesData) => {
      let feesobj = {
        admissionNumber:
          feesData.fees_detail.student.admission_number.toString(),
        name: feesData.fees_detail.student.name.toUpperCase(),
        term: feesData.fees_detail.term,
        academicYear: academicYearMap[feesData.fees_detail.academic_year_id],
        standard:
          feesData.fees_detail.standard.standard +
          " - " +
          feesData.fees_detail.standard.section,
        amountPaid: feesData.amount_paid.toFixed(1),
        paidVia: feesData.fees_detail.payed_through,
        paymentMethod: feesData.payment_mode,
        referenceNo: "NA",
        paymentDate: new Date(feesData.created_at).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "IST",
        }),
      };
      return feesobj;
    });

    let fileName = `transactionhistory_${new Date()
      .toISOString()
      .substring(0, 10)}.csv`;

    const csvWriter = createObjectCsvWriter({
      path: path.join(__dirname, fileName),
      header: headers,
    });

    csvWriter
      .writeRecords(data)
      .then(() => {
        const filePath = path.join(__dirname, fileName);
        const fileStream = fs.createReadStream(filePath);

        res.header("Access-Control-Expose-Headers", "Content-Disposition");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${encodeURIComponent(fileName)}`,
        );

        fileStream.pipe(res);
        res.on("finish", () => {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error("Error deleting CSV file", err);
            } else {
              console.log("CSV file deleted successfully");
            }
          });
        });
      })
      .catch((err) => {
        console.error("Error writing CSV:", err);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
          success: false,
          message: "Error downloading file. please try again",
          data: {},
          error: err,
        });
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
        total_payable: feesDetails.total_amount + feesDetails.sc_fees,
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
      schoolDetails.academic_year_end_month,
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
        total_payable: feesDetails.total_amount + feesDetails.sc_fees,
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
        message: `Student with given admission number already exists. Status - ${status}`,
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
      schoolDetails.academic_year_end_month,
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
        total_payable: studentData.termOneFees + studentData.termOneSCFees,
      });
    }
    if (studentData.termTwoFees) {
      termFeesData.push({
        term: 2,
        total_amount: studentData.termTwoFees,
        is_paid: false,
        sc_fees: studentData.termTwoSCFees,
        due_date: studentData.termTwoDueDate,
        total_payable: studentData.termTwoFees + studentData.termTwoSCFees,
      });
    }
    if (studentData.termThreeFees) {
      termFeesData.push({
        term: 3,
        total_amount: studentData.termThreeFees,
        is_paid: false,
        sc_fees: studentData.termThreeSCFees,
        due_date: studentData.termThreeDueDate,
        total_payable: studentData.termThreeFees + studentData.termThreeSCFees,
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
      }),
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

// exports.getStandardList = async (req, res) => {
//   try {
//     let timeZoneOffset = req.headers.timezoneoffset;
//     let result =
//       await prisma.$queryRaw`SELECT id, standard, section, CONVERT_TZ(created_at, "+00:00", ${timeZoneOffset}) as created_at FROM standards WHERE is_deleted = 0`;
//     res.status(httpStatus.OK).send({
//       success: true,
//       message: "Standard list fetched successfully",
//       data: result,
//     });
//   } catch (err) {
//     res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
//       success: true,
//       message: "Internal server error. Please try again later.",
//       data: {},
//       error: err,
//     });
//   }
// };

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

exports.getAcademicYearList = async (_req, res) => {
  try {
    let result = await prisma.academic_years.findMany({
      where: {
        is_active: true,
        is_deleted: false,
      },
      orderBy: {
        created_at: "desc",
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
    let feesDetails = await prisma.fees_details.update({
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
        fee_detail_id: feesDetails.id,
        transaction_date: recordedFees.paymentDate,
        utr_number: recordedFees.referenceNumber,
        amount_paid: feesDetails.total_payable,
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
      res,
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
      orderBy: [
        {
          standard: "asc",
        },
        {
          section: "desc",
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
      res,
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
      res,
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
              students: {
                where: {
                  is_active: true,
                  is_deleted: false,
                },
              },
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
      res,
    );
  }
};

exports.markStudentActive = async (req, res) => {
  try {
    let studentId = parseInt(req.params.studentId);
    let academicYear = await prisma.academic_years.findFirst({
      orderBy: {
        created_at: "desc",
      },
    });
    let result = await prisma.students.update({
      where: {
        id: studentId,
      },
      data: {
        academic_year_id: academicYear.id,
        is_active: true,
        is_deleted: false,
      },
    });
    res.status(httpStatus.OK).send({
      message: "Student marked as active.",
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
      res,
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
      res,
    );
  }
};

exports.getStudentList = async (req, res) => {
  try {
    let sectionId = req.query.section ? parseInt(req.query.section) : "";
    let termId = req.query.term ? parseInt(req.query.term) : "";
    let paymentStatus = req.query.status || "";
    let studentStatus = req.query.studentStatus || "";
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
    if (studentStatus) {
      if (studentStatus === "inactive") {
        whereConditions.is_active = false;
        whereConditions.is_deleted = true;
      } else {
        whereConditions.is_active = true;
        whereConditions.is_deleted = false;
      }
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
      res,
    );
  }
};

exports.downloadStudentList = async (req, res) => {
  try {
    let sectionId = req.query.section ? parseInt(req.query.section) : "";
    let termId = req.query.term ? parseInt(req.query.term) : "";
    let paymentStatus = req.query.status || "";
    let studentStatus = req.query.studentStatus || "";
    let searchFilter = req.query.search || "";
    let whereConditions = {
      is_active: true,
      is_deleted: false,
    };
    if (sectionId) {
      whereConditions.standard_id = sectionId;
    }
    if (studentStatus) {
      if (studentStatus === "inactive") {
        whereConditions.is_active = false;
        whereConditions.is_deleted = true;
      } else {
        whereConditions.is_active = true;
        whereConditions.is_deleted = false;
      }
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
    let studentList = await prisma.students.findMany({
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
    });

    if (studentList.length === 0) {
      return res.status(httpStatus.CONFLICT).send({
        success: false,
        message: "No Students found for selected filter to download",
        data: {},
      });
    }

    let headers = [
      {
        id: "admissionNumber",
        title: "Admission Number",
      },
      {
        id: "name",
        title: "Student Name",
      },
      {
        id: "standard",
        title: "Standard & section",
      },
      {
        id: "fatherName",
        title: "Father/Guardian Name",
      },
      {
        id: "mobileNumber",
        title: "Mobile Number",
      },
      {
        id: "termOne",
        title: "Term One",
      },
      {
        id: "termTwo",
        title: "Term Two",
      },
      {
        id: "termThree",
        title: "Term Three",
      },
    ];

    const getFeesStatus = (feedDetails, term) => {
      let feeDetail = feedDetails.find((fee) => fee.term === term);
      if (feeDetail) {
        if (feeDetail.is_paid) {
          return "Paid";
        }
        return "Pending";
      }
      return "No Data";
    };

    let formattedStudentData = studentList.map((studentData) => {
      return {
        admissionNumber: studentData.admission_number,
        name: studentData.name,
        fatherName: studentData.father_name,
        mobileNumber: studentData.primary_mobile_no,
        standard:
          studentData.standard.standard + " - " + studentData.standard.section,
        termOne: getFeesStatus(studentData.fees_details, 1),
        termTwo: getFeesStatus(studentData.fees_details, 2),
        termThree: getFeesStatus(studentData.fees_details, 3),
      };
    });

    let fileName = `studentDetails_${new Date()
      .toISOString()
      .substring(0, 10)}.csv`;

    const csvWriter = createObjectCsvWriter({
      path: path.join(__dirname, fileName),
      header: headers,
    });

    csvWriter
      .writeRecords(formattedStudentData)
      .then(() => {
        const filePath = path.join(__dirname, fileName);
        const fileStream = fs.createReadStream(filePath);

        res.header("Access-Control-Expose-Headers", "Content-Disposition");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${encodeURIComponent(fileName)}`,
        );

        fileStream.pipe(res);
        res.on("finish", () => {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error("Error deleting CSV file", err);
            } else {
              console.log("CSV file deleted successfully");
            }
          });
        });
      })
      .catch((err) => {
        console.error("Error writing CSV:", err);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
          success: false,
          message: "Error downloading file. please try again",
          data: {},
          error: err,
        });
      });
  } catch (err) {
    console.log("error", err);
    return error(
      {
        statusCode: httpStatus.UNAUTHORIZED,
        message: "Internal server error. Please try again after sometime",
        error: err,
      },
      res,
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
                      schoolDetails.academic_year_end_month,
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
                      termOne.total_payable =
                        termOne.total_amount + termOne.sc_fees;
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
                      termTwo.total_payable =
                        termTwo.total_amount + termTwo.sc_fees;
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
                      termThree.total_payable =
                        termThree.total_amount + termThree.sc_fees;
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
                      }),
                    );
                    resolve("success");
                  } catch (err) {
                    reject(err);
                  }
                });
              }),
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
      "utf-8",
    );
    let token = generateAccesToken(
      {
        userId: userDetails.id,
        email: userDetails.email,
        userType: "admin",
        schoolId: userDetails.school_id,
      },
      "30m",
    );
    let html = template
      .replace("{{name}}", userDetails.name)
      .replace(
        /{{resetLink}}/g,
        process.env.RESET_PASSWORD_FRONTEND_HOST_ADMIN + token,
      );
    await emailService.sendEmail({
      from: process.env.SMTP_EMAIL,
      to: userDetails.email,
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

exports.paymentWebHooks = async (req, res) => {
  try {
    let paymentDetails = req.body;

    const shasum = crypto.createHmac("sha256", process.env.RP_WEBHOOK_SECRET);

    shasum.update(JSON.stringify(paymentDetails));

    const digest = shasum.digest("hex");

    if (digest === req.headers["x-razorpay-signature"]) {
      let event = paymentDetails.event;

      if (event === "payment.captured") {
        let paymentResponse = paymentDetails.payload.payment.entity;

        let notesObj = paymentResponse.notes;

        let feesIds = Object.values(notesObj);
        await Promise.allSettled(
          feesIds.map((id) => {
            return new Promise(async (resolve, reject) => {
              try {
                let feesDetails = await prisma.fees_details.update({
                  where: {
                    id,
                  },
                  data: {
                    is_paid: true,
                    payed_through: "Online",
                  },
                });
                let feesTransactions = await prisma.fees_transaction.findFirst({
                  where: {
                    fee_detail_id: feesDetails.id,
                    school_id: feesDetails.school_id,
                  },
                });
                if (!feesTransactions) {
                  await prisma.fees_transaction.create({
                    data: {
                      fee_detail_id: id,
                      amount_paid: feesDetails.total_payable,
                      transaction_date: new Date(),
                      payment_mode: paymentResponse.method.toUpperCase(),
                      wallet_provider: (
                        paymentResponse.wallet || ""
                      ).toUpperCase(),
                      school_id: feesDetails.school_id,
                      pg_gateway: "RAZORPAY",
                      order_id: paymentResponse.order_id,
                      payment_id: paymentResponse.id,
                    },
                  });
                }
                resolve();
              } catch (err) {
                reject(err);
              }
            });
          }),
        );
      }
      return res.status(200).send({
        success: true,
        message: "Success",
        data: {},
      });
    } else {
      return res.status(400).send({
        success: false,
        message: "Signature doesnt match",
        data: {},
      });
    }
  } catch (err) {
    console.log("errr", err);
    error(err, res);
  }
};

exports.downloadMasterTemplate = async (_req, res) => {
  try {
    const filePath = "../emailTemplates/studentMasterDataTemplate.csv";
    res.download(filePath, (err) => {
      if (err) {
        return res.status(httpStatus.OK).send({
          message: "Failed to download file.",
          success: false,
          data: {},
          error: err,
        });
      }
    });
    res.status(httpStatus.OK).send({
      message: "File downloaded successfully.",
      success: true,
      data: filePath,
    });
  } catch (err) {
    console.log("webhooks", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      message: err?.message || err.message,
      success: false,
      data: {},
      error: err,
    });
  }
};

exports.dashBoardMerticsOverview = async (req, res) => {
  try {
    let schoolId = parseInt(req.user.schoolId);
    let academicYear = req.query.academicYear;
    let term = req.query.term;
    let section = req.query.section;
    let whereClause = {
      school_id: schoolId,
    };
    if (academicYear) {
      whereClause.academic_year_id = parseInt(academicYear);
    }
    if (term) {
      whereClause.term = parseInt(term);
    }
    if (section) {
      whereClause.standard_id = parseInt(section);
    }
    let [totalFees, totalFeesCollected, totalFeesPending] =
      await prisma.$transaction([
        prisma.fees_details.aggregate({
          where: whereClause,
          _sum: {
            total_payable: true,
          },
        }),
        prisma.fees_details.aggregate({
          where: {
            is_paid: true,
            ...whereClause,
          },
          _sum: {
            total_payable: true,
          },
        }),
        prisma.fees_details.aggregate({
          where: {
            is_paid: false,
            ...whereClause,
          },
          _sum: {
            total_payable: true,
          },
        }),
      ]);
    res.status(httpStatus.OK).send({
      message: "Metrics fetched successfully",
      success: true,
      data: {
        totalFees: totalFees._sum.total_payable || 0,
        totalFeesCollected: totalFeesCollected._sum.total_payable || 0,
        totalFeesPending: totalFeesPending._sum.total_payable || 0,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      message: err?.message || err.message,
      success: false,
      data: {},
      error: err,
    });
  }
};
