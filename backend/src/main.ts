import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { startCleanupJobs } from './common/cleanup';
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

const server = app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
  startCleanupJobs();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

export default app;
