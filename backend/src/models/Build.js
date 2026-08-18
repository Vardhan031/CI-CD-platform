const mongoose = require('mongoose');

const buildSchema = new mongoose.Schema(
  {
    deployment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deployment',
      required: true,
    },
    buildNumber: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUCCESS', 'FAILED'],
      default: 'IN_PROGRESS',
    },
    logs: {
      type: String,
      default: '',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Build', buildSchema);
