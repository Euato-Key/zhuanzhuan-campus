-- =============================================
-- 06 - 评价表
-- 依赖：01-用户表, 05-订单表
-- =============================================

CREATE TABLE `reviews` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '评价ID',
    `order_id` BIGINT NOT NULL COMMENT '订单ID',
    `reviewer_id` INT NOT NULL COMMENT '评价人ID',
    `reviewed_id` INT NOT NULL COMMENT '被评价人ID',
    `type` ENUM('buyer_to_seller', 'seller_to_buyer') NOT NULL COMMENT '评价类型',
    `rating` TINYINT NOT NULL COMMENT '星级(1-5)',
    `content` TEXT DEFAULT NULL COMMENT '评价内容',
    `images` JSON DEFAULT NULL COMMENT '图片数组',
    `is_anonymous` TINYINT DEFAULT 0 COMMENT '是否匿名',
    `status` ENUM('pending', 'approved', 'rejected', 'deleted') DEFAULT 'pending' COMMENT '状态',
    `reject_reason` TEXT DEFAULT NULL COMMENT '拒绝原因',
    `is_append` TINYINT DEFAULT 0 COMMENT '是否追评',
    `append_content` TEXT DEFAULT NULL COMMENT '追评内容',
    `append_images` JSON DEFAULT NULL COMMENT '追评图片',
    `append_status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '追评状态',
    `append_at` DATETIME DEFAULT NULL COMMENT '追评时间',
    `append_audit_count` INT DEFAULT 0 COMMENT '追评审核次数',
    `audit_count` INT DEFAULT 0 COMMENT '审核次数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_order_id` (`order_id`),
    KEY `idx_reviewer_id` (`reviewer_id`),
    KEY `idx_reviewed_id` (`reviewed_id`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`),
    UNIQUE KEY `uk_order_reviewer_type` (`order_id`, `reviewer_id`, `type`),
    CONSTRAINT `chk_rating` CHECK (`rating` BETWEEN 1 AND 5),
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`reviewed_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评价表';
