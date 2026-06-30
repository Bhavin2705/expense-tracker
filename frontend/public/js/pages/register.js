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
      try {
        const fd = new FormData(form);
        const payload = { name: fd.get("name"), email: fd.get("email"), password: fd.get("password") };
        const response = await authService.register(payload);
        if (response.success) {
          toast.show("Account created successfully", "success");
          setTimeout(() => app.showLogin(), 800);
        } else {
          toast.show(response.message || "Registration failed", "error");
        }
      } catch (error) {
        toast.show(error.message || error.data?.message || "Registration failed", "error");
      }
    });
    document.getElementById("showLogin").addEventListener("click", () => app.showLogin());
  }
};
