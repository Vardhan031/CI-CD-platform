/**
 * Authentication & RBAC Test Verification Script
 */
require('dotenv').config();
const http = require('http');
const app = require('../app');
const mongoose = require('mongoose');

const PORT = 5001;

const runTests = async () => {
  console.log('--- Starting Auth & RBAC API Tests ---');
  
  // Start temporary test server
  const server = app.listen(PORT, async () => {
    console.log(`[Test Server] Running on port ${PORT}`);

    try {
      const baseUrl = `http://localhost:${PORT}/api/auth`;

      // 1. Test Register Endpoint
      const testUser = {
        name: 'Test Developer',
        email: `dev_${Date.now()}@example.com`,
        password: 'password123',
        role: 'DEVELOPER',
      };

      console.log('\n1. Testing POST /api/auth/register...');
      const registerRes = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      const registerData = await registerRes.json();
      console.log(`Status: ${registerRes.status}`);
      console.log('Register Response:', registerData);

      if (!registerData.success || !registerData.token) {
        throw new Error('Register test failed!');
      }

      // 2. Test Login Endpoint
      console.log('\n2. Testing POST /api/auth/login...');
      const loginRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email, password: testUser.password }),
      });

      const loginData = await loginRes.json();
      console.log(`Status: ${loginRes.status}`);
      console.log('Login Response:', loginData);

      if (!loginData.success || !loginData.token) {
        throw new Error('Login test failed!');
      }

      const authToken = loginData.token;

      // 3. Test GET /api/auth/me (Protected Route)
      console.log('\n3. Testing GET /api/auth/me (Bearer Auth)...');
      const meRes = await fetch(`${baseUrl}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const meData = await meRes.json();
      console.log(`Status: ${meRes.status}`);
      console.log('User Profile Response:', meData);

      if (!meData.success || meData.user.email !== testUser.email) {
        throw new Error('GetMe test failed!');
      }

      // 4. Test RBAC Enforcement (DEVELOPER user attempting ADMIN-only endpoint)
      console.log('\n4. Testing RBAC Enforcement (DEVELOPER requesting ADMIN endpoint)...');
      const rbacRes = await fetch(`${baseUrl}/admin-test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const rbacData = await rbacRes.json();
      console.log(`Status: ${rbacRes.status}`);
      console.log('RBAC Response:', rbacData);

      if (rbacRes.status !== 403) {
        throw new Error('RBAC test failed! Non-admin was not blocked with 403 Forbidden.');
      }

      console.log('\n✅ All Auth & RBAC Tests (Including 403 Forbidden RBAC check) Passed Successfully!');
    } catch (err) {
      console.error('\n❌ Test Error:', err.message);
    } finally {
      server.close();
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      process.exit(0);
    }
  });
};

runTests();
