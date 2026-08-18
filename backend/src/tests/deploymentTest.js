/**
 * Deployment Tracking & Pipeline API Test Verification Script
 */
require('dotenv').config();
const app = require('../app');
const mongoose = require('mongoose');

const PORT = 5003;

const runDeploymentTests = async () => {
  console.log('--- Starting Deployment Tracking API Tests ---');

  const server = app.listen(PORT, async () => {
    console.log(`[Test Server] Running on port ${PORT}`);

    try {
      const authUrl = `http://localhost:${PORT}/api/auth`;
      const projectUrl = `http://localhost:${PORT}/api/projects`;
      const deploymentUrl = `http://localhost:${PORT}/api/deployments`;

      // 1. Authenticate User
      const testUser = {
        name: 'DevOps Engineer',
        email: `devops_${Date.now()}@example.com`,
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

      console.log('1. User Authenticated with JWT Token');

      // 2. Create Project
      const newProj = {
        name: 'Deployment Pipeline API',
        repositoryUrl: 'https://github.com/user/deploy-app.git',
        branch: 'main',
        port: 8080,
      };

      const projRes = await fetch(projectUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProj),
      });
      const projData = await projRes.json();
      const projectId = projData.project._id || projData.project.id;

      console.log(`2. Registered Target Project (ID: ${projectId})`);

      // 3. Test POST /api/projects/:projectId/deploy (Trigger Deployment)
      console.log(`\n3. Testing POST /api/projects/${projectId}/deploy (Trigger Deployment)...`);
      const triggerRes = await fetch(`${projectUrl}/${projectId}/deploy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ triggerType: 'MANUAL' }),
      });
      const triggerData = await triggerRes.json();
      console.log(`Status: ${triggerRes.status}, Version: ${triggerData.deployment?.version}`);

      if (!triggerData.success || !triggerData.deployment) {
        throw new Error('Trigger deployment test failed!');
      }

      const deploymentId = triggerData.deployment._id || triggerData.deployment.id;

      // 4. Test GET /api/projects/:projectId/deployments (Get Project Deployments)
      console.log(`\n4. Testing GET /api/projects/${projectId}/deployments...`);
      const historyRes = await fetch(`${projectUrl}/${projectId}/deployments`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const historyData = await historyRes.json();
      console.log(`Status: ${historyRes.status}, Total Deployments: ${historyData.count}`);

      if (!historyData.success || historyData.count < 1) {
        throw new Error('Get project deployments test failed!');
      }

      // 5. Test GET /api/deployments/:id (Deployment Details)
      console.log(`\n5. Testing GET /api/deployments/${deploymentId}...`);
      const detailRes = await fetch(`${deploymentUrl}/${deploymentId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const detailData = await detailRes.json();
      console.log(`Status: ${detailRes.status}, Status: ${detailData.deployment?.status}`);

      if (!detailData.success) {
        throw new Error('Get deployment details test failed!');
      }

      // 6. Test GET /api/deployments/:id/logs (Build Logs)
      console.log(`\n6. Testing GET /api/deployments/${deploymentId}/logs...`);
      const logsRes = await fetch(`${deploymentUrl}/${deploymentId}/logs`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const logsData = await logsRes.json();
      console.log(`Status: ${logsRes.status}, Logs Length: ${logsData.logs?.length || 0} chars`);

      if (!logsData.success || !logsData.logs) {
        throw new Error('Get deployment logs test failed!');
      }

      // 7. Test POST /api/deployments/:id/rollback (Rollback Version)
      console.log(`\n7. Testing POST /api/deployments/${deploymentId}/rollback...`);
      const rollbackRes = await fetch(`${deploymentUrl}/${deploymentId}/rollback`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const rollbackData = await rollbackRes.json();
      console.log(`Status: ${rollbackRes.status}, Message: ${rollbackData.message}`);

      if (!rollbackData.success) {
        throw new Error('Rollback deployment test failed!');
      }

      console.log('\n✅ All Deployment Tracking & Pipeline API Tests Passed Successfully!');
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

runDeploymentTests();
