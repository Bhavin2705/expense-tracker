/**
 * Middleware to sanitize inputs and prevent NoSQL injection.
 * Removes keys starting with '$' from req.body, req.query, and req.params.
 */
const sanitizeInput = (obj) => {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      if (key.startsWith('$')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitizeInput(obj[key]);
      }
    });
  }
};

module.exports = (req, res, next) => {
  sanitizeInput(req.body);
  sanitizeInput(req.query);
  sanitizeInput(req.params);
  next();
};
