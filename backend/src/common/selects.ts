/**
 * 用户查询字段选择常量
 * 统一管理，避免在多个地方重复定义
 */

/**
 * 用户完整资料字段（用户自己可见）
 */
export const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  username: true,
  avatar: true,
  bio: true,
  school: true,
  campus: true,
  phone: true,
  role: true,
  creditScore: true,
  createdAt: true,
} as const;

/**
 * 用户公开资料字段（其他用户可见）
 */
export const USER_PUBLIC_PROFILE_SELECT = {
  id: true,
  username: true,
  avatar: true,
  bio: true,
  school: true,
  campus: true,
  creditScore: true,
  createdAt: true,
} as const;

/**
 * 管理员用户字段（用于商品管理等场景）
 */
export const USER_ADMIN_SELECT = {
  id: true,
  username: true,
  email: true,
} as const;

/**
 * 商品列表用户字段
 */
export const PRODUCT_USER_SELECT = {
  id: true,
  username: true,
  avatar: true,
  school: true,
} as const;

/**
 * 商品详情用户字段
 */
export const PRODUCT_DETAIL_USER_SELECT = {
  id: true,
  username: true,
  avatar: true,
  school: true,
  campus: true,
  creditScore: true,
} as const;

/**
 * 商品分类字段
 */
export const PRODUCT_CATEGORY_SELECT = {
  id: true,
  name: true,
} as const;

/**
 * 商品详情分类字段
 */
export const PRODUCT_DETAIL_CATEGORY_SELECT = {
  id: true,
  name: true,
  parentId: true,
} as const;

/**
 * 分类基础字段（用于树形结构）
 */
export const CATEGORY_BASE_SELECT = {
  id: true,
  name: true,
  parentId: true,
  icon: true,
  sort: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * 分类子节点字段
 */
export const CATEGORY_CHILDREN_SELECT = {
  id: true,
  name: true,
  parentId: true,
  icon: true,
  sort: true,
} as const;

/**
 * 聊天用户字段（会话列表中的对方用户信息）
 */
export const CHAT_USER_SELECT = {
  id: true,
  username: true,
  avatar: true,
  school: true,
  campus: true,
} as const;

/**
 * 评价人字段（评价列表中的评价人信息）
 */
export const REVIEW_USER_SELECT = {
  id: true,
  username: true,
  avatar: true,
} as const;

/**
 * 评价关联订单字段
 */
export const REVIEW_ORDER_SELECT = {
  id: true,
  orderNo: true,
  productName: true,
  productImage: true,
} as const;

/**
 * 求购贴用户字段
 */
export const WANT_BUY_USER_SELECT = {
  id: true,
  username: true,
  avatar: true,
  school: true,
  campus: true,
} as const;

/**
 * 求购贴分类字段
 */
export const WANT_BUY_CATEGORY_SELECT = {
  id: true,
  name: true,
} as const;

/**
 * 求购贴列表字段
 */
export const WANT_BUY_LIST_SELECT = {
  id: true,
  userId: true,
  name: true,
  categoryId: true,
  description: true,
  tags: true,
  budgetMin: true,
  budgetMax: true,
  quantity: true,
  images: true,
  status: true,
  validDays: true,
  expireTime: true,
  viewCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
  user: { select: WANT_BUY_USER_SELECT },
  category: { select: WANT_BUY_CATEGORY_SELECT },
} as const;

/**
 * 求购贴详情字段
 */
export const WANT_BUY_DETAIL_SELECT = {
  id: true,
  userId: true,
  name: true,
  categoryId: true,
  description: true,
  tags: true,
  budgetMin: true,
  budgetMax: true,
  quantity: true,
  images: true,
  status: true,
  validDays: true,
  expireTime: true,
  viewCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
  user: { select: WANT_BUY_USER_SELECT },
  category: { select: WANT_BUY_CATEGORY_SELECT },
} as const;

/**
 * 求购评论用户字段
 */
export const WANT_BUY_COMMENT_USER_SELECT = {
  id: true,
  username: true,
  avatar: true,
} as const;

/**
 * 求购评论字段
 */
export const WANT_BUY_COMMENT_SELECT = {
  id: true,
  wantBuyId: true,
  userId: true,
  parentId: true,
  replyToId: true,
  content: true,
  likeCount: true,
  createdAt: true,
  updatedAt: true,
  user: { select: WANT_BUY_COMMENT_USER_SELECT },
  replyTo: {
    select: {
      id: true,
      userId: true,
      user: { select: WANT_BUY_COMMENT_USER_SELECT },
    },
  },
} as const;
