'use client';

import { useState, useEffect } from 'react';

type Question = {
  id: number;
  category: 'MySQL' | 'PostgreSQL' | 'MongoDB' | 'Oracle';
  difficulty: 1 | 2 | 3;
  question: string;
  options: string[];
  answer: number; // 0-based index of correct option
  explanation: string;
};

const QUESTIONS: Question[] = [
  // MySQL
  {
    id: 1,
    category: 'MySQL',
    difficulty: 1,
    question: 'MySQL 中，如何查看当前所有数据库？',
    options: ['SHOW DATABASES;', 'LIST DATABASES;', 'SHOW DB;', 'DISPLAY DATABASES;'],
    answer: 0,
    explanation: 'MySQL 标准语法是 SHOW DATABASES; 用于列出所有数据库。',
  },
  {
    id: 2,
    category: 'MySQL',
    difficulty: 2,
    question: 'InnoDB 的默认隔离级别是？',
    options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'],
    answer: 2,
    explanation: 'InnoDB 默认隔离级别是 Repeatable Read，通过 MVCC + Next-Key Locking 防止幻读。',
  },
  {
    id: 3,
    category: 'MySQL',
    difficulty: 2,
    question: 'MySQL 联合索引 (a, b, c) 中，以下哪个查询能命中索引？',
    options: ['WHERE a=1 AND b=2', 'WHERE b=2 AND c=3', 'WHERE c=3', 'WHERE b=2'],
    answer: 0,
    explanation: '联合索引遵循最左前缀原则，必须包含 a 列才能命中索引。',
  },
  {
    id: 4,
    category: 'MySQL',
    difficulty: 3,
    question: 'MySQL 半同步复制（Semi-sync Replication）的作用是？',
    options: [
      '提升复制速度',
      '确保主库提交时至少有一个从库已接收并写入relay log',
      '自动 failover',
      '支持多主复制',
    ],
    answer: 1,
    explanation: '半同步复制确保事务在主库提交前，至少有一个从库确认收到 binlog 数据，防止数据丢失。',
  },
  {
    id: 5,
    category: 'MySQL',
    difficulty: 1,
    question: 'MySQL 中用于存储引擎是 InnoDB 的系统表是哪个？',
    options: ['MyISAM', 'InnoDB', 'MEMORY', 'BLACKHOLE'],
    answer: 1,
    explanation: 'InnoDB 是 MySQL 5.5+ 的默认存储引擎，支持事务和行级锁。',
  },
  // PostgreSQL
  {
    id: 6,
    category: 'PostgreSQL',
    difficulty: 1,
    question: 'PostgreSQL 查看版本的命令是？',
    options: ['SELECT VERSION();', 'SHOW VERSION;', 'VERSION();', 'PG_VERSION();'],
    answer: 0,
    explanation: 'PostgreSQL 使用 SELECT VERSION(); 查看版本信息，结果类似 "PostgreSQL 16.2 on x86_64..."',
  },
  {
    id: 7,
    category: 'PostgreSQL',
    difficulty: 2,
    question: 'PostgreSQL 中，以下哪种索引类型支持全文搜索？',
    options: ['B-tree', 'GiST', 'GIN', 'BRIN'],
    answer: 2,
    explanation: 'GIN（Generalized Inverted Index）索引支持全文搜索和数组类型；GiST 用于几何类型。',
  },
  {
    id: 8,
    category: 'PostgreSQL',
    difficulty: 3,
    question: 'PostgreSQL MVCC 实现依赖的关键数据结构是？',
    options: ['Redo Log', 'Undo Log', 'WAL', 'Vacuum'],
    answer: 2,
    explanation: 'PostgreSQL 通过 WAL（Write-Ahead Log）配合 Vacuum 清理旧版本实现 MVCC，不依赖回滚段。',
  },
  {
    id: 9,
    category: 'PostgreSQL',
    difficulty: 2,
    question: 'PostgreSQL 中，如何让一个查询使用多个 CPU 核心并行执行？',
    options: ['PARALLEL hint', 'SET max_parallel_workers_per_gather = 4', 'JOIN PARALLEL', 'USE MULTICORE'],
    answer: 1,
    explanation: '通过设置 max_parallel_workers_per_gather 参数，PostgreSQL 可对顺序扫描、聚合等操作启用并行。',
  },
  {
    id: 10,
    category: 'PostgreSQL',
    difficulty: 1,
    question: 'PostgreSQL 中，哪个命令用于修改用户密码？',
    options: ['ALTER USER ... SET PASSWORD', 'SET PASSWORD', 'CREATE USER ... WITH PASSWORD', 'GRANT PASSWORD'],
    answer: 0,
    explanation: 'PostgreSQL 使用 ALTER USER username WITH PASSWORD \'newpassword\'; 修改密码。',
  },
  // MongoDB
  {
    id: 11,
    category: 'MongoDB',
    difficulty: 1,
    question: 'MongoDB 文档的最大大小是多少？',
    options: ['8MB', '16MB', '32MB', '无限制'],
    answer: 1,
    explanation: 'MongoDB 单个文档（Document）最大为 16MB，这是 BSON 文档格式的限制。',
  },
  {
    id: 12,
    category: 'MongoDB',
    difficulty: 2,
    question: 'MongoDB 中，replica set 节点有哪几种类型？',
    options: ['Primary / Secondary / Arbiter', 'Master / Slave / Relay', 'Leader / Follower / Watcher', 'Active / Standby / Halted'],
    answer: 0,
    explanation: 'MongoDB Replica Set 包含 Primary（接受写入）、Secondary（复制数据）、Arbiter（投票不存数据）三种节点。',
  },
  {
    id: 13,
    category: 'MongoDB',
    difficulty: 3,
    question: 'MongoDB Write Concern 的 "majority" 级别含义是？',
    options: [
      '写入任意一个节点即可',
      '写入 Primary 即返回',
      '写入多数节点并确认后返回',
      '写入所有节点后返回',
    ],
    answer: 2,
    explanation: '"majority" 表示写入多数投票节点（多数派）并确认后客户端才收到成功响应，保证数据不丢失。',
  },
  {
    id: 14,
    category: 'MongoDB',
    difficulty: 2,
    question: 'MongoDB 聚合管道（Aggregation Pipeline）中，$group 和 $match 的执行顺序？',
    options: ['$group 先于 $match', '$match 先于 $group', '并行执行', '由查询优化器决定'],
    answer: 1,
    explanation: '在管道中 $match 应尽量放在前面以减少数据量；$group 在后面做分组聚合。顺序由管道设计者决定。',
  },
  {
    id: 15,
    category: 'MongoDB',
    difficulty: 1,
    question: 'MongoDB 中，如何查看当前所有数据库？',
    options: ['show dbs', 'db.adminCommand("listDatabases")', 'db.getDatabases()', 'ALL OF ABOVE'],
    answer: 3,
    explanation: '在 mongo shell 中，show dbs 和 db.adminCommand("listDatabases") 都可列出所有数据库。',
  },
  // Oracle
  {
    id: 16,
    category: 'Oracle',
    difficulty: 1,
    question: 'Oracle 数据库中，SGA 是用于什么的内存区域？',
    options: ['用户会话', '程序代码', '系统全局区，存放缓存数据', '后台进程'],
    answer: 2,
    explanation: 'SGA（System Global Area）是 Oracle 的共享内存区域，存放数据缓冲区、重做日志缓冲等。',
  },
  {
    id: 17,
    category: 'Oracle',
    difficulty: 2,
    question: 'Oracle Data Guard 中，"Maximum Availability" 模式的特点是？',
    options: [
      '最高性能，可能丢数据',
      '零数据丢失，但需要同网络',
      '同步复制，无数据丢失，支持自动 failover',
      '异步复制，性能最好',
    ],
    answer: 2,
    explanation: 'Maximum Availability 模式采用同步传输（SYNC）+ LGWR，确保零数据丢失，且支持自动切换。',
  },
  {
    id: 18,
    category: 'Oracle',
    difficulty: 2,
    question: 'Oracle 中，如何查询当前用户的会话信息？',
    options: ['SELECT * FROM V$SESSION;', 'SHOW SESSIONS;', 'LIST SESSIONS;', 'DISPLAY SESSION;'],
    answer: 0,
    explanation: 'V$SESSION 是 Oracle 动态性能视图，存储当前所有会话信息，需要 SYSDBA 权限查看全部记录。',
  },
  {
    id: 19,
    category: 'Oracle',
    difficulty: 3,
    question: 'Oracle 自动存储管理（ASM）的条带化单元是？',
    options: ['AU（Allocation Unit）', 'Block', 'Extent', 'Segment'],
    answer: 0,
    explanation: 'ASM 以 AU（Allocation Unit）为分配单元，默认 1MB，条带化深度可选 1/4/8/16 AU。',
  },
  {
    id: 20,
    category: 'Oracle',
    difficulty: 1,
    question: 'Oracle 中，哪个视图用于查看执行计划？',
    options: ['V$SQL_PLAN', 'PLAN_TABLE', 'EXPLAIN_PLAN', 'ALL OF ABOVE'],
    answer: 3,
    explanation: 'EXPLAIN PLAN 将计划写入 PLAN_TABLE；V$SQL_PLAN 显示内存中正在执行的 SQL 计划；两者均可查看。',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  MySQL: '#00758F',
  PostgreSQL: '#336791',
  MongoDB: '#47A248',
  Oracle: '#F80000',
};

const DIFFICULTY_STARS: Record<number, string> = {
  1: '⭐',
  2: '⭐⭐',
  3: '⭐⭐⭐',
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function QuizPage() {
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [answeredIds, setAnsweredIds] = useState<number[]>([]);

  useEffect(() => {
    setQuiz(shuffle(QUESTIONS).slice(0, 5));
  }, []);

  const q = quiz[current];

  function handleAnswer(idx: number) {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const correct = idx === q.answer;
    if (correct) setScore(s => s + (4 - q.difficulty) * 10);
    setAnsweredIds(ids => [...ids, q.id]);
  }

  function handleNext() {
    if (current + 1 >= quiz.length) {
      setDone(true);
    } else {
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
    setTotalScore(s => s + score);
  }

  if (!q && !done) return (
    <div style={styles.container}>
      <div style={styles.loading}>加载中...</div>
    </div>
  );

  if (done) {
    const pct = Math.round((score / (quiz.length * 30)) * 100);
    return (
      <div style={styles.container}>
        <div style={styles.resultCard}>
          <div style={styles.resultEmoji}>{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'}</div>
          <h2 style={styles.resultTitle}>本轮得分</h2>
          <div style={styles.resultScore}>{score} 分</div>
          <p style={styles.resultPct}>正确率 {pct}% · 累计 {totalScore + score} 分</p>
          <button style={styles.btnPrimary} onClick={handleRestart}>再来一轮</button>
          <button style={styles.btnSecondary} onClick={() => { setTotalScore(s => s + score); setScore(0); handleRestart(); }}>换题目</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerTitle}>🗄️ 数据库闯关</span>
          <span style={styles.scoreBadge}>🏅 {totalScore + score} 分</span>
        </div>
        <div style={styles.progress}>
          {current + 1} / {quiz.length}
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${((current) / quiz.length) * 100}%` }} />
      </div>

      {/* Question Card */}
      <div style={styles.card}>
        <div style={styles.cardMeta}>
          <span style={{ ...styles.catBadge, background: CATEGORY_COLORS[q.category] }}>
            {q.category}
          </span>
          <span style={styles.diffBadge}>{DIFFICULTY_STARS[q.difficulty]}</span>
        </div>

        <h2 style={styles.question}>{q.question}</h2>

        <div style={styles.options}>
          {q.options.map((opt, idx) => {
            let bg = '#f8f9fa';
            let border = '#e9ecef';
            let color = '#212529';
            if (answered) {
              if (idx === q.answer) { bg = '#d4edda'; border = '#28a745'; }
              else if (idx === selected) { bg = '#f8d7da'; border = '#dc3545'; }
            } else if (selected === idx) {
              bg = '#e7f3ff'; border = '#007bff';
            }
            return (
              <button
                key={idx}
                style={{ ...styles.option, background: bg, borderColor: border, color }}
                onClick={() => handleAnswer(idx)}
                disabled={answered}
              >
                <span style={styles.optionIdx}>{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </button>
            );
          })}
        </div>

        {answered && (
          <div style={styles.explainer}>
            <div style={styles.explainerIcon}>💡</div>
            <div style={styles.explainerText}>{q.explanation}</div>
          </div>
        )}
      </div>

      {/* Score strip */}
      <div style={styles.scoreStrip}>
        <span>本轮得分 <strong>{score}</strong> / {quiz.length * 30}</span>
        <span>累计 <strong>{totalScore + score}</strong></span>
      </div>

      {/* Next button */}
      {answered && (
        <button style={styles.btnPrimary} onClick={handleNext}>
          {current + 1 >= quiz.length ? '查看结果 →' : '下一题 →'}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#1a1a2e', fontFamily: "'PingFang SC', 'Helvetica Neue', Arial, sans-serif", padding: '0', color: '#fff' },
  loading: { color: '#fff', textAlign: 'center', marginTop: '40vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(255,255,255,0.05)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  headerTitle: { fontSize: '1.1rem', fontWeight: '700' },
  scoreBadge: { background: 'linear-gradient(135deg,#f59e0b,#d97706)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' },
  progress: { color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' },
  progressBar: { height: '3px', background: 'rgba(255,255,255,0.1)' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #667eea, #764ba2)', transition: 'width 0.3s ease' },
  card: { margin: '24px 16px', background: 'rgba(255,255,255,0.97)', borderRadius: '20px', padding: '24px', color: '#212529' },
  cardMeta: { display: 'flex', gap: '8px', marginBottom: '16px' },
  catBadge: { color: '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' },
  diffBadge: { fontSize: '0.75rem' },
  question: { fontSize: '1.05rem', fontWeight: '600', lineHeight: '1.6', marginBottom: '20px', color: '#1a1a2e' },
  options: { display: 'flex', flexDirection: 'column', gap: '10px' },
  option: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: '2px solid', fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' },
  optionIdx: { fontWeight: '700', flexShrink: 0, minWidth: '20px' },
  explainer: { display: 'flex', gap: '10px', marginTop: '16px', padding: '14px', background: '#fff3cd', borderRadius: '12px', border: '1px solid #ffc107' },
  explainerIcon: { fontSize: '1.1rem', flexShrink: 0 },
  explainerText: { fontSize: '0.88rem', lineHeight: '1.6', color: '#856404' },
  scoreStrip: { display: 'flex', justifyContent: 'space-between', padding: '12px 20px', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' },
  btnPrimary: { display: 'block', width: 'calc(100% - 32px)', margin: '0 16px 24px', padding: '14px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' },
  btnSecondary: { display: 'block', width: 'calc(100% - 32px)', margin: '8px 16px 24px', padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '14px', fontSize: '0.9rem', cursor: 'pointer' },
  resultCard: { textAlign: 'center', padding: '40px 24px' },
  resultEmoji: { fontSize: '4rem', marginBottom: '16px' },
  resultTitle: { color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontSize: '0.9rem' },
  resultScore: { fontSize: '4rem', fontWeight: '800', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  resultPct: { color: 'rgba(255,255,255,0.5)', marginBottom: '32px' },
};
