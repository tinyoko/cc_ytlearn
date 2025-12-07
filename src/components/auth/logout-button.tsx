"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
    >
      ログアウト
    </button>
  );
}
