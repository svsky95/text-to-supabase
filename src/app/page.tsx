"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Entry {
  id: number;
  name: string;
  created_at: string;
}

export default function Home() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取排行榜
  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from("text_entries")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    if (!error && data) {
      setLeaderboard(data as Entry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase
      .from("text_entries")
      .insert([{ name: name.trim() }]);

    if (error) {
      setMessage("❌ 提交失败：" + error.message);
    } else {
      setName("");
      setMessage("✅ 提交成功！");
      fetchLeaderboard();
    }
    setSubmitting(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 50%, #f3e5f5 100%)",
      padding: "2rem 1rem",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        
        {/* 标题 */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{
            fontSize: "1.8rem",
            fontWeight: 700,
            color: "#2d3748",
            marginBottom: "0.5rem",
          }}>
            🌿 很高兴来到我的测试页
          </h1>
          <p style={{ color: "#718096", fontSize: "0.95rem" }}>
            留下你的姓名，一起参与排行吧
          </p>
        </div>

        {/* 输入表单 */}
        <form onSubmit={handleSubmit} style={{
          background: "white",
          borderRadius: "20px",
          padding: "1.5rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          marginBottom: "1.5rem",
        }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入你的姓名..."
            disabled={submitting}
            maxLength={20}
            style={{
              width: "100%",
              padding: "0.875rem 1rem",
              fontSize: "1rem",
              border: "2px solid #e2e8f0",
              borderRadius: "12px",
              outline: "none",
              transition: "border-color 0.2s",
              boxSizing: "border-box",
              marginBottom: "1rem",
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "0.875rem",
              fontSize: "1rem",
              fontWeight: 600,
              color: "#fff",
              background: submitting ? "#a0aec0" : "linear-gradient(135deg, #68d391, #48bb78)",
              border: "none",
              borderRadius: "12px",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(72, 187, 120, 0.3)",
            }}
          >
            {submitting ? "提交中..." : "✨ 参与排行"}
          </button>
          {message && (
            <p style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: message.startsWith("✅") ? "#f0fff4" : "#fff5f5",
              borderRadius: "10px",
              color: message.startsWith("✅") ? "#2f855a" : "#c53030",
              textAlign: "center",
              fontSize: "0.9rem",
            }}>
              {message}
            </p>
          )}
        </form>

        {/* 排行榜 */}
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "1.5rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}>
          <h2 style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "#2d3748",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            🏆 参与排行
          </h2>
          
          {loading ? (
            <p style={{ textAlign: "center", color: "#a0aec0", padding: "2rem" }}>
              加载中...
            </p>
          ) : leaderboard.length === 0 ? (
            <p style={{ textAlign: "center", color: "#a0aec0", padding: "2rem" }}>
              还没有人参与，快来留言吧！
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.875rem 1rem",
                    background: index === 0 ? "linear-gradient(135deg, #fef3c7, #fde68a)" :
                               index === 1 ? "linear-gradient(135deg, #f3f4f6, #e5e7eb)" :
                               index === 2 ? "linear-gradient(135deg, #fef3c7, #fde68a)" :
                               "#f7fafc",
                    borderRadius: "12px",
                    border: index < 3 ? "2px solid rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  <span style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    width: "2rem",
                    textAlign: "center",
                    color: index === 0 ? "#d97706" : index < 3 ? "#92400e" : "#a0aec0",
                  }}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                  </span>
                  <span style={{
                    flex: 1,
                    fontSize: "1rem",
                    fontWeight: 500,
                    color: "#2d3748",
                    marginLeft: "0.5rem",
                  }}>
                    {entry.name}
                  </span>
                  <span style={{
                    fontSize: "0.8rem",
                    color: "#a0aec0",
                  }}>
                    {new Date(entry.created_at).toLocaleString("zh-CN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p style={{
          textAlign: "center",
          marginTop: "1.5rem",
          color: "#a0aec0",
          fontSize: "0.8rem",
        }}>
          共 {leaderboard.length} 人参与
        </p>
      </div>
    </div>
  );
}
