const authGuard = {
  hasToken() { return !!storage.get("token"); },
  logout() {
    storage.remove("token");
    storage.remove("currentUser");
    window.location.reload();
  }
};
window.authGuard = authGuard;
