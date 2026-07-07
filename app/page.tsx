"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// ─── Types ──────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// ─── Icons (inline SVGs to avoid extra deps) ────────────
const Icons = {
  Send: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Bot: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  ),
  User: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Code: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Sparkles: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  ),
  Globe: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Layout: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  Smartphone: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  Zap: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
};

// ─── Code Block Component ───────────────────────────────
function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block my-4">
      <div className="code-header">
        <div className="flex items-center gap-2">
          <Icons.Code />
          <span>{language || "code"}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-white/10 transition-colors"
          style={{ color: copied ? '#22c55e' : '#8b949e' }}
        >
          {copied ? <Icons.Check /> : <Icons.Copy />}
          {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "javascript"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '16px',
          background: '#0d1117',
          fontSize: '13px',
          lineHeight: '1.6',
          direction: 'ltr',
          textAlign: 'left',
        }}
        showLineNumbers={true}
        lineNumberStyle={{ color: '#484f58', fontSize: '11px' }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

// ─── Typing Indicator ───────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <Icons.Bot />
      </div>
      <div className="chat-ai px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
          <span className="text-sm text-gray-400 mr-2">يكتب...</span>
        </div>
      </div>
    </div>
  );
}

// ─── Suggestion Card ────────────────────────────────────
function SuggestionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="suggestion-card glass-light rounded-xl p-4 text-right w-full hover:bg-dark-700/60 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-sm text-gray-100 mb-1">{title}</h3>
          <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Create placeholder for streaming
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      // Build history for context
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, history }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      // Simulate streaming effect
      const fullText = data.reply || "عذراً، لم أتمكن من生成 إجابة.";
      let currentText = "";
      const chars = fullText.split("");

      for (let i = 0; i < chars.length; i++) {
        currentText += chars[i];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: currentText }
              : msg
          )
        );
        // Small delay for streaming effect
        if (i % 3 === 0) {
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      // Mark streaming complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
    } catch (error) {
      const errorText =
        error instanceof Error
          ? `❌ خطأ: ${error.message}`
          : "❌ حدث خطأ غير متوقع. تحقق من اتصالك وحاول مرة أخرى.";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: errorText, isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const suggestions = [
    {
      icon: <Icons.Globe />,
      title: "موقع أخبار",
      description: "أنشئ موقع أخبار احترافي مع تصنيفات وتصميم عصري",
      prompt: "أنشئ لي موقع أخبار احترافي مثل شبام24 مع تصنيفات (سياسة، رياضة، تقنية، اقتصاد) وتصميم عصري متجاوب",
    },
    {
      icon: <Icons.Layout />,
      title: "صفحة هبوط",
      description: "صفحة هبوط (Landing Page) لمنتج أو خدمة",
      prompt: "صمم لي صفحة هبوط احترافية لتطبيق جوال معقسام: المميزات، آراء العملاء، التسعير، وتواصل معنا",
    },
    {
      icon: <Icons.Smartphone />,
      title: "تطبيق ويب",
      description: "تطبيق ويب تفاعلي مثل قائمة مهام أو دفتر ملاحظات",
      prompt: "أنشئ لي تطبيق قائمة مهام (Todo App) بتصميم حديث مع إمكانية إضافة وحذف وتعليم المهام كمكتملة، مع حفظ البيانات في localStorage",
    },
    {
      icon: <Icons.Zap />,
      title: "لوحة تحكم",
      description: "لوحة تحكم (Dashboard) مع رسوم بيانية",
      prompt: "صمم لوحة تحكم Admin Dashboard احترافية مع إحصائيات ورسوم بيانية وجدول بيانات باستخدام HTML وCSS وJavaScript فقط",
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a]">
      {/* ─── Header ──────────────────────────────────── */}
      <header className="glass border-b border-blue-500/10 px-4 py-3 flex-shrink-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center glow-blue">
              <Icons.Sparkles />
            </div>
            <div>
              <h1 className="font-bold text-lg gradient-text">مُنشئ المواقع</h1>
              <p className="text-xs text-gray-400">وكيل الذكاء الاصطناعي لبناء المواقع</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="status-online" />
              <span>متصل</span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-red-400"
                title="محادثة جديدة"
              >
                <Icons.Trash />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Messages Area ───────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            /* ─── Welcome Screen ────────────────────── */
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center mb-6 glow-blue pulse-ring">
                <span className="text-3xl">
                  <Icons.Sparkles />
                </span>
              </div>
              <h2 className="text-3xl font-bold gradient-text mb-3">
                مرحباً! 👋
              </h2>
              <p className="text-gray-400 text-center max-w-md mb-8 leading-relaxed">
                أنا وكيل الذكاء الاصطناعي المتخصص في إنشاء المواقع.
                اخبرني عن الموقع الذي تريده وسأبنيه لك فوراً! 🚀
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {suggestions.map((s, i) => (
                  <SuggestionCard key={i} {...s} onClick={() => sendMessage(s.prompt)} />
                ))}
              </div>
            </div>
          ) : (
            /* ─── Chat Messages ─────────────────────── */
            <div className="space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 animate-slide-up ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                        : "bg-gradient-to-br from-blue-500 to-purple-600"
                    }`}
                  >
                    {msg.role === "user" ? <Icons.User /> : <Icons.Bot />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[80%] px-4 py-3 ${
                      msg.role === "user" ? "chat-user" : "chat-ai"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-white leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    ) : (
                      <div className="markdown-content text-sm">
                        <ReactMarkdown
                          components={{
                            code({ className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || "");
                              const codeString = String(children).replace(/\n$/, "");
                              if (match) {
                                return (
                                  <CodeBlock language={match[1]}>
                                    {codeString}
                                  </CodeBlock>
                                );
                              }
                              return (
                                <code
                                  className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse mr-1" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.content === "" && (
                <TypingIndicator />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* ─── Input Area ─────────────────────────────── */}
      <footer className="glass border-t border-blue-500/10 px-4 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب طلبك هنا... مثلاً: أنشئ لي موقع portfolio"
                className="w-full bg-[#1e293b] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                rows={1}
                style={{ minHeight: "44px", maxHeight: "120px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 120) + "px";
                }}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                input.trim() && !isLoading
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white glow-blue cursor-pointer"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Icons.Send />
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            مدعوم بنموذج Laguna XS 2.1 · OpenRouter
          </p>
        </div>
      </footer>
    </div>
  );
}
