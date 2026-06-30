// Split Expense Service — uses Bearer token auth
window.api = window.api || {};

function getSplitAuthHeaders(includeContentType) {
    var headers = {};
    if (includeContentType !== false) headers['Content-Type'] = 'application/json';
    var token = localStorage.getItem('accessToken');
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
}

window.api.split = {
    getExpenses: async function (groupId, params) {
        if (!groupId) throw new Error('Group ID is required');
        params = params || {};
        var queryString = new URLSearchParams(params).toString();
        var url = '/api/v1/groups/' + groupId + '/splits' + (queryString ? '?' + queryString : '');
        var response = await fetch(url, { method: 'GET', headers: getSplitAuthHeaders(), credentials: 'include' });
        if (!response.ok) {
            var errorData = await response.json().catch(function () { return {}; });
            throw new Error(errorData.message || 'Failed to load expenses');
        }
        return response.json();
    },

    createExpense: async function (groupId, payload) {
        if (!groupId) throw new Error('Group ID is required');
        var response = await fetch('/api/v1/groups/' + groupId + '/splits', { method: 'POST', headers: getSplitAuthHeaders(), body: JSON.stringify(payload), credentials: 'include' });
        if (!response.ok) {
            var errorData = await response.json().catch(function () { return {}; });
            throw new Error(errorData.message || 'Failed to create expense');
        }
        return response.json();
    },

    toggleSettled: async function (expenseId, participantId) {
        if (!expenseId || !participantId) throw new Error('Expense ID and Participant ID are required');
        var response = await fetch('/api/v1/splits/' + expenseId + '/settle/' + participantId, { method: 'PATCH', headers: getSplitAuthHeaders(), credentials: 'include' });
        if (!response.ok) {
            var errorData = await response.json().catch(function () { return {}; });
            throw new Error(errorData.message || 'Failed to update settlement');
        }
        return response.json();
    },

    getBalances: async function (groupId) {
        if (!groupId) throw new Error('Group ID is required');
        var response = await fetch('/api/v1/groups/' + groupId + '/splits/balances', { method: 'GET', headers: getSplitAuthHeaders(), credentials: 'include' });
        if (!response.ok) {
            var errorData = await response.json().catch(function () { return {}; });
            throw new Error(errorData.message || 'Failed to load balances');
        }
        return response.json();
    }
};

window.splitService = window.api.split;