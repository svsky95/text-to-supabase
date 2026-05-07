'use client';

import { useState, useEffect, useCallback } from 'react';

type Question = {
  id: number;
  category: 'MySQL' | 'PostgreSQL' | 'MongoDB' | 'Oracle';
  difficulty: 1 | 2 | 3;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

const QUESTIONS: Question[] = [
  // MySQL
  { id: 1, category: 'MySQL', difficulty: 1, question: 'MySQL 中，如何查看当前所有数据库？', options: ['SHOW DATABASES;', 'LIST DATABASES;', 'SHOW DB;', 'DISPLAY DATABASES;'], answer: 0, explanation: 'MySQL 标准语法是 SHOW DATABASES; 用于列出所有数据库。' },
  { id: 2, category: 'MySQL', difficulty: 2, question: 'InnoDB 的默认隔离级别是？', options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'], answer: 2, explanation: 'InnoDB 默认隔离级别是 Repeatable Read，通过 MVCC + Next-Key Locking 防止幻读。' },
  { id: 3, category: 'MySQL', difficulty: 2, question: 'MySQL 联合索引 (a, b, c) 中，以下哪个查询能命中索引？', options: ['WHERE a=1 AND b=2', 'WHERE b=2 AND c=3', 'WHERE c=3', 'WHERE b=2'], answer: 0, explanation: '联合索引遵循最左前缀原则，必须包含 a 列才能命中索引。' },
  { id: 4, category: 'MySQL', difficulty: 3, question: 'MySQL 半同步复制（Semi-sync Replication）的作用是？', options: ['提升复制速度', '确保主库提交时至少有一个从库已接收并写入relay log', '自动 failover', '支持多主复制'], answer: 1, explanation: '半同步复制确保事务在主库提交前，至少有一个从库确认收到 binlog 数据，防止数据丢失。' },
  { id: 5, category: 'MySQL', difficulty: 1, question: 'MySQL 中用于存储引擎是 InnoDB 的系统表是哪个？', options: ['MyISAM', 'InnoDB', 'MEMORY', 'BLACKHOLE'], answer: 1, explanation: 'InnoDB 是 MySQL 5.5+ 的默认存储引擎，支持事务和行级锁。' },
  // PostgreSQL
  { id: 6, category: 'PostgreSQL', difficulty: 1, question: 'PostgreSQL 查看版本的命令是？', options: ['SELECT VERSION();', 'SHOW VERSION;', 'VERSION();', 'PG_VERSION();'], answer: 0, explanation: 'PostgreSQL 使用 SELECT VERSION(); 查看版本信息，结果类似 "PostgreSQL 16.2 on x86_64..."' },
  { id: 7, category: 'PostgreSQL', difficulty: 2, question: 'PostgreSQL 中，以下哪种索引类型支持全文搜索？', options: ['B-tree', 'GiST', 'GIN', 'BRIN'], answer: 2, explanation: 'GIN（Generalized Inverted Index）索引支持全文搜索和数组类型；GiST 用于几何类型。' },
  { id: 8, category: 'PostgreSQL', difficulty: 3, question: 'PostgreSQL MVCC 实现依赖的关键数据结构是？', options: ['Redo Log', 'Undo Log', 'WAL', 'Vacuum'], answer: 2, explanation: 'PostgreSQL 通过 WAL（Write-Ahead Log）配合 Vacuum 清理旧版本实现 MVCC，不依赖回滚段。' },
  { id: 9, category: 'PostgreSQL', difficulty: 2, question: 'PostgreSQL 中，如何让一个查询使用多个 CPU 核心并行执行？', options: ['PARALLEL hint', 'SET max_parallel_workers_per_gather = 4', 'JOIN PARALLEL', 'USE MULTICORE'], answer: 1, explanation: '通过设置 max_parallel_workers_per_gather 参数，PostgreSQL 可对顺序扫描、聚合等操作启用并行。' },
  { id: 10, category: 'PostgreSQL', difficulty: 1, question: 'PostgreSQL 中，哪个命令用于修改用户密码？', options: ['ALTER USER ... SET PASSWORD', 'SET PASSWORD', 'CREATE USER ... WITH PASSWORD', 'GRANT PASSWORD'], answer: 0, explanation: 'PostgreSQL 使用 ALTER USER username WITH PASSWORD \'newpassword\'; 修改密码。' },
  // MongoDB
  { id: 11, category: 'MongoDB', difficulty: 1, question: 'MongoDB 文档的最大大小是多少？', options: ['8MB', '16MB', '32MB', '无限制'], answer: 1, explanation: 'MongoDB 单个文档（Document）最大为 16MB，这是 BSON 文档格式的限制。' },
  { id: 12, category: 'MongoDB', difficulty: 2, question: 'MongoDB 中，replica set 节点有哪几种类型？', options: ['Primary / Secondary / Arbiter', 'Master / Slave / Relay', 'Leader / Follower / Watcher', 'Active / Standby / Halted'], answer: 0, explanation: 'MongoDB Replica Set 包含 Primary（接受写入）、Secondary（复制数据）、Arbiter（投票不存数据）三种节点。' },
  { id: 13, category: 'MongoDB', difficulty: 3, question: 'MongoDB Write Concern 的 "majority" 级别含义是？', options: ['写入任意一个节点即可', '写入 Primary 即返回', '写入多数节点并确认后返回', '写入所有节点后返回'], answer: 2, explanation: '"majority" 表示写入多数投票节点（多数派）并确认后客户端才收到成功响应，保证数据不丢失。' },
  { id: 14, category: 'MongoDB', difficulty: 2, question: 'MongoDB 聚合管道（Aggregation Pipeline）中，$group 和 $match 的执行顺序？', options: ['$group 先于 $match', '$match 先于 $group', '并行执行', '由查询优化器决定'], answer: 1, explanation: '在管道中 $match 应尽量放在前面以减少数据量；$group 在后面做分组聚合。顺序由管道设计者决定。' },
  { id: 15, category: 'MongoDB', difficulty: 1, question: 'MongoDB 中，如何查看当前所有数据库？', options: ['show dbs', 'db.adminCommand("listDatabases")', 'db.getDatabases()', 'ALL OF ABOVE'], answer: 3, explanation: '在 mongo shell 中，show dbs 和 db.adminCommand("listDatabases") 都可列出所有数据库。' },
  // Oracle
  { id: 16, category: 'Oracle', difficulty: 1, question: 'Oracle 数据库中，SGA 是用于什么的内存区域？', options: ['用户会话', '程序代码', '系统全局区，存放缓存数据', '后台进程'], answer: 2, explanation: 'SGA（System Global Area）是 Oracle 的共享内存区域，存放数据缓冲区、重做日志缓冲等。' },
  { id: 17, category: 'Oracle', difficulty: 2, question: 'Oracle Data Guard 中，"Maximum Availability" 模式的特点是？', options: ['最高性能，可能丢数据', '零数据丢失，但需要同网络', '同步复制，无数据丢失，支持自动 failover', '异步复制，性能最好'], answer: 2, explanation: 'Maximum Availability 模式采用同步传输（SYNC）+ LGWR，确保零数据丢失，且支持自动切换。' },
  { id: 18, category: 'Oracle', difficulty: 2, question: 'Oracle 中，如何查询当前用户的会话信息？', options: ['SELECT * FROM V$SESSION;', 'SHOW SESSIONS;', 'LIST SESSIONS;', 'DISPLAY SESSION;'], answer: 0, explanation: 'V$SESSION 是 Oracle 动态性能视图，存储当前所有会话信息，需要 SYSDBA 权限查看全部记录。' },
  { id: 19, category: 'Oracle', difficulty: 3, question: 'Oracle 自动存储管理（ASM）的条带化单元是？', options: ['AU（Allocation Unit）', 'Block', 'Extent', 'Segment'], answer: 0, explanation: 'ASM 以 AU（Allocation Unit）为分配单元，默认 1MB，条带化深度可选 1/4/8/16 AU。' },
  { id: 20, category: 'Oracle', difficulty: 1, question: 'Oracle 中，哪个视图用于查看执行计划？', options: ['V$SQL_PLAN', 'PLAN_TABLE', 'EXPLAIN_PLAN', 'ALL OF ABOVE'], answer: 3, explanation: 'EXPLAIN PLAN 将计划写入 PLAN_TABLE；V$SQL_PLAN 显示内存中正在执行的 SQL 计划；两者均可查看。' },
];

const CATEGORY_META: Record<string, { color: string; gradient: string; icon: string; dbIcon: string }> = {
  MySQL:      { color: '#00758F', gradient: 'linear-gradient(135deg, #00758F, #00A8CC)', icon: '🐬', dbIcon: 'MySQL' },
  PostgreSQL: { color: '#336791', gradient: 'linear-gradient(135deg, #336791, #5B6AB4)', icon: '🐘', dbIcon: 'PostgreSQL' },
  MongoDB:    { color: '#47A248', gradient: 'linear-gradient(135deg, #47A248, #6BBF59)', icon: '🍃', dbIcon: 'MongoDB' },
  Oracle:     { color: '#F80000', gradient: 'linear-gradient(135deg, #F80000, #FF4D4D)', icon: '🏛️', dbIcon: 'Oracle' },
};

const DIFFICULTY_META: Record<number, { label: string; color: string }> = {
  1: { label: '简单', color: '#22c55e' },
  2: { label: '中等', color: '#f59e0b' },
  3: { label: '困难', color: '#ef4444' },
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Confetti particle
function Confetti() {
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: ['#667eea', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6', '#a855f7'][i % 6],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 100 }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '-20px',
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.id % 2 === 0 ? '50%' : '2px',
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Animated background grid
function BgGrid() {
  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: '#0a0a1a',
        backgroundImage: `
          linear-gradient(rgba(102,126,234,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(102,126,234,0.07) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(102,126,234,0.15) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(118,75,162,0.1) 0%, transparent 60%)',
      }} />
    </>
  );
}

export default function QuizPage() {
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    setQuiz(shuffle(QUESTIONS).slice(0, 5));
  }, []);

  const q = quiz[current];
  const catMeta = q ? CATEGORY_META[q.category] : null;
  const diffMeta = q ? DIFFICULTY_META[q.difficulty] : null;

  function handleAnswer(idx: number) {
    if (answered) return;
    const correct = idx === q.answer;
    setSelected(idx);
    setAnswered(true);
    const pts = correct ? (4 - q.difficulty) * 10 : 0;
    if (correct) {
      setScore(s => s + pts);
      setSessionCorrect(c => c + 1);
      setCorrectCount(c => c + 1);
    }
  }

  function handleNext() {
    if (current + 1 >= quiz.length) {
      setDone(true);
      setTotalScore(s => s + score);
      setTotalAnswered(a => a + quiz.length);
      if (score / (quiz.length * 30) >= 0.6) setShowConfetti(true);
    } else {
      setAnimKey(k => k + 1);
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  function handleRestart() {
    setQuiz(shuffle(QUESTIONS).slice(0, 5));
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setDone(false);
    setSessionCorrect(0);
    setShowConfetti(false);
    setAnimKey(k => k + 1);
  }

  function handleNewRounds() {
    setTotalScore(0);
    setTotalAnswered(0);
    setCorrectCount(0);
    handleRestart();
  }

  if (!q && !done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⚙️</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>正在加载题库...</div>
        </div>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / (quiz.length * 30)) * 100);
    const maxPts = quiz.length * 30;
    const totalPct = Math.round(((totalScore) / ((totalAnswered || quiz.length) * 30)) * 100);
    const grade = pct >= 90 ? { emoji: '🏆', label: '太强了！', gradeColor: '#f59e0b' }
                   : pct >= 70 ? { emoji: '🌟', label: '很不错！', gradeColor: '#22c55e' }
                   : pct >= 50 ? { emoji: '💪', label: '继续加油！', gradeColor: '#3b82f6' }
                   : { emoji: '📚', label: '再接再厉！', gradeColor: '#a855f7' };

    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', position: 'relative', overflow: 'hidden' }}>
        <BgGrid />
        {showConfetti && <Confetti />}
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          {/* Main result card */}
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '32px',
            padding: '48px 32px',
            width: '100%',
            maxWidth: '480px',
            textAlign: 'center',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
            animation: 'fadeInUp 0.5s ease',
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '8px' }}>{grade.emoji}</div>
            <div style={{ fontSize: '0.85rem', color: grade.gradeColor, fontWeight: '700', letterSpacing: '0.1em', marginBottom: '4px' }}>{grade.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '32px' }}>本轮得分</div>

            <div style={{ fontSize: '4.5rem', fontWeight: '900', lineHeight: 1, marginBottom: '8px',
              background: `linear-gradient(135deg, ${grade.gradeColor}, #a855f7)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {score}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '32px', fontSize: '0.85rem' }}>
              满分 {maxPts} · 正确率 {pct}%
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '36px' }}>
              {[
                { label: '正确', value: `${sessionCorrect}/${quiz.length}`, color: '#22c55e' },
                { label: '本轮得分', value: score, color: grade.gradeColor },
                { label: '累计得分', value: totalScore, color: '#667eea' },
              ].map(stat => (
                <div key={stat.label} style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '16px',
                  padding: '12px 8px', border: `1px solid ${stat.color}30`,
                }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '16px', marginBottom: '32px' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', letterSpacing: '0.05em' }}>各数据库正确率</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {(['MySQL', 'PostgreSQL', 'MongoDB', 'Oracle'] as const).map(cat => {
                  const catQuestions = QUESTIONS.filter(q => q.category === cat);
                  const catCorrect = catQuestions.filter(q => answered && q.answer === q.answer).length;
                  return (
                    <div key={cat} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: `${CATEGORY_META[cat].color}20`,
                      padding: '4px 10px', borderRadius: '20px',
                      border: `1px solid ${CATEGORY_META[cat].color}40`,
                    }}>
                      <span>{CATEGORY_META[cat].icon}</span>
                      <span style={{ fontSize: '0.75rem', color: CATEGORY_META[cat].color, fontWeight: '600' }}>{cat}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              style={{ ...btnBase, background: 'linear-gradient(135deg, #667eea, #764ba2)', marginBottom: '10px', fontSize: '1rem' }}
              onClick={handleRestart}
            >
              🔄 再来一轮
            </button>
            <button
              style={{ ...btnBase, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}
              onClick={handleNewRounds}
            >
              🆕 重新开始
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((current) / quiz.length) * 100;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', position: 'relative', overflow: 'hidden' }}>
      <BgGrid />
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform: translateY(24px); } to { opacity:1; transform: translateY(0); } }
        @keyframes slideIn  { from { opacity:0; transform: translateX(20px); } to { opacity:1; transform: translateX(0); } }
        @keyframes pulse    { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
        button:active { transform: scale(0.97); }
      `}</style>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,10,26,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 20px',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(102,126,234,0.4)',
            }}>🗄️</div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff', letterSpacing: '-0.01em' }}>数据库闯关</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>Database Quiz</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(102,126,234,0.15)', padding: '5px 12px', borderRadius: '20px',
              border: '1px solid rgba(102,126,234,0.3)',
            }}>
              <span style={{ fontSize: '0.85rem' }}>🏅</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#667eea' }}>{totalScore + score}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
              {current + 1}/{quiz.length}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #667eea, #a855f7)',
          transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 0 8px rgba(102,126,234,0.6)',
        }} />
      </div>

      {/* Question area */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }} key={animKey}>
        {/* Question card */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: '24px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
          animation: 'fadeInUp 0.35s ease',
        }}>
          {/* Category + difficulty row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: catMeta!.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', boxShadow: `0 4px 12px ${catMeta!.color}40`,
              }}>
                {catMeta!.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: catMeta!.color }}>{catMeta!.dbIcon}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.35)' }}>Q{q.id}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '0.72rem', fontWeight: '700', color: diffMeta!.color,
                background: `${diffMeta!.color}18`, padding: '3px 10px', borderRadius: '20px',
                border: `1px solid ${diffMeta!.color}30`,
              }}>
                {diffMeta!.label}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.25)' }}>
                {'⭐'.repeat(q.difficulty)}
              </span>
            </div>
          </div>

          {/* Question text */}
          <h2 style={{
            fontSize: '1.05rem', fontWeight: '700', lineHeight: '1.65',
            color: '#1a1a2e', marginBottom: '22px', letterSpacing: '-0.01em',
          }}>
            {q.question}
          </h2>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {q.options.map((opt, idx) => {
              let bg = '#f8f9fa';
              let border = '#e5e7eb';
              let color = '#374151';
              let icon = '○';
              let shadow = 'none';
              if (answered) {
                if (idx === q.answer) {
                  bg = '#dcfce7'; border = '#22c55e'; color = '#166534'; icon = '✅';
                  shadow = '0 0 0 3px rgba(34,197,94,0.15)';
                } else if (idx === selected) {
                  bg = '#fee2e2'; border = '#ef4444'; color = '#991b1b'; icon = '❌';
                  shadow = '0 0 0 3px rgba(239,68,68,0.15)';
                }
              } else if (hovered === idx) {
                bg = '#eef2ff'; border = '#667eea'; color = '#4338ca';
                shadow = '0 0 0 3px rgba(102,126,234,0.12)';
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={answered}
                  onMouseEnter={() => !answered && setHovered(idx)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px 16px', borderRadius: '14px',
                    border: `2px solid ${border}`, background: bg,
                    cursor: answered ? 'default' : 'pointer',
                    textAlign: 'left', transition: 'all 0.18s ease',
                    boxShadow: shadow,
                    animation: answered ? 'none' : `slideIn 0.25s ease ${idx * 0.05}s both`,
                  }}
                >
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: answered && idx === q.answer ? '#22c55e'
                               : answered && idx === selected ? '#ef4444'
                               : '#e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', flexShrink: 0,
                    color: answered ? '#fff' : 'rgba(0,0,0,0.4)',
                    transition: 'background 0.18s',
                  }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '500', lineHeight: '1.5', flex: 1 }}>{opt}</span>
                  {answered && idx === q.answer && (
                    <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: '700', flexShrink: 0 }}>正确答案</span>
                  )}
                  {answered && idx === selected && idx !== q.answer && (
                    <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '700', flexShrink: 0 }}>你的选择</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {answered && (
            <div style={{
              marginTop: '16px', padding: '16px',
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: '14px', border: '1px solid #fde047',
              animation: 'fadeInUp 0.3s ease',
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' }}>💡</span>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#854d0e', marginBottom: '4px', letterSpacing: '0.05em' }}>解析</div>
                  <div style={{ fontSize: '0.875rem', lineHeight: '1.65', color: '#713f12' }}>{q.explanation}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Score mini bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
          padding: '0 4px',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>本轮</span>
          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(score / (quiz.length * 30)) * 100}%`,
              background: 'linear-gradient(90deg, #22c55e, #10b981)',
              borderRadius: '4px', transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#22c55e', flexShrink: 0 }}>
            {score}/{quiz.length * 30}
          </span>
        </div>

        {/* Next button */}
        {answered && (
          <button
            style={{ ...btnBase, background: 'linear-gradient(135deg, #667eea, #764ba2)', animation: 'fadeInUp 0.3s ease' }}
            onClick={handleNext}
          >
            {current + 1 >= quiz.length ? '🎉 查看结果' : '下一题 →'}
          </button>
        )}
      </div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  display: 'block', width: '100%', padding: '15px',
  color: '#fff', border: 'none', borderRadius: '14px',
  fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
  transition: 'all 0.2s',
};
