const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Load .env ──────────────────────────────────────────
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envContent.split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) { const k = m[1].trim(), v = m[2].trim(); if (k && !process.env[k]) process.env[k] = v; }
  });
} catch (e) { console.warn('.env not loaded'); }

const PORT = 3000;

// ─── System Prompt ──────────────────────────────────────
const SYSTEM_PROMPT = `أنت "مُنشئ المواقع" - وكيل ذكاء اصطناعي متخصص في إنشاء المواقع والتطبيقات.

شخصيتك:
- خبير تقني محترف ومتحمس
- تتحدث بالعربية مع المصطلحات التقنية بالإنجليزية
- تقدم شروحات واضحة ومفصلة
- تقترح تحسينات دائماً

مهامك:
- إنشاء صفحات HTML/CSS/JavaScript كاملة
- بناء مواقع React و Next.js
- تحليل وإصلاح الأخطاء البرمجية
- كتابة أكواد احترافية نظيفة
- شرح التعديلات بوضوح

عند إنشاء موقع:
1. حلل المتطلبات
2. اقترح الهيكل
3. اكتب الكود الكامل في code block واحد بلغة html
4. اجعله متجاوباً (responsive)
5. استخدم أفضل الممارسات
6. أضف تأثيرات بصرية جذابة
7. الكود يجب أن يعمل مباشرة في المتصفح

قواعد:
- استخدم markdown code blocks مع تحديد اللغة
- اكتب تعليقات توضيحية بالعربية في الكود
- قسّم الكود الطويل لأجزاء مفهومة
- اشرح كل جزء بعد تقديمه

كن مبدعاً واحترافياً!`;

// ─── Models ─────────────────────────────────────────────
const MODELS = [
  { id: 'poolside/laguna-xs-2.1:free', name: 'Laguna XS 2.1', provider: 'Poolside' },
  { id: 'meta-llama/llama-3.3-8b-instruct:free', name: 'Llama 3.3 8B', provider: 'Meta' },
  { id: 'google/gemma-3-1b-it:free', name: 'Gemma 3 1B', provider: 'Google' },
  { id: 'microsoft/phi-4-mini-instruct:free', name: 'Phi 4 Mini', provider: 'Microsoft' },
  { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: 'qwen/qwen3-8b:free', name: 'Qwen3 8B', provider: 'Qwen' },
];

// ─── HTML Template ──────────────────────────────────────
function getHTML() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>مُنشئ المواقع | AI Site Builder Pro</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✨</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg:#06080f;--bg2:#0c1018;--bg3:#111827;--bg4:#1a2235;
  --border:rgba(59,130,246,0.1);--border2:rgba(59,130,246,0.25);
  --text:#e2e8f0;--text2:#94a3b8;--text3:#475569;
  --blue:#3b82f6;--purple:#8b5cf6;--pink:#ec4899;
  --green:#22c55e;--red:#ef4444;--orange:#f59e0b;--cyan:#06b6d4;
  --radius:14px;--radius-sm:10px;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden}
body{font-family:'Tajawal',sans-serif;background:var(--bg);color:var(--text);direction:rtl;display:flex}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--blue);border-radius:3px}
.gradient-text{background:linear-gradient(135deg,var(--blue),var(--purple),var(--pink));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

/* ─── Sidebar ─── */
.sidebar{width:280px;background:var(--bg2);border-left:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;z-index:20;transition:transform .3s}
.sidebar-header{padding:14px;border-bottom:1px solid var(--border)}
.sidebar-brand{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.sidebar-logo{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--blue),var(--purple),var(--pink));display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 20px rgba(59,130,246,0.25)}
.sidebar-title{font-size:17px;font-weight:800}
.sidebar-sub{font-size:10px;color:var(--text3)}
.new-chat-btn{width:100%;background:linear-gradient(135deg,var(--blue),var(--purple));border:none;border-radius:var(--radius-sm);padding:10px;color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .2s}
.new-chat-btn:hover{box-shadow:0 0 25px rgba(59,130,246,0.35);transform:scale(1.02)}
.chat-list{flex:1;overflow-y:auto;padding:8px}
.chat-item{padding:10px 12px;border-radius:var(--radius-sm);cursor:pointer;transition:all .2s;margin-bottom:3px;display:flex;align-items:center;gap:8px;position:relative}
.chat-item:hover{background:var(--bg4)}
.chat-item.active{background:rgba(59,130,246,0.08);border:1px solid var(--border)}
.chat-item-icon{font-size:13px;flex-shrink:0}
.chat-item-text{flex:1;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chat-item-time{font-size:10px;color:var(--text3);flex-shrink:0}
.chat-item-del{position:absolute;left:6px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:3px;border-radius:4px;opacity:0;transition:all .2s}
.chat-item:hover .chat-item-del{opacity:1}
.chat-item-del:hover{color:var(--red);background:rgba(239,68,68,0.1)}
.sidebar-footer{padding:12px 14px;border-top:1px solid var(--border)}
.model-select{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:inherit;font-size:11px;cursor:pointer;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:12px center}
.model-select:focus{border-color:var(--border2)}
.model-select option{background:var(--bg2);color:var(--text)}
.sidebar-stats{display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:var(--text3)}

/* ─── Main ─── */
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.topbar{padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:var(--bg2)}
.topbar-r{display:flex;align-items:center;gap:10px}
.topbar-l{display:flex;align-items:center;gap:8px}
.menu-btn{display:none;background:none;border:none;color:var(--text2);cursor:pointer;font-size:20px;padding:4px;border-radius:6px}
.menu-btn:hover{background:var(--bg4)}
.topbar-title{font-size:14px;font-weight:600;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.status{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text2)}
.status-dot{width:7px;height:7px;background:var(--green);border-radius:50%;box-shadow:0 0 6px rgba(34,197,94,0.5);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.topbar-btn{background:none;border:1px solid var(--border);color:var(--text2);cursor:pointer;font-size:11px;padding:5px 10px;border-radius:8px;font-family:inherit;transition:all .2s;display:flex;align-items:center;gap:4px}
.topbar-btn:hover{background:var(--bg4);border-color:var(--border2);color:var(--text)}

/* ─── Chat ─── */
.chat-area{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column}
.chat-container{max-width:820px;margin:0 auto;width:100%}
.welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;text-align:center;animation:fadeIn .6s}
.welcome-icon{width:84px;height:84px;border-radius:24px;background:linear-gradient(135deg,var(--blue),var(--purple),var(--pink));display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:24px;box-shadow:0 0 40px rgba(59,130,246,0.3);animation:glow 3s ease-in-out infinite}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(59,130,246,0.25)}50%{box-shadow:0 0 50px rgba(59,130,246,0.45)}}
.welcome h2{font-size:28px;margin-bottom:8px}
.welcome>p{color:var(--text2);max-width:420px;line-height:1.8;margin-bottom:32px;font-size:14px}
.suggestions{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:520px}
.suggestion{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);text-align:right}
.suggestion:hover{transform:translateY(-3px);box-shadow:0 10px 35px rgba(59,130,246,0.15);border-color:var(--border2)}
.suggestion-icon{width:36px;height:36px;border-radius:10px;background:rgba(59,130,246,0.08);display:flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:16px}
.suggestion h3{font-size:12px;font-weight:700;margin-bottom:3px}
.suggestion p{font-size:10px;color:var(--text2);line-height:1.5}
.msgs{display:flex;flex-direction:column;gap:18px}
.msg{display:flex;gap:10px;animation:slideUp .3s ease-out}
.msg.user{flex-direction:row-reverse}
.msg-av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px}
.msg-av.ai{background:linear-gradient(135deg,var(--blue),var(--purple));box-shadow:0 0 10px rgba(59,130,246,0.2)}
.msg-av.human{background:linear-gradient(135deg,#10b981,#14b8a6)}
.msg-b{max-width:78%;padding:14px 18px;line-height:1.85;font-size:14px;word-wrap:break-word}
.msg-b.user{background:linear-gradient(135deg,#1e40af,#2563eb);border-radius:18px 18px 4px 18px;white-space:pre-wrap;box-shadow:0 4px 15px rgba(30,64,175,0.25)}
.msg-b.ai{background:var(--bg2);border:1px solid var(--border);border-radius:18px 18px 18px 4px}
.typing{display:flex;align-items:center;gap:6px;padding:4px 0}
.typing-dot{width:7px;height:7px;background:var(--blue);border-radius:50%;animation:typingB 1.4s infinite ease-in-out both}
.typing-dot:nth-child(1){animation-delay:-.32s}
.typing-dot:nth-child(2){animation-delay:-.16s}
@keyframes typingB{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1);opacity:1}}

/* ─── Code ─── */
.code-block{background:#0d1117;border:1px solid #21262d;border-radius:10px;margin:12px 0;overflow:hidden;direction:ltr;text-align:left}
.code-header{background:#161b22;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #21262d;font-size:12px;color:#8b949e;font-family:'JetBrains Mono',monospace}
.code-actions{display:flex;gap:6px}
.code-btn{background:rgba(255,255,255,.05);border:1px solid #30363d;color:#8b949e;cursor:pointer;font-size:11px;padding:3px 10px;border-radius:6px;transition:all .2s;font-family:'Tajawal',sans-serif;display:flex;align-items:center;gap:4px}
.code-btn:hover{background:rgba(255,255,255,.1);color:#e6edf3}
.code-btn.preview{color:var(--green);border-color:rgba(34,197,94,.3)}
.code-btn.preview:hover{background:rgba(34,197,94,.1)}
.code-body{padding:14px;font-family:'JetBrains Mono','Consolas',monospace;font-size:12.5px;line-height:1.65;overflow-x:auto;color:#e6edf3;white-space:pre;tab-size:2;max-height:400px;overflow-y:auto}

/* ─── Markdown ─── */
.md h1,.md h2,.md h3{color:var(--text);margin:14px 0 8px;font-weight:700}
.md h1{font-size:20px}.md h2{font-size:17px}.md h3{font-size:15px}
.md p{margin:8px 0;line-height:1.85;color:#cbd5e1}
.md ul,.md ol{padding-right:22px;margin:8px 0}
.md li{margin:4px 0;color:#cbd5e1;line-height:1.7}
.md strong{color:var(--text);font-weight:700}
.md em{color:#93c5fd}
.md code:not(.code-body code){background:rgba(59,130,246,.1);color:#93c5fd;padding:2px 6px;border-radius:4px;font-size:12px;font-family:'JetBrains Mono',monospace}
.md blockquote{border-right:3px solid var(--blue);padding:8px 14px;margin:12px 0;background:rgba(59,130,246,.04);border-radius:0 8px 8px 0;color:var(--text2)}
.md hr{border:none;border-top:1px solid #1e293b;margin:16px 0}
.md a{color:var(--blue);text-decoration:underline}
.md table{width:100%;border-collapse:collapse;margin:12px 0;direction:ltr}
.md th,.md td{border:1px solid #1e293b;padding:8px 12px;text-align:left;font-size:13px}
.md th{background:var(--bg3);font-weight:600}

/* ─── Preview ─── */
.preview-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);z-index:100;animation:fadeIn .2s}
.preview-overlay.show{display:flex;align-items:center;justify-content:center}
.preview-box{width:92vw;height:88vh;background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.preview-top{padding:10px 16px;background:var(--bg3);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.preview-top-r{display:flex;align-items:center;gap:10px}
.preview-dots{display:flex;gap:6px}
.preview-dot{width:10px;height:10px;border-radius:50%}
.preview-url{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:4px 12px;font-size:11px;color:var(--text2);font-family:monospace;direction:ltr}
.device-toggle{display:flex;gap:4px}
.device-btn{background:none;border:1px solid var(--border);color:var(--text2);cursor:pointer;font-size:12px;padding:4px 8px;border-radius:6px;transition:all .2s}
.device-btn.active{background:rgba(59,130,246,.1);border-color:var(--blue);color:var(--blue)}
.preview-tabs{display:flex}
.preview-tab{padding:6px 14px;font-size:12px;font-family:inherit;background:none;border:none;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s}
.preview-tab.active{color:var(--blue);border-bottom-color:var(--blue)}
.preview-close{background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px;padding:4px 8px;border-radius:6px;transition:all .2s}
.preview-close:hover{background:rgba(239,68,68,.1);color:var(--red)}
.preview-body{flex:1;position:relative}
.preview-iframe{width:100%;height:100%;border:none;background:#fff}
.preview-code{width:100%;height:100%;display:none;background:#0d1117;color:#e6edf3;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;padding:16px;overflow:auto;white-space:pre;tab-size:2}

/* ─── Input ─── */
.input-area{padding:14px 16px;border-top:1px solid var(--border);flex-shrink:0;background:var(--bg2)}
.input-row{max-width:820px;margin:0 auto;display:flex;gap:10px;align-items:flex-end}
textarea{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;color:var(--text);font-family:'Tajawal',sans-serif;font-size:14px;resize:none;min-height:46px;max-height:120px;outline:none;direction:rtl;transition:all .25s}
textarea:focus{border-color:var(--border2);box-shadow:0 0 0 3px rgba(59,130,246,.08)}
textarea::placeholder{color:var(--text3)}
.send-btn{background:linear-gradient(135deg,var(--blue),#7c3aed);border:none;border-radius:var(--radius);padding:12px 14px;color:#fff;cursor:pointer;transition:all .25s;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.send-btn:hover{box-shadow:0 0 25px rgba(59,130,246,.4);transform:scale(1.05)}
.send-btn:disabled{background:var(--bg3);cursor:not-allowed;box-shadow:none;transform:none;opacity:.4}
.footer-note{text-align:center;font-size:10px;color:var(--text3);margin-top:6px}

/* ─── Upload ─── */
.upload-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:50;align-items:center;justify-content:center}
.upload-overlay.show{display:flex}
.upload-box{background:var(--bg2);border:2px dashed var(--border2);border-radius:16px;padding:40px;text-align:center;max-width:420px;width:90%;animation:slideUp .3s}
.upload-box h3{margin-bottom:8px;font-size:18px}
.upload-box p{color:var(--text2);font-size:13px;margin-bottom:16px}
.upload-input{display:none}
.upload-btn{background:linear-gradient(135deg,var(--blue),var(--purple));border:none;border-radius:var(--radius-sm);padding:10px 28px;color:#fff;font-family:inherit;font-size:13px;cursor:pointer;transition:all .2s}
.upload-btn:hover{box-shadow:0 0 20px rgba(59,130,246,.3)}

/* ─── Settings Modal ─── */
.settings-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:50;align-items:center;justify-content:center}
.settings-overlay.show{display:flex}
.settings-box{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px;max-width:440px;width:90%;animation:slideUp .3s}
.settings-box h3{font-size:18px;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.setting-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)}
.setting-label{font-size:13px;color:var(--text2)}
.setting-value{font-size:12px;color:var(--text);font-family:monospace}
.settings-close{background:none;border:1px solid var(--border);color:var(--text2);cursor:pointer;font-size:13px;padding:8px 20px;border-radius:8px;font-family:inherit;transition:all .2s;margin-top:16px;width:100%}
.settings-close:hover{background:var(--bg4);color:var(--text)}

/* ─── Toast ─── */
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 20px;font-size:13px;color:var(--text);z-index:200;animation:slideUp .3s;box-shadow:0 10px 30px rgba(0,0,0,.3);display:none}
.toast.show{display:block}

@keyframes slideUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.cursor-blink{display:inline-block;width:2px;height:15px;background:var(--blue);animation:blink 1s step-end infinite;vertical-align:middle;margin-right:2px;border-radius:1px}
@keyframes blink{50%{opacity:0}}

@media(max-width:768px){
  .sidebar{position:fixed;inset:0;width:100%;transform:translateX(100%)}
  .sidebar.open{transform:translateX(0)}
  .menu-btn{display:block}
  .suggestions{grid-template-columns:1fr}
  .msg-b{max-width:92%!important}
  .preview-box{width:98vw;height:95vh;border-radius:8px}
}
</style>
</head>
<body>

<!-- Sidebar -->
<aside class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-brand">
      <div class="sidebar-logo">✨</div>
      <div><div class="sidebar-title gradient-text">مُنشئ المواقع</div><div class="sidebar-sub">AI Site Builder Pro v2.0</div></div>
    </div>
    <button class="new-chat-btn" onclick="newChat()">+ محادثة جديدة</button>
  </div>
  <div class="chat-list" id="chatList"></div>
  <div class="sidebar-footer">
    <select class="model-select" id="modelSelect" onchange="saveModel()">
      <option value="poolside/laguna-xs-2.1:free">⚡ Laguna XS 2.1 — Poolside</option>
      <option value="meta-llama/llama-3.3-8b-instruct:free">🦙 Llama 3.3 8B — Meta</option>
      <option value="google/gemma-3-1b-it:free">💎 Gemma 3 1B — Google</option>
      <option value="microsoft/phi-4-mini-instruct:free">🧠 Phi 4 Mini — Microsoft</option>
      <option value="deepseek/deepseek-r1-0528:free">🔍 DeepSeek R1 — DeepSeek</option>
      <option value="qwen/qwen3-8b:free">🌐 Qwen3 8B — Qwen</option>
    </select>
    <div class="sidebar-stats">
      <span id="convCount">0 محادثة</span>
      <span>6 نماذج مجانية</span>
    </div>
  </div>
</aside>

<!-- Main -->
<div class="main">
  <div class="topbar">
    <div class="topbar-r">
      <button class="menu-btn" onclick="toggleSidebar()">☰</button>
      <div class="topbar-title" id="topbarTitle">محادثة جديدة</div>
    </div>
    <div class="topbar-l">
      <div class="status"><div class="status-dot"></div>متصل</div>
      <button class="topbar-btn" onclick="showSettings()">⚙️</button>
      <button class="topbar-btn" onclick="exportChat()">📥 تصدير</button>
      <button class="topbar-btn" onclick="showUpload()">📎 رفع</button>
    </div>
  </div>

  <div class="chat-area" id="chatArea">
    <div class="chat-container">
      <div id="welcome" class="welcome">
        <div class="welcome-icon">✨</div>
        <h2 class="gradient-text">مرحباً! 👋</h2>
        <p>أنا وكيل الذكاء الاصطناعي المتخصص في إنشاء المواقع. أخبرني عن الموقع الذي تريده وسأبنيه لك فوراً! 🚀</p>
        <div class="suggestions">
          <div class="suggestion" onclick="sendS('أنشئ لي موقع أخبار احترافي متجاوب مع تصنيفات (سياسة، رياضة، تقنية، اقتصاد) وتصميم عصري مع قائمة جانبية وبانر رئيسي')">
            <div class="suggestion-icon">🌍</div><h3>موقع أخبار</h3><p>موقع أخبار احترافي مع تصنيفات وتصميم عصري</p>
          </div>
          <div class="suggestion" onclick="sendS('صمم صفحة هبوط احترافية لتطبيق جوال مع أقسام: البانر، المميزات، آراء العملاء، التسعير، وتواصل معنا')">
            <div class="suggestion-icon">📄</div><h3>صفحة هبوط</h3><p>Landing Page احترافية لمنتج أو خدمة</p>
          </div>
          <div class="suggestion" onclick="sendS('أنشئ تطبيق قائمة مهام Todo بتصميم حديث مع إمكانية إضافة وحذف وتعديل وتعليم المهام كمكتملة مع حفظ في localStorage وتأثيرات بصرية')">
            <div class="suggestion-icon">📱</div><h3>تطبيق ويب</h3><p>تطبيق تفاعلي مع حفظ البيانات</p>
          </div>
          <div class="suggestion" onclick="sendS('صمم لوحة تحكم Admin Dashboard احترافية مع إحصائيات ورسوم بيانية وجدول بيانات وألوان جذابة')">
            <div class="suggestion-icon">⚡</div><h3>لوحة تحكم</h3><p>Dashboard مع رسوم بيانية</p>
          </div>
        </div>
      </div>
      <div id="messages" class="msgs" style="display:none"></div>
    </div>
  </div>

  <div class="input-area">
    <div class="input-row">
      <textarea id="input" rows="1" placeholder="اكتب طلبك هنا... مثلاً: أنشئ لي موقع portfolio احترافي"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send()}"
        oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"></textarea>
      <button class="send-btn" id="sendBtn" onclick="send()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
    <div class="footer-note">مدعوم بنماذج AI مجانية · OpenRouter · اضغط Enter للإرسال</div>
  </div>
</div>

<!-- Preview -->
<div class="preview-overlay" id="previewOverlay">
  <div class="preview-box">
    <div class="preview-top">
      <div class="preview-top-r">
        <div class="preview-dots"><div class="preview-dot" style="background:#ef4444"></div><div class="preview-dot" style="background:#f59e0b"></div><div class="preview-dot" style="background:#22c55e"></div></div>
        <div class="preview-url">localhost:3000/preview</div>
        <div class="device-toggle">
          <button class="device-btn active" onclick="setDevice('100%',this)">🖥️</button>
          <button class="device-btn" onclick="setDevice('768px',this)">📱</button>
          <button class="device-btn" onclick="setDevice('375px',this)">📲</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="preview-tabs">
          <button class="preview-tab active" onclick="switchPT('preview',this)">👁️ معاينة</button>
          <button class="preview-tab" onclick="switchPT('code',this)">📝 الكود</button>
        </div>
        <button class="preview-close" onclick="closePreview()">✕</button>
      </div>
    </div>
    <div class="preview-body">
      <iframe class="preview-iframe" id="previewFrame" sandbox="allow-scripts allow-same-origin"></iframe>
      <pre class="preview-code" id="previewCode"></pre>
    </div>
  </div>
</div>

<!-- Upload -->
<div class="upload-overlay" id="uploadOverlay" onclick="if(event.target===this)closeUpload()">
  <div class="upload-box">
    <div style="font-size:40px;margin-bottom:12px">📁</div>
    <h3>رفع ملف لتحليله</h3>
    <p>ارفع ملفات HTML, CSS, JS, JSON, TXT</p>
    <input type="file" class="upload-input" id="fileInput" accept=".html,.css,.js,.json,.txt,.svg" multiple>
    <button class="upload-btn" onclick="document.getElementById('fileInput').click()">اختر ملف</button>
  </div>
</div>

<!-- Settings -->
<div class="settings-overlay" id="settingsOverlay" onclick="if(event.target===this)closeSettings()">
  <div class="settings-box">
    <h3>⚙️ الإعدادات</h3>
    <div class="setting-row">
      <span class="setting-label">النموذج الحالي</span>
      <span class="setting-value" id="currentModel">Laguna XS 2.1</span>
    </div>
    <div class="setting-row">
      <span class="setting-label">عدد المحادثات</span>
      <span class="setting-value" id="convCount2">0</span>
    </div>
    <div class="setting-row">
      <span class="setting-label">إصدار التطبيق</span>
      <span class="setting-value">v2.0.0</span>
    </div>
    <div class="setting-row">
      <span class="setting-label">الحالة</span>
      <span class="setting-value" style="color:var(--green)">● متصل</span>
    </div>
    <button class="settings-close" onclick="closeSettings()">إغلاق</button>
    <button class="settings-close" style="margin-top:8px;border-color:rgba(239,68,68,.3);color:var(--red)" onclick="if(confirm('مسح كل المحادثات؟')){localStorage.clear();location.reload()}">🗑️ مسح كل البيانات</button>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
// ─── State ──────────────────────────────────────────
let chatHistory=[];
let conversations=JSON.parse(localStorage.getItem('sb_convos')||'[]');
let activeId=null;
let isLoading=false;

// ─── Init ───────────────────────────────────────────
renderList();
updateStats();
document.getElementById('input').focus();
const savedModel=localStorage.getItem('sb_model');
if(savedModel)document.getElementById('modelSelect').value=savedModel;
updateModelName();

// ─── Sidebar ────────────────────────────────────────
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open')}
function renderList(){
  const el=document.getElementById('chatList');
  if(!conversations.length){el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">لا توجد محادثات</div>';return}
  el.innerHTML=conversations.map(c=>
    '<div class="chat-item'+(c.id===activeId?' active':'')+'" onclick="loadConv(\\''+c.id+'\\')">'+
    '<span class="chat-item-icon">💬</span>'+
    '<span class="chat-item-text">'+esc(c.title||'محادثة')+'</span>'+
    '<span class="chat-item-time">'+fmtTime(c.updated)+'</span>'+
    '<button class="chat-item-del" onclick="event.stopPropagation();delConv(\\''+c.id+'\\')">✕</button></div>'
  ).join('');
}
function fmtTime(ts){
  if(!ts)return'';const d=new Date(ts),now=new Date();
  if(d.toDateString()===now.toDateString())return d.toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('ar',{month:'short',day:'numeric'});
}
function saveConvos(){localStorage.setItem('sb_convos',JSON.stringify(conversations))}
function updateStats(){
  document.getElementById('convCount').textContent=conversations.length+' محادثة';
  document.getElementById('convCount2').textContent=conversations.length;
}
function saveModel(){
  localStorage.setItem('sb_model',document.getElementById('modelSelect').value);
  updateModelName();toast('تم تغيير النموذج');
}
function updateModelName(){
  const sel=document.getElementById('modelSelect');
  document.getElementById('currentModel').textContent=sel.options[sel.selectedIndex].text.replace(/^[^ ]+ /,'');
}
function getModel(){return document.getElementById('modelSelect').value}

function newChat(){
  activeId=null;chatHistory=[];
  document.getElementById('messages').innerHTML='';
  document.getElementById('messages').style.display='none';
  document.getElementById('welcome').style.display='flex';
  document.getElementById('topbarTitle').textContent='محادثة جديدة';
  renderList();toggleSidebar();
}
function loadConv(id){
  const c=conversations.find(x=>x.id===id);if(!c)return;
  activeId=id;chatHistory=c.messages||[];
  document.getElementById('welcome').style.display='none';
  document.getElementById('messages').style.display='flex';
  document.getElementById('topbarTitle').textContent=c.title||'محادثة';
  const el=document.getElementById('messages');el.innerHTML='';
  chatHistory.forEach(m=>addMsg(m.role,m.content));
  renderList();toggleSidebar();scrollB();
}
function delConv(id){
  conversations=conversations.filter(c=>c.id!==id);saveConvos();
  if(activeId===id)newChat();renderList();updateStats();
}
function autoSave(){
  if(!chatHistory.length)return;
  if(!activeId){
    activeId='c_'+Date.now();
    conversations.unshift({id:activeId,title:chatHistory[0]?.content?.substring(0,40)||'محادثة',messages:chatHistory,updated:Date.now()});
  }else{
    const c=conversations.find(x=>x.id===activeId);
    if(c){c.messages=chatHistory;c.updated=Date.now()}
  }
  const i=conversations.findIndex(x=>x.id===activeId);
  if(i>0){const[c]=conversations.splice(i,1);conversations.unshift(c)}
  saveConvos();renderList();updateStats();
}

// ─── Helpers ────────────────────────────────────────
function esc(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}
function scrollB(){const a=document.getElementById('chatArea');a.scrollTop=a.scrollHeight}
function toast(msg){
  const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2500);
}
function showChat(){
  document.getElementById('welcome').style.display='none';
  document.getElementById('messages').style.display='flex';
}

// ─── Markdown ───────────────────────────────────────
function renderMd(text){
  text=text.replace(/\`\`\`(\w*)\n([\s\S]*?)\`\`\`/gm,function(m,lang,code){
    const id='c'+Math.random().toString(36).substr(2,8);
    const isHtml=lang==='html'||code.trim().startsWith('<!DOCTYPE')||code.trim().startsWith('<html');
    const pb=isHtml?'<button class="code-btn preview" onclick="previewCode(\\''+id+'\\')">👁️ معاينة</button>':'';
    return '<div class="code-block"><div class="code-header"><span>'+(lang||'code')+'</span><div class="code-actions">'+pb+'<button class="code-btn" onclick="copyCode(this)">📋 نسخ</button></div></div><pre class="code-body" id="'+id+'">'+esc(code.trim())+'</pre></div>';
  });
  text=text.replace(/\`([^\`\n]+)\`/g,'<code>$1</code>');
  text=text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  text=text.replace(/\*(.+?)\*/g,'<em>$1</em>');
  text=text.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  text=text.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  text=text.replace(/^# (.+)$/gm,'<h1>$1</h1>');
  text=text.replace(/^---$/gm,'<hr>');
  text=text.replace(/\n/g,'<br>');
  return text;
}
function copyCode(btn){
  const pre=btn.closest('.code-block').querySelector('.code-body');
  navigator.clipboard.writeText(pre.textContent);
  btn.textContent='✅ تم';setTimeout(()=>btn.textContent='📋 نسخ',2000);
}
function previewCode(id){
  const el=document.getElementById(id);if(!el)return;
  openPreview(el.textContent);
}

// ─── Messages ───────────────────────────────────────
function addMsg(role,content){
  const div=document.createElement('div');div.className='msg '+role;
  const av=role==='user'?'human':'ai';
  const em=role==='user'?'👤':'🤖';
  if(role==='user'){
    div.innerHTML='<div class="msg-av '+av+'">'+em+'</div><div class="msg-b user">'+esc(content)+'</div>';
  }else{
    div.innerHTML='<div class="msg-av '+av+'">'+em+'</div><div class="msg-b ai md">'+renderMd(content)+'</div>';
  }
  document.getElementById('messages').appendChild(div);scrollB();
}
function updateLast(content){
  const bs=document.querySelectorAll('.msg-b.ai');
  if(bs.length){bs[bs.length-1].innerHTML=renderMd(content)+'<span class="cursor-blink"></span>';scrollB()}
}
function rmCursor(){document.querySelectorAll('.cursor-blink').forEach(c=>c.remove())}
function showTyping(){
  const d=document.createElement('div');d.className='msg';d.id='typing';
  d.innerHTML='<div class="msg-av ai">🤖</div><div class="msg-b ai"><div class="typing"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div><span style="font-size:11px;color:var(--text3);margin-right:6px">يكتب...</span></div></div>';
  document.getElementById('messages').appendChild(d);scrollB();
}
function rmTyping(){const e=document.getElementById('typing');if(e)e.remove()}

// ─── Send ───────────────────────────────────────────
async function send(){
  const text=document.getElementById('input').value.trim();
  if(!text||isLoading)return;
  showChat();addMsg('user',text);
  chatHistory.push({role:'user',content:text});
  document.getElementById('input').value='';
  document.getElementById('input').style.height='auto';
  isLoading=true;document.getElementById('sendBtn').disabled=true;
  document.getElementById('topbarTitle').textContent=text.substring(0,35)+(text.length>35?'...':'');
  showTyping();
  try{
    const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:chatHistory.slice(0,-1),model:getModel()})});
    const data=await res.json();rmTyping();
    if(data.error){addMsg('assistant','❌ خطأ: '+(data.details||data.error))}
    else{
      const full=data.reply||'عذراً، لم أتمكن من إنشاء إجابة.';
      let cur='';addMsg('assistant','');
      for(let i=0;i<full.length;i++){cur+=full[i];if(i%3===0){updateLast(cur);await new Promise(r=>setTimeout(r,10))}}
      updateLast(cur);rmCursor();
      chatHistory.push({role:'assistant',content:full});autoSave();
    }
  }catch(e){rmTyping();addMsg('assistant','❌ خطأ في الاتصال. تحقق من اتصالك وحاول مرة أخرى.')}
  finally{isLoading=false;document.getElementById('sendBtn').disabled=false;document.getElementById('input').focus()}
}
function sendS(t){document.getElementById('input').value=t;send()}

// ─── Preview ────────────────────────────────────────
function openPreview(code){
  document.getElementById('previewOverlay').classList.add('show');
  const f=document.getElementById('previewFrame');
  f.src=URL.createObjectURL(new Blob([code],{type:'text/html'}));
  document.getElementById('previewCode').textContent=code;
}
function closePreview(){
  document.getElementById('previewOverlay').classList.remove('show');
  document.getElementById('previewFrame').src='about:blank';
}
function switchPT(tab,btn){
  document.querySelectorAll('.preview-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('previewFrame').style.display=tab==='preview'?'block':'none';
  document.getElementById('previewCode').style.display=tab==='code'?'block':'none';
}
function setDevice(w,btn){
  document.querySelectorAll('.device-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const f=document.getElementById('previewFrame');
  f.style.width=w;f.style.margin=w==='100%'?'0':'0 auto';
}

// ─── Export ─────────────────────────────────────────
function exportChat(){
  if(!chatHistory.length){toast('لا توجد محادثة للتصدير');return}
  const t=chatHistory.map(m=>(m.role==='user'?'👤 المستخدم':'🤖 الوكيل')+':\\n'+m.content).join('\\n\\n---\\n\\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/plain;charset=utf-8'}));
  a.download='chat_'+new Date().toISOString().slice(0,10)+'.txt';a.click();toast('تم التصدير بنجاح');
}

// ─── Upload ─────────────────────────────────────────
function showUpload(){document.getElementById('uploadOverlay').classList.add('show')}
function closeUpload(){document.getElementById('uploadOverlay').classList.remove('show')}
document.getElementById('fileInput').addEventListener('change',function(e){
  if(!e.target.files.length)return;
  const r=new FileReader();
  r.onload=function(ev){document.getElementById('input').value='حلل هذا الكود واعرضه بشكل احترافي:\\n\\n'+ev.target.result;closeUpload();send()};
  r.readAsText(e.target.files[0]);
});

// ─── Settings ───────────────────────────────────────
function showSettings(){document.getElementById('settingsOverlay').classList.add('show');updateStats()}
function closeSettings(){document.getElementById('settingsOverlay').classList.remove('show')}

// ─── Keyboard ───────────────────────────────────────
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closePreview();closeUpload();closeSettings()}
});
</script>
</body>
</html>`;
}

// ─── Server ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // API: Chat
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        let parsed;
        try { parsed = JSON.parse(body); } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'طلب غير صالح', details: 'JSON غير صحيح' }));
          return;
        }
        const { message, history, model } = parsed;
        if (!message) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'الرسالة مطلوبة' })); return; }
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'مفتاح API غير مُعرَّف' })); return; }

        const selectedModel = model || 'poolside/laguna-xs-2.1:free';
        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...(history || []).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message }
        ];

        const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
          body: JSON.stringify({ model: selectedModel, messages, temperature: 0.7, max_tokens: 4096 })
        });
        const data = await apiRes.json();
        if (data.error) {
          console.error('OpenRouter Error:', JSON.stringify(data.error, null, 2));
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'خطأ من OpenRouter', details: data.error.message || JSON.stringify(data.error) }));
          return;
        }
        const reply = data.choices?.[0]?.message?.content || 'لم يتم الحصول على رد';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply, model: data.model }));
      } catch (err) {
        console.error('API Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'خطأ داخلي', details: err.message }));
      }
    });
    return;
  }

  // API: Models
  if (req.url === '/api/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ models: MODELS }));
    return;
  }

  // API: Health
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() }));
    return;
  }

  // HTML
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHTML());
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1 style="font-family:Tajawal;text-align:center;margin-top:100px;color:#475569">404</h1>');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ✨ مُنشئ المواقع - AI Site Builder Pro v2.0');
  console.log('  🚀 http://localhost:' + PORT);
  console.log('  🤖 ' + MODELS.length + ' نماذج مجانية');
  console.log('  💾 حفظ تلقائي + معاينة حية + تصدير');
  console.log('');
});
