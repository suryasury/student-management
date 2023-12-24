const bcrypt = require("bcryptjs");

const hashPassword = (password) => {
  try {
    return bcrypt.hashSync(
      password,
      parseInt(process.env.PASSWORD_SALT_ROUNDS)
    );
  } catch (err) {
    throw {
      message: "Error while hashing password.",
    };
  }
};

module.exports = hashPassword;
