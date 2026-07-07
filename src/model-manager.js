/**
 * Model Manager - إدارة النماذج مع Fallback تلقائي
 * يحاول النموذج الأول، إذا فشل ينتقل للبديل
 */

const MODELS = [
  { id: 'poolside/laguna-xs-2.1:free', name: 'Laguna XS 2.1', provider: 'Poolside', priority: 1 },
  { id: 'meta-llama/llama-3.3-8b-instruct:free', name: 'Llama 3.3 8B', provider: 'Meta', priority: 2 },
  { id: 'google/gemma-3-1b-it:free', name: 'Gemma 3 1B', provider: 'Google', priority: 3 },
  { id: 'microsoft/phi-4-mini-instruct:free', name: 'Phi 4 Mini', provider: 'Microsoft', priority: 4 },
  { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1', provider: 'DeepSeek', priority: 5 },
  { id: 'qwen/qwen3-8b:free', name: 'Qwen3 8B', provider: 'Qwen', priority: 6 },
];

// إحصائيات الأداء لكل نموذج
const modelStats = new Map();

/**
 * تهيئة إحصائيات النماذج
 */
function initStats() {
  MODELS.forEach(m => {
    modelStats.set(m.id, {
      successes: 0,
      failures: 0,
      avgLatency: 0,
      lastUsed: null,
      lastError: null,
      disabled: false,
      disabledUntil: null
    });
  });
}

initStats();

/**
 * تحديث إحصائيات النموذج
 */
function updateStats(modelId, success, latencyMs, error = null) {
  const stats = modelStats.get(modelId);
  if (!stats) return;

  if (success) {
    stats.successes++;
    stats.avgLatency = (stats.avgLatency * (stats.successes - 1) + latencyMs) / stats.successes;
    stats.disabled = false;
    stats.disabledUntil = null;
  } else {
    stats.failures++;
    stats.lastError = error;
    
    // تعطيل النموذج مؤقتاً إذا فشل 3 مرات متتالية
    if (stats.failures >= 3) {
      stats.disabled = true;
      stats.disabledUntil = Date.now() + 300000; // 5 دقائق
    }
  }
  stats.lastUsed = Date.now();
}

/**
 * الحصول على النموذج التالي المتاح
 * @param {string|null} preferredModel - النموذج المفضل (اختياري)
 * @returns {{ model: object, fallbackUsed: boolean }}
 */
function getNextModel(preferredModel = null) {
  const now = Date.now();
  
  // ترتيب النماذج حسب الأولوية
  const sorted = [...MODELS].sort((a, b) => a.priority - b.priority);
  
  // إذا تم تحديد نموذج مفضل، نبدأ به
  if (preferredModel) {
    const preferred = sorted.find(m => m.id === preferredModel);
    if (preferred) {
      const stats = modelStats.get(preferred.id);
      if (!stats.disabled || (stats.disabledUntil && now > stats.disabledUntil)) {
        stats.disabled = false;
        return { model: preferred, fallbackUsed: false };
      }
    }
  }
  
  // البحث عن أول نموذج متاح
  for (const model of sorted) {
    const stats = modelStats.get(model.id);
    if (!stats.disabled || (stats.disabledUntil && now > stats.disabledUntil)) {
      stats.disabled = false;
      return { model, fallbackUsed: model.id !== preferredModel };
    }
  }
  
  // إذا كانت جميع النماذج معطلة، نستخدم الأول
  return { model: sorted[0], fallbackUsed: true };
}

/**
 * الحصول على إحصائيات جميع النماذج
 */
function getAllStats() {
  const result = [];
  for (const [id, stats] of modelStats.entries()) {
    const model = MODELS.find(m => m.id === id);
    result.push({
      ...model,
      ...stats,
      successRate: stats.successes + stats.failures > 0 
        ? ((stats.successes / (stats.successes + stats.failures)) * 100).toFixed(1) + '%'
        : 'N/A'
    });
  }
  return result;
}

/**
 * إعادة تعيين إحصائيات نموذج معين
 */
function resetStats(modelId) {
  const stats = modelStats.get(modelId);
  if (stats) {
    stats.successes = 0;
    stats.failures = 0;
    stats.avgLatency = 0;
    stats.disabled = false;
    stats.disabledUntil = null;
    stats.lastError = null;
  }
}

/**
 * إعادة تعيين جميع الإحصائيات
 */
function resetAllStats() {
  for (const stats of modelStats.values()) {
    stats.successes = 0;
    stats.failures = 0;
    stats.avgLatency = 0;
    stats.disabled = false;
    stats.disabledUntil = null;
    stats.lastError = null;
  }
}

module.exports = {
  MODELS,
  getNextModel,
  updateStats,
  getAllStats,
  resetStats,
  resetAllStats
};
