"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type MainMenuButtonProps = {
  className?: string;
  label?: string;
};

export function MainMenuButton({ className, label = "⬅ Retour menu" }: MainMenuButtonProps) {
  return (
    <Link
      href="/user_app/main-menu"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-500 bg-gradient-to-r from-fuchsia-600/90 to-purple-700/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-[0_0_12px_rgba(255,0,255,0.55)] transition-transform hover:scale-105 hover:shadow-[0_0_20px_rgba(255,0,255,0.85)] focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        className,
      )}
    >
      {label}
    </Link>
  );
}
