/**
 * Project CRUD API Test Verification Script
 */
require('dotenv').config();
const app = require('../app');
const mongoose = require('mongoose');

const PORT = 5002;

const runProjectTests = async () => {
  console.log('--- Starting Project CRUD API Tests ---');

  const server = app.listen(PORT, async () => {
    console.log(`[Test Server] Running on port ${PORT}`);

    try {
      const authUrl = `http://localhost:${PORT}/api/auth`;
      const projectUrl = `http://localhost:${PORT}/api/projects`;

      // 1. Register & Login to get token
      const testUser = {
        name: 'Project Manager',
        email: `pm_${Date.now()}@example.com`,
        password: 'password123',
        role: 'DEVELOPER',
      };

      const regRes = await fetch(`${authUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });
      const regData = await regRes.json();
      const token = regData.token;

      console.log('1. User Authenticated with JWT');

      // 2. Test POST /api/projects (Create Project)
      console.log('\n2. Testing POST /api/projects (Create Project)...');
      const newProj = {
        name: 'NodeShop Microservice',
        description: 'E-commerce REST API backend service',
        repositoryUrl: 'https://github.com/user/nodeshop.git',
        branch: 'main',
        dockerfilePath: 'Dockerfile',
        port: 3000,
        environment: 'development',
      };

      const createRes = await fetch(projectUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProj),
      });

      const createData = await createRes.json();
      console.log(`Status: ${createRes.status}`);
      console.log('Create Response:', createData);

      if (!createData.success || !createData.project) {
        throw new Error('Create project test failed!');
      }

      const projectId = createData.project._id || createData.project.id;

      // 3. Test GET /api/projects (List Projects)
      console.log('\n3. Testing GET /api/projects (List Projects)...');
      const listRes = await fetch(projectUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const listData = await listRes.json();
      console.log(`Status: ${listRes.status}, Total Projects Found: ${listData.count}`);

      if (!listData.success || listData.count < 1) {
        throw new Error('List projects test failed!');
      }

      // 4. Test GET /api/projects/:id (Project Details)
      console.log(`\n4. Testing GET /api/projects/${projectId}...`);
      const getSingleRes = await fetch(`${projectUrl}/${projectId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const singleData = await getSingleRes.json();
      console.log(`Status: ${getSingleRes.status}, Name: ${singleData.project?.name}`);

      if (!singleData.success) {
        throw new Error('Get single project test failed!');
      }

      // 5. Test PUT /api/projects/:id (Update Project)
      console.log(`\n5. Testing PUT /api/projects/${projectId}...`);
      const updateRes = await fetch(`${projectUrl}/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ branch: 'staging', port: 8080 }),
      });
      const updateData = await updateRes.json();
      console.log(`Status: ${updateRes.status}, Updated Branch: ${updateData.project?.branch}`);

      if (!updateData.success || updateData.project?.branch !== 'staging') {
        throw new Error('Update project test failed!');
      }

      // 6. Test DELETE /api/projects/:id (Delete Project)
      console.log(`\n6. Testing DELETE /api/projects/${projectId}...`);
      const deleteRes = await fetch(`${projectUrl}/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const deleteData = await deleteRes.json();
      console.log(`Status: ${deleteRes.status}, Message: ${deleteData.message}`);

      if (!deleteData.success) {
        throw new Error('Delete project test failed!');
      }

      console.log('\n✅ All Project CRUD API Tests Passed Successfully!');
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

runProjectTests();
