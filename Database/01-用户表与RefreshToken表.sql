-- =============================================
-- 01 - 用户表、Refresh Token表
-- 依赖：无
-- =============================================

-- 用户表
CREATE TABLE `users` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱',
    `username` VARCHAR(50) NOT NULL COMMENT '用户名',
    `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希',
    `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
    `bio` VARCHAR(500) DEFAULT NULL COMMENT '个人简介',
    `school` VARCHAR(100) DEFAULT NULL COMMENT '学校名称',
    `campus` VARCHAR(100) DEFAULT NULL COMMENT '校区名称',
    `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    `role` ENUM('user', 'admin', 'super_admin') DEFAULT 'user' COMMENT '角色',
    `credit_score` INT DEFAULT 100 COMMENT '信用分(0-150)',
    `is_blocked` TINYINT DEFAULT 0 COMMENT '是否被封禁',
    `blocked_until` DATETIME DEFAULT NULL COMMENT '封禁截止时间',
    `last_login_at` DATETIME DEFAULT NULL COMMENT '最后登录时间',
    `login_fail_count` INT DEFAULT 0 COMMENT '登录失败次数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY `uk_email` (`email`),
    UNIQUE KEY `uk_username` (`username`),
    KEY `idx_role` (`role`),
    KEY `idx_is_blocked` (`is_blocked`),
    CONSTRAINT `chk_credit_score` CHECK (`credit_score` BETWEEN 0 AND 150)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- Refresh Token表（双token轮换机制）
-- Access Token: 短期(15min)，JWT无状态，不存库
-- Refresh Token: 长期(7天)，存库，用于轮换和吊销
-- 安全：token_hash字段存储SHA-256哈希值，非明文；校验时对客户端传入的token做SHA-256后比对
CREATE TABLE `refresh_tokens` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'Token记录ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `token_hash` VARCHAR(64) NOT NULL COMMENT 'Refresh Token的SHA-256哈希',
    `expires_at` DATETIME NOT NULL COMMENT '过期时间',
    `is_revoked` TINYINT DEFAULT 0 COMMENT '是否已吊销',
    `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '客户端UA(识别设备)',
    `ip_address` VARCHAR(45) DEFAULT NULL COMMENT '登录IP',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY `uk_token_hash` (`token_hash`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_expires_at` (`expires_at`),
    KEY `idx_user_revoked` (`user_id`, `is_revoked`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Refresh Token表';
