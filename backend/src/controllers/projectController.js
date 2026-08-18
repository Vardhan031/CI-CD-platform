const Project = require('../models/Project');
const mongoose = require('mongoose');

// In-memory fallback store for offline development
const inMemoryProjects = new Map();

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (ADMIN, DEVELOPER)
const createProject = async (req, res, next) => {
  try {
    const { name, description, repositoryUrl, branch, dockerfilePath, port, environment } = req.body;

    if (!name || !repositoryUrl || !port) {
      return res.status(400).json({
        success: false,
        message: 'Please provide project name, repository URL, and container port',
      });
    }

    if (isDbConnected()) {
      const project = await Project.create({
        name,
        description: description || '',
        repositoryUrl,
        branch: branch || 'main',
        dockerfilePath: dockerfilePath || 'Dockerfile',
        port: Number(port),
        environment: environment || 'development',
        owner: req.user.id,
      });

      return res.status(201).json({
        success: true,
        message: 'Project registered successfully',
        project,
      });
    } else {
      const mockId = `proj_${Date.now()}`;
      const mockProject = {
        _id: mockId,
        id: mockId,
        name,
        description: description || '',
        repositoryUrl,
        branch: branch || 'main',
        dockerfilePath: dockerfilePath || 'Dockerfile',
        port: Number(port),
        environment: environment || 'development',
        owner: req.user.id,
        currentVersion: 'v0.0.0',
        status: 'IDLE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      inMemoryProjects.set(mockId, mockProject);

      return res.status(201).json({
        success: true,
        message: 'Project registered successfully (In-Memory Dev Mode)',
        project: mockProject,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      let filter = {};
      // If VIEWER or DEVELOPER, they can view projects owned by them or all projects depending on RBAC
      if (req.user.role === 'DEVELOPER') {
        filter = { owner: req.user.id };
      }

      const projects = await Project.find(filter).populate('owner', 'name email role').sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: projects.length,
        projects,
      });
    } else {
      let projectsList = Array.from(inMemoryProjects.values());
      if (req.user.role === 'DEVELOPER') {
        projectsList = projectsList.filter((p) => p.owner === req.user.id);
      }

      return res.status(200).json({
        success: true,
        count: projectsList.length,
        projects: projectsList,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const project = await Project.findById(id).populate('owner', 'name email role');
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }
      return res.status(200).json({ success: true, project });
    } else {
      const project = inMemoryProjects.get(id);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }
      return res.status(200).json({ success: true, project });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update project details
// @route   PUT /api/projects/:id
// @access  Private (ADMIN, DEVELOPER)
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      let project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      // Check ownership or ADMIN role
      if (project.owner.toString() !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this project',
        });
      }

      project = await Project.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

      return res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        project,
      });
    } else {
      const project = inMemoryProjects.get(id);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      if (project.owner !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this project',
        });
      }

      const updatedProject = {
        ...project,
        ...req.body,
        updatedAt: new Date().toISOString(),
      };

      inMemoryProjects.set(id, updatedProject);

      return res.status(200).json({
        success: true,
        message: 'Project updated successfully (In-Memory Dev Mode)',
        project: updatedProject,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private (ADMIN, DEVELOPER)
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      if (project.owner.toString() !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this project',
        });
      }

      await project.deleteOne();

      return res.status(200).json({
        success: true,
        message: 'Project removed successfully',
      });
    } else {
      const project = inMemoryProjects.get(id);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      if (project.owner !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this project',
        });
      }

      inMemoryProjects.delete(id);

      return res.status(200).json({
        success: true,
        message: 'Project removed successfully (In-Memory Dev Mode)',
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  inMemoryProjects,
};
