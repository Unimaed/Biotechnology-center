import { Router } from 'express';

import {
  authenticateAdmin,
  requireRoles,
} from '../../middleware/auth.middleware.js';

import {
  listAdministratorsController,
  createAdministratorController,
  updateAdministratorController,
  resetAdministratorPasswordController,
  listAuditLogsController,
} from './admin-users.controller.js';

const router = Router();

// Every endpoint in this module requires an authenticated Centre Director.
router.use(authenticateAdmin);
router.use(requireRoles('centre_director'));

router.get('/', listAdministratorsController);
router.post('/', createAdministratorController);
router.patch('/:id', updateAdministratorController);
router.post('/:id/reset-password', resetAdministratorPasswordController);
router.get('/audit-logs', listAuditLogsController);

export default router;