import type { NextFunction, Request, Response, RequestHandler } from 'express';

export const asyncHandler = <P, ResBody, ReqBody, ReqQuery>(
  handler: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<unknown>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
};
