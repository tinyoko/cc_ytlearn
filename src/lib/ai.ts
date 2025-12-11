import { createAnthropic } from "@ai-sdk/anthropic";

// Anthropic Claude クライアントの作成
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// デフォルトモデル（Claude 4 Sonnet）
export const defaultModel = anthropic("claude-sonnet-4-20250514");
