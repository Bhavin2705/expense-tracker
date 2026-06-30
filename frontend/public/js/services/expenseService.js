// Expense Service — uses Bearer token auth
window.api = window.api || {};

function getAuthHeaders(includeContentType) {
  var headers = {};
  if (includeContentType) headers['Content-Type'] = 'application/json';
  var token = localStorage.getItem('accessToken');
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

window.api.expense = {
  getAll: async function (params) {
    params = params || {};
    var queryString = new URLSearchParams(params).toString();
    var url = '/api/v1/expenses' + (queryString ? '?' + queryString : '');
    var response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(true),
      credentials: 'include'
    });
    if (!response.ok) {
      var error = await response.json().catch(function () { return {}; });
      throw new Error(error.message || 'Failed to load expenses');
    }
    return response.json();
  },

  getOne: async function (id) {
    var response = await fetch('/api/v1/expenses/' + id, {
      method: 'GET',
      headers: getAuthHeaders(true),
      credentials: 'include'
    });
    if (!response.ok) {
      var error = await response.json().catch(function () { return {}; });
      throw new Error(error.message || 'Failed to load expense');
    }
    return response.json();
  },

  create: async function (formData) {
    var response = await fetch('/api/v1/expenses', {
      method: 'POST',
      body: formData,
      headers: getAuthHeaders(false),
      credentials: 'include'
    });
    if (!response.ok) {
      var error = await response.json().catch(function () { return {}; });
      throw new Error(error.message || 'Failed to create expense');
    }
    return response.json();
  },

  update: async function (id, formData) {
    var response = await fetch('/api/v1/expenses/' + id, {
      method: 'PATCH',
      body: formData,
      headers: getAuthHeaders(false),
      credentials: 'include'
    });
    if (!response.ok) {
      var error = await response.json().catch(function () { return {}; });
      throw new Error(error.message || 'Failed to update expense');
    }
    return response.json();
  },

  remove: async function (id) {
    var response = await fetch('/api/v1/expenses/' + id, {
      method: 'DELETE',
      headers: getAuthHeaders(true),
      credentials: 'include'
    });
    if (!response.ok) {
      var error = await response.json().catch(function () { return {}; });
      throw new Error(error.message || 'Failed to delete expense');
    }
    return response.json();
  }
};

window.expenseService = window.api.expense;