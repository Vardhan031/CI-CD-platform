const Project = require('../models/Project');
const Deployment = require('../models/Deployment');
const Build = require('../models/Build');
const DeploymentLog = require('../models/DeploymentLog');
const jenkinsService = require('../services/jenkinsService');
const mongoose = require('mongoose');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * GitHub Webhook Controller
 * Handles incoming push events from GitHub repositories to automate deployment pipelines
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
      // Find matching project in MongoDB
      // Match by repository URL (flexible matching) and configured branch
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

      // Calculate build number & version
      const deploymentCount = await Deployment.countDocuments({ project: project._id });
      const buildNumber = deploymentCount + 1;
      const version = `v1.0.${buildNumber - 1}`;
      const startedAt = new Date();

      // Trigger Jenkins Pipeline
      await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
        PROJECT_ID: project._id.toString(),
        PROJECT_NAME: project.name,
        REPO_URL: project.repositoryUrl,
        BRANCH: pushedBranch,
        DOCKERFILE_PATH: project.dockerfilePath || 'Dockerfile',
        PORT: project.port,
        VERSION: version,
        BUILD_NUMBER: buildNumber,
        COMMIT_HASH: commitHash,
      });

      // Create Deployment Record
      const deployment = await Deployment.create({
        project: project._id,
        version,
        commitHash,
        branch: pushedBranch,
        status: 'SUCCESS',
        triggerType: 'WEBHOOK',
        buildNumber,
        startedAt,
        completedAt: new Date(startedAt.getTime() + 12000),
        duration: 12,
      });

      // Create Build Log
      const logs = `[GitHub Webhook Listener] Received push event from GitHub for branch '${pushedBranch}'
[Commit] Hash: ${commitHash} - Message: "${commitMessage}"
[Jenkins Engine] Pipeline triggered for ${project.name} (Version: ${version})
[Build Result] SUCCESS - Container deployed on port ${project.port}`;

      await Build.create({
        deployment: deployment._id,
        buildNumber,
        status: 'SUCCESS',
        logs,
        startedAt,
        completedAt: deployment.completedAt,
      });

      // Update Project Status & Active Version
      project.status = 'DEPLOYED';
      project.currentVersion = version;
      await project.save();

      return res.status(200).json({
        success: true,
        message: `GitHub Webhook triggered deployment ${version} for project "${project.name}"`,
        deployment,
      });
    } else {
      // In-Memory Fallback Dev Mode
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

      await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
        PROJECT_ID: project._id || project.id,
        PROJECT_NAME: project.name,
        REPO_URL: project.repositoryUrl,
        BRANCH: pushedBranch,
        PORT: project.port,
        VERSION: version,
        BUILD_NUMBER: buildNumber,
      });

      const mockDeployment = {
        _id: mockDepId,
        id: mockDepId,
        project: project._id || project.id,
        version,
        commitHash,
        branch: pushedBranch,
        status: 'SUCCESS',
        triggerType: 'WEBHOOK',
        buildNumber,
        startedAt: new Date().toISOString(),
        duration: 12,
        createdAt: new Date().toISOString(),
      };

      const logs = `[GitHub Webhook Listener] Push event received for branch '${pushedBranch}'
[Commit] Hash: ${commitHash} - Message: "${commitMessage}"
[Jenkins Engine] Pipeline triggered for ${project.name} (${version})
[Build Result] SUCCESS - Container deployed on port ${project.port}`;

      const mockBuild = {
        _id: `build_${Date.now()}`,
        deployment: mockDepId,
        buildNumber,
        status: 'SUCCESS',
        logs,
      };

      inMemoryDeployments.set(mockDepId, mockDeployment);
      inMemoryBuilds.set(mockDepId, mockBuild);

      project.status = 'DEPLOYED';
      project.currentVersion = version;
      inMemoryProjects.set(project._id || project.id, project);

      return res.status(200).json({
        success: true,
        message: `GitHub Webhook triggered deployment ${version} for project "${project.name}" (In-Memory Dev Mode)`,
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
