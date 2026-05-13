-- =============================================
-- 求购社区模块
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
    `valid_days` INT DEFAULT 30 COMMENT '有效期(天)',
    `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_category_id` (`category_id`),
    KEY `idx_status` (`status`),
    KEY `idx_expire_time` (`expire_time`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='求购贴表';

-- 求购评论表
CREATE TABLE `want_buy_comments` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '评论ID',
    `want_buy_id` INT NOT NULL COMMENT '求购贴ID',
    `user_id` INT NOT NULL COMMENT '评论人ID',
    `parent_id` INT DEFAULT NULL COMMENT '父评论ID(回复)',
    `content` TEXT NOT NULL COMMENT '评论内容',
    `likes` INT DEFAULT 0 COMMENT '点赞数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_want_buy_id` (`want_buy_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='求购评论表';

-- 求购评论点赞表
CREATE TABLE `want_buy_comment_likes` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `comment_id` INT NOT NULL COMMENT '评论ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_comment_id` (`comment_id`),
    KEY `idx_user_id` (`user_id`),
    UNIQUE KEY `uk_comment_user` (`comment_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='求购评论点赞表';