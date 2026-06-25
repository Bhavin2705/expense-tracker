const helpers = {
  formatDate(date) {
    return new Date(date).toLocaleString();
  },

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    storage.set("theme", theme);
  }
};

window.helpers = helpers;
