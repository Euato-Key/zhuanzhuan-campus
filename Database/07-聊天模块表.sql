-- =============================================
-- 07 - 聊天模块表
-- 依赖：01-用户表
-- =============================================

-- 会话表
CREATE TABLE `conversations` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '会话ID',
    `user1_id` INT NOT NULL COMMENT '用户1ID',
    `user2_id` INT NOT NULL COMMENT '用户2ID',
    `last_message_id` BIGINT DEFAULT NULL COMMENT '最新消息ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_user1_id` (`user1_id`),
    KEY `idx_user2_id` (`user2_id`),
    CONSTRAINT `chk_user_order` CHECK (`user1_id` < `user2_id`),
    UNIQUE KEY `uk_users_pair` (`user1_id`, `user2_id`),
    FOREIGN KEY (`user1_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user2_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话表';

-- 消息表
CREATE TABLE `messages` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '消息ID',
    `conversation_id` INT NOT NULL COMMENT '会话ID',
    `sender_id` INT NOT NULL COMMENT '发送者ID',
    `type` ENUM('text', 'image', 'product', 'order') NOT NULL COMMENT '消息类型',
    `content` TEXT NOT NULL COMMENT '消息内容',
    `read_at` DATETIME DEFAULT NULL COMMENT '已读时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_conversation_id` (`conversation_id`),
    KEY `idx_sender_id` (`sender_id`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_conv_created` (`conversation_id`, `created_at`),
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息表';

-- 黑名单表
CREATE TABLE `blacklist` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `user_id` INT NOT NULL COMMENT '拉黑者ID',
    `blocked_user_id` INT NOT NULL COMMENT '被拉黑用户ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_user_id` (`user_id`),
    KEY `idx_blocked_user_id` (`blocked_user_id`),
    UNIQUE KEY `uk_user_blocked` (`user_id`, `blocked_user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`blocked_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='黑名单表';

-- 快捷回复表
CREATE TABLE `quick_replies` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `content` VARCHAR(255) NOT NULL COMMENT '快捷回复内容',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY `idx_user_id` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='快捷回复表';
