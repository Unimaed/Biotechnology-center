import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import {
  loginController,
  logoutController,
  refreshController,
  changePasswordController,
} from './auth.controller.js';

import {
  authenticateAdmin,
} from '../../middleware/auth.middleware.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
});

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password-change attempts. Please try again later.',
  },
});

router.post('/login', loginLimiter, loginController);
router.post('/refresh', refreshController);
router.post('/logout', logoutController);

router.post(
  '/change-password',
  passwordChangeLimiter,
  authenticateAdmin,
  changePasswordController,
);

router.get('/me', authenticateAdmin, (req, res) => {
  res.json({
    success: true,
    admin: req.auth,
  });
});

export default router;