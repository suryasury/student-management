let jwt = require("jsonwebtoken");
let error = require("../helpers/errorHandler");
const httpStatus = require("http-status");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  try {
    let jwtToken = req.headers.authorization;
    const jwtSecret = process.env.JWT_SECRET;
    let token = "";
    if (jwtToken) {
      let tokenArr = jwtToken.split(" ");
      if (tokenArr[0] !== "Bearer") {
        return error(
          {
            statusCode: httpStatus.FORBIDDEN,
            message: "Token should be Bearer",
            error: {},
          },
          res
        );
      }
      if (tokenArr[1]) {
        token = tokenArr[1];
      } else {
        return error(
          {
            statusCode: httpStatus.FORBIDDEN,
            message: "Token missing in the header",
            error: {},
          },
          res
        );
      }
    }
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
      let user = JSON.parse(jwtData.data.data);
      let model = {};
      if (user.userType === "parent") {
        model = prisma.students;
      } else if (user.userType === "admin") {
        model = prisma.admins;
      } else if (user.userType === "teacher") {
        model = prisma.teachers;
      }
      let userData = await model.findUnique({
        where: {
          id: parseInt(user.userId),
          is_active: true,
          is_deleted: false,
        },
      });
      if (userData) {
        req.user = user;
        return next();
      } else {
        return error(
          {
            statusCode: httpStatus.UNAUTHORIZED,
            message: "User not found or invalid user",
            error: {},
          },
          res
        );
      }
    } else {
      return error(
        {
          statusCode: httpStatus.UNAUTHORIZED,
          message: "Session expired. Please login again",
          error: jwtData.error,
        },
        res
      );
    }
  } catch (err) {
    error(err, res);
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
