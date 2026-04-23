"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "page_view" }),
    }).catch(() => {});
  }, []);

  return (
    <main className="fixed inset-0 bg-white text-neutral-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-5xl font-black tracking-tight text-center mb-1">
            HotNot<span className="text-orange-500">.app</span>
          </h1>
          <p className="text-center text-neutral-500 mb-10 text-base">
            Hot takes. Cold takes. You decide.
          </p>

          <div className="space-y-3">
            <Link
              href="/play"
              className="block w-full py-5 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all text-white font-bold text-lg text-center"
            >
              &#x1F525; Play
            </Link>
            <Link
              href="/record"
              className="block w-full py-5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all text-white font-bold text-lg text-center"
            >
              &#x1F3A5; Film a Video
            </Link>
            <Link
              href="/create"
              className="block w-full py-5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all text-neutral-900 font-bold text-lg text-center border border-neutral-200"
            >
              &#x270F;&#xFE0F; Make Your Own
            </Link>
            <Link
              href="/hot-list"
              className="block w-full py-5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all text-neutral-900 font-bold text-lg text-center border border-neutral-200"
            >
              &#x1F4CA; Hot List
            </Link>
          </div>
        </div>
      </div>
      <div className="h-8 shrink-0" />
    </main>
  );
}
