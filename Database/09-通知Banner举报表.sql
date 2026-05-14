-- =============================================
-- 09 - 通知、Banner、举报表
-- 依赖：01-用户表
-- =============================================

-- 通知表
CREATE TABLE `notifications` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '通知ID',
    `user_id` INT NOT NULL COMMENT '接收用户ID',
    `type` ENUM('system', 'product', 'order', 'chat', 'review', 'interaction') NOT NULL COMMENT '通知类型',
    `title` VARCHAR(100) NOT NULL COMMENT '通知标题',
    `content` TEXT NOT NULL COMMENT '通知内容',
    `related_id` BIGINT DEFAULT NULL COMMENT '关联ID(订单/商品/评价等)',
    `related_type` ENUM('order', 'product', 'review', 'user', 'want_buy') DEFAULT NULL COMMENT '关联类型',
    `is_read` TINYINT DEFAULT 0 COMMENT '是否已读',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_user_read` (`user_id`, `is_read`),
    KEY `idx_created_at` (`created_at`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- Banner表
CREATE TABLE `banners` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'Banner ID',
    `title` VARCHAR(100) DEFAULT NULL COMMENT '标题',
    `image` VARCHAR(500) NOT NULL COMMENT '图片URL',
    `link_type` ENUM('product', 'category', 'url', 'none') DEFAULT 'none' COMMENT '链接类型',
    `link_url` VARCHAR(500) DEFAULT NULL COMMENT '链接地址',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `is_active` TINYINT DEFAULT 1 COMMENT '是否启用',
    `start_time` DATETIME DEFAULT NULL COMMENT '开始展示时间',
    `end_time` DATETIME DEFAULT NULL COMMENT '结束展示时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_sort` (`sort`),
    KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Banner表';

-- 举报表
CREATE TABLE `reports` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '举报ID',
    `reporter_id` INT NOT NULL COMMENT '举报人ID',
    `target_type` ENUM('product', 'user', 'review', 'want_buy', 'comment') NOT NULL COMMENT '举报对象类型',
    `target_id` BIGINT NOT NULL COMMENT '举报对象ID',
    `reason` ENUM('fraud', 'prohibited', 'inappropriate', 'spam', 'other') NOT NULL COMMENT '举报原因',
    `detail` TEXT DEFAULT NULL COMMENT '详细描述',
    `images` JSON DEFAULT NULL COMMENT '证据图片数组',
    `status` ENUM('pending', 'dismissed', 'warning', 'banned', 'resolved') DEFAULT 'pending' COMMENT '处理状态',
    `handler_id` INT DEFAULT NULL COMMENT '处理人ID',
    `handler_note` TEXT DEFAULT NULL COMMENT '处理备注',
    `handled_at` DATETIME DEFAULT NULL COMMENT '处理时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_reporter_id` (`reporter_id`),
    KEY `idx_target` (`target_type`, `target_id`),
    KEY `idx_status` (`status`),
    KEY `idx_handler_id` (`handler_id`),
    KEY `idx_created_at` (`created_at`),
    FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`handler_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='举报表';
