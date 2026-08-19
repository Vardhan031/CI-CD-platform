const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { inMemoryUsers } = require('../utils/devStore');

// Helper to check DB connection
const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    const lowerEmail = email.toLowerCase();

    if (isDbConnected()) {
      const userExists = await User.findOne({ email: lowerEmail });
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email',
        });
      }

      const user = await User.create({
        name,
        email: lowerEmail,
        password,
        role: role || 'DEVELOPER',
      });

      const token = generateToken(user._id, user.role);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    } else {
      // In-Memory Fallback Mode
      if (inMemoryUsers.has(lowerEmail)) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email',
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const mockId = `user_${Date.now()}`;
      const mockUser = {
        _id: mockId,
        name,
        email: lowerEmail,
        password: hashedPassword,
        role: role || 'DEVELOPER',
        createdAt: new Date().toISOString(),
      };

      inMemoryUsers.set(lowerEmail, mockUser);
      inMemoryUsers.set(mockId, mockUser);

      const token = generateToken(mockId, mockUser.role);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully (In-Memory Dev Mode)',
        token,
        user: {
          id: mockUser._id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          createdAt: mockUser.createdAt,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const lowerEmail = email.toLowerCase();

    if (isDbConnected()) {
      const user = await User.findOne({ email: lowerEmail }).select('+password');

      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const token = generateToken(user._id, user.role);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    } else {
      // In-Memory Fallback Mode
      const user = inMemoryUsers.get(lowerEmail);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const token = generateToken(user._id, user.role);

      return res.status(200).json({
        success: true,
        message: 'Login successful (In-Memory Dev Mode)',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const user = await User.findById(req.user.id).select('-password');
      return res.status(200).json({
        success: true,
        user,
      });
    } else {
      const user = inMemoryUsers.get(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const { password, ...userWithoutPassword } = user;
      return res.status(200).json({
        success: true,
        user: {
          id: userWithoutPassword._id,
          ...userWithoutPassword,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  inMemoryUsers,
};
