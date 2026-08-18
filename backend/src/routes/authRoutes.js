const express = require('express');
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/me', protect, getMe);

// Test RBAC route (ADMIN access required)
router.get('/admin-test', protect, authorize('ADMIN'), (req, res) => {
  res.json({ success: true, message: 'Admin authorization verified successfully' });
});

module.exports = router;
