-- =============================================
-- 11 - AI助手、系统配置、投诉表
-- 依赖：01-用户表, 05-订单表
-- =============================================

-- AI会话表
CREATE TABLE `ai_conversations` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '会话ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `title` VARCHAR(100) DEFAULT NULL COMMENT '会话标题',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_updated_at` (`updated_at`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI会话表';

-- AI消息表
CREATE TABLE `ai_messages` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '消息ID',
    `conversation_id` INT NOT NULL COMMENT '会话ID',
    `role` ENUM('user', 'assistant', 'system') NOT NULL COMMENT '角色',
    `content` TEXT NOT NULL COMMENT '消息内容',
    `msg_type` ENUM('text', 'product_card', 'order_card', 'chart', 'link') DEFAULT 'text' COMMENT '消息类型',
    `extra_data` JSON DEFAULT NULL COMMENT '附加数据(卡片/图表等)',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_conversation_id` (`conversation_id`),
    KEY `idx_conv_created` (`conversation_id`, `created_at`),
    FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI消息表';

-- 系统配置表
CREATE TABLE `system_configs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `config_key` VARCHAR(100) NOT NULL COMMENT '配置键',
    `config_value` TEXT NOT NULL COMMENT '配置值',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '说明',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 投诉表
CREATE TABLE `complaints` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '投诉ID',
    `order_id` BIGINT NOT NULL COMMENT '订单ID',
    `complainant_id` INT NOT NULL COMMENT '投诉人ID',
    `respondent_id` INT NOT NULL COMMENT '被投诉人ID',
    `type` ENUM('quality', 'delivery', 'payment', 'attitude', 'other') NOT NULL COMMENT '投诉类型',
    `description` TEXT NOT NULL COMMENT '投诉描述',
    `images` JSON DEFAULT NULL COMMENT '证据图片数组',
    `status` ENUM('pending', 'processing', 'resolved', 'closed') DEFAULT 'pending' COMMENT '处理状态',
    `handler_id` INT DEFAULT NULL COMMENT '处理人ID',
    `handler_note` TEXT DEFAULT NULL COMMENT '处理备注',
    `result` TEXT DEFAULT NULL COMMENT '处理结果',
    `handled_at` DATETIME DEFAULT NULL COMMENT '处理时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_order_id` (`order_id`),
    KEY `idx_complainant_id` (`complainant_id`),
    KEY `idx_respondent_id` (`respondent_id`),
    KEY `idx_status` (`status`),
    KEY `idx_handler_id` (`handler_id`),
    KEY `idx_created_at` (`created_at`),
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`complainant_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`respondent_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`handler_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投诉表';
