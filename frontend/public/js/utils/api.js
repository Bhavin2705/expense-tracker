const API_BASE = "https://expensetracker-five-sand.vercel.app/api/v1";

const api = {
  getHeaders() {
    return { "Content-Type": "application/json" };
  },
  async request(method, endpoint, body) {
    try {
      const url = `${API_BASE}${endpoint}`;
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error(`API Error [${response.status}] ${method} ${url}:`, data);
        const error = new Error(data.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Request failed:`, error);
      throw error;
    }
  },
  get(endpoint) { return this.request("GET", endpoint); },
  post(endpoint, payload) { return this.request("POST", endpoint, payload); },
  patch(endpoint, payload) { return this.request("PATCH", endpoint, payload); },
  delete(endpoint) { return this.request("DELETE", endpoint); },
  async getHealth() { return this.get("/health"); }
};

window.api = api;
