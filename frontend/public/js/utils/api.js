// API utility — uses relative URLs (frontend served by same backend)
const API_BASE = "https://prod-backend.example.com/api/v1";

const api = {
  _accessToken: localStorage.getItem("accessToken") || null,
  _refreshToken: localStorage.getItem("refreshToken") || null,
  _refreshing: null,

  setTokens(accessToken, refreshToken) {
    this._accessToken = accessToken;
    this._refreshToken = refreshToken;
    if (accessToken) localStorage.setItem("accessToken", accessToken);
    else localStorage.removeItem("accessToken");
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    else localStorage.removeItem("refreshToken");
  },

  clearTokens() {
    this._accessToken = null;
    this._refreshToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("currentUser");
  },

  getHeaders(includeContentType = true) {
    const headers = {};
    if (includeContentType) headers["Content-Type"] = "application/json";
    if (this._accessToken) headers["Authorization"] = `Bearer ${this._accessToken}`;
    return headers;
  },

  async refreshAccessToken() {
    // Prevent multiple simultaneous refresh requests
    if (this._refreshing) return this._refreshing;

    this._refreshing = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: this._refreshToken })
        });

        if (!response.ok) {
          throw new Error("Refresh failed");
        }

        const data = await response.json();
        if (data.success && data.data) {
          this.setTokens(data.data.accessToken, data.data.refreshToken);
          return true;
        }
        throw new Error("Refresh failed");
      } catch (error) {
        this.clearTokens();
        return false;
      } finally {
        this._refreshing = null;
      }
    })();

    return this._refreshing;
  },

  async request(method, endpoint, body, isFormData = false) {
    const url = `${API_BASE}${endpoint}`;
    const options = {
      method,
      credentials: "include",
      headers: this.getHeaders(!isFormData)
    };

    if (body) {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    let response = await fetch(url, options);

    // If 401 with TOKEN_EXPIRED, try refresh
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.code === "TOKEN_EXPIRED" || errorData.message === "Token expired") {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the original request with new token
          const retryOptions = {
            method,
            credentials: "include",
            headers: this.getHeaders(!isFormData)
          };
          if (body) {
            retryOptions.body = isFormData ? body : JSON.stringify(body);
          }
          response = await fetch(url, retryOptions);
        } else {
          // Refresh failed — redirect to login
          window.location.replace("/login.html");
          throw new Error("Session expired. Please log in again.");
        }
      }
    }

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : {};
    }

    if (!response.ok) {
      const error = new Error(data.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  },

  get(endpoint) { return this.request("GET", endpoint); },
  post(endpoint, payload) { return this.request("POST", endpoint, payload); },
  patch(endpoint, payload) { return this.request("PATCH", endpoint, payload); },
  delete(endpoint) { return this.request("DELETE", endpoint); },

  // Form data upload (receipts, avatars)
  postForm(endpoint, formData) { return this.request("POST", endpoint, formData, true); },
  patchForm(endpoint, formData) { return this.request("PATCH", endpoint, formData, true); },

  async getHealth() { return this.get("/health"); }
};

window.api = api;
