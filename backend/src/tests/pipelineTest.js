/**
 * Docker Pipeline & Jenkinsfile Validation Test Script
 */
const fs = require('fs');
const path = require('path');

const runPipelineTests = async () => {
  console.log('--- Starting Docker CI Pipeline & Jenkinsfile Validation Tests ---');

  try {
    const jenkinsfilePath = path.join(__dirname, '../../../jenkins/Jenkinsfile');
    
    // 1. Verify Jenkinsfile Exists
    console.log('\n1. Verifying Jenkinsfile existence...');
    if (!fs.existsSync(jenkinsfilePath)) {
      throw new Error('Jenkinsfile does not exist!');
    }

    const content = fs.readFileSync(jenkinsfilePath, 'utf8');

    // 2. Validate Required CI Pipeline Stages
    const requiredStages = [
      'Checkout Code',
      'Install Dependencies',
      'Run Unit Tests',
      'Build Docker Image',
      'Push Image to Docker Hub',
    ];

    console.log('\n2. Validating Declarative CI Pipeline Stages...');
    requiredStages.forEach((stage) => {
      if (!content.includes(stage)) {
        throw new Error(`Missing required stage: ${stage}`);
      }
      console.log(`  ✓ Stage found: ${stage}`);
    });

    // 3. Validate Build Abort on Test Failure
    console.log('\n3. Validating Test Failure Abort Directive...');
    if (!content.includes('error("[CI Pipeline Error] Unit tests failed! Aborting build pipeline.")')) {
      throw new Error('Missing test failure abort error handler!');
    }
    console.log('  ✓ Test failure abort handler verified.');

    // 4. Validate Versioned Docker Image Tagging & Docker Hub Registry Push
    console.log('\n4. Validating Versioned Docker Tagging & Push...');
    if (!content.includes('params.VERSION') || !content.includes('docker push')) {
      throw new Error('Missing versioned image tag parameter or docker push command!');
    }
    console.log('  ✓ Versioned Docker image tagging (params.VERSION) & registry push verified.');

    console.log('\n✅ All Docker CI Pipeline & Jenkinsfile Validation Tests Passed Successfully!');
  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
    process.exit(1);
  }
};

runPipelineTests();
