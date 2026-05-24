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

  async getChartStats() {
    const now = new Date();

    // Build date cursors for last 7 days
    const dateCursors: Date[] = [];
    const dateLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      dateCursors.push(d);
      dateLabels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }

    // 1. User registration trend (7 days)
    const userCounts = await Promise.all(
      dateCursors.map((start, i) => {
        const end = new Date(dateCursors[i].getTime() + 86400000);
        return prisma.user.count({
          where: { createdAt: { gte: start, lt: end } },
        });
      }),
    );

    // 2. Order & revenue trend (7 days)
    const orderStats = await Promise.all(
      dateCursors.map(async (start, i) => {
        const end = new Date(dateCursors[i].getTime() + 86400000);
        const [count, rev] = await Promise.all([
          prisma.order.count({
            where: { createdAt: { gte: start, lt: end } },
          }),
          prisma.order.aggregate({
            _sum: { totalPrice: true },
            where: { payTime: { gte: start, lt: end }, status: 'completed' },
          }),
        ]);
        return { count, revenue: Number(rev._sum.totalPrice ?? 0) };
      }),
    );

    // 3. Product status distribution
    const productStatuses = await prisma.product.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // 4. Product category distribution (top 8)
    const categoryStats = await prisma.product.groupBy({
      by: ['categoryId'],
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 8,
    });

    const categoryIds = categoryStats.map((c) => c.categoryId).filter((id): id is number => id != null);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    return {
      userTrend: {
        dates: dateLabels,
        values: userCounts,
      },
      orderTrend: {
        dates: dateLabels,
        counts: orderStats.map((s) => s.count),
        revenues: orderStats.map((s) => s.revenue),
      },
      productStatus: productStatuses.map((s) => ({
        name: statusLabel(s.status),
        value: s._count.status,
      })),
      categoryDistribution: categoryStats.map((c) => ({
        name: categoryMap[c.categoryId as number] || '未分类',
        value: c._count.categoryId,
      })),
    };
  },
};

const statusLabelMap: Record<string, string> = {
  active: '在售',
  pending: '待审核',
  offline: '已下架',
  banned: '已封禁',
  audit_failed: '审核未通过',
};

function statusLabel(status: string | null): string {
  return statusLabelMap[status || ''] || status || '未知';
}