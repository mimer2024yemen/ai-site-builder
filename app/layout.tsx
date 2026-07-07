import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Site Builder | بناء المواقع بالذكاء الاصطناعي',
  description: 'وكيل ذكاء اصطناعي متخصص في إنشاء المواقع والتطبيقات - اطلب موقعك الآن',
  keywords: 'AI, موقع, بناء, ذكاء اصطناعي, React, Next.js, HTML, CSS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
