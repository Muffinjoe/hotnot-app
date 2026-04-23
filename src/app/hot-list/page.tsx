"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface HotItem {
  id: number;
  text: string;
  hot_votes: number;
  not_votes: number;
  hot_pct: number;
}

export default function HotList() {
  const [items, setItems] = useState<HotItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/prompts/hot-list")
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="flex items-center justify-between px-5 pt-3 h-14 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
        <h1 className="text-lg font-bold tracking-tight">
          <Link href="/">HotNot<span className="text-neutral-400">.app</span></Link>
          <span className="text-orange-500 ml-2 text-sm font-medium">
            Hot List
          </span>
        </h1>
        <Link
          href="/play"
          className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
        >
          Play
        </Link>
      </header>

      <div className="px-4 pb-8">
        {loading ? (
          <p className="text-center text-neutral-400 mt-20">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-neutral-400 mt-20">
            No votes yet. Go vote!
          </p>
        ) : (
          <div className="space-y-2 mt-2">
            {items.map((item, i) => {
              const total = item.hot_votes + item.not_votes;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200"
                >
                  <span className="text-neutral-400 text-sm font-mono w-6 text-right shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg truncate">{item.text}</p>
                    <p className="text-xs text-neutral-400">
                      {total} vote{total !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black text-orange-500">
                      {item.hot_pct}%
                    </p>
                    <p className="text-xs text-neutral-400">hot</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
