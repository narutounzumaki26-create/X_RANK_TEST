// src/app/PetDashboard/components/PetLayout.tsx
"use client";

export default function PetLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6">
      {children}
    </main>
  );
}