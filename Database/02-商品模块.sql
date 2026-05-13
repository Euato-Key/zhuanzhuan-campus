-- =============================================
-- 商品模块
-- =============================================

-- 商品分类表
CREATE TABLE `categories` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '分类ID',
    `name` VARCHAR(50) NOT NULL COMMENT '分类名称',
    `parent_id` INT DEFAULT NULL COMMENT '父分类ID(顶级为NULL)',
    `icon` VARCHAR(500) DEFAULT NULL COMMENT '图标URL',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类表';

-- 商品表
CREATE TABLE `products` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '商品ID',
    `user_id` INT NOT NULL COMMENT '卖家ID',
    `name` VARCHAR(100) NOT NULL COMMENT '商品名称',
    `description` TEXT DEFAULT NULL COMMENT '商品描述',
    `category_id` INT NOT NULL COMMENT '分类ID',
    `tags` JSON DEFAULT NULL COMMENT '商品标签数组',
    `images` JSON NOT NULL COMMENT '主图URL数组(1-9张)',
    `detail_images` JSON DEFAULT NULL COMMENT '详情图片数组',
    `original_price` DECIMAL(10,2) DEFAULT NULL COMMENT '原价',
    `current_price` DECIMAL(10,2) NOT NULL COMMENT '现价',
    `bargain` TINYINT(1) DEFAULT 0 COMMENT '是否支持议价(0/1)',
    `delivery_type` ENUM('self', 'express', 'both') NOT NULL COMMENT '交易方式',
    `pickup_address` VARCHAR(255) DEFAULT NULL COMMENT '自提地点',
    `pickup_time` VARCHAR(255) DEFAULT NULL COMMENT '自提时间段',
    `condition` ENUM('new', '99new', '95new', '90new', '80new') NOT NULL COMMENT '新旧程度',
    `stock` INT DEFAULT 1 COMMENT '库存数量',
    `brand` VARCHAR(100) DEFAULT NULL COMMENT '品牌',
    `specs` JSON DEFAULT NULL COMMENT '规格自定义JSON',
    `shipping_address` VARCHAR(255) DEFAULT NULL COMMENT '发货地址',
    `valid_days` INT DEFAULT NULL COMMENT '有效期(天,永久为NULL)',
    `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间',
    `status` ENUM('pending', 'active', 'offline', 'banned', 'audit_failed') DEFAULT 'pending' COMMENT '状态',
    `reject_reason` TEXT DEFAULT NULL COMMENT '审核拒绝原因',
    `audit_count` INT DEFAULT 0 COMMENT '审核次数',
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
    KEY `idx_favorite_count` (`favorite_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- 商品库存锁表
CREATE TABLE `product_locks` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '锁ID',
    `product_id` INT NOT NULL COMMENT '商品ID',
    `order_id` INT NOT NULL COMMENT '订单ID',
    `quantity` INT NOT NULL COMMENT '锁定数量',
    `locked_until` DATETIME NOT NULL COMMENT '锁过期时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_product_id` (`product_id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_locked_until` (`locked_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品库存锁表';