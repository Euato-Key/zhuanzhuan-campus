-- =============================================
-- 搜索模块
-- =============================================

-- 搜索历史表
CREATE TABLE `search_history` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `keyword` VARCHAR(100) NOT NULL COMMENT '搜索关键词',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '搜索时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索历史表';

-- 热门搜索词表
CREATE TABLE `hot_searches` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `keyword` VARCHAR(100) NOT NULL COMMENT '搜索关键词',
    `search_count` INT DEFAULT 0 COMMENT '搜索次数',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_search_count` (`search_count`),
    KEY `idx_enabled` (`enabled`),
    KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='热门搜索词表';

-- =============================================
-- 验证码与Token模块
-- =============================================

-- 邮箱验证码表
CREATE TABLE `email_codes` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱',
    `code` VARCHAR(10) NOT NULL COMMENT '验证码',
    `type` ENUM('register', 'login', 'reset_password') NOT NULL COMMENT '验证码类型',
    `used` TINYINT(1) DEFAULT 0 COMMENT '是否已使用',
    `expires_at` DATETIME NOT NULL COMMENT '过期时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_email` (`email`),
    KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮箱验证码表';

-- 设备Token表
CREATE TABLE `device_tokens` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `device_id` VARCHAR(255) NOT NULL COMMENT '设备ID',
    `access_token` TEXT DEFAULT NULL COMMENT 'Access Token',
    `refresh_token` TEXT DEFAULT NULL COMMENT 'Refresh Token',
    `expires_at` DATETIME DEFAULT NULL COMMENT 'Token过期时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_device_id` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备Token表';

-- =============================================
-- 初始化数据
-- =============================================

-- 初始化热门搜索词
INSERT INTO `hot_searches` (`keyword`, `search_count`, `sort`, `enabled`) VALUES
('教材', 100, 1, 1),
('自行车', 90, 2, 1),
('电子产品', 80, 3, 1),
('生活用品', 70, 4, 1),
('二手书', 60, 5, 1),
('篮球', 50, 6, 1),
('台灯', 40, 7, 1),
('耳机', 30, 8, 1);

-- 初始化默认商品分类
INSERT INTO `categories` (`name`, `parent_id`, `sort`) VALUES
('书籍', NULL, 1),
('电子产品', NULL, 2),
('生活用品', NULL, 3),
('服饰鞋包', NULL, 4),
('运动户外', NULL, 5),
('文具办公', NULL, 6),
('美妆个护', NULL, 7),
('其他', NULL, 8);

-- 书籍子分类
INSERT INTO `categories` (`name`, `parent_id`, `sort`) VALUES
('教材教辅', 1, 1),
('小说文学', 1, 2),
('专业技术', 1, 3),
('考试资料', 1, 4);

-- 电子产品子分类
INSERT INTO `categories` (`name`, `parent_id`, `sort`) VALUES
('手机平板', 2, 1),
('电脑配件', 2, 2),
('耳机音响', 2, 3),
('相机游戏', 2, 4);

-- 生活用品子分类
INSERT INTO `categories` (`name`, `parent_id`, `sort`) VALUES
('家居饰品', 3, 1),
('厨具餐具', 3, 2),
('收纳整理', 3, 3),
('小家电', 3, 4);