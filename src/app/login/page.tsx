import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/auth/login-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  // 既にログイン済みの場合はダッシュボードにリダイレクト
  if (session) {
    redirect("/dashboard");
  }

  const errorMessage = params.error
    ? getErrorMessage(params.error)
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            YouTube Learning Companion
          </h1>
          <p className="text-slate-400">
            Googleアカウントでログインして、学習を始めましょう
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm text-center">{errorMessage}</p>
          </div>
        )}

        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <LoginButton />
          <p className="mt-4 text-xs text-slate-500 text-center">
            ログインすることで、YouTubeの動画データへのアクセスを許可します
          </p>
        </div>
      </div>
    </main>
  );
}

function getErrorMessage(error: string): string {
  switch (error) {
    case "OAuthSignin":
      return "認証の開始に失敗しました。もう一度お試しください。";
    case "OAuthCallback":
      return "認証のコールバック処理に失敗しました。";
    case "OAuthAccountNotLinked":
      return "このメールアドレスは別のアカウントでリンクされています。";
    case "AccessDenied":
      return "アクセスが拒否されました。";
    case "Configuration":
      return "サーバーの設定エラーが発生しました。";
    default:
      return "認証中にエラーが発生しました。もう一度お試しください。";
  }
}
