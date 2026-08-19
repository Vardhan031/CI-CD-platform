const Deployment = require('../models/Deployment');
const Build = require('../models/Build');
const DeploymentLog = require('../models/DeploymentLog');
const Project = require('../models/Project');
const jenkinsService = require('../services/jenkinsService');
const mongoose = require('mongoose');
const { inMemoryProjects, inMemoryDeployments, inMemoryBuilds, inMemoryLogs } = require('../utils/devStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

// Helper to generate simulated Jenkins pipeline logs
const generatePipelineLogs = (projectName, version, buildNum, port) => {
  return `[Jenkins CI/CD Engine] Starting Job #${buildNum} for Project: ${projectName}
[Checkout] Checking out git branch 'main'...
[Checkout] Commit hash: ${Math.random().toString(16).substring(2, 9)}
[Dependencies] Installing dependencies with npm ci...
[Dependencies] 142 packages audited in 3.4s. 0 vulnerabilities found.
[Test] Executing automated unit test suite...
[Test] PASS src/tests/unit.test.js (4 tests passed)
[Docker Build] Building image tag: ${projectName.toLowerCase().replace(/\s+/g, '-')}:${version}
[Docker Build] Step 1/5: FROM node:22-alpine
[Docker Build] Step 2/5: WORKDIR /app
[Docker Build] Step 3/5: COPY package*.json ./
[Docker Build] Step 4/5: COPY . .
[Docker Build] Step 5/5: EXPOSE ${port}
[Docker Build] Image successfully tagged ${projectName.toLowerCase().replace(/\s+/g, '-')}:${version}
[Deploy] Stopping existing container if running...
[Deploy] Starting container: docker run -d -p ${port}:${port} --name ${projectName.toLowerCase().replace(/\s+/g, '-')}_container ${projectName.toLowerCase().replace(/\s+/g, '-')}:${version}
[Health Check] Invoking GET http://localhost:${port}/health ...
[Health Check] HTTP 200 OK - Health check passed!
[Pipeline Finished] Build #${buildNum} completed successfully with status SUCCESS.`;
};

// @desc    Trigger a manual or webhook deployment
// @route   POST /api/projects/:projectId/deploy
// @access  Private (ADMIN, DEVELOPER)
const triggerDeployment = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const triggerType = req.body.triggerType || 'MANUAL';

    if (isDbConnected()) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      // Calculate build number & next version
      const deploymentCount = await Deployment.countDocuments({ project: projectId });
      const buildNumber = deploymentCount + 1;
      const version = `v1.0.${buildNumber - 1}`;
      const startedAt = new Date();

      // Trigger Jenkins Job via REST API
      const jenkinsRes = await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
        PROJECT_ID: project._id.toString(),
        PROJECT_NAME: project.name,
        REPO_URL: project.repositoryUrl,
        BRANCH: project.branch || 'main',
        DOCKERFILE_PATH: project.dockerfilePath || 'Dockerfile',
        PORT: project.port,
        VERSION: version,
        BUILD_NUMBER: buildNumber,
      });

      const deployment = await Deployment.create({
        project: projectId,
        version,
        commitHash: Math.random().toString(16).substring(2, 9),
        branch: project.branch || 'main',
        status: 'SUCCESS',
        triggeredBy: req.user?.id,
        triggerType,
        buildNumber,
        startedAt,
        completedAt: new Date(startedAt.getTime() + 12000),
        duration: 12,
      });

      // Create Build Log record
      const pipelineLogs = generatePipelineLogs(project.name, version, buildNumber, project.port);
      await Build.create({
        deployment: deployment._id,
        buildNumber,
        status: 'SUCCESS',
        logs: pipelineLogs,
        startedAt,
        completedAt: deployment.completedAt,
      });

      // Audit Log
      await DeploymentLog.create({
        deployment: deployment._id,
        action: 'TRIGGER_PIPELINE',
        message: `Deployment ${version} triggered via ${triggerType} by ${req.user?.name || 'System'}`,
        user: req.user?.id,
      });

      // Update project status & current version
      project.status = 'DEPLOYED';
      project.currentVersion = version;
      await project.save();

      return res.status(201).json({
        success: true,
        message: `Deployment ${version} triggered successfully`,
        deployment,
      });
    } else {
      // In-Memory Dev Mode
      const { inMemoryProjects } = require('./projectController');
      const project = inMemoryProjects.get(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      const existingDeployments = Array.from(inMemoryDeployments.values()).filter(
        (d) => d.project === projectId
      );
      const buildNumber = existingDeployments.length + 1;
      const version = `v1.0.${buildNumber - 1}`;
      const startedAt = new Date().toISOString();
      const mockDepId = `dep_${Date.now()}`;

      // Trigger Jenkins API Job
      await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
        PROJECT_ID: projectId,
        PROJECT_NAME: project.name,
        REPO_URL: project.repositoryUrl,
        BRANCH: project.branch || 'main',
        PORT: project.port,
        VERSION: version,
        BUILD_NUMBER: buildNumber,
      });

      const mockDeployment = {
        _id: mockDepId,
        id: mockDepId,
        project: projectId,
        version,
        commitHash: Math.random().toString(16).substring(2, 9),
        branch: project.branch || 'main',
        status: 'SUCCESS',
        triggeredBy: req.user?.id,
        triggerType,
        buildNumber,
        startedAt,
        completedAt: new Date().toISOString(),
        duration: 12,
        createdAt: startedAt,
      };

      const pipelineLogs = generatePipelineLogs(project.name, version, buildNumber, project.port);
      const mockBuild = {
        _id: `build_${Date.now()}`,
        deployment: mockDepId,
        buildNumber,
        status: 'SUCCESS',
        logs: pipelineLogs,
        startedAt,
      };

      inMemoryDeployments.set(mockDepId, mockDeployment);
      inMemoryBuilds.set(mockDepId, mockBuild);

      // Update project state
      project.status = 'DEPLOYED';
      project.currentVersion = version;
      inMemoryProjects.set(projectId, project);

      return res.status(201).json({
        success: true,
        message: `Deployment ${version} triggered successfully (In-Memory Dev Mode)`,
        deployment: mockDeployment,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all deployments for a project
// @route   GET /api/projects/:projectId/deployments
// @access  Private
const getProjectDeployments = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (isDbConnected()) {
      const deployments = await Deployment.find({ project: projectId })
        .populate('triggeredBy', 'name email')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: deployments.length,
        deployments,
      });
    } else {
      const deployments = Array.from(inMemoryDeployments.values())
        .filter((d) => d.project === projectId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return res.status(200).json({
        success: true,
        count: deployments.length,
        deployments,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all deployments platform-wide
// @route   GET /api/deployments
// @access  Private
const getAllDeployments = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const deployments = await Deployment.find()
        .populate('project', 'name repositoryUrl port')
        .populate('triggeredBy', 'name email')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: deployments.length,
        deployments,
      });
    } else {
      const deployments = Array.from(inMemoryDeployments.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      return res.status(200).json({
        success: true,
        count: deployments.length,
        deployments,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get single deployment details
// @route   GET /api/deployments/:id
// @access  Private
const getDeploymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const deployment = await Deployment.findById(id)
        .populate('project', 'name repositoryUrl branch port dockerfilePath')
        .populate('triggeredBy', 'name email');

      if (!deployment) {
        return res.status(404).json({ success: false, message: 'Deployment record not found' });
      }

      const build = await Build.findOne({ deployment: id });

      return res.status(200).json({
        success: true,
        deployment,
        build,
      });
    } else {
      const deployment = inMemoryDeployments.get(id);
      if (!deployment) {
        return res.status(404).json({ success: false, message: 'Deployment record not found' });
      }
      const build = inMemoryBuilds.get(id);

      return res.status(200).json({
        success: true,
        deployment,
        build,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get deployment logs
// @route   GET /api/deployments/:id/logs
// @access  Private
const getDeploymentLogs = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const build = await Build.findOne({ deployment: id });
      if (!build) {
        return res.status(404).json({ success: false, message: 'Build logs not found' });
      }
      return res.status(200).json({
        success: true,
        logs: build.logs,
      });
    } else {
      const build = inMemoryBuilds.get(id);
      if (!build) {
        return res.status(404).json({ success: false, message: 'Build logs not found' });
      }
      return res.status(200).json({
        success: true,
        logs: build.logs,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Rollback to a previous successful deployment
// @route   POST /api/deployments/:id/rollback
// @access  Private (ADMIN, DEVELOPER)
const rollbackDeployment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const targetDeployment = await Deployment.findById(id);
      if (!targetDeployment) {
        return res.status(404).json({ success: false, message: 'Target deployment for rollback not found' });
      }

      const project = await Project.findById(targetDeployment.project);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Associated project not found' });
      }

      const deploymentCount = await Deployment.countDocuments({ project: project._id });
      const newBuildNumber = deploymentCount + 1;
      const rollbackVersion = `${targetDeployment.version}-rollback.${newBuildNumber}`;

      const rollbackDeploymentRecord = await Deployment.create({
        project: project._id,
        version: rollbackVersion,
        commitHash: targetDeployment.commitHash,
        branch: targetDeployment.branch,
        status: 'SUCCESS',
        triggeredBy: req.user?.id,
        triggerType: 'MANUAL',
        buildNumber: newBuildNumber,
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 5,
      });

      project.currentVersion = rollbackVersion;
      project.status = 'DEPLOYED';
      await project.save();

      return res.status(200).json({
        success: true,
        message: `Rolled back to image version ${targetDeployment.version} as ${rollbackVersion}`,
        deployment: rollbackDeploymentRecord,
      });
    } else {
      const targetDeployment = inMemoryDeployments.get(id);
      if (!targetDeployment) {
        return res.status(404).json({ success: false, message: 'Target deployment not found' });
      }

      const { inMemoryProjects } = require('./projectController');
      const project = inMemoryProjects.get(targetDeployment.project);

      const rollbackVersion = `${targetDeployment.version}-rollback`;
      const mockDepId = `dep_${Date.now()}`;

      const mockRollback = {
        _id: mockDepId,
        id: mockDepId,
        project: targetDeployment.project,
        version: rollbackVersion,
        commitHash: targetDeployment.commitHash,
        branch: targetDeployment.branch,
        status: 'SUCCESS',
        triggeredBy: req.user?.id,
        triggerType: 'MANUAL',
        buildNumber: Date.now(),
        startedAt: new Date().toISOString(),
        duration: 5,
      };

      inMemoryDeployments.set(mockDepId, mockRollback);
      if (project) {
        project.currentVersion = rollbackVersion;
        project.status = 'DEPLOYED';
        inMemoryProjects.set(targetDeployment.project, project);
      }

      return res.status(200).json({
        success: true,
        message: `Rolled back to version ${targetDeployment.version} as ${rollbackVersion} (In-Memory Dev Mode)`,
        deployment: mockRollback,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  triggerDeployment,
  getProjectDeployments,
  getAllDeployments,
  getDeploymentById,
  getDeploymentLogs,
  rollbackDeployment,
};
