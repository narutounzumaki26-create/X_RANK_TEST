"use client";

import Image from "next/image";
import { useState } from "react";

type ImageWithFallbackProps = {
  /** Chemin relatif ou URL complète de l'image */
  src?: string | null;
  /** Texte alternatif */
  alt?: string;
  /** Taille en pixels (largeur et hauteur) */
  size?: number;
  /** Emoji ou caractère à afficher si l'image ne charge pas */
  fallback?: string;
};

/**
 * Composant image avec gestion automatique :
 * - ajoute /pet/ si le chemin est local (ex: "WA_1.png")
 * - gère les erreurs de chargement
 * - affiche un fallback visuel en cas d'erreur
 */
export default function ImageWithFallback({
  src,
  alt = "Image",
  size = 80,
  fallback = "🐶",
}: ImageWithFallbackProps) {
  const [loadError, setLoadError] = useState(false);

  // 🧠 Corrige automatiquement les chemins relatifs
  const resolvedSrc =
    src && !src.includes("/") && !src.startsWith("http")
      ? `/pet/${src}`
      : src ?? "";

  // 🚫 Si pas de source ou erreur, affiche fallback
  if (!resolvedSrc || loadError) {
    return (
      <div
        style={{
          width: size,
          height: size,
          fontSize: size * 0.6,
        }}
        className="flex items-center justify-center bg-black/40 rounded-xl text-center select-none"
      >
        {fallback}
      </div>
    );
  }

  // ✅ Si tout est bon, affiche l'image
  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      width={size}
      height={size}
      className="object-contain rounded-xl border border-gray-700 shadow-md bg-black/30"
      onError={() => setLoadError(true)}
    />
  );
}
