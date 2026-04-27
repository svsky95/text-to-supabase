"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Entry {
  id: number;
  name: string;
  created_at: string;
}

// 旅游城市库（备用，当数据库无数据时使用）
const backupCities = [
  "北京", "上海", "广州", "深圳", "成都", "杭州", "西安", "重庆",
  "厦门", "三亚", "丽江", "大理", "青岛", "桂林", "张家界", "苏州",
  "南京", "乌镇", "周庄", "凤凰古城", "平遥古城", "敦煌", "拉萨",
  "哈尔滨", "长春", "沈阳", "大连", "威海", "烟台", "长白山", "九寨沟",
  "黄山", "泰山", "华山", "峨眉山", "乐山", "庐山", "井冈山", "武夷山",
  "西塘", "南浔", "同里", "甪直", "宏村", "婺源", "阳朔", "北海",
  "海口", "万宁", "文昌", "琼海", "五指山", "陵水",
  "珠海", "汕头", "潮州", "揭阳", "梅州", "韶关", "肇庆", "惠州",
  "昆明", "香格里拉", "西双版纳", "腾冲", "瑞丽",
  "贵阳", "黄果树", "梵净山", "镇远", "西江千户苗寨", "荔波",
  "郑州", "洛阳", "开封", "安阳", "新乡", "云台山", "少林寺",
  "武汉", "长沙", "衡山", "岳阳", "武当山",
  "太原", "五台山", "大同", "乔家大院", "壶口瀑布",
  "兰州", "张掖", "嘉峪关", "青海湖", "茶卡盐湖", "塔尔寺",
  "乌鲁木齐", "天山", "吐鲁番", "喀纳斯", "伊犁", "赛里木湖",
  "银川", "中卫", "沙湖", "镇北堡影视城", "西夏王陵",
  "呼和浩特", "希拉穆仁", "响沙湾", "鄂尔多斯", "呼伦贝尔", "满洲里",
];

// 获取随机旅游城市（从数据库）
const getRandomCity = async () => {
  const { data } = await supabase
    .from("cities")
    .select("name")
    .limit(1)
    .order("random");

  if (data && data.length > 0) {
    return data[0].name;
  }
  // 备用：随机从本地库选择
  return backupCities[Math.floor(Math.random() * backupCities.length)];
};

export default function Home() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [randomCity, setRandomCity] = useState("");
  const [isRolling, setIsRolling] = useState(false);

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
      const city = await getRandomCity();
      setMessage(`🎉 提交成功！推荐五一旅游：${city}`);
      fetchLeaderboard();
    }
    setSubmitting(false);
  };

  // 随机推荐旅游城市（滚动效果）
  const handleRandomCity = async () => {
    if (isRolling) return;
    setIsRolling(true);
    setRandomCity("🎰 抽取中...");

    let count = 0;
    const interval = setInterval(async () => {
      setRandomCity(`🎰 抽取中... ${await getRandomCity()}`);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const finalCity = await getRandomCity();
        setRandomCity(`✈️ 你的五一推荐目的地：${finalCity}`);
        setIsRolling(false);
      }
    }, 100);
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
            ✈️ 你的五一旅行目的地
          </h1>
          <p style={{ color: "#718096", fontSize: "0.9rem" }}>
            输入名字，看看系统推荐你去哪里玩
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

        {/* 随机推荐旅游城市 */}
        <div style={{
          background: "white",
          borderRadius: "16px",
          padding: "1.25rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          boxSizing: "border-box",
          marginTop: "1.25rem",
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
            🎲 随机看看你五一想去的城市
          </h2>
          <button
            onClick={handleRandomCity}
            disabled={isRolling}
            style={{
              width: "100%",
              padding: "0.875rem",
              fontSize: "1rem",
              fontWeight: 600,
              color: "#fff",
              background: isRolling ? "#a0aec0" : "linear-gradient(135deg, #667eea, #764ba2)",
              border: "none",
              borderRadius: "12px",
              cursor: isRolling ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: isRolling ? "none" : "0 4px 12px rgba(102, 126, 234, 0.3)",
            }}
          >
            {isRolling ? "🎰 抽取中..." : "🎯 试试手气"}
          </button>
          {randomCity && (
            <p style={{
              marginTop: "1rem",
              padding: "0.875rem",
              background: "linear-gradient(135deg, #fef3c7, #fde68a)",
              borderRadius: "12px",
              color: "#92400e",
              textAlign: "center",
              fontSize: "1rem",
              fontWeight: 600,
            }}>
              {randomCity}
            </p>
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
