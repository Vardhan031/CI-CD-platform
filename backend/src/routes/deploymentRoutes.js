const express = require('express');
const {
  triggerDeployment,
  getProjectDeployments,
  getAllDeployments,
  getDeploymentById,
  getDeploymentLogs,
  rollbackDeployment,
} = require('../controllers/deploymentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

const router = express.Router({ mergeParams: true });

router.use(protect);

// Global deployment list & single deployment routes
router.get('/', getAllDeployments);
router.get('/:id', getDeploymentById);
router.get('/:id/logs', getDeploymentLogs);
router.post('/:id/rollback', authorize('ADMIN', 'DEVELOPER'), rollbackDeployment);

module.exports = router;
