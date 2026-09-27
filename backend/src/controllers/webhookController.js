const crypto = require('crypto');
const Project = require('../models/Project');
const Deployment = require('../models/Deployment');
const Build = require('../models/Build');
const DeploymentLog = require('../models/DeploymentLog');
const jenkinsService = require('../services/jenkinsService');
const mongoose = require('mongoose');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * Helper to verify GitHub Webhook HMAC SHA256 Signature
 */
const verifyGitHubSignature = (req) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true; // Skip signature check if secret is not configured in env

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(JSON.stringify(req.body)).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
};

/**
 * GitHub Webhook Controller
 * Handles incoming push events from GitHub repositories to automate CI build pipelines
 * @route POST /api/webhooks/github
 * @access Public (GitHub Webhook Listener)
 */
const handleGitHubWebhook = async (req, res, next) => {
  try {
    const payload = req.body;

    // Check if this is a GitHub ping event
    if (req.headers['x-github-event'] === 'ping') {
      return res.status(200).json({
        success: true,
        message: 'GitHub webhook ping received successfully',
      });
    }

    // Verify HMAC signature if secret is present
    if (!verifyGitHubSignature(req)) {
      return res.status(401).json({
        success: false,
        message: 'GitHub Webhook signature verification failed: Invalid X-Hub-Signature-256',
      });
    }

    // Extract repository URL & branch ref from GitHub payload
    const repoUrl = payload.repository?.html_url || payload.repository?.clone_url;
    const ref = payload.ref; // e.g. "refs/heads/main"

    if (!repoUrl || !ref) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GitHub webhook payload: Missing repository URL or branch ref',
      });
    }

    const pushedBranch = ref.replace('refs/heads/', '');
    const commitHash = payload.head_commit?.id?.substring(0, 7) || Math.random().toString(16).substring(2, 9);
    const commitMessage = payload.head_commit?.message || 'Automatic webhook push trigger';

    console.log(`[GitHub Webhook Event] Push detected for Repo: ${repoUrl} | Branch: ${pushedBranch} | Commit: ${commitHash}`);

    if (isDbConnected()) {
      const projects = await Project.find();
      const project = projects.find(
        (p) =>
          (p.repositoryUrl.toLowerCase() === repoUrl.toLowerCase() ||
           p.repositoryUrl.toLowerCase().includes(payload.repository?.name?.toLowerCase())) &&
          p.branch.toLowerCase() === pushedBranch.toLowerCase()
      );

      if (!project) {
        console.warn(`[GitHub Webhook Warning] No project found matching repository "${repoUrl}" and branch "${pushedBranch}"`);
        return res.status(200).json({
          success: false,
          message: `Webhook received, but no project is registered for repository URL "${repoUrl}" on branch "${pushedBranch}"`,
        });
      }

      const deploymentCount = await Deployment.countDocuments({ project: project._id });
      const buildNumber = deploymentCount + 1;
      const version = `v1.0.${buildNumber - 1}`;
      const startedAt = new Date();

      // Trigger Jenkins Pipeline
      const jenkinsRes = await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
        PROJECT_ID: project._id.toString(),
        PROJECT_NAME: project.name,
        REPO_URL: project.repositoryUrl,
        BRANCH: pushedBranch,
        DOCKERFILE_PATH: project.dockerfilePath || 'Dockerfile',
        PORT: project.port,
        VERSION: version,
        BUILD_NUMBER: buildNumber,
        COMMIT_HASH: commitHash,
        DOCKER_HUB_USER: process.env.DOCKER_HUB_USER || 'vardhan031',
      });

      if (!jenkinsRes.success) {
        return res.status(500).json({
          success: false,
          message: jenkinsRes.message || 'Failed to trigger Jenkins CI job via Webhook',
        });
      }

      // Create Deployment Record
      const deployment = await Deployment.create({
        project: project._id,
        version,
        commitHash,
        branch: pushedBranch,
        status: 'RUNNING',
        triggerType: 'WEBHOOK',
        buildNumber,
        startedAt,
      });

      const logs = `[GitHub Webhook Listener] Received push event from GitHub for branch '${pushedBranch}'
[Commit] Hash: ${commitHash} - Message: "${commitMessage}"
[Jenkins CI Engine] Pipeline triggered for ${project.name} (Version: ${version})
[Status] Build execution in progress on Jenkins server...`;

      await Build.create({
        deployment: deployment._id,
        buildNumber,
        status: 'IN_PROGRESS',
        logs,
        startedAt,
      });

      await DeploymentLog.create({
        deployment: deployment._id,
        action: 'WEBHOOK_TRIGGER',
        message: `CI Pipeline ${version} triggered via GitHub Webhook push to ${pushedBranch}`,
      });

      project.status = 'BUILDING';
      await project.save();

      return res.status(200).json({
        success: true,
        message: `GitHub Webhook triggered CI build pipeline ${version} for project "${project.name}"`,
        deployment,
      });
    } else {
      const { inMemoryProjects, inMemoryDeployments, inMemoryBuilds } = require('../utils/devStore');

      const projectsList = Array.from(inMemoryProjects.values());
      const project = projectsList.find(
        (p) =>
          (p.repositoryUrl.toLowerCase() === repoUrl.toLowerCase() ||
           p.repositoryUrl.toLowerCase().includes(payload.repository?.name?.toLowerCase())) &&
          p.branch.toLowerCase() === pushedBranch.toLowerCase()
      );

      if (!project) {
        return res.status(200).json({
          success: false,
          message: `Webhook received, but no project is registered for repository URL "${repoUrl}" on branch "${pushedBranch}"`,
        });
      }

      const existingDeployments = Array.from(inMemoryDeployments.values()).filter(
        (d) => d.project === (project._id || project.id)
      );
      const buildNumber = existingDeployments.length + 1;
      const version = `v1.0.${buildNumber - 1}`;
      const mockDepId = `dep_${Date.now()}`;
      const startedAt = new Date().toISOString();

      const jenkinsRes = await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
        PROJECT_ID: project._id || project.id,
        PROJECT_NAME: project.name,
        REPO_URL: project.repositoryUrl,
        BRANCH: pushedBranch,
        PORT: project.port,
        VERSION: version,
        BUILD_NUMBER: buildNumber,
        DOCKER_HUB_USER: process.env.DOCKER_HUB_USER || 'vardhan031',
      });

      if (!jenkinsRes.success) {
        return res.status(500).json({
          success: false,
          message: jenkinsRes.message || 'Failed to trigger Jenkins CI job via Webhook',
        });
      }

      const mockDeployment = {
        _id: mockDepId,
        id: mockDepId,
        project: project._id || project.id,
        version,
        commitHash,
        branch: pushedBranch,
        status: 'RUNNING',
        triggerType: 'WEBHOOK',
        buildNumber,
        startedAt,
        createdAt: startedAt,
      };

      const logs = `[GitHub Webhook Listener] Push event received for branch '${pushedBranch}'
[Commit] Hash: ${commitHash} - Message: "${commitMessage}"
[Jenkins CI Engine] Pipeline triggered for ${project.name} (${version})
[Status] Build execution in progress on Jenkins server...`;

      const mockBuild = {
        _id: `build_${Date.now()}`,
        deployment: mockDepId,
        buildNumber,
        status: 'IN_PROGRESS',
        logs,
        startedAt,
      };

      inMemoryDeployments.set(mockDepId, mockDeployment);
      inMemoryBuilds.set(mockDepId, mockBuild);

      project.status = 'BUILDING';
      inMemoryProjects.set(project._id || project.id, project);

      return res.status(200).json({
        success: true,
        message: `GitHub Webhook triggered CI pipeline ${version} for project "${project.name}" (In-Memory Dev Mode)`,
        deployment: mockDeployment,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleGitHubWebhook,
};
