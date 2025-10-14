"use client";

import ImageWithFallback from "../ImageWithFallback";
import {
  UserBladeFullWithBuild,
  Enemy,
  DEFAULT_STAT,
  applyBuildStats,
} from "@/app/solo_blade_app/types/pets";
import { motion } from "framer-motion";

/* -------------------- HealthBar -------------------- */
function HealthBar({ value, max }: { value: number; max: number }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-32 bg-gray-700 rounded-full overflow-hidden shadow-md border border-gray-500">
      <div
        className="h-3 bg-gradient-to-r from-green-400 to-red-500 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/* -------------------- Main Component -------------------- */
export default function BattleFighters({
  userPet,
  enemy,
}: {
  userPet: UserBladeFullWithBuild; // ✅ corrigé
  enemy: Enemy; // ✅ logique : ennemi du front
}) {
  // 🧩 Fusionner les stats de build pour l’utilisateur
  const builtUser = applyBuildStats(userPet);

  // ⚙️ Stats normalisées du joueur
  const userStats = {
    attack: builtUser.attack ?? DEFAULT_STAT,
    defense: builtUser.defense ?? DEFAULT_STAT,
    stamina: builtUser.stamina ?? DEFAULT_STAT,
    height: builtUser.height ?? DEFAULT_STAT,
    propulsion: builtUser.propulsion ?? DEFAULT_STAT,
    burst: builtUser.burst ?? DEFAULT_STAT,
    hp: 100 - Math.floor(userPet.hunger / 1.2), // HP simulé à partir de la faim
  };

  // ⚙️ Stats de l’ennemi (déjà fusionnées dans EnemyFactory)
  const enemyStats = {
    attack: enemy.attack ?? DEFAULT_STAT,
    defense: enemy.defense ?? DEFAULT_STAT,
    stamina: enemy.stamina ?? DEFAULT_STAT,
    height: enemy.height ?? DEFAULT_STAT,
    propulsion: enemy.propulsion ?? DEFAULT_STAT,
    burst: enemy.burst ?? DEFAULT_STAT,
    hp: 100, // fixe pour les ennemis
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-12 mt-8 relative">
      {/* USER BLADE */}
      <div className="flex flex-col items-center text-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="relative"
        >
          <div className="absolute -inset-4 rounded-full bg-fuchsia-500/30 blur-xl animate-pulse"></div>
          <ImageWithFallback
            src={userPet.blade.image_url ?? null}
            alt={userPet.blade.name ?? "Blade"}
            size={100}
            fallback="⚡"
          />
        </motion.div>

        <p className="text-white font-bold mt-2 text-lg">
          {userPet.blade.name ?? "Ma Blade"}
        </p>

        <HealthBar value={userStats.hp} max={100} />
        <p className="text-gray-400 text-xs mt-1">Faim : {userPet.hunger}/100</p>
      </div>

      {/* VS au centre */}
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
        className="text-red-500 text-4xl md:text-6xl font-extrabold drop-shadow-[0_0_15px_rgba(255,0,0,0.7)]"
      >
        VS
      </motion.div>

      {/* ENEMY */}
      <div className="flex flex-col items-center text-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
          className="relative"
        >
          <div className="absolute -inset-4 rounded-full bg-blue-500/30 blur-xl animate-pulse"></div>
          <ImageWithFallback
            src={enemy.image_url ?? null}
            alt={enemy.name}
            size={100}
            fallback="👾"
          />
        </motion.div>

        <p className="text-white font-bold mt-2 text-lg">{enemy.name}</p>

        <HealthBar value={enemyStats.hp} max={100} />
        <p className="text-gray-400 text-xs mt-1">
          ATK : {enemyStats.attack ?? DEFAULT_STAT}
        </p>
      </div>
    </div>
  );
}
