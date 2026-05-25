import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { prisma } from '../../config/prisma';
import type { ProductCardItem, OrderCardItem } from './ai.types';

export interface ToolExecutionResult {
  toolCallId: string;
  functionName: string;
  result: unknown;
  displayType?: 'product_card' | 'order_card';
  displayData?: ProductCardItem[] | OrderCardItem[];
}

export const ASSISTANT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: '搜索平台商品。在商品名/描述/分类名中模糊匹配关键词，返回最多5个热门商品。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '搜索关键词，最多50字', maxLength: 50 },
          categoryId: { type: 'integer', description: '分类ID，可选' },
        },
        required: ['keyword'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_orders',
      description: '获取当前用户的订单列表（最近5条买入和5条卖出）。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_stats',
      description: '获取当前用户的统计数据：订单数、商品数、评价数、信用分。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_platform_stats',
      description: '获取平台统计数据：总用户数、商品数、订单数。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_product_card',
      description: '向用户展示商品卡片。参数为商品ID列表（逗号分隔），必须是搜索结果中返回的真实ID。',
      parameters: {
        type: 'object',
        properties: {
          product_ids: { type: 'string', description: '商品ID列表，逗号分隔，如"12,5,8"' },
        },
        required: ['product_ids'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_order_card',
      description: '向用户展示订单卡片。参数为订单ID列表（逗号分隔），必须是查询结果中返回的真实ID。',
      parameters: {
        type: 'object',
        properties: {
          order_ids: { type: 'string', description: '订单ID列表，逗号分隔，如"3,7"' },
        },
        required: ['order_ids'],
      },
    },
  },
];

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? Number(v) : v));
}

async function executeSearchProducts(args: { keyword?: string; categoryId?: number }, _userId: number) {
  const kw = (args.keyword || '').trim();
  const where: any = { status: 'active' };
  if (kw) {
    where.OR = [
      { name: { contains: kw } },
      { description: { contains: kw } },
      { category: { name: { contains: kw } } },
    ];
  }
  if (args.categoryId) {
    where.categoryId = Number(args.categoryId);
  }
  const products = await prisma.product.findMany({
    where,
    take: 5,
    orderBy: { favoriteCount: 'desc' },
    select: {
      id: true, name: true, currentPrice: true, images: true,
      itemCondition: true, favoriteCount: true, deliveryType: true,
      category: { select: { id: true, name: true } },
    },
  });
  const mapped = products.map(p => ({
    id: Number(p.id),
    name: p.name,
    currentPrice: p.currentPrice,
    images: p.images,
    itemCondition: p.itemCondition,
    favoriteCount: p.favoriteCount,
    deliveryType: p.deliveryType,
    categoryId: p.category?.id,
    categoryName: p.category?.name || '',
  }));
  return { products: mapped, keyword: kw };
}

async function executeGetMyOrders(_args: any, userId: number) {
  const [bought, sold] = await Promise.all([
    prisma.order.findMany({
      where: { buyerId: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNo: true, status: true, totalPrice: true, productName: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { sellerId: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNo: true, status: true, totalPrice: true, productName: true, createdAt: true, buyerId: true, sellerId: true },
    }),
  ]);
  const allOrders = [
    ...bought.map(o => ({ ...o, id: Number(o.id), type: '买入' as const })),
    ...sold.map(o => ({ ...o, id: Number(o.id), type: '卖出' as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return {
    orders: allOrders.map(o => ({ id: o.id, orderNo: o.orderNo, status: o.status, totalPrice: o.totalPrice, productName: o.productName, createdAt: o.createdAt.toISOString(), type: o.type })),
    totalBought: bought.length,
    totalSold: sold.length,
  };
}

async function executeGetMyStats(_args: any, userId: number) {
  const [boughtCount, soldCount, productCount, reviews] = await Promise.all([
    prisma.order.count({ where: { buyerId: userId } }),
    prisma.order.count({ where: { sellerId: userId } }),
    prisma.product.count({ where: { userId, status: 'active' } }),
    prisma.review.count({ where: { reviewedId: userId } }),
  ]);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { creditScore: true } });
  return {
    totalOrders: boughtCount + soldCount,
    boughtCount,
    soldCount,
    productCount,
    reviewCount: reviews,
    creditScore: user?.creditScore ?? 100,
  };
}

async function executeGetPlatformStats() {
  const [userCount, productCount, orderCount] = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { status: 'active' } }),
    prisma.order.count(),
  ]);
  return { userCount, productCount, orderCount };
}

async function executeShowProductCard(args: { product_ids: string }) {
  const ids = args.product_ids.split(',').map(s => BigInt(s.trim())).filter(b => b > 0n);
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: 'active' },
    select: { id: true, name: true, currentPrice: true, images: true, itemCondition: true, favoriteCount: true, deliveryType: true, category: { select: { name: true } } },
  });
  return products.map(p => ({
    id: Number(p.id), name: p.name, currentPrice: p.currentPrice, images: p.images,
    itemCondition: p.itemCondition, favoriteCount: p.favoriteCount, deliveryType: p.deliveryType, categoryName: p.category?.name || '',
  }));
}

async function executeShowOrderCard(args: { order_ids: string }, userId: number) {
  const ids = args.order_ids.split(',').map(s => BigInt(s.trim())).filter(b => b > 0n);
  if (ids.length === 0) return [];
  const orders = await prisma.order.findMany({
    where: { id: { in: ids }, OR: [{ buyerId: userId }, { sellerId: userId }] },
    select: { id: true, orderNo: true, status: true, totalPrice: true, productName: true, createdAt: true, buyerId: true, sellerId: true },
  });
  return orders.map(o => ({
    id: Number(o.id), orderNo: o.orderNo, status: o.status, totalPrice: o.totalPrice,
    productName: o.productName, createdAt: o.createdAt.toISOString(), type: o.buyerId === userId ? '买入' : '卖出',
  }));
}

export async function executeAssistantTool(
  call: { id: string; function: { name: string; arguments: string } },
  userId: number,
): Promise<ToolExecutionResult> {
  let args: any;
  try {
    args = JSON.parse(call.function.arguments);
  } catch {
    args = {};
  }

  let result: unknown;
  let displayType: 'product_card' | 'order_card' | undefined;
  let displayData: ProductCardItem[] | OrderCardItem[] | undefined;

  try {
    switch (call.function.name) {
      case 'search_products': {
        result = await executeSearchProducts(args, userId);
        displayType = 'product_card';
        displayData = (result as { products: unknown[] }).products.map((p: any) => ({
          id: Number(p.id), name: String(p.name), currentPrice: Number(p.currentPrice),
          images: p.images as string[], itemCondition: String(p.itemCondition),
          favoriteCount: Number(p.favoriteCount), deliveryType: String(p.deliveryType),
          categoryId: p.categoryId != null ? Number(p.categoryId) : undefined,
          categoryName: p.categoryName ? String(p.categoryName) : undefined,
        })) as ProductCardItem[];
        break;
      }
      case 'get_my_orders': {
        result = await executeGetMyOrders(args, userId);
        displayType = 'order_card';
        displayData = (result as { orders: unknown[] }).orders.map((o: any) => ({
          id: Number(o.id), orderNo: String(o.orderNo), status: String(o.status),
          totalPrice: Number(o.totalPrice), productName: String(o.productName),
          createdAt: String(o.createdAt), type: o.type ? String(o.type) : undefined,
          buyerId: o.buyerId != null ? Number(o.buyerId) : undefined,
          sellerId: o.sellerId != null ? Number(o.sellerId) : undefined,
        })) as OrderCardItem[];
        break;
      }
      case 'get_my_stats': {
        result = await executeGetMyStats(args, userId);
        break;
      }
      case 'get_platform_stats': {
        result = await executeGetPlatformStats();
        break;
      }
      case 'show_product_card': {
        const cardData = await executeShowProductCard(args);
        result = cardData;
        displayType = 'product_card';
        displayData = (cardData as unknown[]).map((p: any) => ({
          id: Number(p.id), name: String(p.name), currentPrice: Number(p.currentPrice),
          images: p.images as string[], itemCondition: String(p.itemCondition),
          favoriteCount: Number(p.favoriteCount), deliveryType: String(p.deliveryType),
          categoryName: p.categoryName ? String(p.categoryName) : undefined,
        })) as ProductCardItem[];
        break;
      }
      case 'show_order_card': {
        const cardData = await executeShowOrderCard(args, userId);
        result = cardData;
        displayType = 'order_card';
        displayData = (cardData as unknown[]).map((o: any) => ({
          id: Number(o.id), orderNo: String(o.orderNo), status: String(o.status),
          totalPrice: Number(o.totalPrice), productName: String(o.productName),
          createdAt: String(o.createdAt), type: o.type ? String(o.type) : undefined,
          buyerId: o.buyerId != null ? Number(o.buyerId) : undefined,
          sellerId: o.sellerId != null ? Number(o.sellerId) : undefined,
        })) as OrderCardItem[];
        break;
      }
      default:
        result = { error: `未知工具: ${call.function.name}` };
    }
  } catch (err) {
    console.error('executeAssistantTool error:', err);
    result = { error: '查询数据时发生错误，请稍后重试' };
  }

  return {
    toolCallId: call.id,
    functionName: call.function.name,
    result: serializeBigInt(result),
    displayType,
    displayData: displayData ? serializeBigInt(displayData) : undefined,
  };
}

const TOOL_STATUS_MESSAGES: Record<string, string> = {
  search_products: '正在搜索商品...',
  get_my_orders: '正在查询订单...',
  get_my_stats: '正在查询数据...',
  get_platform_stats: '正在获取平台数据...',
  show_product_card: '正在生成商品卡片...',
  show_order_card: '正在生成订单卡片...',
};

export function getToolStatusMessage(toolName: string): string {
  return TOOL_STATUS_MESSAGES[toolName] || '正在处理...';
}