-- =============================================
-- 10 - 搜索、验证码表
-- 依赖：无
-- =============================================

-- 搜索历史表
CREATE TABLE `search_history` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `user_id` INT DEFAULT NULL COMMENT '用户ID(游客为NULL)',
    `keyword` VARCHAR(100) NOT NULL COMMENT '搜索关键词',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '搜索时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索历史表';

-- 热搜表
CREATE TABLE `hot_searches` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `keyword` VARCHAR(100) NOT NULL COMMENT '搜索关键词',
    `search_count` INT DEFAULT 1 COMMENT '搜索次数',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY `uk_keyword` (`keyword`),
    KEY `idx_search_count` (`search_count` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='热搜表';

-- 邮箱验证码表
CREATE TABLE `email_codes` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱',
    `code` VARCHAR(10) NOT NULL COMMENT '验证码',
    `type` ENUM('register', 'login', 'reset_password', 'change_email') NOT NULL COMMENT '类型',
    `expires_at` DATETIME NOT NULL COMMENT '过期时间',
    `is_used` TINYINT DEFAULT 0 COMMENT '是否已使用',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_email_type` (`email`, `type`),
    KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮箱验证码表';
