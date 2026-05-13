-- =============================================
-- 用户模块
-- =============================================

-- 用户表
CREATE TABLE `users` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱',
    `username` VARCHAR(50) NOT NULL COMMENT '用户名',
    `password` VARCHAR(255) NOT NULL COMMENT '密码(加密)',
    `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
    `school` VARCHAR(100) DEFAULT NULL COMMENT '学校名称',
    `campus` VARCHAR(100) DEFAULT NULL COMMENT '校区名称',
    `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    `role` ENUM('user', 'admin', 'super_admin') DEFAULT 'user' COMMENT '角色',
    `credit_score` INT DEFAULT 100 COMMENT '信用分(0-150)',
    `credit_level` ENUM('excellent', 'good', 'average', 'poor') DEFAULT 'good' COMMENT '信用等级',
    `is_blocked` TINYINT(1) DEFAULT 0 COMMENT '是否被封禁',
    `blocked_until` DATETIME DEFAULT NULL COMMENT '封禁截止时间',
    `last_login_at` DATETIME DEFAULT NULL COMMENT '最后登录时间',
    `login_fail_count` INT DEFAULT 0 COMMENT '登录失败次数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY `uk_email` (`email`),
    UNIQUE KEY `uk_username` (`username`),
    KEY `idx_role` (`role`),
    KEY `idx_is_blocked` (`is_blocked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';