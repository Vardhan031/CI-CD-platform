const Deployment = require('../models/Deployment');
const Build = require('../models/Build');
const DeploymentLog = require('../models/DeploymentLog');
const Project = require('../models/Project');
const jenkinsService = require('../services/jenkinsService');
const mongoose = require('mongoose');
const { inMemoryProjects, inMemoryDeployments, inMemoryBuilds, inMemoryLogs } = require('../utils/devStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * Helper to sync running build status and console logs from Jenkins API
 */
const syncBuildStateWithJenkins = async (deployment, build, project) => {
  if (!deployment || deployment.status === 'SUCCESS' || deployment.status === 'FAILED') {
    return { deployment, build };
  }

  const buildNumber = deployment.buildNumber || 1;
  const jenkinsStatus = await jenkinsService.getJenkinsBuildStatus('cicd-deploy-pipeline', buildNumber);

  if (jenkinsStatus.success && !jenkinsStatus.building) {
    const finalStatus = jenkinsStatus.status; // 'SUCCESS' or 'FAILED'
    const completedAt = new Date();
    const startedAt = new Date(deployment.startedAt || Date.now());
    const durationSec = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    // Fetch real raw console logs from Jenkins
    const logRes = await jenkinsService.getJenkinsBuildLogs('cicd-deploy-pipeline', buildNumber);
    const realLogs = logRes.logs || `[Jenkins CI Engine] Build #${buildNumber} finished with status ${finalStatus}.`;

    if (isDbConnected()) {
      deployment.status = finalStatus;
      deployment.completedAt = completedAt;
      deployment.duration = durationSec || jenkinsStatus.duration || 5;
      await deployment.save();

      if (build) {
        build.status = finalStatus;
        build.logs = realLogs;
        build.completedAt = completedAt;
        await build.save();
      }

      if (project) {
        project.status = finalStatus === 'SUCCESS' ? 'DEPLOYED' : 'FAILED';
        if (finalStatus === 'SUCCESS') {
          project.currentVersion = deployment.version;
        }
        await project.save();
      }
    } else {
      deployment.status = finalStatus;
      deployment.completedAt = completedAt.toISOString();
      deployment.duration = durationSec || jenkinsStatus.duration || 5;
      inMemoryDeployments.set(deployment._id || deployment.id, deployment);

      if (build) {
        build.status = finalStatus;
        build.logs = realLogs;
        inMemoryBuilds.set(deployment._id || deployment.id, build);
      }

      if (project) {
        project.status = finalStatus === 'SUCCESS' ? 'DEPLOYED' : 'FAILED';
        if (finalStatus === 'SUCCESS') {
          project.currentVersion = deployment.version;
        }
        inMemoryProjects.set(project._id || project.id, project);
      }
    }
  }

  return { deployment, build };
};

// @desc    Trigger a manual or webhook CI build pipeline
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

      const deploymentCount = await Deployment.countDocuments({ project: projectId });
      const buildNumber = deploymentCount + 1;
      const version = `v1.0.${buildNumber - 1}`;
      const startedAt = new Date();

      // Trigger Jenkins CI Job via REST API
      const jenkinsRes = await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
        PROJECT_ID: project._id.toString(),
        PROJECT_NAME: project.name,
        REPO_URL: project.repositoryUrl,
        BRANCH: project.branch || 'main',
        DOCKERFILE_PATH: project.dockerfilePath || 'Dockerfile',
        PORT: project.port,
        VERSION: version,
        BUILD_NUMBER: buildNumber,
        DOCKER_HUB_USER: process.env.DOCKER_HUB_USER || 'vardhan031',
      });

      if (!jenkinsRes.success) {
        return res.status(500).json({
          success: false,
          message: jenkinsRes.message || 'Failed to trigger Jenkins CI job',
        });
      }

      const deployment = await Deployment.create({
        project: projectId,
        version,
        commitHash: Math.random().toString(16).substring(2, 9),
        branch: project.branch || 'main',
        status: 'RUNNING',
        triggeredBy: req.user?.id,
        triggerType,
        buildNumber,
        startedAt,
      });

      const initialLog = `[Jenkins CI Engine] Triggered Build #${buildNumber} for Project: ${project.name} (${version})
[Pipeline Stage 1/5] Checking out repository branch '${project.branch || 'main'}'...
[Status] Build execution in progress on Jenkins server...`;

      const build = await Build.create({
        deployment: deployment._id,
        buildNumber,
        status: 'IN_PROGRESS',
        logs: initialLog,
        startedAt,
      });

      await DeploymentLog.create({
        deployment: deployment._id,
        action: 'TRIGGER_PIPELINE',
        message: `CI Pipeline ${version} triggered via ${triggerType} by ${req.user?.name || 'System'}`,
        user: req.user?.id,
      });

      project.status = 'BUILDING';
      await project.save();

      return res.status(201).json({
        success: true,
        message: `CI Build Pipeline ${version} triggered successfully`,
        deployment,
        build,
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

      const jenkinsRes = await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
        PROJECT_ID: projectId,
        PROJECT_NAME: project.name,
        REPO_URL: project.repositoryUrl,
        BRANCH: project.branch || 'main',
        PORT: project.port,
        VERSION: version,
        BUILD_NUMBER: buildNumber,
        DOCKER_HUB_USER: process.env.DOCKER_HUB_USER || 'vardhan031',
      });

      if (!jenkinsRes.success) {
        return res.status(500).json({
          success: false,
          message: jenkinsRes.message || 'Failed to trigger Jenkins CI job',
        });
      }

      const mockDeployment = {
        _id: mockDepId,
        id: mockDepId,
        project: projectId,
        version,
        commitHash: Math.random().toString(16).substring(2, 9),
        branch: project.branch || 'main',
        status: 'RUNNING',
        triggeredBy: req.user?.id,
        triggerType,
        buildNumber,
        startedAt,
        createdAt: startedAt,
      };

      const initialLog = `[Jenkins CI Engine] Triggered Build #${buildNumber} for Project: ${project.name} (${version})
[Pipeline Stage 1/5] Checking out repository branch '${project.branch || 'main'}'...
[Status] Build execution in progress on Jenkins server...`;

      const mockBuild = {
        _id: `build_${Date.now()}`,
        deployment: mockDepId,
        buildNumber,
        status: 'IN_PROGRESS',
        logs: initialLog,
        startedAt,
      };

      inMemoryDeployments.set(mockDepId, mockDeployment);
      inMemoryBuilds.set(mockDepId, mockBuild);

      project.status = 'BUILDING';
      inMemoryProjects.set(projectId, project);

      return res.status(201).json({
        success: true,
        message: `CI Build Pipeline ${version} triggered successfully (In-Memory Dev Mode)`,
        deployment: mockDeployment,
        build: mockBuild,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all CI deployments for a project
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

// @desc    Get all CI deployments platform-wide
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

// @desc    Get single deployment details & sync Jenkins status/logs
// @route   GET /api/deployments/:id
// @access  Private
const getDeploymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      let deployment = await Deployment.findById(id)
        .populate('project', 'name repositoryUrl branch port dockerfilePath')
        .populate('triggeredBy', 'name email');

      if (!deployment) {
        return res.status(404).json({ success: false, message: 'CI Deployment record not found' });
      }

      let build = await Build.findOne({ deployment: id });
      const project = await Project.findById(deployment.project._id || deployment.project);

      // Sync with Jenkins if build is currently running/queued
      const synced = await syncBuildStateWithJenkins(deployment, build, project);
      deployment = synced.deployment;
      build = synced.build;

      return res.status(200).json({
        success: true,
        deployment,
        build,
      });
    } else {
      let deployment = inMemoryDeployments.get(id);
      if (!deployment) {
        return res.status(404).json({ success: false, message: 'CI Deployment record not found' });
      }
      let build = inMemoryBuilds.get(id);
      const project = inMemoryProjects.get(deployment.project);

      const synced = await syncBuildStateWithJenkins(deployment, build, project);
      deployment = synced.deployment;
      build = synced.build;

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

// @desc    Get deployment stdout console logs
// @route   GET /api/deployments/:id/logs
// @access  Private
const getDeploymentLogs = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      let deployment = await Deployment.findById(id);
      let build = await Build.findOne({ deployment: id });
      const project = deployment ? await Project.findById(deployment.project) : null;

      if (deployment && (deployment.status === 'QUEUED' || deployment.status === 'RUNNING')) {
        const synced = await syncBuildStateWithJenkins(deployment, build, project);
        build = synced.build;
      }

      if (!build) {
        return res.status(404).json({ success: false, message: 'Build logs not found' });
      }

      return res.status(200).json({
        success: true,
        logs: build.logs,
      });
    } else {
      let deployment = inMemoryDeployments.get(id);
      let build = inMemoryBuilds.get(id);
      const project = deployment ? inMemoryProjects.get(deployment.project) : null;

      if (deployment && (deployment.status === 'QUEUED' || deployment.status === 'RUNNING')) {
        const synced = await syncBuildStateWithJenkins(deployment, build, project);
        build = synced.build;
      }

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

// @desc    Re-trigger a target version build pipeline
// @route   POST /api/deployments/:id/rollback
// @access  Private (ADMIN, DEVELOPER)
const rollbackDeployment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const targetDeployment = await Deployment.findById(id);
      if (!targetDeployment) {
        return res.status(404).json({ success: false, message: 'Target deployment record not found' });
      }

      const project = await Project.findById(targetDeployment.project);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Associated project not found' });
      }

      const deploymentCount = await Deployment.countDocuments({ project: project._id });
      const newBuildNumber = deploymentCount + 1;
      const rollbackVersion = `${targetDeployment.version}-rebuild.${newBuildNumber}`;
      const startedAt = new Date();

      // Trigger Jenkins Re-build Pipeline
      const jenkinsRes = await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
        PROJECT_ID: project._id.toString(),
        PROJECT_NAME: project.name,
        REPO_URL: project.repositoryUrl,
        BRANCH: targetDeployment.branch,
        PORT: project.port,
        VERSION: rollbackVersion,
        BUILD_NUMBER: newBuildNumber,
        DOCKER_HUB_USER: process.env.DOCKER_HUB_USER || 'vardhan031',
      });

      if (!jenkinsRes.success) {
        return res.status(500).json({
          success: false,
          message: jenkinsRes.message || 'Failed to trigger Jenkins CI rebuild pipeline',
        });
      }

      const rollbackDeploymentRecord = await Deployment.create({
        project: project._id,
        version: rollbackVersion,
        commitHash: targetDeployment.commitHash,
        branch: targetDeployment.branch,
        status: 'RUNNING',
        triggeredBy: req.user?.id,
        triggerType: 'MANUAL',
        buildNumber: newBuildNumber,
        startedAt,
      });

      const initialLog = `[CI Pipeline Rebuild] Initiated CI pipeline rebuild for version ${targetDeployment.version} as ${rollbackVersion}
[Status] Build execution in progress on Jenkins server...`;

      const build = await Build.create({
        deployment: rollbackDeploymentRecord._id,
        buildNumber: newBuildNumber,
        status: 'IN_PROGRESS',
        logs: initialLog,
        startedAt,
      });

      await DeploymentLog.create({
        deployment: rollbackDeploymentRecord._id,
        action: 'REBUILD',
        message: `CI Pipeline rebuild ${rollbackVersion} triggered for ${targetDeployment.version}`,
        user: req.user?.id,
      });

      project.status = 'BUILDING';
      await project.save();

      return res.status(200).json({
        success: true,
        message: `Re-triggered CI build pipeline for version ${targetDeployment.version} as ${rollbackVersion}`,
        deployment: rollbackDeploymentRecord,
        build,
      });
    } else {
      const targetDeployment = inMemoryDeployments.get(id);
      if (!targetDeployment) {
        return res.status(404).json({ success: false, message: 'Target deployment not found' });
      }

      const project = inMemoryProjects.get(targetDeployment.project);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Associated project not found' });
      }

      const existingDeployments = Array.from(inMemoryDeployments.values()).filter(
        (d) => d.project === targetDeployment.project
      );
      const newBuildNumber = existingDeployments.length + 1;
      const rollbackVersion = `${targetDeployment.version}-rebuild.${newBuildNumber}`;
      const mockDepId = `dep_${Date.now()}`;
      const startedAt = new Date().toISOString();

      const jenkinsRes = await jenkinsService.triggerJenkinsJob('cicd-deploy-pipeline', {
        PROJECT_ID: targetDeployment.project,
        PROJECT_NAME: project.name,
        REPO_URL: project.repositoryUrl,
        BRANCH: targetDeployment.branch,
        PORT: project.port,
        VERSION: rollbackVersion,
        BUILD_NUMBER: newBuildNumber,
        DOCKER_HUB_USER: process.env.DOCKER_HUB_USER || 'vardhan031',
      });

      if (!jenkinsRes.success) {
        return res.status(500).json({
          success: false,
          message: jenkinsRes.message || 'Failed to trigger Jenkins CI rebuild pipeline',
        });
      }

      const mockRollback = {
        _id: mockDepId,
        id: mockDepId,
        project: targetDeployment.project,
        version: rollbackVersion,
        commitHash: targetDeployment.commitHash,
        branch: targetDeployment.branch,
        status: 'RUNNING',
        triggeredBy: req.user?.id,
        triggerType: 'MANUAL',
        buildNumber: newBuildNumber,
        startedAt,
        createdAt: startedAt,
      };

      const initialLog = `[CI Pipeline Rebuild] Initiated CI pipeline rebuild for version ${targetDeployment.version} as ${rollbackVersion}
[Status] Build execution in progress on Jenkins server...`;

      const mockBuild = {
        _id: `build_${Date.now()}`,
        deployment: mockDepId,
        buildNumber: newBuildNumber,
        status: 'IN_PROGRESS',
        logs: initialLog,
        startedAt,
      };

      inMemoryDeployments.set(mockDepId, mockRollback);
      inMemoryBuilds.set(mockDepId, mockBuild);

      project.status = 'BUILDING';
      inMemoryProjects.set(targetDeployment.project, project);

      return res.status(200).json({
        success: true,
        message: `Re-triggered CI build pipeline for version ${targetDeployment.version} as ${rollbackVersion} (In-Memory Dev Mode)`,
        deployment: mockRollback,
        build: mockBuild,
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
