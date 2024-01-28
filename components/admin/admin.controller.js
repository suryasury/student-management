const httpStatus = require("http-status");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const error = require("../../helpers/errorHandler");
const hashPassword = require("../../helpers/hashPassword");
const validatePassword = require("../../helpers/validatePassword");
const generateAccesToken = require("../../helpers/generateAccessToken");
const csv = require("fast-csv");
const getCurrentAcademicYear = require("../../utils/getCurrentAcademicYear");

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
    res.status(httpStatus.OK).send({
      success: true,
      message: "Admin created successfully.",
      data: result,
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
    res.status(httpStatus.OK).send({
      success: true,
      message: "Staff created successfully.",
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

exports.createStandards = async (req, res) => {
  try {
    let result = await prisma.standards.create({
      data: {
        standard: req.body.standard,
        section: req.body.section,
        school_id: req.body.school_id,
      },
    });
    res.status(httpStatus.OK).send({
      success: true,
      message: "Admins fetched successfully.",
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
    let timeZoneOffset = req.headers.timezoneoffset;
    let result =
      await prisma.$queryRaw`SELECT name, email, id, is_active, CONVERT_TZ(created_at, "+00:00", ${timeZoneOffset}) as created_at FROM admins where is_deleted = 0`;
    res.status(httpStatus.OK).send({
      success: true,
      message: "Admin list fetched successfully",
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

exports.getStaffList = async (req, res) => {
  try {
    let timeZoneOffset = req.headers.timezoneoffset;
    let result =
      await prisma.$queryRaw`SELECT id, name, email, is_active, CONVERT_TZ(created_at, "+00:00", ${timeZoneOffset}) as created_at FROM teachers where is_deleted = 0, is_active = 1, school_id = ${parseInt(
        req.user.schoolId
      )}`;
    res.status(httpStatus.OK).send({
      success: true,
      message: "Staff list fetched successfully.",
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
    csv
      .parseString(data, { headers: true })
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", async () => {
        await Promise.allSettled(
          rows.map((row) => {
            new Promise(async (resolve, reject) => {
              try {
                let standardData = await prisma.standards.upsert({
                  where: {
                    standardsUniqueConstrain: {
                      standard: row.standard,
                      section: row.section,
                      school_id: parseInt(req.user.schoolId),
                      is_active: true,
                      is_deleted: false,
                    },
                  },
                  update: { standard: row.standard, section: row.section },
                  create: {
                    standard: row.standard,
                    section: row.section,
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
                      is_active: true,
                      is_deleted: false,
                    },
                  },
                  update: {
                    ...academicYearDetails,
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
                      is_deleted: false,
                      is_active: true,
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
                    standard_id: standardData.id,
                    academic_year_id: academicYear.id,
                    password: hashPassword(row.parentsMobileNo),
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
                    let [date, month, year] = row["term-1-dueDate"].split("/");
                    termOne.due_date = `${year}/${month}/${date}`;
                  }
                }
                if (row["term-2-fees"]) {
                  termTwo.total_amount = parseInt(row["term-1-fees"]);
                  termTwo.term = 2;
                  termTwo.sc_fees = parseInt(row["term-2-sc"]) || 0;
                  termTwo.due_date = row["term-2-dueDate"];
                  if (row["term-2-dueDate"]) {
                    let [date, month, year] = row["term-2-dueDate"].split("/");
                    termTwo.due_date = `${year}/${month}/${date}`;
                  }
                }
                if (row["term-3-fees"]) {
                  termThree.total_amount = parseInt(row["term-1-fees"]);
                  termThree.term = 3;
                  termThree.sc_fees = parseInt(row["term-2-sc"]) || 0;
                  termThree.due_date = row["term-3-dueDate"];
                  if (row["term-3-dueDate"]) {
                    let [date, month, year] = row["term-3-dueDate"].split("/");
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
                              student_id: studentDetails.standard_id,
                              term: fee.term,
                              academic_year_id: academicYear.id,
                              school_id: parseInt(req.user.schoolId),
                            },
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
      });
    res.status(httpStatus.OK).send({
      success: true,
      message: "Students data uploaded successfully",
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
      success: true,
      message: "Internal server error. Please try again later.",
      data: {},
      error: err,
    });
  }
};
