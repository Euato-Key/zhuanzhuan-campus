/**
 * 分页参数接口
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  maxPageSize?: number;
}

/**
 * 分页结果接口
 */
export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/**
 * 分页工具
 * 统一分页逻辑，避免在多个 service 中重复计算
 */
export const PaginationUtil = {
  /**
   * 计算分页参数
   */
  getPagination(params: PaginationParams): PaginationResult {
    const page = Math.max(1, params.page ?? 1);
    const maxPageSize = params.maxPageSize ?? MAX_PAGE_SIZE;
    const pageSize = Math.min(
      Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE),
      maxPageSize
    );

    return {
      skip: (page - 1) * pageSize,
      take: pageSize,
      page,
      pageSize,
    };
  },

  /**
   * 构建分页响应
   */
  buildResponse<T>(
    list: T[],
    total: number,
    page: number,
    pageSize: number
  ): PaginatedResponse<T> {
    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  /**
   * 从请求查询参数解析分页
   */
  fromQuery(query: Record<string, any>): PaginationResult {
    return this.getPagination({
      page: query.page ? parseInt(query.page as string, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : undefined,
    });
  },
};