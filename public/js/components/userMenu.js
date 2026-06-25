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
