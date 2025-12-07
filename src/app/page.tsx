export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-100 mb-4">
          YouTube Learning Companion
        </h1>
        <p className="text-slate-400 mb-8">
          YouTube動画のトランスクリプトを活用した学習体験
        </p>
        <a
          href="/login"
          className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
        >
          ログインして始める
        </a>
      </div>
    </main>
  );
}
