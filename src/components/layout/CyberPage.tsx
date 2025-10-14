import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NeonBackdrop } from "./NeonBackdrop";

type CyberPageHeader = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

type CyberPageProps = {
  children: ReactNode;
  header?: CyberPageHeader;
  centerContent?: boolean;
  className?: string;
  contentClassName?: string;
};

export function CyberPage({
  children,
  header,
  centerContent = false,
  className,
  contentClassName,
}: CyberPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <NeonBackdrop />

      <div
        className={cn(
          "relative mx-auto flex w-full max-w-6xl flex-col px-4 py-12 sm:px-6 lg:px-10",
          centerContent ? "min-h-screen justify-center" : "min-h-screen",
          className,
        )}
      >
        {header && (header.title || header.subtitle || header.eyebrow || header.actions) && (
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3 text-center sm:text-left">
              {header.eyebrow && (
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
                  {header.eyebrow}
                </p>
              )}
              {header.title && (
                <h1 className="text-3xl font-extrabold tracking-tight text-fuchsia-200 drop-shadow-[0_0_18px_rgba(255,0,255,0.4)] sm:text-4xl">
                  {header.title}
                </h1>
              )}
              {header.subtitle && (
                <p className="max-w-2xl text-sm text-gray-200/80 sm:text-base">
                  {header.subtitle}
                </p>
              )}
            </div>
            {header.actions && <div className="flex shrink-0 items-center justify-center gap-3">{header.actions}</div>}
          </header>
        )}

        <div
          className={cn(
            "flex flex-1 flex-col gap-8",
            centerContent && "items-center justify-center text-center",
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
