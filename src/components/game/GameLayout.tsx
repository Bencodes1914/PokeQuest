import React from "react";
import { BottomNav } from "./BottomNav";

export function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow pb-24 pt-4 px-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
