/**
 * Jenkins API Service Integration Test Script
 */
require('dotenv').config();
const jenkinsService = require('../services/jenkinsService');

const runJenkinsTests = async () => {
  console.log('--- Starting Jenkins API Service Tests ---');

  try {
    // 1. Test Triggering Jenkins Job
    console.log('\n1. Testing jenkinsService.triggerJenkinsJob()...');
    const triggerRes = await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
      PROJECT_ID: 'test_project_123',
      PROJECT_NAME: 'nodeshop-api',
      REPO_URL: 'https://github.com/user/nodeshop.git',
      BRANCH: 'main',
      PORT: 3000,
      VERSION: 'v1.0.0',
      BUILD_NUMBER: 1,
    });
    console.log('Trigger Result:', triggerRes);

    if (!triggerRes.success) {
      throw new Error('Trigger Jenkins job failed!');
    }

    // 2. Test Fetching Jenkins Build Status
    console.log('\n2. Testing jenkinsService.getJenkinsBuildStatus()...');
    const statusRes = await jenkinsService.getJenkinsBuildStatus('cicd-deploy-pipeline', 1);
    console.log('Status Result:', statusRes);

    // 3. Test Fetching Jenkins Build Logs
    console.log('\n3. Testing jenkinsService.getJenkinsBuildLogs()...');
    const logsRes = await jenkinsService.getJenkinsBuildLogs('cicd-deploy-pipeline', 1);
    console.log(`Logs Result (Length: ${logsRes.logs?.length || 0} chars):\n${logsRes.logs?.substring(0, 200)}...\n`);

    console.log('✅ All Jenkins API Service Tests Passed Successfully!');
  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
  } finally {
    process.exit(0);
  }
};

runJenkinsTests();
