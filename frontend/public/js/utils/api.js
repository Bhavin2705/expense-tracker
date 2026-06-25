const API_BASE = "https://expensetracker-five-sand.vercel.app/api/v1";

const api = {
  getHeaders() {
    return { "Content-Type": "application/json" };
  },
  async request(method, endpoint, body) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      credentials: "include",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    return response.json();
  },
  get(endpoint) { return this.request("GET", endpoint); },
  post(endpoint, payload) { return this.request("POST", endpoint, payload); },
  patch(endpoint, payload) { return this.request("PATCH", endpoint, payload); },
  delete(endpoint) { return this.request("DELETE", endpoint); },
  async getHealth() { return this.get("/health"); }
};

window.api = api;
