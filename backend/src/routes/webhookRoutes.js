const express = require('express');
const { handleGitHubWebhook } = require('../controllers/webhookController');

const router = express.Router();

// POST /api/webhooks/github (Public listener endpoint called by GitHub)
router.post('/github', handleGitHubWebhook);

module.exports = router;
