import { prisma } from '../config/prisma';
import { NotificationService } from '../modules/notification/notification.service';

export type CreditReason =
  | 'order_completed'     // 交易完成 +3
  | 'good_review'         // 好评 +2
  | 'good_review_with_img' // 好评有图 +3 (含基础+2)
  | 'cancel_after_pay'    // 付款后取消 -1
  | 'bad_review'          // 差评 -5
  | 'order_refunded'      // 退货退款 -5
  | 'report_warning'      // 举报警告 -10
  | 'product_banned'      // 商品封禁 -15
  | 'report_banned'       // 举报封禁 -20

const CREDIT_DELTA: Record<CreditReason, number> = {
  order_completed: 3,
  good_review: 2,
  good_review_with_img: 3,
  cancel_after_pay: -1,
  bad_review: -5,
  order_refunded: -5,
  report_warning: -10,
  product_banned: -15,
  report_banned: -20,
}

const CREDIT_LABELS: Record<CreditReason, string> = {
  order_completed: '交易完成',
  good_review: '获得好评',
  good_review_with_img: '获得好评(有图)',
  cancel_after_pay: '付款后取消订单',
  bad_review: '获得差评',
  order_refunded: '退货退款',
  report_warning: '被举报警告',
  product_banned: '商品被封禁',
  report_banned: '被举报封禁',
}


export async function adjustCredit(userId: number, reason: CreditReason, relatedId?: number): Promise<void> {
  const delta = CREDIT_DELTA[reason]
  if (delta === 0) return

  // 原子操作：GREATEST/LEAST 保证分数在 [0, 150] 范围内，避免并发读后写丢失更新
  const [updated] = await prisma.$queryRaw<Array<{ creditScore: number }>>`
    UPDATE users
    SET credit_score = GREATEST(0, LEAST(150, credit_score + ${delta}))
    WHERE id = ${userId}
    RETURNING credit_score
  `
  if (!updated) return

  // 扣分时通知用户
  if (delta < 0) {
    const label = CREDIT_LABELS[reason]
    await NotificationService.create({
      userId,
      type: 'system',
      title: '信用分变动',
      content: `您的信用分因「${label}」被扣除 ${Math.abs(delta)} 分，当前信用分：${updated.creditScore}`,
      relatedId,
      relatedType: 'user',
    })
  }
}