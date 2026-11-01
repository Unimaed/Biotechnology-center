import type { Request, Response } from 'express';

import {
  createAdminSchema,
  updateAdminSchema,
  resetAdminPasswordSchema,
} from './admin-users.schemas.js';

import {
  listAdministrators,
  createAdministrator,
  updateAdministrator,
  resetAdministratorPassword,
  listAuditLogs,
} from './admin-users.service.js';

function getActorId(req: Request): number {
  if (!req.auth) {
    throw new Error('AUTHENTICATION_REQUIRED');
  }

  return req.auth.id;
}

function getIpAddress(req: Request): string | undefined {
  return req.ip || undefined;
}

function handleError(error: unknown, res: Response): void {
  if (error instanceof Error) {
    if (error.message === 'ADMINISTRATOR_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'Administrator account not found.',
      });
      return;
    }

    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
      return;
    }
  }

  console.error('Administrator management error:', error);

  res.status(500).json({
    success: false,
    message: 'Unable to complete the administrator management request.',
  });
}

export async function listAdministratorsController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const administrators = await listAdministrators();

    res.json({
      success: true,
      administrators,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function createAdministratorController(
  req: Request,
  res: Response,
): Promise<void> {
  const validation = createAdminSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid administrator details.',
      errors: validation.error.flatten(),
    });
    return;
  }

  try {
    const administrator = await createAdministrator(
      getActorId(req),
      validation.data,
      getIpAddress(req),
    );

    res.status(201).json({
      success: true,
      message: 'Administrator account created. They must change their password at first login.',
      administrator,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateAdministratorController(
  req: Request,
  res: Response,
): Promise<void> {
  const targetId = Number(req.params.id);

  if (!Number.isSafeInteger(targetId) || targetId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid administrator ID.',
    });
    return;
  }

  const validation = updateAdminSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid administrator update.',
      errors: validation.error.flatten(),
    });
    return;
  }

  try {
    const administrator = await updateAdministrator(
      getActorId(req),
      targetId,
      validation.data,
      getIpAddress(req),
    );

    res.json({
      success: true,
      message: 'Administrator account updated.',
      administrator,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function resetAdministratorPasswordController(
  req: Request,
  res: Response,
): Promise<void> {
  const targetId = Number(req.params.id);

  if (!Number.isSafeInteger(targetId) || targetId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid administrator ID.',
    });
    return;
  }

  const validation = resetAdminPasswordSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: 'Password must contain between 12 and 200 characters.',
    });
    return;
  }

  try {
    const result = await resetAdministratorPassword(
      getActorId(req),
      targetId,
      validation.data.password,
      getIpAddress(req),
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function listAuditLogsController(
  req: Request,
  res: Response,
): Promise<void> {
  const requestedLimit = Number(req.query.limit || 100);
  const limit = Number.isSafeInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 200)
    : 100;

  try {
    const logs = await listAuditLogs(limit);

    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    handleError(error, res);
  }
}