"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Entry {
  id: number;
  name: string;
  created_at: string;
}

// 随机四字短语库
const phrases = [
  "龙腾虎跃", "凤鸣朝阳", "心想事成", "福运连连",
  "笑口常开", "步步高升", "学业进步", "财运亨通",
  "身体健康", "万事如意", "旗开得胜", "一帆风顺",
  "金榜题名", "喜事连连", "福如东海", "寿比南山",
  "左右逢源", "如鱼得水", "蒸蒸日上", "红红火火",
  "才华横溢", "出类拔萃", "不同凡响", "超凡脱俗",
  "风度翩翩", "温文尔雅", "亭亭玉立", "眉清目秀",
  "精神抖擞", "神采奕奕", "意气风发", "斗志昂扬",
  "胸有成竹", "稳操胜券", "志在必得", "勇往直前",
  "前程似锦", "鹏程万里", "飞黄腾达", "平步青云",
  "和气生财", "和衷共济", "和颜悦色", "和和美美",
  "福星高照", "吉星高照", "紫气东来", "瑞气盈门",
  "开门大吉", "好事成双", "双喜临门", "三阳开泰",
  "五福临门", "六六大顺", "七星高照", "八方来财",
  "十全十美", "百花齐放", "百家争鸣", "推陈出新",
  "与时俱进", "开拓创新", "敢为人先", "力争上游",
];

// 获取随机短语
const getRandomPhrase = () => {
  return phrases[Math.floor(Math.random() * phrases.length)];
};

export default function Home() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 获取排行榜和总人数
  const fetchLeaderboard = async () => {
    // 查询最新3条
    const { data, error } = await supabase
      .from("text_entries")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    // 查询总人数
    const { count } = await supabase
      .from("text_entries")
      .select("*", { count: "exact", head: true });

    if (!error && data) {
      setLeaderboard(data as Entry[]);
    }
    if (count !== null) {
      setTotalCount(count);
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
      const phrase = getRandomPhrase();
      setMessage(`✅ 提交成功！今日运势：${phrase}`);
      fetchLeaderboard();
    }
    setSubmitting(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 50%, #f3e5f5 100%)",
      padding: "1rem",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        
        {/* 标题 */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 style={{
            fontSize: "clamp(1.4rem, 5vw, 1.8rem)",
            fontWeight: 700,
            color: "#2d3748",
            marginBottom: "0.5rem",
          }}>
            🌿 很高兴来到我的测试页
          </h1>
          <p style={{ color: "#718096", fontSize: "0.9rem" }}>
            留下你的姓名，一起参与排行吧
          </p>
        </div>

        {/* 输入表单 */}
        <form onSubmit={handleSubmit} style={{
          background: "white",
          borderRadius: "16px",
          padding: "1.25rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          marginBottom: "1.25rem",
          boxSizing: "border-box",
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
          borderRadius: "16px",
          padding: "1.25rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          boxSizing: "border-box",
        }}>
          <h2 style={{
            fontSize: "1rem",
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
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.75rem 0.875rem",
                    background: index === 0 ? "linear-gradient(135deg, #fef3c7, #fde68a)" :
                               index === 1 ? "linear-gradient(135deg, #f3f4f6, #e5e7eb)" :
                               index === 2 ? "linear-gradient(135deg, #fef3c7, #fde68a)" :
                               "#f7fafc",
                    borderRadius: "12px",
                    border: index < 3 ? "2px solid rgba(0,0,0,0.05)" : "none",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    width: "2.2rem",
                    textAlign: "center",
                    color: index === 0 ? "#d97706" : index < 3 ? "#92400e" : "#a0aec0",
                    flexShrink: 0,
                  }}>
                    #{entry.id}
                  </span>
                  <span style={{
                    flex: 1,
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    color: "#2d3748",
                    marginLeft: "0.5rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {entry.name}
                  </span>
                  <span style={{
                    fontSize: "0.75rem",
                    color: "#a0aec0",
                    marginLeft: "0.5rem",
                    flexShrink: 0,
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
          marginTop: "1.25rem",
          color: "#a0aec0",
          fontSize: "0.75rem",
        }}>
          共 {totalCount} 人参与
        </p>
      </div>
    </div>
  );
}
