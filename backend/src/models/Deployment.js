const mongoose = require('mongoose');

const deploymentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    version: {
      type: String,
      required: true,
      default: 'v1.0.0',
    },
    commitHash: {
      type: String,
      default: 'a1b2c3d',
    },
    branch: {
      type: String,
      default: 'main',
    },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'],
      default: 'QUEUED',
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    triggerType: {
      type: String,
      enum: ['MANUAL', 'WEBHOOK'],
      default: 'MANUAL',
    },
    buildNumber: {
      type: Number,
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number, // seconds
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Deployment', deploymentSchema);
