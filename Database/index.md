# 数据库表设计文档

> 数据库：`devdb` / `testdb`，字符集：`utf8mb4_unicode_ci`
>
> SQL 脚本按外键依赖顺序编号，**按 00→11 依次执行即可**，无跨文件依赖问题。

---

## 执行顺序总览

| 序号 | 文件 | 包含的表 | 依赖 |
|:----:|------|---------|------|
| 00 | `00-创建数据库.sql` | — | root 用户执行 |
| 01 | `01-用户表与RefreshToken表.sql` | `users`, `refresh_tokens` | 无 |
| 02 | `02-商品分类表.sql` | `categories` | 无（自引用） |
| 03 | `03-收货地址表.sql` | `addresses` | 01 |
| 04 | `04-商品与浏览记录表.sql` | `products`, `product_views` | 01, 02 |
| 05 | `05-收藏与订单表.sql` | `favorites`, `orders`, `product_locks` | 01, 03, 04 |
| 06 | `06-评价表.sql` | `reviews` | 01, 05 |
| 07 | `07-聊天模块表.sql` | `conversations`, `messages`, `blacklist`, `quick_replies` | 01 |
| 08 | `08-求购社区表.sql` | `want_buys`, `want_buy_comments`, `want_buy_comment_likes` | 01, 02 |
| 09 | `09-通知Banner举报表.sql` | `notifications`, `banners`, `reports` | 01 |
| 10 | `10-搜索验证码表.sql` | `search_history`, `hot_searches`, `email_codes` | 无 |
| 11 | `11-AI助手系统配置投诉表.sql` | `ai_conversations`, `ai_messages`, `system_configs`, `complaints` | 01, 05 |

---

## 一、用户模块 — `01-用户表与RefreshToken表.sql`

### 1.1 users 用户表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 用户ID |
| email | VARCHAR(255) UNIQUE | 邮箱 |
| username | VARCHAR(50) UNIQUE | 用户名 |
| password_hash | VARCHAR(255) | 密码哈希 |
| avatar | VARCHAR(500) | 头像URL |
| bio | VARCHAR(500) | 个人简介 |
| school | VARCHAR(100) | 学校名称 |
| campus | VARCHAR(100) | 校区名称 |
| phone | VARCHAR(20) | 手机号 |
| role | ENUM('user','admin','super_admin') | 角色，默认 user |
| credit_score | INT | 信用分(0-150)，默认100 |
| is_blocked | TINYINT | 是否被封禁，默认0 |
| blocked_until | DATETIME | 封禁截止时间 |
| last_login_at | DATETIME | 最后登录时间 |
| login_fail_count | INT | 登录失败次数，默认0 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 1.2 refresh_tokens Refresh Token表

> 双 Token 轮换机制：Access Token(15min) 无状态不存库，Refresh Token(7天) 存库用于轮换和吊销。
> `token_hash` 存储 SHA-256 哈希值，非明文；校验时对客户端传入的 token 做 SHA-256 后比对。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK AI | Token记录ID |
| user_id | INT FK→users | 用户ID |
| token_hash | VARCHAR(64) UNIQUE | Refresh Token 的 SHA-256 哈希 |
| expires_at | DATETIME | 过期时间 |
| is_revoked | TINYINT | 是否已吊销，默认0 |
| user_agent | VARCHAR(500) | 客户端UA(识别设备) |
| ip_address | VARCHAR(45) | 登录IP |
| created_at | DATETIME | 创建时间 |

---

## 二、商品分类 — `02-商品分类表.sql`

### 2.1 categories 商品分类表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 分类ID |
| name | VARCHAR(50) | 分类名称 |
| parent_id | INT FK→categories | 父分类ID(NULL为顶级) |
| icon | VARCHAR(500) | 图标URL |
| sort | INT | 排序，默认0 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

## 三、收货地址 — `03-收货地址表.sql`

### 3.1 addresses 收货地址表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 地址ID |
| user_id | INT FK→users | 用户ID |
| receiver_name | VARCHAR(50) | 收货人姓名 |
| receiver_phone | VARCHAR(20) | 手机号 |
| province | VARCHAR(50) | 省份 |
| city | VARCHAR(50) | 城市 |
| district | VARCHAR(50) | 区县 |
| detail | VARCHAR(255) | 详细地址 |
| is_default | TINYINT | 是否默认，默认0 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

## 四、商品与浏览记录 — `04-商品与浏览记录表.sql`

### 4.1 products 商品表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK AI | 商品ID |
| user_id | INT FK→users | 卖家ID |
| name | VARCHAR(100) | 商品名称 |
| description | TEXT | 商品描述 |
| category_id | INT FK→categories | 分类ID |
| tags | JSON | 商品标签数组 |
| images | JSON | 主图URL数组(1-9张) |
| detail_images | JSON | 详情图片数组 |
| original_price | DECIMAL(10,2) | 原价 |
| current_price | DECIMAL(10,2) | 现价 |
| bargain | TINYINT | 是否支持议价(0/1) |
| delivery_type | ENUM('self','express','both') | 交易方式 |
| pickup_address | VARCHAR(255) | 自提地点 |
| pickup_time | VARCHAR(255) | 自提时间段 |
| item_condition | ENUM('new','99new','95new','90new','80new') | 新旧程度 |
| stock | INT | 库存数量，默认1 |
| brand | VARCHAR(100) | 品牌 |
| specs | JSON | 规格自定义JSON |
| shipping_address | VARCHAR(255) | 发货地址 |
| valid_days | INT | 有效期(天,7/15/30,NULL为永久) |
| expire_time | DATETIME | 过期时间 |
| status | ENUM('pending','active','offline','banned','audit_failed') | 状态，默认 pending |
| reject_reason | TEXT | 审核拒绝原因 |
| audit_count | INT | 审核次数 |
| relist_count | INT | 续期/重新上架次数 |
| view_count | INT | 浏览次数 |
| favorite_count | INT | 收藏数 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 4.2 product_views 商品浏览记录表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | ID |
| user_id | INT FK→users | 用户ID |
| product_id | BIGINT FK→products | 商品ID |
| created_at | DATETIME | 浏览时间 |

---

## 五、收藏与订单 — `05-收藏与订单表.sql`

### 5.1 favorites 收藏表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 收藏ID |
| user_id | INT FK→users | 用户ID |
| product_id | BIGINT FK→products | 商品ID |
| created_at | DATETIME | 收藏时间 |

### 5.2 orders 订单表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK AI | 订单ID |
| order_no | VARCHAR(32) UNIQUE | 订单编号 |
| product_id | BIGINT FK→products | 商品ID |
| buyer_id | INT FK→users | 买家ID |
| seller_id | INT FK→users | 卖家ID |
| quantity | INT | 购买数量，默认1 |
| price | DECIMAL(10,2) | 成交单价 |
| total_price | DECIMAL(10,2) | 订单总价 |
| delivery_type | ENUM('self','express') | 交易方式 |
| address_id | INT FK→addresses | 收货地址ID |
| address_snapshot | JSON | 收货地址快照 |
| pickup_info | JSON | 自提信息(地点+时间段) |
| payment_method | ENUM('wechat','alipay') | 支付方式 |
| status | ENUM('pending_payment','pending_ship','pending_pickup','pending_receive','pending_confirm','completed','cancelled','returning','refunded') | 订单状态 |
| pay_time | DATETIME | 支付时间 |
| ship_time | DATETIME | 发货时间 |
| receive_time | DATETIME | 收货时间 |
| confirm_pickup_time | DATETIME | 确认取货时间 |
| confirm_time | DATETIME | 确认完成时间 |
| express_company | VARCHAR(50) | 快递公司 |
| express_no | VARCHAR(50) | 快递单号 |
| product_name | VARCHAR(100) | 商品名称快照 |
| product_image | VARCHAR(500) | 商品主图快照 |
| product_specs | JSON | 商品规格快照 |
| cancel_reason | VARCHAR(255) | 取消原因 |
| return_status | ENUM('none','pending','approved','rejected') | 退货审核状态 |
| return_reason | VARCHAR(255) | 退货理由 |
| return_reject_reason | VARCHAR(255) | 卖家拒绝退货理由 |
| return_apply_time | DATETIME | 退货申请时间 |
| return_approved_time | DATETIME | 退货审核通过时间 |
| return_received_time | DATETIME | 卖家确认收到退货时间 |
| return_company | VARCHAR(50) | 退货快递公司 |
| return_express_no | VARCHAR(50) | 退货快递单号 |
| return_apply_count | INT | 退货申请次数 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 5.3 product_locks 商品库存锁表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 锁ID |
| product_id | BIGINT FK→products | 商品ID |
| order_id | BIGINT FK→orders | 订单ID |
| quantity | INT | 锁定数量 |
| locked_until | DATETIME | 锁过期时间 |
| created_at | DATETIME | 创建时间 |

---

## 六、评价 — `06-评价表.sql`

### 6.1 reviews 评价表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 评价ID |
| order_id | BIGINT FK→orders | 订单ID |
| reviewer_id | INT FK→users | 评价人ID |
| reviewed_id | INT FK→users | 被评价人ID |
| type | ENUM('buyer_to_seller','seller_to_buyer') | 评价类型 |
| rating | TINYINT | 星级(1-5) |
| content | TEXT | 评价内容 |
| images | JSON | 图片数组 |
| is_anonymous | TINYINT | 是否匿名 |
| status | ENUM('pending','approved','rejected','deleted') | 状态 |
| reject_reason | TEXT | 拒绝原因 |
| is_append | TINYINT | 是否追评 |
| append_content | TEXT | 追评内容 |
| append_images | JSON | 追评图片 |
| append_status | ENUM('pending','approved','rejected') | 追评状态 |
| append_at | DATETIME | 追评时间 |
| append_audit_count | INT | 追评审核次数 |
| audit_count | INT | 审核次数 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

## 七、聊天模块 — `07-聊天模块表.sql`

### 7.1 conversations 会话表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 会话ID |
| user1_id | INT FK→users | 用户1ID |
| user2_id | INT FK→users | 用户2ID |
| last_message_id | BIGINT | 最新消息ID |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 7.2 messages 消息表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK AI | 消息ID |
| conversation_id | INT FK→conversations | 会话ID |
| sender_id | INT FK→users | 发送者ID |
| type | ENUM('text','image','product','order') | 消息类型 |
| content | TEXT | 消息内容 |
| read_at | DATETIME | 已读时间 |
| created_at | DATETIME | 创建时间 |

### 7.3 blacklist 黑名单表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | ID |
| user_id | INT FK→users | 拉黑者ID |
| blocked_user_id | INT FK→users | 被拉黑用户ID |
| created_at | DATETIME | 创建时间 |

### 7.4 quick_replies 快捷回复表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | ID |
| user_id | INT FK→users | 用户ID |
| content | VARCHAR(255) | 快捷回复内容 |
| sort | INT | 排序 |
| created_at | DATETIME | 创建时间 |

---

## 八、求购社区 — `08-求购社区表.sql`

### 8.1 want_buys 求购贴表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 求购贴ID |
| user_id | INT FK→users | 发布者ID |
| name | VARCHAR(100) | 商品名称 |
| category_id | INT FK→categories | 分类ID |
| description | TEXT | 商品描述 |
| tags | JSON | 标签数组 |
| budget_min | DECIMAL(10,2) | 预算最低价 |
| budget_max | DECIMAL(10,2) | 预算最高价 |
| quantity | INT | 求购数量，默认1 |
| images | JSON | 图片数组 |
| status | ENUM('active','found','closed','expired') | 状态 |
| valid_days | INT | 有效期(7/15/30天)，默认30 |
| expire_time | DATETIME | 过期时间 |
| view_count | INT | 浏览次数 |
| comment_count | INT | 评论次数 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 8.2 want_buy_comments 求购评论表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 评论ID |
| want_buy_id | INT FK→want_buys | 求购贴ID |
| user_id | INT FK→users | 评论人ID |
| parent_id | INT FK→want_buy_comments | 父评论ID(回复) |
| content | TEXT | 评论内容 |
| like_count | INT | 点赞数 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 8.3 want_buy_comment_likes 求购评论点赞表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | ID |
| comment_id | INT FK→want_buy_comments | 评论ID |
| user_id | INT FK→users | 用户ID |
| created_at | DATETIME | 创建时间 |

---

## 九、通知、Banner、举报 — `09-通知Banner举报表.sql`

### 9.1 notifications 通知表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 通知ID |
| user_id | INT FK→users | 接收用户ID |
| type | ENUM('system','product','order','chat','review','interaction') | 通知类型 |
| title | VARCHAR(100) | 通知标题 |
| content | TEXT | 通知内容 |
| related_id | BIGINT | 关联ID |
| related_type | ENUM('order','product','review','user','want_buy') | 关联类型 |
| is_read | TINYINT | 是否已读，默认0 |
| created_at | DATETIME | 创建时间 |

### 9.2 banners Banner表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | Banner ID |
| title | VARCHAR(100) | 标题 |
| image | VARCHAR(500) | 图片URL |
| link_type | ENUM('product','category','url','none') | 链接类型 |
| link_url | VARCHAR(500) | 链接地址 |
| sort | INT | 排序 |
| is_active | TINYINT | 是否启用，默认1 |
| start_time | DATETIME | 开始展示时间 |
| end_time | DATETIME | 结束展示时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 9.3 reports 举报表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 举报ID |
| reporter_id | INT FK→users | 举报人ID |
| target_type | ENUM('product','user','review','want_buy','comment') | 举报对象类型 |
| target_id | BIGINT | 举报对象ID |
| reason | ENUM('fraud','prohibited','inappropriate','spam','other') | 举报原因 |
| detail | TEXT | 详细描述 |
| images | JSON | 证据图片数组 |
| status | ENUM('pending','dismissed','warning','banned','resolved') | 处理状态 |
| handler_id | INT FK→users | 处理人ID |
| handler_note | TEXT | 处理备注 |
| handled_at | DATETIME | 处理时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

## 十、搜索、验证码 — `10-搜索验证码表.sql`

### 10.1 search_history 搜索历史表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | ID |
| user_id | INT | 用户ID(游客为NULL) |
| keyword | VARCHAR(100) | 搜索关键词 |
| created_at | DATETIME | 搜索时间 |

### 10.2 hot_searches 热搜表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | ID |
| keyword | VARCHAR(100) UNIQUE | 搜索关键词 |
| search_count | INT | 搜索次数，默认1 |
| updated_at | DATETIME | 更新时间 |

### 10.3 email_codes 邮箱验证码表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | ID |
| email | VARCHAR(255) | 邮箱 |
| code | VARCHAR(10) | 验证码 |
| type | ENUM('register','login','reset_password','change_email') | 类型 |
| expires_at | DATETIME | 过期时间 |
| is_used | TINYINT | 是否已使用，默认0 |
| created_at | DATETIME | 创建时间 |

---

## 十一、AI助手、系统配置、投诉 — `11-AI助手系统配置投诉表.sql`

### 11.1 ai_conversations AI会话表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 会话ID |
| user_id | INT FK→users | 用户ID |
| title | VARCHAR(100) | 会话标题 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 11.2 ai_messages AI消息表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 消息ID |
| conversation_id | INT FK→ai_conversations | 会话ID |
| role | ENUM('user','assistant','system') | 角色 |
| content | TEXT | 消息内容 |
| msg_type | ENUM('text','product_card','order_card','chart','link') | 消息类型 |
| extra_data | JSON | 附加数据(卡片/图表等) |
| created_at | DATETIME | 创建时间 |

### 11.3 system_configs 系统配置表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | ID |
| config_key | VARCHAR(100) UNIQUE | 配置键 |
| config_value | TEXT | 配置值 |
| description | VARCHAR(255) | 说明 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 11.4 complaints 投诉表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AI | 投诉ID |
| order_id | BIGINT FK→orders | 订单ID |
| complainant_id | INT FK→users | 投诉人ID |
| respondent_id | INT FK→users | 被投诉人ID |
| type | ENUM('quality','delivery','payment','attitude','other') | 投诉类型 |
| description | TEXT | 投诉描述 |
| images | JSON | 证据图片数组 |
| status | ENUM('pending','processing','resolved','closed') | 处理状态 |
| handler_id | INT FK→users | 处理人ID |
| handler_note | TEXT | 处理备注 |
| result | TEXT | 处理结果 |
| handled_at | DATETIME | 处理时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

## 外键约束汇总

| 子表 | 字段 | 父表 | 父字段 | 删除策略 |
|------|------|------|--------|----------|
| categories | parent_id | categories | id | RESTRICT |
| refresh_tokens | user_id | users | id | CASCADE |
| products | user_id | users | id | CASCADE |
| products | category_id | categories | id | RESTRICT |
| product_views | user_id | users | id | CASCADE |
| product_views | product_id | products | id | CASCADE |
| favorites | user_id | users | id | CASCADE |
| favorites | product_id | products | id | CASCADE |
| orders | product_id | products | id | RESTRICT |
| orders | buyer_id | users | id | RESTRICT |
| orders | seller_id | users | id | RESTRICT |
| orders | address_id | addresses | id | SET NULL |
| product_locks | product_id | products | id | CASCADE |
| product_locks | order_id | orders | id | CASCADE |
| reviews | order_id | orders | id | CASCADE |
| reviews | reviewer_id | users | id | CASCADE |
| reviews | reviewed_id | users | id | CASCADE |
| conversations | user1_id | users | id | CASCADE |
| conversations | user2_id | users | id | CASCADE |
| messages | conversation_id | conversations | id | CASCADE |
| messages | sender_id | users | id | CASCADE |
| blacklist | user_id | users | id | CASCADE |
| blacklist | blocked_user_id | users | id | CASCADE |
| quick_replies | user_id | users | id | CASCADE |
| want_buys | user_id | users | id | CASCADE |
| want_buys | category_id | categories | id | SET NULL |
| want_buy_comments | want_buy_id | want_buys | id | CASCADE |
| want_buy_comments | user_id | users | id | CASCADE |
| want_buy_comments | parent_id | want_buy_comments | id | CASCADE |
| want_buy_comment_likes | comment_id | want_buy_comments | id | CASCADE |
| want_buy_comment_likes | user_id | users | id | CASCADE |
| addresses | user_id | users | id | CASCADE |
| notifications | user_id | users | id | CASCADE |
| reports | reporter_id | users | id | CASCADE |
| reports | handler_id | users | id | SET NULL |
| ai_conversations | user_id | users | id | CASCADE |
| ai_messages | conversation_id | ai_conversations | id | CASCADE |
| complaints | order_id | orders | id | CASCADE |
| complaints | complainant_id | users | id | CASCADE |
| complaints | respondent_id | users | id | CASCADE |
| complaints | handler_id | users | id | SET NULL |
