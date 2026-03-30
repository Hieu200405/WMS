import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  AppError,
  internal,
  notFound as notFoundError
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(notFoundError(`Route ${req.originalUrl} not found`));
};

import { Error as MongooseError } from 'mongoose';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = err;

  if (error instanceof ZodError) {
    error = new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', error.issues);
  }

  if (error instanceof MongooseError.ValidationError) {
    error = new AppError(400, 'VALIDATION_ERROR', error.message, error.errors);
  }

  if (error instanceof MongooseError.CastError) {
    error = new AppError(400, 'INVALID_ID', `Invalid ${error.path}: ${error.value}`);
  }

  if (!(error instanceof AppError)) {
    logger.error('Unhandled error', { error });
    error = internal('Unexpected error');
  }

  const appError = error as AppError;
  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details ?? null
    }
  });
};
