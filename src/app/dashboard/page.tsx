import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function DashboardPage() {
  const session = await auth();

  // 未ログインの場合はログインページにリダイレクト
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">
            YouTube Learning Companion
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-slate-300 text-sm">
                {session.user?.name}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-slate-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-4">
            ダッシュボード
          </h2>
          <p className="text-slate-400 mb-6">
            YouTube動画をインポートして、学習を始めましょう。
          </p>
          <button className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">
            動画をインポート
          </button>
        </div>
      </div>
    </main>
  );
}
