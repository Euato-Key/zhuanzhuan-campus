-- =============================================
-- 08 - 求购社区表
-- 依赖：01-用户表, 02-商品分类表
-- =============================================

-- 求购贴表
CREATE TABLE `want_buys` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '求购贴ID',
    `user_id` INT NOT NULL COMMENT '发布者ID',
    `name` VARCHAR(100) NOT NULL COMMENT '商品名称',
    `category_id` INT DEFAULT NULL COMMENT '分类ID',
    `description` TEXT DEFAULT NULL COMMENT '商品描述',
    `tags` JSON DEFAULT NULL COMMENT '标签数组',
    `budget_min` DECIMAL(10,2) DEFAULT NULL COMMENT '预算最低价',
    `budget_max` DECIMAL(10,2) DEFAULT NULL COMMENT '预算最高价',
    `quantity` INT DEFAULT 1 COMMENT '求购数量',
    `images` JSON DEFAULT NULL COMMENT '图片数组',
    `status` ENUM('active', 'found', 'closed', 'expired') DEFAULT 'active' COMMENT '状态',
    `valid_days` INT DEFAULT 30 COMMENT '有效期(天,可选7/15/30)',
    `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间',
    `view_count` INT DEFAULT 0 COMMENT '浏览次数',
    `comment_count` INT DEFAULT 0 COMMENT '评论次数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_category_id` (`category_id`),
    KEY `idx_status` (`status`),
    KEY `idx_expire_time` (`expire_time`),
    KEY `idx_created_at` (`created_at`),
    CONSTRAINT `chk_wb_valid_days` CHECK (`valid_days` IN (7, 15, 30)),
    CONSTRAINT `chk_wb_budget` CHECK (`budget_min` IS NULL OR `budget_max` IS NULL OR `budget_min` <= `budget_max`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='求购贴表';

-- 求购评论表
CREATE TABLE `want_buy_comments` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '评论ID',
    `want_buy_id` INT NOT NULL COMMENT '求购贴ID',
    `user_id` INT NOT NULL COMMENT '评论人ID',
    `parent_id` INT DEFAULT NULL COMMENT '父评论ID(一级评论ID)',
    `reply_to_id` INT DEFAULT NULL COMMENT '回复的目标评论ID(用于显示"回复@xxx")',
    `content` TEXT NOT NULL COMMENT '评论内容',
    `like_count` INT DEFAULT 0 COMMENT '点赞数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_want_buy_id` (`want_buy_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_reply_to_id` (`reply_to_id`),
    KEY `idx_created_at` (`created_at`),
    FOREIGN KEY (`want_buy_id`) REFERENCES `want_buys`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`parent_id`) REFERENCES `want_buy_comments`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`reply_to_id`) REFERENCES `want_buy_comments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='求购评论表';

-- 求购评论点赞表
CREATE TABLE `want_buy_comment_likes` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `comment_id` INT NOT NULL COMMENT '评论ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_comment_id` (`comment_id`),
    KEY `idx_user_id` (`user_id`),
    UNIQUE KEY `uk_comment_user` (`comment_id`, `user_id`),
    FOREIGN KEY (`comment_id`) REFERENCES `want_buy_comments`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='求购评论点赞表';
