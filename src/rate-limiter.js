/**
 * Rate Limiter - حماية API من الاستخدام المفرط
 * يحمي من الهجمات ويحدد عدد الطلبات لكل IP
 */

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // نافذة زمنية (دقيقة افتراضياً)
    this.maxRequests = options.maxRequests || 30; // أقصى عدد طلبات
    this.cleanupInterval = options.cleanupInterval || 300000; // تنظيف كل 5 دقائق
    this.store = new Map();
    this.message = options.message || 'تم تجاوز الحد المسموح. حاول مرة أخرى لاحقاً.';
    
    // تنظيف تلقائي للعناصر القديمة
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * التحقق من طلب IP معين
   * @param {string} ip - عنوان IP
   * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
   */
  check(ip) {
    const now = Date.now();
    let record = this.store.get(ip);

    // إنشاء سجل جديد إذا لم يكن موجوداً
    if (!record) {
      record = { count: 0, resetAt: now + this.windowMs };
      this.store.set(ip, record);
    }

    // إعادة تعيين العداد إذا انتهت النافذة
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + this.windowMs;
    }

    // التحقق من الحد
    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetMs: record.resetAt - now,
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      };
    }

    // زيادة العداد
    record.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetMs: record.resetAt - now
    };
  }

  /**
   * تنظيف السجلات القديمة
   */
  cleanup() {
    const now = Date.now();
    for (const [ip, record] of this.store.entries()) {
      if (now > record.resetAt + this.windowMs) {
        this.store.delete(ip);
      }
    }
  }

  /**
   * الحصول على معلومات IP
   */
  getInfo(ip) {
    const record = this.store.get(ip);
    if (!record) return null;
    return {
      count: record.count,
      remaining: Math.max(0, this.maxRequests - record.count),
      resetAt: new Date(record.resetAt).toISOString()
    };
  }

  /**
   * تدمير المُنظف
   */
  destroy() {
    clearInterval(this.cleanupTimer);
    this.store.clear();
  }
}

module.exports = RateLimiter;
