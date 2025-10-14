// src/app/PetDashboard/components/PetButton.tsx
"use client";

export default function PetButton({
  children,
  color = "bg-purple-500",
  onClick,
}: {
  children: React.ReactNode;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${color} px-4 py-2 text-white rounded hover:scale-105 transition`}
    >
      {children}
    </button>
  );
}