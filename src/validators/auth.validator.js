const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRegister = ({ name, email, password }) => {
  if (!name || !email || !password) return "All fields are required";
  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
    return "Invalid account details";
  }
  if (name.trim().length < 2 || name.trim().length > 100) return "Name must be between 2 and 100 characters";
  if (!EMAIL_REGEX.test(email)) return "Invalid email address";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password must be 128 characters or fewer";
  return null;
};

const validateLogin = ({ email, password }) => {
  if (!email || !password) return "Email and password are required";
  if (typeof email !== "string" || typeof password !== "string") return "Invalid login details";
  if (!EMAIL_REGEX.test(email)) return "Invalid email address";
  return null;
};

module.exports = { validateRegister, validateLogin };
