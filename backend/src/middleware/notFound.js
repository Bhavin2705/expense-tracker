const { error } = require("../utils/response");

module.exports = (req, res) => {
  return error(res, "Route not found", 404);
};
