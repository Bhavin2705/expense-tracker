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
      try {
        const fd = new FormData(form);
        const payload = { email: fd.get("email"), password: fd.get("password") };
        const response = await authService.login(payload);
        if (response.success) {
          toast.show("Login successful", "success");
          setTimeout(() => window.location.reload(), 400);
        } else {
          toast.show(response.message || "Login failed", "error");
        }
      } catch (error) {
        console.error("Login error:", error);
        toast.show(error.message || error.data?.message || "Login failed", "error");
      }
    });
    document.getElementById("showRegister").addEventListener("click", () => app.showRegister());
  }
};
