# YouTube Learning Companion App

---

## 🌐 Language / 言語

- [日本語版](#日本語版)
- [English Version](#english-version)

---

# 日本語版

## 1. プロジェクト概要

### 1.1 目的 (What & Why)

このプロジェクトは、**YouTube動画のトランスクリプト（字幕）を活用し、動画視聴、タイムスタンプ付き目次の探索、およびコンテンツに関する対話型チャットを融合させた最高の学習体験を実現するWebアプリケーション**の開発を目的としています。

従来のYouTube視聴体験では、長い動画から特定の情報を探したり、内容を深く理解したりすることが困難でした。このアプリケーションは、AI技術を活用して以下を実現します：

- **効率的な学習**: 自動生成される目次で、必要な箇所に素早くアクセス
- **深い理解**: 動画内容に関する質問に即座に回答するAIチャット機能
- **シームレスな体験**: 動画、字幕、チャットが一体となった統合インターフェース

## 2. 主要機能

### ✅ 認証・セキュリティ
- Google OAuthによる安全なユーザー認証
- セッション管理と保護されたページアクセス

### 📹 動画管理
- YouTube動画のURLからのワンクリックインポート
- 動画メタデータ（タイトル、説明、サムネイル、チャンネル名）の自動取得
- タイムスタンプ付き字幕データの取得・保存
- ダッシュボードでの動画一覧表示と管理
- 動画削除機能（イベント競合を考慮した安全な実装）

### 🎓 学習体験
- **統合学習画面**:
  - YouTube動画プレーヤー
  - リアルタイム同期するタイムスタンプ付き字幕表示
  - AI生成による自動目次（チャプター）
  - 動画内容に基づいた対話型AIチャット
- **インタラクティブ機能**:
  - 字幕や目次のクリックによる動画シーク
  - AIチャットの回答からタイムスタンプへのジャンプ
  - 字幕内検索機能
  - チャット履歴の保存・表示

### 🎨 UI/UX
- レスポンシブデザイン（モバイル/タブレット/デスクトップ対応）
- Tailwind CSSによる美しいインターフェース
- 3カラムレイアウト（リサイズ可能なパネル）
- ローディング状態とエラーメッセージの適切な表示

## 3. 技術スタック

| 分野 | 技術 |
|------|------|
| **フレームワーク** | Next.js (App Router) |
| **言語** | TypeScript |
| **認証** | NextAuth.js + Google Provider |
| **スタイリング** | Tailwind CSS |
| **データベース** | Prisma (RDBMS推奨) |
| **API連携** | YouTube Data API v3 |
| **AI** | Claude 3.5 Sonnet (予定) |

## 4. エージェント構成 (開発プロセス)

このプロジェクトは、長期間の自律的な開発（ロングラン）と精度維持のため、**マルチエージェント方式**により進行します。

### 4.1 イニシャライザーエージェント (Initializer Agent)

**担当**: Antigravity (Gemini 1.5 Pro)

**役割**:
- プロジェクトの初期設定とタスクのオーケストレーション
- 詳細な機能リスト (`features.json`) のJSON形式での作成
- Gitの初期化とファイル差分追跡の設定
- 作業ログ (`progress.txt`) の定義

### 4.2 コーディングエージェント (Coding Agent)

**担当**: Claude Sonnet 4.5

**役割**:
- イニシャライザーが作成した機能リストからタスクを一つずつ選んで実装
- コード品質の維持と既存機能の保守
- タスク完了後のコミットログ作成と次タスクへの引き継ぎ

### 4.3 関心事の分離 (Separation of Concerns)

このアプローチにより、以下のメリットを実現：
- **明確な役割分担**: 計画と実装を分離し、それぞれに最適化
- **品質保証**: 各エージェントが専門領域に集中
- **進捗の可視化**: `features.json`と`progress.txt`による透明な管理
- **長期的な安定性**: 段階的な開発により、複雑さを制御

## 5. プロジェクト構造

```
youtube-learning-companion/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   ├── (auth)/            # 認証関連ページ
│   │   ├── (main)/
│   │   │   ├── dashboard/    # ダッシュボード
│   │   │   └── learn/[videoId]/ # 学習画面
│   │   ├── globals.css        # グローバルスタイル
│   │   └── layout.tsx         # ルートレイアウト
│   ├── components/            # 再利用可能なUIコンポーネント
│   ├── lib/                   # ユーティリティ関数・ビジネスロジック
│   └── types/                 # TypeScript型定義
├── docs/                      # プロジェクトドキュメント
│   ├── authentication.md      # Google OAuth認証の実装仕様
│   ├── import_video.md        # YouTube動画インポート機能の仕様
│   ├── ui_design_guidelines.md # UIデザインガイドライン
│   ├── incident_reports.md    # 過去の不具合と解決策
│   └── walkthrough_20241214.md # 修正の技術的詳細
├── prisma/
│   └── schema.prisma          # データベーススキーマ
├── features.json              # 機能リスト（Initializer管理）
├── progress.txt               # 作業進捗ログ（Coding Agent更新）
├── CLAUDE.md                  # AIエージェント向けプロジェクト指針
└── .env.local                 # 環境変数（Gitに含めない）
```

## 6. 開発環境のセットアップ

### 6.1 前提条件

- Node.js 18.x 以上
- npm, yarn, または pnpm
- Google Cloud Platform アカウント（OAuth認証用）
- YouTube Data API キー

### 6.2 セットアップ手順

#### 1. リポジトリのクローン

```bash
git clone https://github.com/tinyoko/cc_ytlearn.git
cd cc_ytlearn
```

#### 2. 依存関係のインストール

```bash
npm install
# または
yarn install
# または
pnpm install
```

#### 3. 環境変数の設定

`.env.local` ファイルをプロジェクトルートに作成し、以下の環境変数を設定してください：

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_SECRET=your_random_secret_string
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key
```

**環境変数の取得方法**:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: [Google Cloud Console](https://console.cloud.google.com/) でOAuth 2.0クライアントを作成
- `NEXTAUTH_SECRET`: `openssl rand -base64 32` で生成
- `YOUTUBE_API_KEY`: Google Cloud ConsoleでYouTube Data API v3を有効化

#### 4. データベースのセットアップ

```bash
# Prismaスキーマの適用とマイグレーション実行
npx prisma migrate dev --name init

# Prisma Clientの生成
npx prisma generate
```

#### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## 7. コーディング規約

### ディレクトリ配置ルール

- **コンポーネント**: `src/components/` に配置
- **API Routes**: `src/app/api/` に配置
- **型定義**: `src/types/` に配置
- **ユーティリティ関数**: `src/lib/` に配置

### コードスタイル

- **フォーマット**: Prettier を使用
- **静的解析**: ESLint を使用
- **命名規則**: camelCase（変数・関数）、PascalCase（コンポーネント・型）

## 8. 参照ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [`docs/authentication.md`](docs/authentication.md) | Google OAuth認証の実装仕様 |
| [`docs/import_video.md`](docs/import_video.md) | YouTube動画インポート機能の仕様 |
| [`docs/ui_design_guidelines.md`](docs/ui_design_guidelines.md) | UIデザインガイドライン（色、フォント、レイアウト） |
| [`features.json`](features.json) | タスク一覧（イニシャライザーが管理） |
| [`progress.txt`](progress.txt) | 作業進捗ログ（コーディングエージェントが更新） |
| [`docs/incident_reports.md`](docs/incident_reports.md) | **重要**: 過去の重大な不具合の解決策と再発防止策 |
| [`docs/walkthrough_20241214.md`](docs/walkthrough_20241214.md) | 字幕・動画削除機能修正の技術的詳細 |

## 9. 過去の修正経緯とAIへの申し送り事項

⚠️ **将来のAIエージェントへの重要な指示**

プロジェクトの安定稼働と今後の開発効率のため、以下の教訓を常に考慮してください（詳細は [`docs/incident_reports.md`](docs/incident_reports.md) を参照）。

### 9.1 タイムスタンプ判定ロジックの変更禁止

**背景**: 2025-12-14に発生した「字幕タイムスタンプが全て0:00と表示される」問題。

**原因**:
1. 恣意的な「10秒しきい値判定」により、有効なセグメントが除外されていた
2. `youtubei.js` からのクラスインスタンスを単純なプロパティアクセスで処理していた
3. データのJSON二重化による不整合

**解決策と申し送り**:
- ✅ **現在の厳密なプロパティチェック方式を維持すること**
- ✅ データ正規化: `JSON.parse(JSON.stringify(raw))` によるPlain Object化
- ❌ **推測ベースの判定や恣意的なしきい値（例：10秒ルール）の再導入は禁止**

**参照**: `src/lib/transcript-utils.ts`

### 9.2 イベントハンドリングの注意

**背景**: 2025-12-14に発生した「動画削除ボタンが動作しない」問題。

**原因**:
- `<Link>` コンポーネントでカード全体をラップ
- 削除ボタンのクリックイベントとページ遷移イベントが競合

**解決策と申し送り**:
- ✅ **ネストされたインタラクティブ要素を避ける**
- ✅ `<Link>` で全体を囲まず、`div` + `onClick` (router.push) を使用
- ✅ 削除ボタンを独立させ、`e.stopPropagation()` でイベント伝播を防止

**参照**: `src/components/DashboardClient.tsx`, `src/app/learn/[id]/learn-client.tsx`

### 9.3 確認ダイアログの扱い

**背景**: `window.confirm` が環境によって不安定（一瞬で消える、動作しない）。

**解決策と申し送り**:
- ❌ **`window.confirm` や `alert` に依存しない**
- ✅ 独自のモーダルコンポーネントを使用
- ✅ または即時実行 + Undo機能の検討

## 10. 開発ロードマップ

現在の実装状況と今後の計画については、以下を参照してください：

- **機能リスト**: [`features.json`](features.json) - 全機能の詳細タスク一覧
- **進捗ログ**: [`progress.txt`](progress.txt) - 完了したタスクの記録

主要マイルストーン（予定）:
1. ✅ 環境構築と初期設定 (F001)
2. ✅ 認証機能 (F002)
3. ✅ データベース設計 (F003)
4. 🔄 動画インポート機能 (F004)
5. 📅 ダッシュボード機能 (F005)
6. 📅 学習ページ (F006)
7. 📅 UI/UXの最適化 (F007-F008)
8. 📅 型定義とユーティリティの整備 (F009)

## 11. コントリビューション

現在、このプロジェクトはAIエージェント主導で開発されていますが、人間の開発者からの貢献も歓迎します。

### 貢献方法

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 注意事項

- **必ず `docs/incident_reports.md` を確認**してから、字幕処理や削除機能に関連するコードを変更してください
- **`features.json` に記載されていない機能**を追加する場合は、事前にIssueで提案してください

## 12. ライセンス

TBD (今後決定予定)

---

# English Version

## 1. Project Overview

### 1.1 Purpose (What & Why)

This project aims to develop a **web application that provides the ultimate learning experience by integrating YouTube video playback, timestamp-indexed table of contents exploration, and interactive chat about content, all powered by YouTube video transcripts (subtitles)**.

Traditional YouTube viewing experiences make it difficult to find specific information in long videos or deeply understand content. This application uses AI technology to achieve the following:

- **Efficient Learning**: Quickly access needed sections with auto-generated table of contents
- **Deep Understanding**: AI chat feature that instantly answers questions about video content
- **Seamless Experience**: Integrated interface combining video, subtitles, and chat

## 2. Key Features

### ✅ Authentication & Security
- Secure user authentication via Google OAuth
- Session management and protected page access

### 📹 Video Management
- One-click import from YouTube video URLs
- Automatic retrieval of video metadata (title, description, thumbnail, channel name)
- Fetching and storing timestamped subtitle data
- Video list display and management on dashboard
- Video deletion feature (safe implementation considering event conflicts)

### 🎓 Learning Experience
- **Integrated Learning Screen**:
  - YouTube video player
  - Real-time synchronized timestamped subtitle display
  - AI-generated automatic table of contents (chapters)
  - Interactive AI chat based on video content
- **Interactive Features**:
  - Video seeking by clicking subtitles or table of contents
  - Jumping to timestamps from AI chat responses
  - Subtitle search functionality
  - Chat history saving and display

### 🎨 UI/UX
- Responsive design (mobile/tablet/desktop support)
- Beautiful interface with Tailwind CSS
- 3-column layout (resizable panels)
- Proper loading states and error message display

## 3. Technology Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js (App Router) |
| **Language** | TypeScript |
| **Authentication** | NextAuth.js + Google Provider |
| **Styling** | Tailwind CSS |
| **Database** | Prisma (RDBMS recommended) |
| **API Integration** | YouTube Data API v3 |
| **AI** | Claude 3.5 Sonnet (planned) |

## 4. Agent Configuration (Development Process)

This project progresses using a **multi-agent approach** for long-term autonomous development and precision maintenance.

### 4.1 Initializer Agent

**In Charge**: Antigravity (Gemini 1.5 Pro)

**Responsibilities**:
- Project initial setup and task orchestration
- Creating detailed feature list (`features.json`) in JSON format
- Git initialization and file diff tracking setup
- Defining work log (`progress.txt`)

### 4.2 Coding Agent

**In Charge**: Claude Sonnet 4.5

**Responsibilities**:
- Selecting and implementing tasks one by one from the feature list created by Initializer
- Maintaining code quality and existing features
- Creating commit logs after task completion and handoff to next task

### 4.3 Separation of Concerns

This approach achieves the following benefits:
- **Clear Role Division**: Separating planning and implementation, optimizing each
- **Quality Assurance**: Each agent focuses on their specialized domain
- **Progress Visibility**: Transparent management via `features.json` and `progress.txt`
- **Long-term Stability**: Controlling complexity through staged development

## 5. Project Structure

```
youtube-learning-companion/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (main)/
│   │   │   ├── dashboard/    # Dashboard
│   │   │   └── learn/[videoId]/ # Learning screen
│   │   ├── globals.css        # Global styles
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable UI components
│   ├── lib/                   # Utility functions & business logic
│   └── types/                 # TypeScript type definitions
├── docs/                      # Project documentation
│   ├── authentication.md      # Google OAuth implementation spec
│   ├── import_video.md        # YouTube video import feature spec
│   ├── ui_design_guidelines.md # UI design guidelines
│   ├── incident_reports.md    # Past bugs and solutions
│   └── walkthrough_20241214.md # Technical details of fixes
├── prisma/
│   └── schema.prisma          # Database schema
├── features.json              # Feature list (Initializer managed)
├── progress.txt               # Work progress log (Coding Agent updated)
├── CLAUDE.md                  # Project guidelines for AI agents
└── .env.local                 # Environment variables (not in Git)
```

## 6. Development Environment Setup

### 6.1 Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm
- Google Cloud Platform account (for OAuth authentication)
- YouTube Data API key

### 6.2 Setup Instructions

#### 1. Clone Repository

```bash
git clone https://github.com/tinyoko/cc_ytlearn.git
cd cc_ytlearn
```

#### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

#### 3. Configure Environment Variables

Create a `.env.local` file in the project root with the following environment variables:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_SECRET=your_random_secret_string
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key
```

**How to obtain environment variables**:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Create OAuth 2.0 client in [Google Cloud Console](https://console.cloud.google.com/)
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `YOUTUBE_API_KEY`: Enable YouTube Data API v3 in Google Cloud Console

#### 4. Database Setup

```bash
# Apply Prisma schema and run migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

#### 5. Start Development Server

```bash
npm run dev
```

Access `http://localhost:3000` in your browser.

## 7. Coding Conventions

### Directory Placement Rules

- **Components**: Place in `src/components/`
- **API Routes**: Place in `src/app/api/`
- **Type Definitions**: Place in `src/types/`
- **Utility Functions**: Place in `src/lib/`

### Code Style

- **Formatting**: Use Prettier
- **Static Analysis**: Use ESLint
- **Naming Convention**: camelCase (variables/functions), PascalCase (components/types)

## 8. Reference Documentation

| Document | Content |
|----------|---------|
| [`docs/authentication.md`](docs/authentication.md) | Google OAuth authentication implementation spec |
| [`docs/import_video.md`](docs/import_video.md) | YouTube video import feature spec |
| [`docs/ui_design_guidelines.md`](docs/ui_design_guidelines.md) | UI design guidelines (colors, fonts, layout) |
| [`features.json`](features.json) | Task list (managed by Initializer) |
| [`progress.txt`](progress.txt) | Work progress log (updated by Coding Agent) |
| [`docs/incident_reports.md`](docs/incident_reports.md) | **Important**: Solutions and prevention for past critical bugs |
| [`docs/walkthrough_20241214.md`](docs/walkthrough_20241214.md) | Technical details of subtitle/video deletion fixes |

## 9. Past Fix History and Instructions for AI

⚠️ **Important Instructions for Future AI Agents**

Please always consider the following lessons for project stability and future development efficiency (see [`docs/incident_reports.md`](docs/incident_reports.md) for details).

### 9.1 Do Not Change Timestamp Judgment Logic

**Background**: "All subtitle timestamps displaying as 0:00" issue occurred on 2025-12-14.

**Causes**:
1. Arbitrary "10-second threshold" excluded valid segments
2. Class instances from `youtubei.js` processed with simple property access
3. Inconsistency due to JSON double-encoding

**Solution and Instructions**:
- ✅ **Maintain current strict property checking approach**
- ✅ Data normalization: Plain Object conversion via `JSON.parse(JSON.stringify(raw))`
- ❌ **Prohibit reintroduction of speculation-based judgments or arbitrary thresholds (e.g., 10-second rule)**

**Reference**: `src/lib/transcript-utils.ts`

### 9.2 Event Handling Considerations

**Background**: "Video delete button not working" issue occurred on 2025-12-14.

**Causes**:
- Entire card wrapped in `<Link>` component
- Delete button click event conflicted with page navigation event

**Solution and Instructions**:
- ✅ **Avoid nested interactive elements**
- ✅ Don't wrap everything in `<Link>`, use `div` + `onClick` (router.push)
- ✅ Make delete button independent and prevent event propagation with `e.stopPropagation()`

**Reference**: `src/components/DashboardClient.tsx`, `src/app/learn/[id]/learn-client.tsx`

### 9.3 Handling Confirmation Dialogs

**Background**: `window.confirm` unstable depending on environment (disappears instantly, doesn't work).

**Solution and Instructions**:
- ❌ **Don't rely on `window.confirm` or `alert`**
- ✅ Use custom modal components
- ✅ Or consider immediate execution + Undo functionality

## 10. Development Roadmap

For current implementation status and future plans, refer to:

- **Feature List**: [`features.json`](features.json) - Detailed task list for all features
- **Progress Log**: [`progress.txt`](progress.txt) - Record of completed tasks

Major Milestones (Planned):
1. ✅ Environment setup and initialization (F001)
2. ✅ Authentication features (F002)
3. ✅ Database design (F003)
4. 🔄 Video import features (F004)
5. 📅 Dashboard features (F005)
6. 📅 Learning page (F006)
7. 📅 UI/UX optimization (F007-F008)
8. 📅 Type definitions and utilities (F009)

## 11. Contributing

This project is currently developed under AI agent leadership, but contributions from human developers are also welcome.

### How to Contribute

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

### Notes

- **Always check `docs/incident_reports.md`** before modifying code related to subtitle processing or deletion features
- **For adding features not listed in `features.json`**, please propose via Issue first

## 12. License

TBD (To be determined)

---

**🤖 Generated with Multi-AI Development System**
- **Initializer Agent**: Antigravity (Gemini 1.5 Pro)
- **Coding Agent**: Claude Sonnet 4.5
