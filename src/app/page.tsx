"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('text_entries')
        .insert([{ content: text }]);

      if (error) throw error;

      setText('');
      setMessage('✅ 写入成功！');
    } catch (err) {
      setMessage('❌ 写入失败：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#333' }}>
          文本写入数据库
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入文字..."
            disabled={submitting}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#fff',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? '提交中...' : 'Commit'}
          </button>
        </form>

        {message && (
          <p style={{ marginTop: '1rem', padding: '0.75rem', background: '#fff', borderRadius: '8px', color: '#333' }}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}