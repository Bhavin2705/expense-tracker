// Category Service — uses Bearer token auth
window.api = window.api || {};

function getCatAuthHeaders() {
  var headers = { 'Content-Type': 'application/json' };
  var token = localStorage.getItem('accessToken');
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

window.api.category = {
  getAll: async function () {
    var response = await fetch('/api/v1/categories', {
      method: 'GET',
      headers: getCatAuthHeaders(),
      credentials: 'include'
    });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to load categories');
    }
    return response.json();
  },

  create: async function (payload) {
    var response = await fetch('/api/v1/categories', {
      method: 'POST',
      headers: getCatAuthHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to create category');
    }
    return response.json();
  },

  update: async function (id, payload) {
    if (!id) throw new Error('Category ID is required');
    var response = await fetch('/api/v1/categories/' + id, {
      method: 'PATCH',
      headers: getCatAuthHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to update category');
    }
    return response.json();
  },

  remove: async function (id) {
    if (!id) throw new Error('Category ID is required');
    var response = await fetch('/api/v1/categories/' + id, {
      method: 'DELETE',
      headers: getCatAuthHeaders(),
      credentials: 'include'
    });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to delete category');
    }
    return response.json();
  }
};

window.categoryService = window.api.category;