// =============================================
// Category Service - Production Ready
// =============================================

window.api = window.api || {};

window.api.category = {
  getAll: async function () {
    try {
      const response = await fetch('/api/v1/categories', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
          `Failed to load categories (status ${response.status})`
        );
      }

      return await response.json();
    } catch (err) {
      console.error('Category getAll failed:', err);
      throw err;
    }
  },

  create: async function (payload) {
    try {
      const response = await fetch('/api/v1/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Failed to create category'
        );
      }

      return await response.json();
    } catch (err) {
      console.error('Category create failed:', err);
      throw err;
    }
  },

  update: async function (id, payload) {
    if (!id) {
      throw new Error('Category ID is required');
    }

    try {
      const response = await fetch(`/api/v1/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Failed to update category'
        );
      }

      return await response.json();
    } catch (err) {
      console.error('Category update failed:', err);
      throw err;
    }
  },

  remove: async function (id) {
    if (!id) {
      throw new Error('Category ID is required');
    }

    try {
      const response = await fetch(`/api/v1/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Failed to delete category'
        );
      }

      return await response.json();
    } catch (err) {
      console.error('Category delete failed:', err);
      throw err;
    }
  }
};

// Global exposure
window.categoryService = window.api.category;

console.log(
  '%c✅ CategoryService loaded successfully',
  'color: #10b981; font-weight: 500'
);