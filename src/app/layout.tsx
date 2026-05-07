import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '🗄️ 数据库闯关',
  description: 'MySQL / PostgreSQL / MongoDB / Oracle 每日问答练习',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #1a1a2e; } button:active { transform: scale(0.98); }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
