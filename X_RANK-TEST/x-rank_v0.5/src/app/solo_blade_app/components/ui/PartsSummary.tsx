// src/app/solo_blade_app/components/BattleComponents/ui/PartsSummary.tsx
"use client";

export function PartsSummary({
  side,            // "user" | "enemy"
  label,           // ex: BladeName
  parts,           // ex: ["Accel", "70", "Ratchet-ABC"]
  align = "center" // "left" | "center" | "right"
}: {
  side: "user" | "enemy";
  label: string;
  parts: string[];
  align?: "left" | "center" | "right";
}) {
  const color = side === "user" ? "text-fuchsia-300" : "text-blue-300";
  const justify =
    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";

  return (
    <div className={`${justify} text-xs text-gray-300`}>
      <span className={`${color} font-semibold`}>{label}</span>{" "}
      {parts.length > 0 && <span className="opacity-80">({parts.join(" · ")})</span>}
    </div>
  );
}
