import { getOssUrl } from './oss'

export interface ShareProductData {
  id: string
  name: string
  currentPrice: number
  images?: string[]
  user?: { username?: string }
}

export function getShareUrl(productId: string): string {
  return `${window.location.origin}/products/${productId}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fallback below
    }
  }
  // fallback for insecure contexts
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export async function shareProduct(product: ShareProductData): Promise<boolean> {
  if (!navigator.share) return false

  const url = getShareUrl(product.id)
  const title = `${product.name} - 转转校园`
  const text = `${product.name} ¥${product.currentPrice}` + (product.user?.username ? ` | 卖家: ${product.user.username}` : '')

  try {
    await navigator.share({ title, text, url })
    return true
  } catch {
    // user cancelled or share failed
    return false
  }
}

export function getWeiboShareUrl(product: ShareProductData): string {
  const url = getShareUrl(product.id)
  const title = `【转转校园】${product.name} ¥${product.currentPrice}`
  const pic = product.images?.[0] ? getOssUrl(product.images[0]) : ''
  const params = new URLSearchParams({
    title,
    url,
    ...(pic && { pic }),
  })
  return `https://service.weibo.com/share/share.php?${params.toString()}`
}
