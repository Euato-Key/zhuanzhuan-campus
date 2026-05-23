import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { initSocketServer } from './config/socket';
import { registerChatSocketEvents } from './modules/chat/chat.socket';
import { startCleanupJobs } from './common/cleanup';
import { MCPClientService } from './services/mcp-client.service';
import { AppError } from './common/errors';
import { fail } from './utils/response';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import uploadRoutes from './modules/upload/upload.routes';
import categoryRoutes from './modules/category/category.routes';
import productRoutes from './modules/product/product.routes';
import orderRoutes from './modules/order/order.routes';
import addressRoutes from './modules/address/address.routes';
import regionRoutes from './modules/region/region.routes';
import universityRoutes from './modules/university/university.routes';
import chatRoutes from './modules/chat/chat.routes';
import reviewRoutes from './modules/review/review.routes';
import wantBuyRoutes from './modules/want-buy/want-buy.routes';
import { notificationRoutes } from './modules/notification/notification.routes';
import aiRoutes from './modules/ai/ai.routes';
import settingsRoutes from './modules/settings/settings.routes';
import reportRoutes from './modules/report/report.routes';
import { SettingsService } from './modules/settings/settings.service';

const app = express();

app.use(cors({
  origin: env.CLIENT_ORIGIN,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/want-buys', wantBuyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ code: 200, data: { status: 'ok' }, message: 'success' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return fail(res, err.message, err.statusCode);
  }
  console.error('Unhandled error:', err);
  return fail(res, '服务器内部错误', 500);
});

const httpServer = http.createServer(app);
const io = initSocketServer(httpServer);
registerChatSocketEvents(io);

httpServer.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
  startCleanupJobs();
  SettingsService.ensureDefaults().catch((err) => {
    console.error('Failed to init settings defaults:', err);
  });
});

process.on('SIGINT', async () => {
  await MCPClientService.disconnect();
  await prisma.$disconnect();
  httpServer.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await MCPClientService.disconnect();
  await prisma.$disconnect();
  httpServer.close();
  process.exit(0);
});

export default app;
