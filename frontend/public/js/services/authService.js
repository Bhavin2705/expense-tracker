const authService = {
  async register(payload) { return api.post("/auth/register", payload); },
  async login(payload) { return api.post("/auth/login", payload); },
  async logout() {
    try { await api.post("/auth/logout"); } catch (e) {}
    api.clearTokens();
  },
  async getCurrentUser() { return api.get("/auth/me"); },
  async refreshToken() { return api.post("/auth/refresh", { refreshToken: api._refreshToken }); }
};
window.authService = authService;
