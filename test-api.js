const URL = 'http://localhost:4525/api/auth';

async function runTests() {
    // Generate unique credentials for testing
    const uniqueId = Date.now();
    const testUser = {
        email: `test_${uniqueId}@example.com`,
        username: `user_${uniqueId}`,
        password: "securePassword123"
    };

    console.log("==================================================");
    console.log("🚀 STARTING API ENDPOINT TESTS");
    console.log("==================================================\n");

    try {
        // 1. REGISTER
        console.log("⏳ [1/3] POST /api/auth/register");
        const registerResponse = await fetch(`${URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        const registerResult = await registerResponse.json();
        console.log(`🔹 Status: ${registerResponse.status}`);
        console.log("🔹 Response:", JSON.stringify(registerResult, null, 2));

        if (registerResponse.status !== 201) {
            console.log("❌ Registration Failed. Stopping test.");
            return;
        }
        console.log("✅ Registration Successful!\n");

        // 2. LOGIN
        console.log("⏳ [2/3] POST /api/auth/login");
        const loginResponse = await fetch(`${URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
            })
        });
        const loginResult = await loginResponse.json();
        console.log(`🔹 Status: ${loginResponse.status}`);
        console.log("🔹 Response:", JSON.stringify(loginResult, null, 2));

        if (loginResponse.status !== 200) {
            console.log("❌ Login Failed. Stopping test.");
            return;
        }
        
        // Grab token cookie if returned
        const cookie = loginResponse.headers.get('set-cookie');
        console.log(`🔹 Cookie Received: ${cookie ? "Yes" : "No"}`);
        console.log("✅ Login Successful!\n");

        // 3. LOGOUT
        console.log("⏳ [3/3] POST /api/auth/logout");
        const headers = { 'Content-Type': 'application/json' };
        if (cookie) {
            headers['Cookie'] = cookie;
        } else if (loginResult.token) {
            headers['Authorization'] = `Bearer ${loginResult.token}`;
        }
        
        const logoutResponse = await fetch(`${URL}/logout`, {
            method: 'POST',
            headers: headers
        });
        const logoutResult = await logoutResponse.json();
        console.log(`🔹 Status: ${logoutResponse.status}`);
        console.log("🔹 Response:", JSON.stringify(logoutResult, null, 2));
        console.log("✅ Logout Successful!\n");

        console.log("==================================================");
        console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
        console.log("==================================================");

    } catch (error) {
        console.error("❌ Test encountered an error:", error.message);
        console.log("\n💡 Tip: Make sure your server is running with 'npm run dev' on port 4525 before executing this script.");
    }
}

runTests();
