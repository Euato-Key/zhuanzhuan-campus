-- =============================================
-- 收藏模块
-- =============================================

CREATE TABLE `favorites` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '收藏ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `product_id` INT NOT NULL COMMENT '商品ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_product_id` (`product_id`),
    UNIQUE KEY `uk_user_product` (`user_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏表';

-- =============================================
-- 地址模块
-- =============================================

CREATE TABLE `addresses` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '地址ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `name` VARCHAR(50) NOT NULL COMMENT '收货人姓名',
    `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
    `province` VARCHAR(50) DEFAULT NULL COMMENT '省份',
    `city` VARCHAR(50) DEFAULT NULL COMMENT '城市',
    `district` VARCHAR(50) DEFAULT NULL COMMENT '区县',
    `detail` VARCHAR(255) NOT NULL COMMENT '详细地址',
    `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_is_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收货地址表';

-- =============================================
-- 通知模块
-- =============================================

CREATE TABLE `notifications` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '通知ID',
    `user_id` INT NOT NULL COMMENT '接收用户ID',
    `type` ENUM('system', 'product', 'order', 'chat', 'interaction') NOT NULL COMMENT '通知类型',
    `title` VARCHAR(100) NOT NULL COMMENT '通知标题',
    `content` TEXT NOT NULL COMMENT '通知内容',
    `related_id` INT DEFAULT NULL COMMENT '关联ID',
    `related_type` VARCHAR(50) DEFAULT NULL COMMENT '关联类型',
    `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_type` (`type`),
    KEY `idx_is_read` (`is_read`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- =============================================
-- Banner模块
-- =============================================

CREATE TABLE `banners` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'BannerID',
    `image` VARCHAR(500) NOT NULL COMMENT '图片URL',
    `link` VARCHAR(500) DEFAULT NULL COMMENT '跳转链接',
    `title` VARCHAR(100) DEFAULT NULL COMMENT '标题',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    `start_time` DATETIME DEFAULT NULL COMMENT '生效开始时间',
    `end_time` DATETIME DEFAULT NULL COMMENT '生效结束时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_enabled` (`enabled`),
    KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Banner表';

-- =============================================
-- 举报模块
-- =============================================

CREATE TABLE `reports` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '举报ID',
    `reporter_id` INT NOT NULL COMMENT '举报人ID',
    `target_id` INT NOT NULL COMMENT '被举报对象ID',
    `target_type` ENUM('product', 'want_buy', 'comment', 'user') NOT NULL COMMENT '被举报类型',
    `reason` VARCHAR(255) NOT NULL COMMENT '举报理由',
    `detail` TEXT DEFAULT NULL COMMENT '详细说明',
    `status` ENUM('pending', 'dismissed', 'warning', 'banned', 'resolved') DEFAULT 'pending' COMMENT '处理状态',
    `result` TEXT DEFAULT NULL COMMENT '处理结果',
    `handler_id` INT DEFAULT NULL COMMENT '处理人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_reporter_id` (`reporter_id`),
    KEY `idx_target` (`target_id`, `target_type`),
    KEY `idx_status` (`status`),
    KEY `idx_handler_id` (`handler_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='举报表';