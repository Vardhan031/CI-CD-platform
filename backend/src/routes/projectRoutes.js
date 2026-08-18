const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

const router = express.Router();

// All project routes require valid JWT authentication
router.use(protect);

router
  .route('/')
  .get(getProjects)
  .post(authorize('ADMIN', 'DEVELOPER'), createProject);

router
  .route('/:id')
  .get(getProjectById)
  .put(authorize('ADMIN', 'DEVELOPER'), updateProject)
  .delete(authorize('ADMIN', 'DEVELOPER'), deleteProject);

module.exports = router;
