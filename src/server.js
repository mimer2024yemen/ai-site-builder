/**
 * مُنشئ المواقع - AI Site Builder Pro v3.0
 * المرحلة 1: Stream حقيقي + Rate Limiting + Multi-Model Fallback
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const RateLimiter = require('./rate-limiter');
const { MODELS, getNextModel, updateStats, getAllStats, resetAllStats } = require('./model-manager');
const { setupSSE, sendEvent, sendError, sendDone, sendStart, handleStream, handleNonStream } = require('./stream-handler');
const { analyzeWebsite, fetchURL } = require('./web-fetcher');

// ─── Load .env ──────────────────────────────────────────
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  envContent.split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) { const k = m[1].trim(), v = m[2].trim(); if (k && !process.env[k]) process.env[k] = v; }
  });
} catch (e) { console.warn('.env not loaded'); }

const PORT = process.env.PORT || 3000;

// ─── Rate Limiter ───────────────────────────────────────
const limiter = new RateLimiter({
  windowMs: 60000,      // نافذة دقيقة واحدة
  maxRequests: 30,       // 30 طلب في الدقيقة
  message: 'تم تجاوز الحد المسموح (30 طلب/دقيقة). حاول لاحقاً.'
});

// ─── System Prompt ──────────────────────────────────────
const SYSTEM_PROMPT = `أنت "مُنشئ المواقع" - مهندس Full-Stack وهندسة عكسيه محترف من الدرجة الأولى.

شخصيتك:
- مهندس Full-Stack محترف بخبرة 15+ سنة
- متخصص في الهندسة العكسية للمواقع (Reverse Engineering)
- متخصص في التصميمات البصرية عالية الجودة
- تتحدث بالعربية مع المصطلحات التقنية بالإنجليزية
- لا تقبل بالحلول البدائية - دائماً تقدم الأفضل
- تتذكر كل ما تم مناقشته في المحادثة
- تتجنب الأخطاء السابقة ولا تكررها

═══════════════════════════════════════════════════════════
🔧 قواعد الهندسة العكسية (Reverse Engineering):
═══════════════════════════════════════════════════════════

عندما يرسل لك المستخدم رابط URL لموقع:

1. ادخل للموقع كمهندس هندسة عكسية:
   - حلل HTML structure بدقة
   - استخرج كل CSS classes و IDs
   - استخرج كل JavaScript functions
   - حلل التصميم (colors, fonts, spacing, layout)
   - حلل الاستجابة (responsive breakpoints)
   - حلل التفاعلات (hover, click, scroll)

2. انسخ التصميم بدقة 100%:
   - نفس الألوان بالضبط (hex, rgb)
   - نفس الخطوط بالضبط (family, size, weight)
   - نفس المسافات بالضبط (padding, margin, gap)
   - نفس التخطيط بالضبط (grid, flex, positions)
   - نفس الظلال بالضبط (box-shadow, text-shadow)
   - نفس التأثيرات بالضبط (transitions, animations)
   - نفس الصور والرموز بالضبط

3. ابني كل الملفات:
   - index.html (الملف الرئيسي)
   - style.css (أنماط منفصلة)
   - script.js (جافاسكربت منفصل)
   - أي ملفات أخرى مطلوبة

4. لكل ملف:
   - اكتبه في code block منفصل مع اسم الملف
   - اكتب مسار الملف بوضوح
   - الكود يجب أن يعمل مباشرة

═══════════════════════════════════════════════════════════
📋 قواعد عرض الملفات:
═══════════════════════════════════════════════════════════

عند بناء أي مشروع:

1. اعرض الملفات كقائمة في البداية:
   📁 هيكل المشروع:
   ├── index.html
   ├── style.css
   ├── script.js
   └── assets/

2. لكل ملف، استخدم format خاص:
   📄 **index.html**
   [code block]

3. في النهاية:
   ✅ تم بناء المشروع بنجاح!
   📁 الملفات: X ملفات
   📊 الحجم: X KB

═══════════════════════════════════════════════════════════
⚠️ قواعد إلزامية للكود (لا تخرقها أبداً):
═══════════════════════════════════════════════════════════

1. التصميمات البصرية:
   - استخدم CSS Gradients المتقدمة (linear, radial, conic)
   - أضف Box Shadows متعددة الطبقات للعمق
   - استخدم Text Shadows للتأثيرات الواقعية
   - أضف backdrop-filter للزجاج (glass morphism)
   - استخدم clip-path للأشكال المعقدة
   - أضف animations سلسة (60fps)
   - استخدم CSS Variables للألوان

2. الرسوميات (Graphics):
   - استخدم SVG للرسوميات المتجهة الدقيقة
   - استخدم Canvas API للرسوميات المعقدة
   - أضف تدرجات لونية واقعية (metallic, glossy)
   - استخدم filters (blur, brightness, contrast)
   - أضف reflections و highlights واقعية

3. التفاعلية:
   - استخدم requestAnimationFrame للحركات السلسة
   - أضف تأثيرات hover و active احترافية
   - استخدم CSS transitions cubic-bezier
   - استخدم touch events للأجهزة المحمولة

4. الجودة:
   - الكود يعمل مباشرة بدون مكتبات خارجية
   - استخدم Google Fonts للخطوط الاحترافية
   - اجعل التصميم متجاوباً (responsive)
   - استخدم CSS Grid و Flexbox

═══════════════════════════════════════════════════════════
🧠 قواعد الذاكرة والسياق:
═══════════════════════════════════════════════════════════

1. تذكر كل ما تم مناقشته:
   - ما تم بناؤه سابقاً
   - الأخطاء التي وقعت فيها
   - التعديلات التي طلبها المستخدم
   - التفضيلات الخاصة بالمستخدم

2. تجنب:
   - تكرار نفس الأخطاء
   - بناء شيء تم بناؤه سابقاً
   - طرح أسئلة تم الإجابة عليها
   - نسيان السياق السابق

3. استمرارية:
   - اذكر ما تم إنجازه سابقاً
   - اقترح تحسينات بناءً على العمل السابق
   - اربط الطلبات الجديدة بالقديمة

═══════════════════════════════════════════════════════════

عند طلب تصميم:
1. حلل المتطلبات بدقة
2. صمم بمستوى احترافي عالي
3. اكتب الكود الكامل مع فصل الملفات
4. الكود يعمل مباشرة في المتصفح
5. لا تكتب كود بدائي - دائماً الأفضل

كن مبدعاً واحترافياً! لا تقبل بالحلول البدائية!`;

// ─── Helper Functions ───────────────────────────────────

/**
 * الحصول على IP الحقيقي للعميل
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         'unknown';
}

/**
 * قراءة HTML template
 */
function getHTML() {
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  } catch (e) {
    // Fallback: قراءة من نفس المجلد
    try {
      return fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    } catch (e2) {
      return '<h1>Error: index.html not found</h1>';
    }
  }
}

// ─── Server ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const clientIP = getClientIP(req);
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ─── API: Chat (مع Stream) ─────────────────────────
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    // Rate Limiting
    const rateCheck = limiter.check(clientIP);
    if (!rateCheck.allowed) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'تم تجاوز الحد المسموح',
        details: limiter.message,
        retryAfter: rateCheck.retryAfter
      }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      // Parse JSON
      let parsed;
      try { parsed = JSON.parse(body); } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'طلب غير صالح', details: 'JSON غير صحيح' }));
        return;
      }

      const { message, history, model, stream } = parsed;

      if (!message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'الرسالة مطلوبة' }));
        return;
      }

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'مفتاح API غير مُعرَّف' }));
        return;
      }

      // اختيار النموذج مع Fallback
      const { model: selectedModel, fallbackUsed } = getNextModel(model);
      
      // بناء الرسائل
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(history || []).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ];

      // إذا كان Stream مطلوباً
      if (stream !== false) {
        // إعداد SSE
        setupSSE(res);
        sendStart(res, selectedModel.id);

        const startTime = Date.now();
        let success = false;
        let lastError = null;

        // محاولة النموذج المحدد
        try {
          const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + apiKey,
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'AI Site Builder'
            },
            body: JSON.stringify({
              model: selectedModel.id,
              messages,
              temperature: 0.7,
              max_tokens: 4096,
              stream: true
            })
          });

          if (!apiRes.ok) {
            const errorData = await apiRes.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${apiRes.status}`);
          }

          const fullText = await handleStream(apiRes, res);
          success = true;
          
          if (fullText) {
            sendDone(res, { model: selectedModel.id, fallbackUsed, length: fullText.length });
          }
        } catch (error) {
          lastError = error.message;
          console.error(`Model ${selectedModel.id} failed:`, error.message);
          
          // محاولة النموذج البديل
          const { model: fallbackModel } = getNextModel(null);
          if (fallbackModel.id !== selectedModel.id) {
            sendEvent(res, 'fallback', { from: selectedModel.id, to: fallbackModel.id });
            
            try {
              const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + apiKey,
                  'HTTP-Referer': 'http://localhost:3000',
                  'X-Title': 'AI Site Builder'
                },
                body: JSON.stringify({
                  model: fallbackModel.id,
                  messages,
                  temperature: 0.7,
                  max_tokens: 4096,
                  stream: true
                })
              });

              if (!apiRes.ok) {
                const errorData = await apiRes.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${apiRes.status}`);
              }

              const fullText = await handleStream(apiRes, res);
              success = true;
              
              if (fullText) {
                sendDone(res, { model: fallbackModel.id, fallbackUsed: true, length: fullText.length });
              }
            } catch (fallbackError) {
              lastError = fallbackError.message;
              console.error(`Fallback model ${fallbackModel.id} failed:`, fallbackError.message);
            }
          }
        }

        // تحديث الإحصائيات
        const latency = Date.now() - startTime;
        updateStats(selectedModel.id, success, latency, lastError);
        
        if (!success) {
          sendError(res, 'فشل في جميع النماذج', lastError);
        }
        
        res.end();
        return;
      }

      // Non-stream response (fallback)
      res.writeHead(200, { 'Content-Type': 'application/json' });
      
      try {
        const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'AI Site Builder'
          },
          body: JSON.stringify({
            model: selectedModel.id,
            messages,
            temperature: 0.7,
            max_tokens: 4096,
            stream: false
          })
        });

        const data = await apiRes.json();
        
        if (data.error) {
          res.end(JSON.stringify({ error: 'خطأ من النموذج', details: data.error.message }));
          return;
        }

        const reply = data.choices?.[0]?.message?.content || 'لم يتم الحصول على رد';
        res.end(JSON.stringify({ reply, model: data.model, fallbackUsed }));
      } catch (error) {
        res.end(JSON.stringify({ error: 'خطأ داخلي', details: error.message }));
      }
    });
    return;
  }

  // ─── API: Models ───────────────────────────────────
  if (url.pathname === '/api/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ models: MODELS }));
    return;
  }

  // ─── API: Model Stats ──────────────────────────────
  if (url.pathname === '/api/models/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stats: getAllStats() }));
    return;
  }

  // ─── API: Health ───────────────────────────────────
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      rateLimiter: {
        windowMs: limiter.windowMs,
        maxRequests: limiter.maxRequests,
        activeIPs: limiter.store.size
      }
    }));
    return;
  }

  // ─── API: Rate Limit Info ──────────────────────────
  if (url.pathname === '/api/rate-limit') {
    const info = limiter.getInfo(clientIP);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ip: clientIP,
      limit: limiter.maxRequests,
      windowMs: limiter.windowMs,
      current: info || { count: 0, remaining: limiter.maxRequests }
    }));
    return;
  }

  // ─── API: Fetch URL (جلب وتحليل المواقع) ─────────
  if (url.pathname === '/api/fetch-url' && req.method === 'POST') {
    const rateCheck = limiter.check(clientIP);
    if (!rateCheck.allowed) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'تم تجاوز الحد المسموح' }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        let parsed;
        try { parsed = JSON.parse(body); } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'JSON غير صحيح' }));
          return;
        }

        const { url: targetUrl } = parsed;
        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'الـ URL مطلوب' }));
          return;
        }

        // تحليل الموقع
        const result = await analyzeWebsite(targetUrl);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'خطأ في جلب الموقع', details: error.message }));
      }
    });
    return;
  }

  // ─── HTML Pages ────────────────────────────────────
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHTML());
    return;
  }

  // ─── Static Files ──────────────────────────────────
  const staticExtensions = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const ext = path.extname(url.pathname);
  if (staticExtensions[ext]) {
    const filePath = path.join(__dirname, '..', 'public', url.pathname);
    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': staticExtensions[ext] });
      res.end(content);
      return;
    } catch (e) {
      // File not found, continue to 404
    }
  }

  // ─── 404 ───────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'غير موجود', path: url.pathname }));
});

// ─── Start Server ───────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ✨ مُنشئ المواقع - AI Site Builder Pro v3.0');
  console.log('  🚀 http://localhost:' + PORT);
  console.log('  🤖 ' + MODELS.length + ' نماذج مع Fallback تلقائي');
  console.log('  📡 Stream حقيقي (SSE)');
  console.log('  🛡️ Rate Limiting: ' + limiter.maxRequests + ' طلب/' + (limiter.windowMs/1000) + 'ث');
  console.log('');
});

// ─── Graceful Shutdown ──────────────────────────────────
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  limiter.destroy();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  limiter.destroy();
  server.close(() => process.exit(0));
});
