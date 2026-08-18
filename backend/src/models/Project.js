const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    repositoryUrl: {
      type: String,
      required: [true, 'GitHub repository URL is required'],
      trim: true,
    },
    branch: {
      type: String,
      default: 'main',
      trim: true,
    },
    dockerfilePath: {
      type: String,
      default: 'Dockerfile',
      trim: true,
    },
    port: {
      type: Number,
      required: [true, 'Application target port is required'],
    },
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'development',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    currentVersion: {
      type: String,
      default: 'v0.0.0',
    },
    status: {
      type: String,
      enum: ['IDLE', 'BUILDING', 'DEPLOYED', 'FAILED'],
      default: 'IDLE',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', projectSchema);
