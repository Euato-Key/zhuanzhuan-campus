-- =============================================
-- 04 - 商品表与浏览记录表
-- 依赖：01-用户表, 02-商品分类表
-- =============================================

-- 商品表
CREATE TABLE `products` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '商品ID',
    `user_id` INT NOT NULL COMMENT '卖家ID',
    `name` VARCHAR(100) NOT NULL COMMENT '商品名称',
    `description` TEXT NOT NULL COMMENT '商品描述',
    `category_id` INT NOT NULL COMMENT '分类ID',
    `tags` JSON DEFAULT NULL COMMENT '商品标签数组',
    `images` JSON NOT NULL COMMENT '主图URL数组(1-9张)',
    `detail_images` JSON DEFAULT NULL COMMENT '详情图片数组',
    `original_price` DECIMAL(10,2) DEFAULT NULL COMMENT '原价',
    `current_price` DECIMAL(10,2) NOT NULL COMMENT '现价',
    `bargain` TINYINT DEFAULT 0 COMMENT '是否支持议价(0/1)',
    `delivery_type` ENUM('self', 'express', 'both') NOT NULL COMMENT '交易方式',
    `pickup_address` VARCHAR(255) DEFAULT NULL COMMENT '自提地点',
    `pickup_time` VARCHAR(255) DEFAULT NULL COMMENT '自提时间段',
    `item_condition` ENUM('new', '99new', '95new', '90new', '80new') NOT NULL COMMENT '新旧程度',
    `stock` INT DEFAULT 1 COMMENT '库存数量',
    `brand` VARCHAR(100) DEFAULT NULL COMMENT '品牌',
    `specs` JSON DEFAULT NULL COMMENT '规格自定义JSON',
    `shipping_address` VARCHAR(255) DEFAULT NULL COMMENT '发货地址',
    `valid_days` INT DEFAULT NULL COMMENT '有效期(天,永久为NULL)',
    `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间',
    `status` ENUM('pending', 'active', 'offline', 'banned', 'audit_failed') DEFAULT 'pending' COMMENT '状态',
    `reject_reason` TEXT DEFAULT NULL COMMENT '审核拒绝原因',
    `audit_count` INT DEFAULT 0 COMMENT '审核次数',
    `relist_count` INT DEFAULT 0 COMMENT '续期/重新上架次数(不计入审核)',
    `view_count` INT DEFAULT 0 COMMENT '浏览次数',
    `favorite_count` INT DEFAULT 0 COMMENT '收藏数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_category_id` (`category_id`),
    KEY `idx_status` (`status`),
    KEY `idx_expire_time` (`expire_time`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_current_price` (`current_price`),
    KEY `idx_favorite_count` (`favorite_count`),
    CONSTRAINT `chk_valid_days` CHECK (`valid_days` IS NULL OR `valid_days` IN (7, 15, 30)),
    CONSTRAINT `chk_current_price` CHECK (`current_price` >= 0),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- 商品浏览记录表
CREATE TABLE `product_views` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `product_id` BIGINT NOT NULL COMMENT '商品ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '浏览时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_user_created` (`user_id`, `created_at`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品浏览记录表';
