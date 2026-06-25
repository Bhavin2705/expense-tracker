// =============================================
// Dashboard Service
// =============================================

const api = window.api || (window.api = {});

api.dashboard = {
    /**
     * Get dashboard data for the selected period
     * @param {Object} params - Query parameters
     * @param {string} params.range - 'this_month', 'this_week', 'last_month', 'last_90_days', 'custom'
     * @param {string} [params.dateFrom] - YYYY-MM-DD (for custom range)
     * @param {string} [params.dateTo] - YYYY-MM-DD (for custom range)
     */
    get: async function (params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `/api/v1/dashboard${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include' // Important for session cookies
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP Error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Failed to load dashboard data');
            }

            return result;
        } catch (error) {
            console.error('Dashboard Service Error:', error);
            throw error;
        }
    }
};

// Expose globally so inline scripts and other pages can use it
window.dashboardService = api.dashboard;

console.log('✅ DashboardService loaded successfully');