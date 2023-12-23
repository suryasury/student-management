exports.login = (req, res) => {
  try {
    res.status(200).send({ message: "Success" });
  } catch (err) {
    return err;
  }
};
