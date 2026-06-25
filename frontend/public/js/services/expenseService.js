// =============================================
// Expense Service - Final Version
// =============================================

const api = window.api || (window.api = {});

api.expense = {
  getAll: async function (params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v1/expenses${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to load expenses');
    }
    return response.json();
  },

  getOne: async function (id) {
    const response = await fetch(`/api/v1/expenses/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to load expense');
    }
    return response.json();
  },

  create: async function (formData) {
    const response = await fetch('/api/v1/expenses', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to create expense');
    }
    return response.json();
  },

  update: async function (id, formData) {
    const response = await fetch(`/api/v1/expenses/${id}`, {
      method: 'PATCH',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to update expense');
    }
    return response.json();
  },

  remove: async function (id) {
    const response = await fetch(`/api/v1/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to delete expense');
    }
    return response.json();
  }
};

// Global exposure
window.expenseService = api.expense;

console.log('✅ ExpenseService loaded');