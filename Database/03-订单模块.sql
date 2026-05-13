-- =============================================
-- 订单模块
-- =============================================

CREATE TABLE `orders` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
    `product_id` INT NOT NULL COMMENT '商品ID',
    `buyer_id` INT NOT NULL COMMENT '买家ID',
    `seller_id` INT NOT NULL COMMENT '卖家ID',
    `quantity` INT NOT NULL DEFAULT 1 COMMENT '购买数量',
    `price` DECIMAL(10,2) NOT NULL COMMENT '成交单价',
    `total_price` DECIMAL(10,2) NOT NULL COMMENT '订单总价',
    `delivery_type` ENUM('self', 'express') NOT NULL COMMENT '交易方式',
    `address_id` INT DEFAULT NULL COMMENT '收货地址ID',
    `pickup_info` JSON DEFAULT NULL COMMENT '自提信息(地点+时间段)',
    `status` ENUM('pending_payment', 'pending_ship', 'pending_pickup', 'pending_receive', 'pending_confirm', 'completed', 'cancelled', 'returning', 'refunded') DEFAULT 'pending_payment' COMMENT '订单状态',
    `pay_time` DATETIME DEFAULT NULL COMMENT '支付时间',
    `ship_time` DATETIME DEFAULT NULL COMMENT '发货时间',
    `receive_time` DATETIME DEFAULT NULL COMMENT '收货时间',
    `confirm_pickup_time` DATETIME DEFAULT NULL COMMENT '确认取货时间',
    `confirm_time` DATETIME DEFAULT NULL COMMENT '确认完成时间',
    `express_company` VARCHAR(50) DEFAULT NULL COMMENT '快递公司',
    `express_no` VARCHAR(50) DEFAULT NULL COMMENT '快递单号',
    `cancel_reason` VARCHAR(255) DEFAULT NULL COMMENT '取消原因',
    `return_reason` VARCHAR(255) DEFAULT NULL COMMENT '退货理由',
    `return_company` VARCHAR(50) DEFAULT NULL COMMENT '退货快递公司',
    `return_express_no` VARCHAR(50) DEFAULT NULL COMMENT '退货快递单号',
    `return_apply_count` INT DEFAULT 0 COMMENT '退货申请次数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_product_id` (`product_id`),
    KEY `idx_buyer_id` (`buyer_id`),
    KEY `idx_seller_id` (`seller_id`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';