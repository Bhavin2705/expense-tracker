window.healthService = {
  async check() {
    return api.getHealth();
  }
};
