import { prisma } from '../../config/prisma';

export const AdminService = {
  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      newUsersToday,
      totalProducts,
      pendingReviewProducts,
      totalOrders,
      pendingPaymentOrders,
      revenueResult,
      recentReports,
      pendingProducts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.product.count(),
      prisma.product.count({
        where: { status: 'pending' },
      }),
      prisma.order.count(),
      prisma.order.count({
        where: { status: 'pending_payment' },
      }),
      prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: {
          status: { notIn: ['cancelled', 'refunded'] },
        },
      }),
      prisma.report.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          reporter: {
            select: { id: true, username: true },
          },
        },
      }),
      prisma.product.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: { id: true, username: true },
          },
        },
      }),
    ]);

    const totalRevenue = revenueResult._sum.totalPrice ?? 0;

    return {
      totalUsers,
      newUsersToday,
      totalProducts,
      pendingReviewProducts,
      totalOrders,
      pendingPaymentOrders,
      totalRevenue: Number(totalRevenue),
      recentActivities: recentReports.map((r) => ({
        id: r.id,
        time: r.createdAt.toISOString(),
        content: `用户 "${r.reporter.username}" 提交了举报`,
        type: 'report',
        targetType: r.targetType,
        targetId: r.targetId,
      })),
      pendingProducts: pendingProducts.map((p) => ({
        id: p.id,
        name: p.name,
        seller: p.user.username,
        time: p.createdAt.toISOString(),
      })),
    };
  },
};
