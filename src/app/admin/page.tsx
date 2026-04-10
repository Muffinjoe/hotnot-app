"use client";

import { useState } from "react";

interface AdminData {
  emails: { id: number; email: string; created_at: string }[];
  totalVotes: number;
  todayHits: number;
  totalHits: number;
  shareClicks: number;
  todayShares: number;
  dailyHits: { day: string; count: number }[];
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin?password=${encodeURIComponent(password)}`);
      if (!res.ok) {
        setError("Wrong password");
        setLoading(false);
        return;
      }
      const d = await res.json();
      setData(d);
      setAuthed(true);
    } catch {
      setError("Failed to load");
    }
    setLoading(false);
  };

  const refresh = async () => {
    const res = await fetch(`/api/admin?password=${encodeURIComponent(password)}`);
    if (res.ok) setData(await res.json());
  };

  if (!authed) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-6">
        <form onSubmit={handleLogin} className="w-full max-w-xs">
          <h1 className="text-2xl font-black text-center mb-6">Admin</h1>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-base outline-none focus:border-orange-400 transition-colors mb-3"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-neutral-900 text-white font-bold cursor-pointer disabled:opacity-50"
          >
            {loading ? "..." : "Login"}
          </button>
        </form>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-white text-neutral-900 px-5 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Admin</h1>
        <button
          onClick={refresh}
          className="text-sm text-orange-500 font-medium cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
          <p className="text-2xl font-black">{data.todayHits}</p>
          <p className="text-xs text-neutral-400">Hits today</p>
        </div>
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
          <p className="text-2xl font-black">{data.totalHits}</p>
          <p className="text-xs text-neutral-400">Total hits</p>
        </div>
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
          <p className="text-2xl font-black">{data.todayShares}</p>
          <p className="text-xs text-neutral-400">Shares today</p>
        </div>
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
          <p className="text-2xl font-black">{data.shareClicks}</p>
          <p className="text-xs text-neutral-400">Total shares</p>
        </div>
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
          <p className="text-2xl font-black">{data.totalVotes}</p>
          <p className="text-xs text-neutral-400">Total votes</p>
        </div>
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
          <p className="text-2xl font-black">{data.emails.length}</p>
          <p className="text-xs text-neutral-400">Email signups</p>
        </div>
      </div>

      {/* Daily Hits */}
      {data.dailyHits.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3">Daily Hits (last 30 days)</h2>
          <div className="space-y-1">
            {data.dailyHits.map((d) => {
              const max = Math.max(...data.dailyHits.map((x) => Number(x.count)));
              const pct = max > 0 ? (Number(d.count) / max) * 100 : 0;
              return (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400 w-20 shrink-0">
                    {new Date(d.day).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <div className="flex-1 bg-neutral-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-orange-400 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">
                    {d.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Emails */}
      <div>
        <h2 className="text-lg font-bold mb-3">
          Email Signups ({data.emails.length})
        </h2>
        {data.emails.length === 0 ? (
          <p className="text-sm text-neutral-400">No signups yet</p>
        ) : (
          <div className="space-y-1">
            {data.emails.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg border border-neutral-100"
              >
                <span className="text-sm font-medium">{e.email}</span>
                <span className="text-xs text-neutral-400">
                  {new Date(e.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
