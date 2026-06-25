// =============================================
// Split Expense Service - Production Ready
// =============================================

window.api || (window.api = {});

window.api.split = {
    getExpenses: async function (groupId, params = {}) {
        if (!groupId) throw new Error('Group ID is required');

        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `/api/v1/groups/${groupId}/splits${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to load expenses');
            }

            return await response.json();
        } catch (err) {
            console.error('Split getExpenses failed:', err);
            throw err;
        }
    },

    createExpense: async function (groupId, payload) {
        if (!groupId) throw new Error('Group ID is required');

        try {
            const response = await fetch(`/api/v1/groups/${groupId}/splits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to create expense');
            }

            return await response.json();
        } catch (err) {
            console.error('Split createExpense failed:', err);
            throw err;
        }
    },

    toggleSettled: async function (expenseId, participantId) {
        if (!expenseId || !participantId) throw new Error('Expense ID and Participant ID are required');

        try {
            const response = await fetch(`/api/v1/splits/${expenseId}/settle/${participantId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update settlement');
            }

            return await response.json();
        } catch (err) {
            console.error('Split toggleSettled failed:', err);
            throw err;
        }
    },

    getBalances: async function (groupId) {
        if (!groupId) throw new Error('Group ID is required');

        try {
            const response = await fetch(`/api/v1/groups/${groupId}/splits/balances`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to load balances');
            }

            return await response.json();
        } catch (err) {
            console.error('Split getBalances failed:', err);
            throw err;
        }
    }
};

// Global exposure
window.splitService = window.api.split;

console.log('%c✅ SplitService loaded successfully', 'color: #10b981; font-weight: 500');