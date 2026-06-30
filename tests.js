const http = require('http');

const runTest = async () => {
    const baseUrl = 'http://localhost:5000/api/v1';
    let token = '';

    const fetchAPI = async (method, endpoint, body = null) => {
        return new Promise((resolve, reject) => {
            const url = new URL(baseUrl + endpoint);
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            
            console.log(`\n--- REQUEST ---`);
            console.log(`${method} ${baseUrl}${endpoint}`);
            console.log(`Headers:`, JSON.stringify(headers));
            if (body) console.log(`Body:`, JSON.stringify(body));

            const reqOptions = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: method,
                headers: headers
            };
            
            const req = http.request(reqOptions, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log(`--- RESPONSE ---`);
                    console.log(`Status: ${res.statusCode}`);
                    let parsed;
                    try {
                        parsed = JSON.parse(data);
                        console.log(`Body:`, JSON.stringify(parsed, null, 2));
                    } catch (e) {
                        parsed = data;
                        console.log(`Body:`, data);
                    }
                    resolve({ status: res.statusCode, data: parsed });
                });
            });
            req.on('error', reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    };

    try {
        console.log('=============================================');
        console.log('         API VERIFICATION SUITE');
        console.log('=============================================');
        
        // 1. Health
        await fetchAPI('GET', '/health');

        // 2. Register
        const rEmail = `user${Date.now()}@test.com`;
        await fetchAPI('POST', '/auth/register', {
            name: 'New Test User',
            email: rEmail,
            password: 'password123',
            confirmPassword: 'password123'
        });

        // 3. Login
        const loginRes = await fetchAPI('POST', '/auth/login', {
            email: rEmail,
            password: 'password123'
        });
        token = loginRes.data.data.accessToken;
        const refreshToken = loginRes.data.data.refreshToken;

        // 4. Get Me
        await fetchAPI('GET', '/auth/me');

        // 5. Refresh Token
        console.log(`\n--- REQUEST ---`);
        console.log(`POST ${baseUrl}/auth/refresh`);
        console.log(`Body: {"refreshToken": "${refreshToken}"}`);
        const refreshRes = await fetchAPI('POST', '/auth/refresh', { refreshToken });
        token = refreshRes.data.data.accessToken;

        // 6. Category CRUD
        const catRes = await fetchAPI('POST', '/categories', {
            name: 'Test Cat',
            color: '#000000',
            icon: 'star'
        });
        let categoryId = catRes.data.data.category._id;
        
        await fetchAPI('GET', '/categories');
        
        await fetchAPI('PATCH', `/categories/${categoryId}`, { name: 'Updated Cat' });

        // 7. Expense CRUD
        const expRes = await fetchAPI('POST', '/expenses', {
            title: 'Test Expense',
            amount: 500,
            date: new Date().toISOString(),
            categoryId: categoryId,
            description: 'Testing CRUD'
        });
        let expenseId = expRes.data.data.expense._id;

        await fetchAPI('GET', '/expenses');
        
        await fetchAPI('PATCH', `/expenses/${expenseId}`, { amount: 600 });
        
        await fetchAPI('DELETE', `/expenses/${expenseId}`);

        // 8. Group CRUD
        const grpRes = await fetchAPI('POST', '/groups', {
            name: 'Test Group API',
            description: 'Group for tests API'
        });
        let groupId = grpRes.data.data._id;
        
        await fetchAPI('GET', '/groups');
        
        await fetchAPI('PATCH', `/groups/${groupId}`, { name: 'Updated Group API' });

        // 9. Dashboard
        await fetchAPI('GET', '/dashboard');

        // 10. Logout
        await fetchAPI('POST', '/auth/logout');
        
        // 11. Admin Endpoints (Using previously created admin)
        console.log("\n--- SWITCHING TO ADMIN USER ---");
        const adminLogin = await fetchAPI('POST', '/auth/login', {
            email: 'admin@test.com',
            password: 'password123'
        });
        token = adminLogin.data.data.accessToken;
        
        await fetchAPI('GET', '/admin/stats');
        await fetchAPI('GET', '/admin/users');
        await fetchAPI('GET', '/admin/expenses');
        
        console.log('\n=============================================');
        console.log('         API VERIFICATION COMPLETE');
        console.log('=============================================');

    } catch (e) {
        console.error("TEST FAILED:", e);
    }
};

runTest();
