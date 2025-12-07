# 動画インポート機能 (docs/import_video.md)

## 項目

| 項目 | 詳細 | 記述の具体化 (LLMが取る幅を狭める目的) |
|------|------|----------------------------------|
| **目標 (What)** | ユーザーのYouTubeチャンネルまたは指定されたプレイリストから、字幕付き動画をデータベースにインポートし、トランスクリプトを保存する。 | 認証されたGoogleアカウントのYouTube Data APIを利用し、ユーザーのアップロード動画リストと、指定されたプレイリスト内の動画の情報を取得する。 |
| **データ取得** | 動画ID、タイトル、公開ステータス、字幕（トランスクリプト）。 | 字幕データは、動画IDと関連付けてアプリケーションのバックエンドデータベースに保存する。 |
| **ユーザーインターフェース (UI)** | ログイン後、ダッシュボードでインポート元を選択するUI（自分のアップロード動画 / プレイリストのURL指定）を提供する。 | ユーザーが複数の動画を選択し、一括でインポート開始できるインターフェースを実装する。 |

## 詳細

### データ取得フロー
1. ユーザーがダッシュボードで「動画をインポート」を選択
2. インポート元を選択（自分の動画 or プレイリストURL）
3. YouTube Data APIで動画一覧を取得
4. ユーザーがインポートする動画をチェックボックスで選択
5. 選択した動画のトランスクリプトを取得・保存

### 取得データ項目
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `videoId` | `string` | YouTube動画の一意識別子 |
| `title` | `string` | 動画のタイトル |
| `thumbnailUrl` | `string` | サムネイル画像URL |
| `duration` | `number` | 動画の長さ（秒） |
| `publishedAt` | `Date` | 公開日時 |
| `privacyStatus` | `string` | 公開/限定公開/非公開 |
| `transcript` | `TranscriptSegment[]` | 字幕データ（タイムスタンプ付き） |

### TranscriptSegment型
```typescript
interface TranscriptSegment {
  text: string;       // 字幕テキスト
  start: number;      // 開始時間（秒）
  duration: number;   // 表示時間（秒）
}
```

### API エンドポイント
| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/youtube/my-videos` | 自分のアップロード動画一覧を取得 |
| `GET` | `/api/youtube/playlist?id={playlistId}` | プレイリスト内の動画一覧を取得 |
| `POST` | `/api/videos/import` | 選択した動画をインポート |
| `GET` | `/api/videos/{videoId}/transcript` | 動画のトランスクリプトを取得 |

### データベーススキーマ（Prisma）
```prisma
model Video {
  id            String   @id @default(cuid())
  videoId       String   @unique  // YouTube動画ID
  title         String
  thumbnailUrl  String?
  duration      Int?
  publishedAt   DateTime?
  privacyStatus String?
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  transcript    Transcript?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Transcript {
  id        String   @id @default(cuid())
  videoId   String   @unique
  video     Video    @relation(fields: [videoId], references: [id])
  segments  Json     // TranscriptSegment[]
  createdAt DateTime @default(now())
}
```

### ユーザーインターフェース
- ログイン後のダッシュボードに「動画をインポート」ボタンを配置
- モーダルで2つの選択肢を提供：
  1. **自分のアップロード動画**: OAuthトークンで自動取得
  2. **プレイリストURL**: URLを入力してプレイリストIDを抽出
- 動画リストはチェックボックス付きで表示
- 「全選択」「選択解除」ボタンを提供
- インポート進捗をプログレスバーで表示
