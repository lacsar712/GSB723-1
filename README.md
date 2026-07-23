# Vocabulary Learning Website / 智能背单词应用

An intelligent Chinese-English vocabulary learning application featuring adaptive testing and an i+1 recommendation algorithm. Built with React (Vite), Node.js, and SQLite.
一个基于 React (Vite) 和 Node.js 开发的智能背单词应用，具备自适应词汇量测试与 i+1 难度推荐算法，全中文界面支持。

## Features / 功能特性

### 1. Adaptive Vocabulary Test / 自适应词汇量测试

- **Assessment**: Accurately estimates your current vocabulary size using a dynamic testing mechanism. (通过自适应难度的测试题目，准确测量用户当前的英语词汇量水平)
- **Result Analysis**: Provides immediate feedback and a baseline for your learning journey. (测试完成后提供预估词汇量数据，作为后续推荐算法的基准)

### 2. Smart Recommendation Engine / i+1 智能推荐

- **i+1 Algorithm**: Recommends words that are slightly above your current level based on Krashen's input hypothesis. (基于 i+1 理论（可理解输入），为您推荐略高于当前水平的单词，确保学习效率最大化)
- **Daily Recommendations**: Learn one word at a time with definitions, pronunciation, and example sentences. (每日推荐单词卡片，包含标准发音、中文释义及例句)
- **Interactive Control**:
  - **Mark as Learned (标为已掌握)**: Adds the word to your learned history and triggers a new recommendation.
  - **Skip (跳过)**: Temporarily skip a word if it's not relevant or you want to see something else.

### 3. Dashboard & Progress / 仪表盘与进度

- **Visualized Stats**: Track your daily learning velocity with interactive charts. (可视化展示每日学习进度与单词积累曲线)
- **Review Mode**: Review all mastered words in a dedicated modal list with audio support. (复习模式：随时查看已掌握单词列表，并可点击播放发音)
- **Retake Test**: Option to retake the vocabulary test to update your difficulty level. (支持随时重测词汇量，动态调整推荐难度)

### 4. User Experience / 用户体验

- **Glassmorphism UI**: Modern, aesthetic dark-mode design with smooth animations using Framer Motion. (极光玻璃拟态风格设计，深色模式配合丝滑动画，提供沉浸式体验)
- **Bilingual Interface**: Full Chinese localization for all UI elements and word definitions. (全中文界面与单词释义，专为中文用户优化)
- **Secure Auth**: JWT-based authentication with secure password hashing. (基于 JWT 的安全登录注册系统)

## Quick Start (Docker) / 快速部署

Use Docker Compose for a one-click deployment of the full stack (Frontend + Backend + Database).
使用 Docker Compose 一键启动前端、后端及数据库服务。

```bash
docker compose up --build -d
```

- **Frontend / 前端**: http://localhost:80
- **Backend / 后端**: http://localhost:3000

## How to Use / 使用指南

1. **Register / 注册**: Access http://localhost and click "Create Account" to create a new user. (访问首页并创建新账号)
2. **Take Test / 测试**: Complete the initial vocabulary test to determine your starting level. (完成初始化词汇量测试)
3. **Start Learning / 开始学习**:
   - On the dashboard, view your recommended word. (在主页查看推荐单词)
   - Click the **Volume** icon to hear pronunciation. (点击喇叭图标听发音)
   - Click **"Mark as Learned" (标为已掌握)** to finish a word. (点击“标为已掌握”完成学习)
   - Click the **Book** icon to skip. (点击书本图标跳过)
4. **Manage / 管理**:
   - Use the top-right **Refresh** button to reload data. (右上角刷新按钮同步数据)
   - Use the top-right **Log Out** button to exit. (右上角退出按钮注销登录)

## Tech Stack / 技术栈

### Frontend (前端)

- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS
- **Animation**: Framer Motion
- **Visualization**: Recharts
- **Icons**: Lucide React

### Backend (后端)

- **Runtime**: Node.js v22
- **Framework**: Express.js
- **Database**: SQLite3 (Persistent storage via Docker volume)
- **Security**: BCrypt, JSON Web Tokens (JWT)

### DevOps

- **Container**: Docker, Docker Compose
- **Server**: Nginx (Frontend serving & Proxy)

## Troubleshooting / 常见问题

- **Build Failures / 构建失败**:
  If you encounter architecture related errors (e.g. `sqlite3` bindings), try rebuilding without cache:
  如果遇到架构相关的错误（如 `node_sqlite3`），请尝试清理并重建：

  ```bash
  docker-compose down -v
  docker-compose up --build -d
  ```

- **Data Persistence / 数据持久化**:
  Database file is stored in `./backend/vocab.db`. The Docker setup uses a volume mapping to ensure data survives container restarts.
  数据库文件位于 `./backend/vocab.db`。Docker 配置了卷映射，确保重启容器后数据不会丢失。
