-- =============================================
-- 02 - 商品分类表
-- 依赖：无（自引用外键）
-- =============================================

CREATE TABLE `categories` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '分类ID',
    `name` VARCHAR(50) NOT NULL COMMENT '分类名称',
    `parent_id` INT DEFAULT NULL COMMENT '父分类ID(NULL表示顶级分类)',
    `icon` VARCHAR(500) DEFAULT NULL COMMENT '图标URL',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_sort` (`sort`),
    UNIQUE KEY `uk_name_parent` (`name`, `parent_id`),
    FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类表';
