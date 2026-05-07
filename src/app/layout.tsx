import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '🗄️ 数据库闯关 — MySQL / PostgreSQL / MongoDB / Oracle',
  description: '数据库管理员必刷！精选 20 道 MySQL、PostgreSQL、MongoDB、Oracle 经典面试题，每日练习提升技能。',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🗄️</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
