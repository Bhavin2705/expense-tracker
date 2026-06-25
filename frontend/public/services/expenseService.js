// =============================================
// Expense Service
// =============================================

window.api = window.api || {};

window.api.expense = {
    /**
     * Get all expenses with filters and pagination
     */
    getAll: async function (params = {}) {
        const query = new URLSearchParams(params).toString();
        const url = `/api/v1/expenses${query ? '?' + query : ''}`;

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

    /**
     * Get single expense by ID
     */
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

    /**
     * Create new expense (supports FormData for receipt upload)
     */
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

    /**
     * Update existing expense
     */
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

    /**
     * Delete expense
     */
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

// Expose globally
window.expenseService = window.api.expense;

console.log('✅ ExpenseService loaded successfully');