const httpStatus = require("http-status");
const errorHandler = (error, res) => {
  let errorResponse = {};
  let statusCode = "";
  if (error && error.name) {
    if (
      error.name === "PrismaClientKnownRequestError" &&
      error.code === "P2002"
    ) {
      statusCode = httpStatus.CONFLICT;
      errorResponse = {
        message: error.meta.modelName.toUpperCase() + " already exists.",
        error: error.message,
      };
    } else {
      statusCode = httpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        message: error.message,
        error: error,
      };
    }
  } else {
    statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    errorResponse = {
      message: error.message,
      error: error,
    };
  }
  errorResponse.success = false;
  res.status(statusCode).send(errorResponse);
};

module.exports = errorHandler;
