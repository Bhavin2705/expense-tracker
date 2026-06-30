(function () {
  var page = document.body.dataset.authPage;
  var form = document.getElementById("authForm");
  var errorBox = document.getElementById("authError");
  var submitBtn = document.getElementById("submitBtn");

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add("visible");
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.classList.remove("visible");
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading
      ? (page === "register" ? "Creating account…" : "Signing in…")
      : (page === "register" ? "Create account" : "Sign in");
  }

  async function request(endpoint, payload) {
    var response = await fetch("/api/v1/auth/" + endpoint, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    var data = await response.json().catch(function () {
      return { success: false, message: "Unexpected server response" };
    });
    if (!response.ok) throw new Error(data.message || "Authentication failed");
    return data;
  }

  document.querySelectorAll("[data-password-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      var input = document.getElementById(button.dataset.passwordToggle);
      var reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.textContent = reveal ? "Hide" : "Show";
    });
  });

  // Check if already logged in
  fetch("/api/v1/auth/me", {
    credentials: "include",
    headers: (function () {
      var h = { "Accept": "application/json" };
      var token = localStorage.getItem("accessToken");
      if (token) h["Authorization"] = "Bearer " + token;
      return h;
    })()
  })
    .then(function (response) {
      if (response.ok) window.location.replace("/dashboard.html");
    })
    .catch(function () {});

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearError();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var formData = new FormData(form);
    var payload = {
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || "")
    };

    if (page === "register") {
      payload.name = String(formData.get("name") || "").trim();
      if (payload.password !== String(formData.get("confirmPassword") || "")) {
        showError("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    try {
      var result = await request(page, payload);

      // Store tokens from response
      if (result.data) {
        if (result.data.accessToken) {
          localStorage.setItem("accessToken", result.data.accessToken);
        }
        if (result.data.refreshToken) {
          localStorage.setItem("refreshToken", result.data.refreshToken);
        }
        if (result.data.user) {
          localStorage.setItem("currentUser", JSON.stringify(result.data.user));
        }
        // Also set on api object if available
        if (window.api && window.api.setTokens) {
          window.api.setTokens(result.data.accessToken, result.data.refreshToken);
        }
      }

      window.location.replace("/dashboard.html");
    } catch (error) {
      showError(error.message || "Authentication failed");
      setLoading(false);
    }
  });
})();
