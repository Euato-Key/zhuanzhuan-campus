/**
 * 创建超级管理员工具
 *
 * 使用方法:
 *   npm run create-admin                    # 交互式创建
 *   npm run create-admin -- --email admin@example.com --username admin --password 123456
 *   npm run create-admin -- --help          # 查看帮助
 *
 * 功能:
 *   - 创建新的超级管理员账号
 *   - 将现有用户提升为超级管理员
 *   - 密码加密存储
 *   - 输入验证
 */

import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

interface CreateAdminOptions {
  email: string;
  username: string;
  password: string;
}

// 验证邮箱格式
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 验证用户名格式
function validateUsername(username: string): boolean {
  return username.length >= 2 && username.length <= 50;
}

// 验证密码强度
function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少6位' };
  }
  return { valid: true, message: '' };
}

// 创建超级管理员
async function createSuperAdmin(options: CreateAdminOptions): Promise<void> {
  const { email, username, password } = options;

  // 验证输入
  if (!validateEmail(email)) {
    console.error('❌ 邮箱格式不正确');
    process.exit(1);
  }

  if (!validateUsername(username)) {
    console.error('❌ 用户名长度需在2-50个字符之间');
    process.exit(1);
  }

  const pwdValidation = validatePassword(password);
  if (!pwdValidation.valid) {
    console.error(`❌ ${pwdValidation.message}`);
    process.exit(1);
  }

  try {
    // 检查邮箱是否已存在
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingByEmail) {
      if (existingByEmail.role === 'super_admin') {
        console.log('⚠️  该邮箱已是超级管理员');
        process.exit(0);
      }
      // 提升为超级管理员
      await prisma.user.update({
        where: { email },
        data: { role: UserRole.super_admin },
      });
      console.log(`✅ 用户 ${existingByEmail.username} 已提升为超级管理员`);
      process.exit(0);
    }

    // 检查用户名是否已存在
    const existingByUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingByUsername) {
      console.error('❌ 用户名已被使用');
      process.exit(1);
    }

    // 创建新超级管理员
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: UserRole.super_admin,
        creditScore: 100,
      },
    });

    console.log('✅ 超级管理员创建成功！');
    console.log('-----------------------------------');
    console.log(`   ID:       ${user.id}`);
    console.log(`   邮箱:     ${user.email}`);
    console.log(`   用户名:   ${user.username}`);
    console.log(`   角色:     ${user.role}`);
    console.log('-----------------------------------');
    console.log('⚠️  请妥善保管账号密码！');

  } catch (error) {
    console.error('❌ 创建失败:', error);
    process.exit(1);
  }
}

// 交互式输入
function question(rl: readline.ReadLine, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

// 交互式创建
async function interactiveCreate(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n🎓 转转校园 - 创建超级管理员\n');

  try {
    const email = await question(rl, '请输入邮箱: ');
    const username = await question(rl, '请输入用户名: ');
    const password = await question(rl, '请输入密码: ');

    await createSuperAdmin({ email, username, password });
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// 解析命令行参数
function parseArgs(): CreateAdminOptions | null {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
使用方法:
  npm run create-admin                    交互式创建
  npm run create-admin -- [options]       命令行参数创建

选项:
  --email <email>       邮箱地址
  --username <name>     用户名
  --password <pwd>      密码
  --help, -h            显示帮助信息

示例:
  npm run create-admin -- --email admin@example.com --username admin --password 123456
`);
    process.exit(0);
  }

  const options: Partial<CreateAdminOptions> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      options.email = args[i + 1];
      i++;
    } else if (args[i] === '--username' && args[i + 1]) {
      options.username = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      options.password = args[i + 1];
      i++;
    }
  }

  // 如果提供了所有参数，返回选项
  if (options.email && options.username && options.password) {
    return options as CreateAdminOptions;
  }

  return null;
}

// 主函数
async function main() {
  const options = parseArgs();

  if (options) {
    // 命令行参数模式
    await createSuperAdmin(options);
    await prisma.$disconnect();
  } else {
    // 交互式模式
    await interactiveCreate();
  }
}

main();
