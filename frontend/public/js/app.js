window.app = window.app || {};

document.addEventListener("DOMContentLoaded", async () => {
  const apiStatus = document.getElementById("apiStatus");
  const statusBadge = document.getElementById("statusBadge");
  const themeToggle = document.getElementById("themeToggle");

  const savedTheme = storage.get("theme") || "light";
  helpers.setTheme(savedTheme);

  if (themeToggle) {
    themeToggle.textContent = savedTheme === "dark" ? "Light Mode" : "Dark Mode";

    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";

      helpers.setTheme(next);
      themeToggle.textContent = next === "dark" ? "Light Mode" : "Dark Mode";

      toast.show(`Theme changed to ${next}`, "info");
    });
  }

  if (apiStatus || statusBadge) {
    try {
      const result = await healthService.check();
      if (apiStatus) apiStatus.textContent = result.message || "Operational";
      if (statusBadge && typeof statusBadgeComponent !== "undefined") {
        statusBadgeComponent.update(statusBadge, "Operational");
      }
      toast.show("API connection established", "success");
    } catch (error) {
      if (apiStatus) apiStatus.textContent = "Unavailable";
      if (statusBadge && typeof statusBadgeComponent !== "undefined") {
        statusBadgeComponent.update(statusBadge, "Offline");
      }
      toast.show("API connection failed", "error");
    }
  }
});
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
// PHASE3_GROUPS
window.loadGroups = async function() {
  const root = document.getElementById("appRoot") || document.querySelector("main");
  if (root) {
    root.innerHTML = await groupsPage.render();
    groupsPage.bind();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (window.app && typeof app.bootstrap === "function") app.bootstrap();
});
