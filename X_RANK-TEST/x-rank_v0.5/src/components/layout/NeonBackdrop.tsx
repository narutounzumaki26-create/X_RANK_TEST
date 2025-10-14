import { cn } from "@/lib/utils";

type NeonBackdropProps = {
  className?: string;
};

/**
 * Shared animated background inspired by the leaderboard screen.
 * Adds layered neon glows that softly pulse to give the UI a cyberpunk feel.
 */
export function NeonBackdrop({ className }: NeonBackdropProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div className="absolute -left-1/4 -top-1/3 h-[55vh] w-[55vh] animate-[pulse_10s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(255,0,255,0.4)_0%,rgba(255,0,255,0.05)_65%,transparent_80%)] blur-3xl" />
      <div className="absolute -right-1/3 top-1/4 h-[60vh] w-[60vh] animate-[pulse_12s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(0,255,255,0.35)_0%,rgba(0,255,255,0.05)_65%,transparent_80%)] blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-[50vh] w-[50vh] -translate-x-1/2 -translate-y-1/2 animate-[pulse_14s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(0,255,170,0.25)_0%,transparent_70%)] blur-[120px]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12)_0%,rgba(0,0,0,0.65)_55%,rgba(0,0,0,0.9)_100%)] mix-blend-screen" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.85)_65%,rgba(0,0,0,0.95)_100%)]" />
    </div>
  );
}
