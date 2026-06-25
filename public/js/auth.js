var auth = (function () {
  var currentUser = null;

  function updateUserUi(user) {
    var name = user.name || user.email || "User";
    var firstName = name.split(" ")[0];
    var navUser = document.getElementById("navUser");
    var userName = document.getElementById("userName");
    var userAvatar = document.getElementById("userAvatar");
    var greetingTitle = document.getElementById("greetingTitle");

    if (navUser) navUser.textContent = name;
    if (userName) userName.textContent = name;
    if (userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();

    if (greetingTitle) {
      var hour = new Date().getHours();
      var greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      greetingTitle.textContent = greeting + (firstName ? ", " + firstName : "") + ".";
    }
  }

  async function requireAuth() {
    try {
      var response = await fetch("/api/v1/auth/me", {
        credentials: "same-origin",
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) throw new Error("Authentication required");
      var result = await response.json();
      currentUser = result.data.user;
      updateUserUi(currentUser);
      return currentUser;
    } catch (error) {
      window.location.replace("/login.html");
      return null;
    }
  }

  async function logout() {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" }
      });
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("es-user");
      window.location.replace("/login.html");
    }
  }

  function getUser() {
    return currentUser;
  }

  return { requireAuth: requireAuth, logout: logout, getUser: getUser };
})();
