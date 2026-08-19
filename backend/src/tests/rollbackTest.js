/**
 * Health Check & Rollback Engine API Test Verification Script
 */
require('dotenv').config();
const app = require('../app');
const mongoose = require('mongoose');
const { verifyApplicationHealth } = require('../services/healthCheckService');

const PORT = 5005;

const runRollbackTests = async () => {
  console.log('--- Starting Health Check & Rollback Engine API Tests ---');

  const server = app.listen(PORT, async () => {
    console.log(`[Test Server] Running on port ${PORT}`);

    try {
      const authUrl = `http://localhost:${PORT}/api/auth`;
      const projectUrl = `http://localhost:${PORT}/api/projects`;
      const deploymentUrl = `http://localhost:${PORT}/api/deployments`;

      // 1. Test Health Check Service on backend test port 5005 (/api/health)
      console.log('\n1. Testing healthCheckService.verifyApplicationHealth()...');
      const healthRes = await verifyApplicationHealth(PORT, '/api/health');
      console.log('Health Service Result:', healthRes);

      if (!healthRes.healthy) {
        throw new Error('Health check service test failed!');
      }

      // 2. Authenticate User & Register Project
      const testUser = {
        name: 'Rollback Tester',
        email: `rollback_${Date.now()}@example.com`,
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

      const projRes = await fetch(projectUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Rollback Service API',
          repositoryUrl: 'https://github.com/user/rollback-api.git',
          branch: 'main',
          port: PORT,
        }),
      });
      const projData = await projRes.json();
      const projectId = projData.project._id || projData.project.id;

      console.log(`\n2. Project Registered for Rollback Test (ID: ${projectId})`);

      // 3. Trigger Initial Deployment (v1.0.0)
      console.log('\n3. Triggering Deployment v1.0.0...');
      const dep1Res = await fetch(`${projectUrl}/${projectId}/deploy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ triggerType: 'MANUAL' }),
      });
      const dep1Data = await dep1Res.json();
      const dep1Id = dep1Data.deployment._id || dep1Data.deployment.id;
      console.log(`Initial Deployment Created (Version: ${dep1Data.deployment?.version})`);

      // 4. Trigger Second Deployment (v1.0.1)
      console.log('\n4. Triggering Deployment v1.0.1...');
      const dep2Res = await fetch(`${projectUrl}/${projectId}/deploy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ triggerType: 'MANUAL' }),
      });
      const dep2Data = await dep2Res.json();
      console.log(`Second Deployment Created (Version: ${dep2Data.deployment?.version})`);

      // 5. Test Rollback Endpoint targeting initial Deployment dep1Id (v1.0.0)
      console.log(`\n5. Executing Rollback to Initial Deployment (ID: ${dep1Id})...`);
      const rollbackRes = await fetch(`${deploymentUrl}/${dep1Id}/rollback`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const rollbackData = await rollbackRes.json();
      console.log(`Status: ${rollbackRes.status}`);
      console.log('Rollback Response:', rollbackData);

      if (!rollbackData.success || !rollbackData.deployment) {
        throw new Error('Rollback endpoint test failed!');
      }

      if (!rollbackData.deployment.version.includes('rollback')) {
        throw new Error('Rollback version tag format is incorrect!');
      }

      // 6. Verify Active Project Version Updated
      console.log(`\n6. Verifying active version update for project ${projectId}...`);
      const getProjRes = await fetch(`${projectUrl}/${projectId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const getProjData = await getProjRes.json();
      console.log(`Active Project Version: ${getProjData.project?.currentVersion}`);

      if (!getProjData.project?.currentVersion.includes('rollback')) {
        throw new Error('Project currentVersion was not updated after rollback!');
      }

      console.log('\n✅ All Health Check & Rollback Engine API Tests Passed Successfully!');
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

runRollbackTests();
