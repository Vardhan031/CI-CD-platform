const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production');

      if (mongoose.connection.readyState === 1) {
        req.user = await User.findById(decoded.id).select('-password');
      } else {
        // Fallback for decoded token when MongoDB is offline
        const { inMemoryUsers } = require('../utils/devStore');
        const user = inMemoryUsers.get(decoded.id);
        if (user) {
          req.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } else {
          // If token contains payload with id and role directly
          req.user = {
            id: decoded.id,
            role: decoded.role,
          };
        }
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists',
        });
      }

      next();
    } catch (error) {
      console.error(`[Auth Middleware Error] ${error.message}`);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed or expired',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no authentication token provided',
    });
  }
};

module.exports = { protect };
