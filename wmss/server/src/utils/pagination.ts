import { env } from '../config/env.js';

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort: string;
  skip: number;
}

export const parsePagination = (query: PaginationQuery): PaginationOptions => {
  const page = Math.max(Number(query.page ?? env.defaultPage) || env.defaultPage, 1);
  const limit = Math.min(Math.max(Number(query.limit ?? env.defaultLimit) || env.defaultLimit, 1), 1000); // Max 1000
  const sort = query.sort ?? '-createdAt';
  const skip = (page - 1) * limit;
  return { page, limit, sort, skip };
};

export const buildPagedResponse = <T>(
  data: T[],
  total: number,
  options: PaginationOptions
) => {
  return {
    data,
    pagination: {
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit) || 1
    }
  };
};
