# 3D 山地森林 - 每个人种一棵树

## 概念

一个极简的 3D 山地森林网页。用户输入名字后，会在山地场景中种下一棵树。随着参与人数增多，网页变成一片越来越茂密的山地森林。每个人都可以看到所有人种下的树，树会出现在山坡上或平地上。

## 设计风格

**Low-Poly 山地森林**
- 纯色渐变天空（深蓝到浅蓝）
- 扁平化树木（三角形树冠 + 矩形树干）
- 多峰山脉（灰色岩石 + 绿坡 + 白色雪顶）
- 简约地面（纯色平面）
- 无复杂光影

## 技术方案

**前端**
- Next.js 14
- Three.js（3D 渲染，CDN 引入）
- 手写 Canvas 纹理 + Sprite 文字标签

**数据库**
- Supabase（已配置）
- `forest` 表：id, name, position_x, position_z, **position_y**, tree_type, created_at

## 山地模型

### 山峰配置（8座山）
| 山峰 | X | Z | 高度 | 半径 |
|------|---|---|------|------|
| 主峰 | 0 | 0 | 40 | 70 |
| 副峰1 | -55 | -35 | 28 | 50 |
| 副峰2 | 60 | -30 | 25 | 45 |
| 副峰3 | 50 | 55 | 22 | 42 |
| 副峰4 | -50 | 50 | 20 | 38 |
| 副峰5 | 0 | -70 | 18 | 35 |
| 副峰6 | -65 | 10 | 16 | 32 |
| 副峰7 | 70 | 15 | 15 | 30 |

### 高度计算
`getMountainHeight(x, z)` — 使用 cosine 衰减计算任意 X,Z 的山体高度：
```
h = peak_height * 0.5 * (1 + cos(pi * dist / radius))
```

### 山体外观
- 岩石底层（深灰色 ConeGeometry）
- 植被中层（棕绿色 ConeGeometry）
- 雪顶（白色 ConeGeometry）

## 功能

### 输入名字种树
1. 用户输入名字
2. 点击"种树"按钮
3. 树位置根据螺旋分布算法落在地形上
4. Y 坐标由 `getMountainHeight(x, z)` 计算（山坡或平地）
5. 数据存入 Supabase（position_y 字段）
6. 3D 场景中动态种下一棵树（带种植动画）

### 3D 场景
- 相机可 360° 旋转查看森林
- 相机默认拉远（适应山地范围更大）
- 自动排列树木位置（螺旋分布，覆盖山地和平原）
- 树木有轻微摇摆动画
- 参与者名字悬停显示

### 计数器
- 显示"已有 X 棵树"

## 树木设计

每棵树是极简几何体：
- **树干**：深棕色矩形（CylinderGeometry）
- **树冠**：绿色三角形（ConeGeometry）
- 不同 tree_type 决定树冠形状（5种：圆润绿树/樱花/枫树/松树/棕榈）

## 颜色

- 天空：`#1a237e` → `#3949ab` → `#7986cb` → `#c5cae9` 渐变
- 地面：`#4caf50` 浅绿
- 树干：`#5d4037` 棕色
- 树冠：`#2e7d32` 森林绿 / `#f48fb1` 粉色 / `#e64a19` 橙红 / `#1b5e20` 深绿 / `#43a047` 热带绿
- 山体岩石：`#6d5c52` 深灰
- 山体植被：`#5d7a3a` 棕绿
- 山体雪顶：`#f5f5f5` 白色

## 数据库 Schema

```sql
CREATE TABLE forest (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  position_x REAL NOT NULL,
  position_z REAL NOT NULL,
  position_y REAL DEFAULT 0,    -- 山体高度（新增字段）
  tree_type INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
