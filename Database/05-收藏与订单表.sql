-- =============================================
-- 05 - 收藏表与订单表
-- 依赖：01-用户表, 03-收货地址表, 04-商品表
-- =============================================

-- 收藏表
CREATE TABLE `favorites` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '收藏ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `product_id` BIGINT NOT NULL COMMENT '商品ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_product_id` (`product_id`),
    UNIQUE KEY `uk_user_product` (`user_id`, `product_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏表';

-- 订单表
CREATE TABLE `orders` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
    `order_no` VARCHAR(32) NOT NULL COMMENT '订单编号',
    `product_id` BIGINT NOT NULL COMMENT '商品ID',
    `buyer_id` INT NOT NULL COMMENT '买家ID',
    `seller_id` INT NOT NULL COMMENT '卖家ID',
    `quantity` INT NOT NULL DEFAULT 1 COMMENT '购买数量',
    `price` DECIMAL(10,2) NOT NULL COMMENT '成交单价',
    `total_price` DECIMAL(10,2) NOT NULL COMMENT '订单总价',
    `delivery_type` ENUM('self', 'express') NOT NULL COMMENT '交易方式',
    `address_id` INT DEFAULT NULL COMMENT '收货地址ID',
    `address_snapshot` JSON DEFAULT NULL COMMENT '收货地址快照',
    `pickup_info` JSON DEFAULT NULL COMMENT '自提信息(地点+时间段)',
    `payment_method` ENUM('wechat', 'alipay') DEFAULT NULL COMMENT '支付方式',
    `status` ENUM('pending_payment', 'pending_ship', 'pending_pickup', 'pending_receive', 'pending_confirm', 'completed', 'cancelled', 'returning', 'refunded') DEFAULT 'pending_payment' COMMENT '订单状态',
    `pay_time` DATETIME DEFAULT NULL COMMENT '支付时间',
    `ship_time` DATETIME DEFAULT NULL COMMENT '发货时间',
    `receive_time` DATETIME DEFAULT NULL COMMENT '收货时间',
    `confirm_pickup_time` DATETIME DEFAULT NULL COMMENT '确认取货时间',
    `confirm_time` DATETIME DEFAULT NULL COMMENT '确认完成时间',
    `express_company` VARCHAR(50) DEFAULT NULL COMMENT '快递公司',
    `express_no` VARCHAR(50) DEFAULT NULL COMMENT '快递单号',
    `product_name` VARCHAR(100) NOT NULL COMMENT '商品名称快照',
    `product_image` VARCHAR(500) DEFAULT NULL COMMENT '商品主图快照',
    `product_specs` JSON DEFAULT NULL COMMENT '商品规格快照',
    `cancel_reason` VARCHAR(255) DEFAULT NULL COMMENT '取消原因',
    `return_status` ENUM('none', 'pending', 'approved', 'rejected') DEFAULT 'none' COMMENT '退货审核状态',
    `return_reason` VARCHAR(255) DEFAULT NULL COMMENT '退货理由',
    `return_reject_reason` VARCHAR(255) DEFAULT NULL COMMENT '卖家拒绝退货理由',
    `return_apply_time` DATETIME DEFAULT NULL COMMENT '退货申请时间',
    `return_approved_time` DATETIME DEFAULT NULL COMMENT '退货审核通过时间',
    `return_received_time` DATETIME DEFAULT NULL COMMENT '卖家确认收到退货时间',
    `return_company` VARCHAR(50) DEFAULT NULL COMMENT '退货快递公司',
    `return_express_no` VARCHAR(50) DEFAULT NULL COMMENT '退货快递单号',
    `return_apply_count` INT DEFAULT 0 COMMENT '退货申请次数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_buyer_id` (`buyer_id`),
    KEY `idx_seller_id` (`seller_id`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_buyer_status` (`buyer_id`, `status`),
    KEY `idx_seller_status` (`seller_id`, `status`),
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 商品库存锁表
CREATE TABLE `product_locks` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '锁ID',
    `product_id` BIGINT NOT NULL COMMENT '商品ID',
    `order_id` BIGINT NOT NULL COMMENT '订单ID',
    `quantity` INT NOT NULL COMMENT '锁定数量',
    `locked_until` DATETIME NOT NULL COMMENT '锁过期时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_product_id` (`product_id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_locked_until` (`locked_until`),
    UNIQUE KEY `uk_product_order` (`product_id`, `order_id`),
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品库存锁表';
