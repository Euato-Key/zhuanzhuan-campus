-- ============================================================
-- 06-高校信息表
-- 数据来源：教育部2025年全国普通高等学校名单
-- 用途：用户填写信息时快速、准确选中自己的高校
-- ============================================================

CREATE TABLE IF NOT EXISTS `university` (
  `id`              INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`            VARCHAR(100)    NOT NULL COMMENT '学校名称',
  `code`            CHAR(10)        NOT NULL COMMENT '学校标识码（10位数字）',
  `authority`       VARCHAR(50)     NOT NULL COMMENT '主管部门',
  `province`        VARCHAR(30)     NOT NULL COMMENT '所在省份',
  `city`            VARCHAR(50)     NOT NULL COMMENT '所在地',
  `level`           ENUM('本科','专科') NOT NULL COMMENT '办学层次',
  `remark`          VARCHAR(100)    DEFAULT NULL COMMENT '备注（民办/中外合作办学等）',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_province` (`province`),
  KEY `idx_level` (`level`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全国普通高等学校';
