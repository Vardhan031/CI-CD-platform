const mongoose = require('mongoose');

const deploymentLogSchema = new mongoose.Schema(
  {
    deployment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deployment',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }
);

module.exports = mongoose.model('DeploymentLog', deploymentLogSchema);
