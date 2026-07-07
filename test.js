/**
 * اختبارات شاملة لمشروع AI Site Builder Pro v3.0
 * المرحلة 1: Stream + Rate Limiting + Multi-Model Fallback
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let passed = 0;
let failed = 0;

/**
 * إرسال طلب HTTP
 */
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

/**
 * اختبار SSE Stream
 */
function testStream(message) {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL('/api/chat', BASE_URL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    }, (res) => {
      let data = '';
      let chunks = [];
      let events = [];
      let currentEvent = '';
      
      res.on('data', chunk => {
        data += chunk.toString();
        // تحليل SSE events
        const lines = data.split('\n');
        data = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            events.push(currentEvent);
          }
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              parsed._event = currentEvent;
              chunks.push(parsed);
            } catch (e) {}
          }
        }
      });
      
      res.on('end', () => {
        // معالجة أي بيانات متبقية في buffer
        if (data.trim()) {
          const lines = data.split('\n');
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
              if (!events.includes(currentEvent)) events.push(currentEvent);
            }
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                parsed._event = currentEvent;
                chunks.push(parsed);
              } catch (e) {}
            }
          }
        }
        
        const lastChunk = chunks.filter(c => c._event === 'chunk').pop();
        resolve({ status: res.statusCode, chunks, events, lastChunk });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    
    req.write(JSON.stringify({ message, history: [], stream: true }));
    req.end();
  });
}

/**
 * تشغيل اختبار واحد
 */
async function runTest(name, testFn) {
  try {
    const result = await testFn();
    if (result) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

/**
 * تشغيل جميع الاختبارات
 */
async function runAllTests() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     اختبارات AI Site Builder Pro v3.0 - المرحلة 1      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // ─── 1. Health Check ──────────────────────────────
  console.log('📋 اختبارات API الأساسية:');
  
  await runTest('Health Check', async () => {
    const res = await request('/api/health');
    return res.status === 200 && res.data.status === 'ok' && res.data.version === '3.0.0';
  });

  await runTest('Models API', async () => {
    const res = await request('/api/models');
    return res.status === 200 && res.data.models.length === 6;
  });

  await runTest('Model Stats API', async () => {
    const res = await request('/api/models/stats');
    return res.status === 200 && Array.isArray(res.data.stats);
  });

  await runTest('Rate Limit Info', async () => {
    const res = await request('/api/rate-limit');
    return res.status === 200 && res.data.limit === 30;
  });

  await runTest('HTML Page', async () => {
    const res = await request('/');
    return res.status === 200 && typeof res.data === 'string' && res.data.includes('AI Site Builder');
  });

  await runTest('404 Page', async () => {
    const res = await request('/api/nonexistent');
    return res.status === 404;
  });

  console.log('');

  // ─── 2. Error Handling ────────────────────────────
  console.log('🛡️ اختبارات معالجة الأخطاء:');
  
  await runTest('Invalid JSON', async () => {
    const res = await request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });
    return res.status === 400 && res.data.error;
  });

  await runTest('Empty Message', async () => {
    const res = await request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { message: '' }
    });
    return res.status === 400 && res.data.error;
  });

  await runTest('No Message', async () => {
    const res = await request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { history: [] }
    });
    return res.status === 400 && res.data.error;
  });

  console.log('');

  // ─── 3. SSE Stream ───────────────────────────────
  console.log('📡 اختبارات Stream (SSE):');
  
  await runTest('SSE Response Headers', async () => {
    const result = await testStream('قول مرحبا فقط');
    return result.status === 200;
  });

  await runTest('SSE Chunk Events', async () => {
    const result = await testStream('اكتب كلمة نجاح');
    return result.events.includes('chunk') && result.chunks.length > 0;
  });

  await runTest('SSE Done Event', async () => {
    const result = await testStream('اكتب كلمة اختبار');
    return result.events.includes('done');
  });

  await runTest('SSE Start Event', async () => {
    const result = await testStream('مرحبا');
    return result.events.includes('start');
  });

  await runTest('SSE Content Received', async () => {
    const result = await testStream('اكتب كلمة برمجة');
    return result.lastChunk && result.lastChunk.fullText && result.lastChunk.fullText.length > 0;
  });

  console.log('');

  // ─── 4. Code Generation ──────────────────────────
  console.log('💻 اختبارات توليد الأكواد:');
  
  await runTest('HTML Generation', async () => {
    const result = await testStream('اكتب صفحة HTML بسيطة');
    return result.lastChunk && result.lastChunk.fullText.includes('<!DOCTYPE');
  });

  await runTest('Code Block Format', async () => {
    const result = await testStream('اكتب دالة JavaScript');
    return result.lastChunk && result.lastChunk.fullText.includes('```');
  });

  console.log('');

  // ─── 5. Multi-Model Fallback ──────────────────────
  console.log('🤖 اختبارات Multi-Model:');
  
  await runTest('Default Model', async () => {
    const result = await testStream('مرحبا');
    const doneChunk = result.chunks.find(c => c._event === 'done');
    return doneChunk && doneChunk.model;
  });

  await runTest('Model Stats Updated', async () => {
    const res = await request('/api/models/stats');
    const laguna = res.data.stats.find(s => s.id.includes('laguna'));
    return laguna && laguna.successes > 0;
  });

  console.log('');

  // ─── Results ──────────────────────────────────────
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log(`║  النتائج: ${passed} نجح | ${failed} فشل | ${passed + failed} إجمالي                ║`);
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  if (failed === 0) {
    console.log('🎉 جميع الاختبارات نجحت!');
  } else {
    console.log(`⚠️ ${failed} اختبارات فشلت.`);
  }
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

// تشغيل الاختبارات
runAllTests().catch(err => {
  console.error('❌ خطأ في تشغيل الاختبارات:', err);
  process.exit(1);
});
