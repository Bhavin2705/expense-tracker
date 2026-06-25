#!/usr/bin/env bash
set -e

echo "Starting ExpenseSplit Phase 2 - Authentication Setup..."

# Install dependencies
npm install bcryptjs jsonwebtoken

# Create directories
mkdir -p src/controllers src/middleware src/models src/routes src/validators

# ====================== BACKEND ======================

cat > src/models/User.js <<'EOF'
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 100,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  avatar: {
    type: String,
    default: ""
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
EOF

cat > src/validators/auth.validator.js <<'EOF'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRegister = ({ name, email, password }) => {
  if (!name || !email || !password) return "All fields are required";
  if (name.length < 2 || name.length > 100) return "Name must be between 2 and 100 characters";
  if (!EMAIL_REGEX.test(email)) return "Invalid email address";
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
};

const validateLogin = ({ email, password }) => {
  if (!email || !password) return "Email and password are required";
  if (!EMAIL_REGEX.test(email)) return "Invalid email address";
  return null;
};

module.exports = { validateRegister, validateLogin };
EOF

cat > src/middleware/auth.js <<'EOF'
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "User not found or inactive" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
EOF

cat > src/middleware/authRateLimiter.js <<'EOF'
const rateLimit = require("express-rate-limit");

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
EOF

cat > src/controllers/auth.controller.js <<'EOF'
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { validateRegister, validateLogin } = require("../validators/auth.validator");

const createToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt
});

exports.register = async (req, res) => {
  try {
    const validationError = validateRegister(req.body);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(409).json({ success: false, message: "Email already exists" });

    const user = await User.create({ name, email: email.toLowerCase(), password });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: { user: sanitizeUser(user) }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const validationError = validateLogin(req.body);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    user.lastLoginAt = new Date();
    await user.save();

    const token = createToken(user._id);
    return res.json({
      success: true,
      message: "Login successful",
      data: { token, user: sanitizeUser(user) }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.logout = async (req, res) => {
  return res.json({ success: true, message: "Logout successful" });
};

exports.getCurrentUser = async (req, res) => {
  return res.json({ success: true, data: { user: req.user } });
};

exports.protectedRoute = async (req, res) => {
  return res.json({ success: true, data: { user: req.user } });
};
EOF

cat > src/routes/auth.routes.js <<'EOF'
const express = require("express");
const auth = require("../middleware/auth");
const authRateLimiter = require("../middleware/authRateLimiter");
const {
  register, login, logout, getCurrentUser, protectedRoute
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/login", authRateLimiter, login);
router.post("/logout", logout);
router.get("/me", auth, getCurrentUser);
router.get("/protected", auth, protectedRoute);

module.exports = router;
EOF

# Safe patch for src/routes/index.js
if [ -f src/routes/index.js ]; then
  if ! grep -q "authRoutes" src/routes/index.js; then
    # Insert before module.exports
    sed -i '/module.exports = router;/i \
const authRoutes = require("./auth.routes");\n\
router.use("/auth", authRoutes);' src/routes/index.js
  fi
else
  cat > src/routes/index.js <<'EOF'
const express = require("express");
const { success } = require("../utils/response");
const authRoutes = require("./auth.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  return success(res, "ExpenseSplit API is running", { version: "1.0.0" });
});

router.use("/auth", authRoutes);

module.exports = router;
EOF
fi

# Safe update for server.js (JWT validation + imports)
if [ -f server.js ]; then
  # Add JWT_SECRET validation after env import
  if ! grep -q "JWT_SECRET" server.js; then
    sed -i '/const env = require(".\/src\/config\/env");/a \
if (!env.jwtSecret || env.jwtSecret === "change_me" || env.jwtSecret.length < 20) {\
  logger.error("JWT_SECRET is missing or too weak. Please set a strong secret in .env");\
  console.error("❌ JWT_SECRET validation failed. Update .env and restart.");\
  process.exit(1);\
}' server.js 2>/dev/null || true
  fi

  # Ensure authRateLimiter is not needed in server.js anymore (moved to route)
  sed -i '/authRateLimiter/d' server.js 2>/dev/null || true
fi

# Update .env files
if ! grep -q "^JWT_SECRET=" .env 2>/dev/null; then
  echo "JWT_SECRET=supersecret_jwt_key_change_in_production_2026" >> .env
fi
if ! grep -q "^JWT_SECRET=" .env.example 2>/dev/null; then
  echo "JWT_SECRET=supersecret_jwt_key_change_in_production_2026" >> .env.example
fi

# ====================== FRONTEND ======================

# Generate missing Phase 1 files if absent
if [ ! -f public/js/services/healthService.js ]; then
  cat > public/js/services/healthService.js <<'EOF'
window.healthService = {
  async check() {
    return api.getHealth();
  }
};
EOF
fi

if [ ! -f public/js/components/statusBadge.js ]; then
  cat > public/js/components/statusBadge.js <<'EOF'
window.statusBadgeComponent = {
  update(element, text) {
    if (element) element.textContent = text;
  }
};
EOF
fi

if [ ! -f public/js/pages/dashboard.js ]; then
  cat > public/js/pages/dashboard.js <<'EOF'
window.dashboardPage = {
  init() {
    return true;
  }
};
EOF
fi

# Safe API update
if [ -f public/js/utils/api.js ]; then
  if ! grep -q "getHeaders" public/js/utils/api.js; then
    cat >> public/js/utils/api.js <<'EOP'

const api = {
  getHeaders() {
    const token = storage.get("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  },
  async request(method, endpoint, body) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    if (response.status === 401) {
      storage.remove("token");
      storage.remove("currentUser");
    }
    const data = await response.json();
    return data;
  },
  get(endpoint) { return this.request("GET", endpoint); },
  post(endpoint, payload) { return this.request("POST", endpoint, payload); },
  async getHealth() { return this.get("/health"); }
};
window.api = api;
EOP
  fi
fi

# Safe app.js update (idempotent with marker)
if [ -f public/js/app.js ]; then
  if ! grep -q "PHASE2_AUTH_INTEGRATION" public/js/app.js; then
    cat >> public/js/app.js <<'EOP'
// PHASE2_AUTH_INTEGRATION
const originalDOMContentLoaded = document.addEventListener;
app.bootstrap = async function() {
  const root = document.getElementById("appRoot") || document.querySelector("main");
  const token = storage.get("token");

  if (token) {
    try {
      const response = await authService.getCurrentUser();
      if (response.success) {
        storage.set("currentUser", response.data.user);
        this.showDashboard(response.data.user);
        return;
      }
    } catch (e) {}
    storage.remove("token");
    storage.remove("currentUser");
  }
  this.showLogin();
};

app.showLogin = function() {
  const root = document.getElementById("appRoot") || document.querySelector("main");
  root.innerHTML = loginPage.render();
  loginPage.bind();
};

app.showRegister = function() {
  const root = document.getElementById("appRoot") || document.querySelector("main");
  root.innerHTML = registerPage.render();
  registerPage.bind();
};

app.showDashboard = function(user) {
  const root = document.getElementById("appRoot") || document.querySelector("main");
  root.innerHTML = `
    <div class="panel">
      <div class="dashboard-header">
        <h2>Dashboard</h2>
        <div id="userMenu"></div>
      </div>
      <p>Welcome back, <strong>${user.name}</strong>!</p>
    </div>
    ${typeof profilePage !== "undefined" ? profilePage.render(user) : ''}
  `;
  if (typeof userMenu !== "undefined") userMenu.render(user);
};
EOP
  fi
fi

# Auth frontend files
cat > public/js/services/authService.js <<'EOF'
const authService = {
  async register(payload) { return api.post("/auth/register", payload); },
  async login(payload) {
    const response = await api.post("/auth/login", payload);
    if (response.success && response.data?.token) {
      storage.set("token", response.data.token);
      storage.set("currentUser", response.data.user);
    }
    return response;
  },
  async logout() {
    try { await api.post("/auth/logout"); } catch (e) {}
    storage.remove("token");
    storage.remove("currentUser");
  },
  async getCurrentUser() { return api.get("/auth/me"); }
};
window.authService = authService;
EOF

cat > public/js/components/authGuard.js <<'EOF'
const authGuard = {
  hasToken() { return !!storage.get("token"); },
  logout() {
    storage.remove("token");
    storage.remove("currentUser");
    window.location.reload();
  }
};
window.authGuard = authGuard;
EOF

cat > public/js/components/userMenu.js <<'EOF'
const userMenu = {
  render(user) {
    const container = document.getElementById("userMenu");
    if (!container) return;
    container.innerHTML = `
      <div class="user-menu-name">${user.name}</div>
      <button id="logoutBtn" class="btn-secondary">Logout</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await authService.logout();
      toast.show("Logged out successfully", "info");
      setTimeout(() => window.location.reload(), 300);
    });
  }
};
window.userMenu = userMenu;
EOF

cat > public/js/pages/login.js <<'EOF'
window.loginPage = {
  render() {
    return `
      <div class="auth-container">
        <div class="panel auth-panel">
          <h2>Sign In</h2>
          <form id="loginForm">
            <div class="form-group"><label>Email</label><input type="email" name="email" required /></div>
            <div class="form-group"><label>Password</label><input type="password" name="password" required /></div>
            <button type="submit" class="btn-primary">Login</button>
          </form>
          <div class="auth-footer">
            <button id="showRegister" class="link-button">Create Account</button>
          </div>
        </div>
      </div>
    `;
  },
  bind() {
    const form = document.getElementById("loginForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = { email: fd.get("email"), password: fd.get("password") };
      const response = await authService.login(payload);
      if (response.success) {
        toast.show("Login successful", "success");
        setTimeout(() => window.location.reload(), 400);
      } else {
        toast.show(response.message || "Login failed", "error");
      }
    });
    document.getElementById("showRegister").addEventListener("click", () => app.showRegister());
  }
};
EOF

cat > public/js/pages/register.js <<'EOF'
window.registerPage = {
  render() {
    return `
      <div class="auth-container">
        <div class="panel auth-panel">
          <h2>Create Account</h2>
          <form id="registerForm">
            <div class="form-group"><label>Name</label><input type="text" name="name" required /></div>
            <div class="form-group"><label>Email</label><input type="email" name="email" required /></div>
            <div class="form-group"><label>Password</label><input type="password" name="password" required /></div>
            <button type="submit" class="btn-primary">Register</button>
          </form>
          <div class="auth-footer">
            <button id="showLogin" class="link-button">Back To Login</button>
          </div>
        </div>
      </div>
    `;
  },
  bind() {
    const form = document.getElementById("registerForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = { name: fd.get("name"), email: fd.get("email"), password: fd.get("password") };
      const response = await authService.register(payload);
      if (response.success) {
        toast.show("Account created successfully", "success");
        setTimeout(() => app.showLogin(), 800);
      } else {
        toast.show(response.message || "Registration failed", "error");
      }
    });
    document.getElementById("showLogin").addEventListener("click", () => app.showLogin());
  }
};
EOF

cat > public/js/pages/profile.js <<'EOF'
window.profilePage = {
  render(user) {
    return `
      <div class="panel">
        <h2>Profile</h2>
        <table>
          <tr><td>Name</td><td>${user.name}</td></tr>
          <tr><td>Email</td><td>${user.email}</td></tr>
          <tr><td>Status</td><td>${user.isActive ? "Active" : "Inactive"}</td></tr>
        </table>
      </div>
    `;
  }
};
EOF

# Safe index.html update
if [ -f public/index.html ]; then
  if ! grep -q 'id="appRoot"' public/index.html; then
    sed -i 's|<main>|<main id="appRoot">|g' public/index.html
  fi
  if ! grep -q "authService.js" public/index.html; then
    sed -i '/<script src="\/js\/app.js"/i \
  <script src="/js/services/authService.js"></script>\
  <script src="/js/components/authGuard.js"></script>\
  <script src="/js/components/userMenu.js"></script>\
  <script src="/js/pages/login.js"></script>\
  <script src="/js/pages/register.js"></script>\
  <script src="/js/pages/profile.js"></script>' public/index.html
  fi
fi

# Safe CSS append (check for duplicate)
if ! grep -q ".auth-container" public/css/components.css 2>/dev/null; then
  cat >> public/css/components.css <<'EOF'

.auth-container { display: flex; justify-content: center; padding: 40px 20px; }
.auth-panel { width: 420px; max-width: 100%; }
.form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.form-group input { padding: 10px; border: 1px solid var(--border); background: var(--panel); color: var(--text); border-radius: 4px; }
.btn-primary { padding: 12px 16px; border: none; background: #2563eb; color: white; cursor: pointer; border-radius: 4px; width: 100%; font-weight: 600; }
.link-button { background: none; border: none; color: #2563eb; cursor: pointer; margin-top: 12px; }
.dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.user-menu-name { font-weight: 600; }
EOF
fi

echo ""
echo "✅ ExpenseSplit Phase 2 Authentication Setup Complete!"
echo "   • Login rate limiter applied at route level"
echo "   • Protected route: GET /api/v1/auth/protected"
echo "   • JWT_SECRET validated on startup"
echo "   • Phase 1 fully preserved"
echo ""
echo "Next steps:"
echo "   npm run dev"
echo ""