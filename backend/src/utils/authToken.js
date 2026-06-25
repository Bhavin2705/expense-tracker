const COOKIE_NAME = "expensesplit_session";

const getCookie = (req, name) => {
  const header = req.headers.cookie;
  if (!header) return null;

  const prefix = `${name}=`;
  const cookie = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
};

const getAuthToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return getCookie(req, COOKIE_NAME);
};

const cookieOptions = (isProduction) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000
});

module.exports = { COOKIE_NAME, getAuthToken, cookieOptions };
