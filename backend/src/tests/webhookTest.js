/**
 * GitHub Webhook Automation Test Script
 */
require('dotenv').config();
const app = require('../app');
const mongoose = require('mongoose');

const PORT = 5004;

const runWebhookTests = async () => {
  console.log('--- Starting GitHub Webhook Automation API Tests ---');

  const server = app.listen(PORT, async () => {
    console.log(`[Test Server] Running on port ${PORT}`);

    try {
      const authUrl = `http://localhost:${PORT}/api/auth`;
      const projectUrl = `http://localhost:${PORT}/api/projects`;
      const webhookUrl = `http://localhost:${PORT}/api/webhooks/github`;

      // 1. Authenticate & Register Target Project
      const testUser = {
        name: 'Webhook Dev',
        email: `webhook_${Date.now()}@example.com`,
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

      const targetRepoUrl = 'https://github.com/user/webhook-shop.git';
      const targetBranch = 'main';

      const projRes = await fetch(projectUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Webhook Shop Microservice',
          repositoryUrl: targetRepoUrl,
          branch: targetBranch,
          port: 4000,
        }),
      });
      const projData = await projRes.json();
      const projectId = projData.project._id || projData.project.id;

      console.log(`1. Target Project Registered for Webhook (ID: ${projectId})`);

      // 2. Simulate GitHub Push Event Webhook HTTP POST Payload
      console.log('\n2. Simulating GitHub Push Event Webhook (POST /api/webhooks/github)...');
      const gitHubPayload = {
        ref: `refs/heads/${targetBranch}`,
        repository: {
          name: 'webhook-shop',
          full_name: 'user/webhook-shop',
          html_url: targetRepoUrl,
          clone_url: targetRepoUrl,
        },
        head_commit: {
          id: '8fa32c9123456789',
          message: 'feat: add payment checkout microservice',
          timestamp: new Date().toISOString(),
          author: {
            name: 'Webhook Dev',
            email: testUser.email,
          },
        },
      };

      const webhookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'push',
        },
        body: JSON.stringify(gitHubPayload),
      });

      const webhookData = await webhookRes.json();
      console.log(`Status: ${webhookRes.status}`);
      console.log('Webhook Response:', webhookData);

      if (!webhookData.success || !webhookData.deployment) {
        throw new Error('GitHub Webhook trigger test failed!');
      }

      if (webhookData.deployment.triggerType !== 'WEBHOOK') {
        throw new Error('Deployment triggerType is not WEBHOOK!');
      }

      // 3. Verify Deployment Record Created for Project
      console.log(`\n3. Verifying Project Deployments history for project ${projectId}...`);
      const historyRes = await fetch(`${projectUrl}/${projectId}/deployments`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const historyData = await historyRes.json();
      console.log(`Status: ${historyRes.status}, Total Deployments Found: ${historyData.count}`);

      if (!historyData.success || historyData.count < 1) {
        throw new Error('Project deployment history check failed!');
      }

      console.log('\n✅ All GitHub Webhook Automation API Tests Passed Successfully!');
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

runWebhookTests();
