/**
 * Jenkins API Service Test Verification Script
 */
require('dotenv').config();
const jenkinsService = require('../services/jenkinsService');

const runJenkinsTests = async () => {
  console.log('--- Starting Jenkins API Service Tests ---');

  try {
    // 1. Test Triggering Jenkins Job with Parameters
    console.log('\n1. Testing jenkinsService.triggerJenkinsJob()...');
    const triggerRes = await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
      PROJECT_ID: 'proj_123456',
      PROJECT_NAME: 'NodeShop API',
      REPO_URL: 'https://github.com/user/nodeshop.git',
      BRANCH: 'main',
      PORT: '3000',
      VERSION: 'v1.0.0',
    });

    console.log('Trigger Result:', triggerRes);

    if (!triggerRes.success) {
      throw new Error('Jenkins trigger test failed!');
    }

    // 2. Test Fetching Jenkins Build Status
    console.log('\n2. Testing jenkinsService.getJenkinsBuildStatus()...');
    const statusRes = await jenkinsService.getJenkinsBuildStatus('cicd-deploy-pipeline', 1);

    console.log('Status Result:', statusRes);

    if (!statusRes.success || !statusRes.status) {
      throw new Error('Jenkins build status test failed!');
    }

    // 3. Test Fetching Jenkins Build Logs
    console.log('\n3. Testing jenkinsService.getJenkinsBuildLogs()...');
    const logsRes = await jenkinsService.getJenkinsBuildLogs('cicd-deploy-pipeline', 1);

    console.log(`Logs Result (Length: ${logsRes.logs?.length || 0} chars):`);
    console.log(logsRes.logs.substring(0, 250) + '\n...');

    if (!logsRes.success || !logsRes.logs) {
      throw new Error('Jenkins logs test failed!');
    }

    console.log('\n✅ All Jenkins API Service Tests Passed Successfully!');
  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
    process.exit(1);
  }
};

runJenkinsTests();
