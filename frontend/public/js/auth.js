var auth = (function () {
  var currentUser = null;

  function updateUserUi(user) {
    var name = user.name || user.email || "User";
    var firstName = name.split(" ")[0];
    var navUser = document.getElementById("navUser");
    var userName = document.getElementById("userName");
    var userAvatar = document.getElementById("userAvatar");
    var greetingTitle = document.getElementById("greetingTitle");
    var userFirstName = document.getElementById("userFirstName");

    if (navUser) navUser.textContent = name;
    if (userName) userName.textContent = name;
    if (userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();

    if (greetingTitle) {
      var hour = new Date().getHours();
      var greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      greetingTitle.textContent = greeting + (firstName ? ", " + firstName : "") + ".";
    }
    if (userFirstName) {
      userFirstName.textContent = firstName;
    }

    // Show/hide admin elements based on role
    var adminElements = document.querySelectorAll("[data-role='admin']");
    var isAdmin = user.role === "admin";
    adminElements.forEach(function (el) {
      el.style.display = isAdmin ? "" : "none";
    });
  }

  async function requireAuth() {
    try {
      // First try using Bearer token
      var token = localStorage.getItem("accessToken");
      var headers = { "Accept": "application/json" };
      if (token) {
        headers["Authorization"] = "Bearer " + token;
      }

      var response = await fetch("/api/v1/auth/me", {
        credentials: "include",
        headers: headers
      });

      // If 401, try refreshing the token
      if (response.status === 401) {
        var refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          var refreshResponse = await fetch("/api/v1/auth/refresh", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: refreshToken })
          });

          if (refreshResponse.ok) {
            var refreshData = await refreshResponse.json();
            if (refreshData.success && refreshData.data) {
              localStorage.setItem("accessToken", refreshData.data.accessToken);
              localStorage.setItem("refreshToken", refreshData.data.refreshToken);
              if (window.api) {
                window.api.setTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
              }

              // Retry the original request
              response = await fetch("/api/v1/auth/me", {
                credentials: "include",
                headers: {
                  "Accept": "application/json",
                  "Authorization": "Bearer " + refreshData.data.accessToken
                }
              });
            }
          }
        }
      }

      if (!response.ok) throw new Error("Authentication required");
      var result = await response.json();
      currentUser = result.data.user;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      updateUserUi(currentUser);
      return currentUser;
    } catch (error) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("currentUser");
      window.location.replace("/login.html");
      return null;
    }
  }

  async function logout() {
    try {
      var token = localStorage.getItem("accessToken");
      var headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;

      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: headers
      });
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("token");
      localStorage.removeItem("es-user");
      if (window.api) window.api.clearTokens();
      window.location.replace("/login.html");
    }
  }

  function getUser() {
    return currentUser;
  }

  function isAdmin() {
    return currentUser && currentUser.role === "admin";
  }

  return { requireAuth: requireAuth, logout: logout, getUser: getUser, isAdmin: isAdmin };
})();
