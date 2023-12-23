let jwt = require("jsonwebtoken");
let error = require("../helper/errorHandler");
const httpStatus = require("http-status");

module.exports = (req, res, next) => {
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
        return error(
          {
            statusCode: httpStatus.UNAUTHORIZED,
            message: "Session expired. Please login again",
            error: err,
          },
          res
        );
      }
      return payload;
    });
    req.user = JSON.parse(jwtData.data);
    next();
  } catch (err) {
    error(err, res);
  }
};
