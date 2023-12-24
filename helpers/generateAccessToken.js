const jwt = require("jsonwebtoken");

const generateAccesToken = (payload) => {
  try {
    return jwt.sign({ data: JSON.stringify(payload) }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });
  } catch (err) {
    throw err;
  }
};

module.exports = generateAccesToken;
