# 思考轨迹

## 1. 需求分析与技术选型
**用户目标**：构建一个功能完整的背单词网站，核心在于“词汇量测试”与“i+1智能推荐”。
**关键约束**：
- 前端：Modern JS Framework (选定 React + Vite + Tailwind)。
- 后端：RESTful API + Database (选定 Node.js Express + SQLite)。
- 体验：极致美观、响应式、性能指标（<3s加载）。
- 交付：无 Docker，真实模拟数据，自测文档。

## 2. 核心算法设计
- **词汇量测试 (Test)**：
  - 简化为随机抽取 10 个不同难度等级（Rank 500-10000）的单词。
  - 根据答对数量估算 `i` 值 (e.g., Score/Total * 10000)。
- **推荐引擎 (Recommend)**：
  - 基于 Krashen 的 i+1 理论。
  - SQL 逻辑：`SELECT * FROM words WHERE rank > user_vocab_size ORDER BY rank ASC LIMIT 1`。
  - 确保排除已学单词。

## 3. 架构设计
- **数据库 (SQLite)**：
  - `users`: 存储基础信息及 `vocab_size` (i)。
  - `words`: 存储单词详情及 `rank` (难度分级)。
  - `learning_history`: 多对多关联，记录学习进度。
- **后端 (Express)**：
  - Auth Middleware (JWT) 保护学习接口。
  - 分离 Auth、Test、Recommend 路由。
- **前端 (React)**：
  - **Context API** 管理用户登录状态。
  - **Recharts** 可视化学习曲线。
  - **Framer Motion** 实现卡片切换与页面进场动画，满足“Wow”的视觉要求。
- **Docker 容器化**：
  - `docker-compose.yml` 编排 Nginx (Frontend) + Node.js (Backend)。
  - 生产环境构建：Build Stage -> Nginx Alpine。

## 4. 开发实施路径
1.  **环境搭建**：初始化前后端项目结构，安装必要依赖 (Express, sqlite3, React, Tailwind)。
2.  **后端实现**：
    - 编写数据库初始化脚本 (`database.js`)，注入真实单词数据（无乱码）。
    - 实现 API：`/api/login`, `/api/test/words`, `/api/recommend`。
3.  **前端实现**：
    - 配置 Tailwind CSS theme，定义 Primary/Secondary 渐变色。
    - 开发 `VocabularyTest` 组件：交互式答题卡片。
    - 开发 `Dashboard` 组件：展示当前单词与 Pronunciation/Definition，集成图表。
4.  **UI/UX 打磨**：
    - 引入 Glassmorphism (玻璃拟态) 样式。
    - 添加 Loading 状态与平滑过渡。
    - 确保 Responsive 布局适配移动端。

## 5. 自测与验收
- 验证 API 响应速度（本地 SQLite 极快，符合 <1s 要求）。
- 检查中文编码（SQLite 默认 UTF-8，无乱码）。
- 确认模拟数据的真实性（使用 Cambridge/Oxford 常见词汇定义）。
- 最终生成交付文档 `SELF_TEST.md`。
