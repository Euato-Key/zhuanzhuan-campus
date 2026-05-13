mysql -u root -p;

-- 创建用户（允许从任意主机连接，若仅本地开发可将 '%' 改为 'localhost'）
CREATE USER 'euatokey'@'%' IDENTIFIED BY '@7680997aaAA';

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

-- exit
-- mysql -u euatokey -p
CREATE DATABASE devdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE testdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;