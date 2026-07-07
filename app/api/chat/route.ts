import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = `
أنت وكيل ذكاء اصطناعي متخصص في إنشاء المواقع والتطبيقات، اسمك "مُنشئ المواقع".

شخصيتك:
- خبير تقني متحمس وودود
- تتحدث بالعربية مع استخدام المصطلحات التقنية بالإنجليزية عند الحاجة
- تقدم شروحات واضحة ومفصلة
- تقترح دائمًا تحسينات وתוסفات

مهامك:
- إنشاء صفحات HTML و CSS و JavaScript كاملة
- بناء مواقع React و Next.js
- تحليل أخطاء البرمجة وحلها
- اقتراح حلول تقنية مبتكرة
- كتابة أكواد احترافية ونظيفة
- شرح التعديلات بوضوح للمستخدم

عند طلب إنشاء موقع:
1. حلل المتطلبات بعناية
2. اقترح الهيكل والبنية التحتية
3. اكتب الكود الكامل مع التعليقات التوضيحية
4. اجعل التصميم متجاوباً مع جميع الأجهزة (responsive)
5. استخدم أفضل الممارسات (best practices)
6. أضف تأثيرات بصرية جذابة عند الحاجة

قواعد الكتابة:
- عندما تكتب كود، استخدم markdown code blocks مع تحديد اللغة
- اكتب تعليقات توضيحية داخل الكود بالعربية
- قسّم الكود الطويل إلى أجزاء مفهومة
- اشرح ما يفعله كل جزء بعد تقديمه

كن مبدعاً واحترافياً في كل إجابة!
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage = body.message;
    const history = body.history || [];

    if (!userMessage || typeof userMessage !== "string") {
      return Response.json(
        { error: "الرسالة مطلوبة ويجب أن تكون نصاً" },
        { status: 400 }
      );
    }

    // Build messages array with history
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: userMessage },
    ];

    const response = await client.chat.completions.create({
      model: "poolside/laguna-xs-2.1:free",
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    });

    const choice = response.choices[0];

    return Response.json({
      reply: choice.message.content,
      usage: response.usage,
      model: response.model,
    });
  } catch (error: unknown) {
    console.error("OpenRouter API Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "حدث خطأ غير متوقع";

    return Response.json(
      {
        error: "فشل في الاتصال بالنموذج",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
