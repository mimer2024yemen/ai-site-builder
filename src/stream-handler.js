/**
 * Stream Handler - معالجة Server-Sent Events للبث المباشر
 * يوفر تدفق حقيقي للردود من API
 */

/**
 * إعداد SSE headers
 */
function setupSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Accel-Buffering': 'no' // لمنع buffering في Nginx
  });
  res.flushHeaders();
}

/**
 * إرسال حدث SSE
 */
function sendEvent(res, event, data) {
  if (res.destroyed) return false;
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * إرسال حدث خطأ
 */
function sendError(res, message, details = null) {
  return sendEvent(res, 'error', { message, details, timestamp: new Date().toISOString() });
}

/**
 * إرسال حدث اكتمال
 */
function sendDone(res, metadata = {}) {
  return sendEvent(res, 'done', { ...metadata, timestamp: new Date().toISOString() });
}

/**
 * إرسال حدث بداية
 */
function sendStart(res, model) {
  return sendEvent(res, 'start', { model, timestamp: new Date().toISOString() });
}

/**
 * معالجة Stream من OpenRouter API
 * @param {Response} apiResponse - استجابة fetch من OpenRouter
 * @param {Response} res - استجابة HTTP للعميل
 * @returns {Promise<string>} - النص الكامل
 */
async function handleStream(apiResponse, res) {
  const reader = apiResponse.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // معالجة SSE chunks
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // الاحتفاظ بالسطر الأخير غير المكتمل

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              fullText += content;
              // إرسال كل مقطع فوراً
              sendEvent(res, 'chunk', { content, fullText });
            }
          } catch (e) {
            // تجاهل الأخطاء في تحليل JSON
          }
        }
      }
    }
  } catch (error) {
    console.error('Stream error:', error.message);
    sendError(res, 'خطأ في تدفق البيانات', error.message);
  }

  return fullText;
}

/**
 * معالجة استجابة عادية (غير Stream)
 */
async function handleNonStream(apiResponse, res) {
  const data = await apiResponse.json();
  
  if (data.error) {
    sendError(res, 'خطأ من النموذج', data.error.message || JSON.stringify(data.error));
    return null;
  }

  const content = data.choices?.[0]?.message?.content || '';
  
  // إرسال المحتوى ك chunk واحد
  if (content) {
    sendEvent(res, 'chunk', { content, fullText: content });
  }

  return content;
}

module.exports = {
  setupSSE,
  sendEvent,
  sendError,
  sendDone,
  sendStart,
  handleStream,
  handleNonStream
};
