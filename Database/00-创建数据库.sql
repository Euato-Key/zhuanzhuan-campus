-- =============================================
-- 00 - 创建数据库与用户
-- 注意：以下命令需在MySQL root用户下执行
-- 执行方式: mysql -u root -p < 00-创建数据库.sql
-- =============================================

-- 创建用户（允许从任意主机连接，若仅本地开发可将 '%' 改为 'localhost'）
CREATE USER 'euatokey'@'%' IDENTIFIED BY '--------';

-- 授予开发相关的全局权限（包含创建数据库、表、索引、视图等）
GRANT CREATE, ALTER, DROP, INSERT, UPDATE, DELETE, SELECT, INDEX,
      CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE,
      EXECUTE, TRIGGER, REFERENCES, CREATE TEMPORARY TABLES,
      LOCK TABLES, EVENT
ON *.* TO 'euatokey'@'%' WITH GRANT OPTION;

-- 若希望简化（授予所有权限，含 CREATE DATABASE），可直接：
-- GRANT ALL PRIVILEGES ON *.* TO 'euatokey'@'%' WITH GRANT OPTION;

-- 刷新权限（MySQL 8.0+ 通常可省略，但执行无害）
FLUSH PRIVILEGES;

-- 创建开发数据库
CREATE DATABASE devdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建测试数据库
CREATE DATABASE testdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================
-- 建表SQL执行顺序说明
-- 重构后文件按外键依赖顺序编号，可按 01→02→...→09 顺序依次执行
-- 无需关心跨文件依赖问题
--
-- 执行方式:
--   方式一：逐个执行（推荐调试时使用）
--     mysql -u euatokey -p devdb < 01-用户表.sql
--     mysql -u euatokey -p devdb < 02-商品分类表.sql
--     ...
--
--   方式二：一键执行（推荐）
--     mysql -u euatokey -p devdb < 00-创建数据库.sql
-- =============================================

-- =============================================
-- 一键执行所有建表SQL（跳过外键检查）
-- =============================================
-- 取消下方注释以启用一键建表功能：

-- SET FOREIGN_KEY_CHECKS = 0;
-- SOURCE 01-用户表与RefreshToken表.sql;
-- SOURCE 02-商品分类表.sql;
-- SOURCE 03-收货地址表.sql;
-- SOURCE 04-商品与浏览记录表.sql;
-- SOURCE 05-收藏与订单表.sql;
-- SOURCE 06-评价表.sql;
-- SOURCE 07-聊天模块表.sql;
-- SOURCE 08-求购社区表.sql;
-- SOURCE 09-通知Banner举报表.sql;
-- SOURCE 10-搜索验证码表.sql;
-- SOURCE 11-AI助手系统配置投诉表.sql;
-- SET FOREIGN_KEY_CHECKS = 1;
-- =============================================
