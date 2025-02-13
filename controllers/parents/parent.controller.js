const httpStatus = require("http-status");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const error = require("../../helpers/errorHandler");
const validatePassword = require("../../helpers/validatePassword");
const generateAccesToken = require("../../helpers/generateAccessToken");
const hashPassword = require("../../helpers/hashPassword");
const hideEmail = require("../../utils/emailScreening");
const fs = require("fs");
const emailService = require("../../utils/emailService");
const jwt = require("jsonwebtoken");
const Razorpay = require("razorpay");
let crypto = require("crypto");
const { default: axios } = require("axios");

exports.login = async (req, res) => {
  try {
    let admissionNo = req.body.admissionNumber;
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
      let isValidPassword = validatePassword(
        password.trim().toString(),
        userDetails.password,
      );
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
    let academicYear = await prisma.academic_years.findFirst({
      orderBy: {
        created_at: "desc",
      },
    });
    let feesDetails = await prisma.fees_details.findMany({
      where: {
        student_id: studentId,
        academic_year_id: academicYear.id,
      },
      include: {
        academic_year: true,
        fees_transactions: true,
        standard: true,
        student: true,
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

exports.resetPasswordWithAuth = async (req, res) => {
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

exports.forgotPassword = async (req, res) => {
  try {
    let admissionNumber = req.body.admissionNumber;
    let userDetails = await prisma.students.findFirst({
      where: {
        admission_number: admissionNumber,
      },
    });
    if (!userDetails) {
      return res.status(httpStatus.NOT_FOUND).send({
        message: "User not found or invalid admission number",
        success: false,
        data: {},
      });
    }
    if (!userDetails.email) {
      return res.status(httpStatus.NOT_FOUND).send({
        message: "Email not found for this student. Please contact the school",
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
        userType: "parents",
        schoolId: userDetails.school_id,
        admissionNumber: userDetails.admission_number,
      },
      "30m",
    );
    let html = template
      .replace("{{name}}", userDetails.name)
      .replace(
        /{{resetLink}}/g,
        process.env.RESET_PASSWORD_FRONTEND_HOST_PARENT + token,
      );
    await emailService.sendEmail({
      from: process.env.SMTP_EMAIL,
      to: userDetails.email,
      subject: "Reset password",
      html: html,
    });
    const screenedEmail = hideEmail(userDetails.email);
    res.status(httpStatus.OK).send({
      message: `Reset password link has been sent to your email ${screenedEmail}. Kindly check the email and proceed further`,
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
      await prisma.students.update({
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

// exports.initiatePayment = async (req, res) => {
//   try {
//     let feesId = parseInt(req.params.feesId);
//     let url = process.env.PG_BASE_URL;
//     let pgEndpoint = "/pg/v1/pay";

//     let feesDetails = await prisma.fees_details.findUnique({
//       where: {
//         id: feesId,
//       },
//       include: {
//         student: true,
//       },
//     });

//     let totalPayableAmount =
//       feesDetails.total_amount + (feesDetails.sc_fees || 0);

//     let payload = {
//       merchantId: "", //need to take it from env - pg depedency
//       merchantTransactionId: `TID_${new Date().getTime()}`,
//       merchantUserId: "", //take from env - pg depedency
//       amount: totalPayableAmount,
//       redirectUrl: process.env.PG_REDIRECT_URL,
//       redirectMode: "REDIRECT",
//       callbackUrl: process.env.PG_WEBHOOKS_URL,
//       mobileNumber: feesDetails.student.primary_mobile_no,
//       paymentInstrument: {
//         type: "PAY_PAGE",
//       },
//     };
//     let stringifiedPayload = JSON.stringify(payload);
//     let base64Payload = Buffer.from(stringifiedPayload).toString("base64");
//     let saltKeyIndex = 2;
//     let payloadCombained = base64Payload + pgEndpoint + process.env.PG_SALT_KEY; //PG_SALT_KEY need to get thos from phonepe
//     let hashedPayload = sha256(payloadCombained);
//     let checkSum = hashedPayload + "###" + saltKeyIndex;

//     let pgResponse = await fetch(url + pgEndpoint, {
//       method: "POST",
//       headers: {
//         accept: "application/json",
//         "Content-Type": "application/json",
//         "X-VERIFY": checkSum,
//       },
//       body: JSON.stringify(base64Payload),
//     });

//     let parsedResponse = await pgResponse.json();

//     res.status(httpStatus.OK).send({
//       message: "Payment initiated",
//       success: true,
//       data: parsedResponse,
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
//       message: err.message,
//       success: false,
//       data: {},
//       error: err,
//     });
//   }
// };

exports.createRazorpayOrder = async (req, res) => {
  try {
    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    let feesIds = req.body.feesIds;

    let totalFees = await prisma.fees_details.aggregate({
      where: {
        id: {
          in: feesIds,
        },
      },
      _sum: {
        total_payable: true,
      },
    });

    let totalOrderAmount = totalFees._sum.total_payable;

    let notes = {};

    feesIds.forEach((id) => {
      notes[`fees_${id}`] = id;
    });

    const options = {
      amount: totalOrderAmount * 100,
      currency: "INR",
      receipt: `R_${Date.now().toString()}`,
      payment_capture: 1,
      partial_payment: false,
      notes: notes,
    };

    let orderDetails = await razorpayInstance.orders.create(options);

    if (!orderDetails) {
      throw {
        message: "Could not initiate payment. Please try again.",
      };
    }
    res.status(httpStatus.OK).send({
      message: "Order created successfully.",
      success: true,
      data: { ...orderDetails, merchantId: process.env.RAZORPAY_KEY_ID },
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

exports.createPaymentOrder = async (req, res) => {
  try {
    let feesIds = req.body.feesIds;
    let studentId = req.body.studentId;

    let totalFees = await prisma.fees_details.aggregate({
      where: {
        id: {
          in: feesIds,
        },
      },
      _sum: {
        total_payable: true,
      },
    });

    let studentDetails = await prisma.students.findUnique({
      where: { id: studentId },
    });

    let totalOrderAmount = totalFees._sum.total_payable;

    let notes = {};

    feesIds.forEach((id) => {
      notes[`fees_${id}`] = id;
    });

    const options = {
      orderId: `${Date.now().toString()}`,
      orderInfo: "Fees payment",
      amount: totalOrderAmount * 100,
      currency: "INR",
      udf: feesIds.map(String),
      customer: {
        name: studentDetails.father_name,
        emailId: studentDetails.email,
        phone: studentDetails.primary_mobile_no,
      },
      webhook: {
        url: `${process.env.BACKEND_BASE_URL}/api/admin/fees/payment/lyra/webhook`,
      },
      return: {
        method: "GET",
        url: process.env.PARENT_FRONT_END_URL,
        timeout: 600,
      },
    };
    var base64String = Buffer.from(
      `${process.env.LYRA_SHOP_ID}:${process.env.LYRA_API_KEY}`,
    ).toString("base64");

    let response = await axios.post(
      `${process.env.LYRA_BASE_URL}/pg/rest/v1/charge`,
      options,
      {
        headers: {
          Authorization: `Basic ${base64String}`,
        },
      },
    );
    response = response.data;

    if (!response) {
      throw {
        message: "Could not initiate payment. Please try again.",
      };
    }
    res.status(httpStatus.OK).send({
      message: "Order created successfully.",
      success: true,
      data: response,
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

exports.checkPaymentStatus = async (req, res) => {
  try {
    let orderId = req.params.orderId;
    // let schoolId = req.user.school_id;

    // let totalFees = await prisma.fees_details.aggregate({
    //   where: {
    //     id: {
    //       in: feesIds,
    //     },
    //   },
    //   _sum: {
    //     total_payable: true,
    //   },
    // });

    // let studentDetails = await prisma.students.findUnique({
    //   where: { id: studentId },
    // });

    // let totalOrderAmount = totalFees._sum.total_payable;

    // let notes = {};

    // feesIds.forEach((id) => {
    //   notes[`fees_${id}`] = id;
    // });

    var base64String = Buffer.from(
      `${process.env.LYRA_SHOP_ID}:${process.env.LYRA_API_KEY}`,
    ).toString("base64");

    let response = await axios.get(
      `${process.env.LYRA_BASE_URL}/pg/rest/v1/charge/${orderId}`,
      {
        headers: {
          Authorization: `Basic ${base64String}`,
        },
      },
    );
    response = response.data;

    if (!response) {
      throw {
        message: "Could not check payment statue. Please try again.",
      };
    }
    if (response.status === "PAID") {
      return res.status(httpStatus.OK).send({
        message: "Payment captured successfully",
        success: true,
        data: { isPaymentFailed: false },
      });
    } else if (response.status === "DROPPED") {
      return res.status(httpStatus.OK).send({
        message: "Payment failed. Please try again",
        success: false,
        data: { isPaymentFailed: true },
      });
    } else {
      return res.status(httpStatus.OK).send({
        message: "Payment not captured. please try again.",
        success: false,
        data: { isPaymentFailed: false },
      });
    }
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

exports.verifyPayment = async (req, res) => {
  try {
    let feesIds = req.body.feesIds;
    let paymentResponse = req.body.razorPayResponse;
    let razorPayOrderId = req.body.orderId;
    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
    shasum.update(`${razorPayOrderId}|${paymentResponse.razorpay_payment_id}`);

    const digest = shasum.digest("hex");

    if (paymentResponse.razorpay_signature === digest) {
      let orderDetails = await razorpayInstance.orders.fetchPayments(
        razorPayOrderId,
      );

      let successResponse = orderDetails.items.filter(
        (payment) => payment.captured,
      );

      if (successResponse.length > 0) {
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
                      payment_mode: successResponse[0].method.toUpperCase(),
                      school_id: feesDetails.school_id,
                      pg_gateway: "RAZORPAY",
                      order_id: successResponse[0].order_id,
                      payment_id: successResponse[0].id,
                      wallet_provider: (
                        successResponse[0].wallet || ""
                      ).toUpperCase(),
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
      } else {
        return res.status(400).send({
          success: true,
          message: "Payment failed. Please try after Sometimes",
          data: {},
        });
      }
      return res.status(200).send({
        success: true,
        message: "Payment verified successfully",
        data: {},
      });
    }
    res.status(400).send({
      success: false,
      message: "Invalid payment or payment not legit.",
      data: {},
    });
  } catch (err) {
    console.log("parent", err);
    error(err, res);
  }
};
