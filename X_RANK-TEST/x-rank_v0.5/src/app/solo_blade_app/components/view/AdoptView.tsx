"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import ImageWithFallback from "../ImageWithFallback";
import { Blade, UserBladeFull } from "@/app/solo_blade_app/types/pets";
import { adoptBlade } from "../Adopt";
import {
  hasReceivedReward,
  recordReward,
  rewardRandomEquipments,
} from "@/lib/rewards";
import { CyberPage } from "@/components/layout/CyberPage";

interface AdoptViewProps {
  adoptCandidate: Blade;
  onBack: () => void;
  onAdopt: (newBlade: UserBladeFull | null) => void;
  refreshUserBlades: () => Promise<void>;
  playerId: string;
  setPendingReward: (reward: string | null) => void;
}

export default function AdoptView({
  adoptCandidate,
  onBack,
  onAdopt,
  refreshUserBlades,
  playerId,
  setPendingReward,
}: AdoptViewProps) {
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdopt = async () => {
    setLoading(true);
    try {
      // ⚙️ Adoption d’une Blade
      const newBlade = await adoptBlade(adoptCandidate, refreshUserBlades);

      if (newBlade) {
        onAdopt(newBlade);

        // 🎁 Gestion des récompenses à la première adoption
        if (playerId) {
          const alreadyRewarded = await hasReceivedReward(playerId, "first_blade");
          if (!alreadyRewarded) {
            const rewarded = await rewardRandomEquipments(playerId, 10);
            await recordReward(playerId, "first_blade");

            const preview = rewarded.map((item) => item.name).slice(0, 3);
            const message =
              rewarded.length === 0
                ? "Bienvenue ! Ton arsenal est prêt à se remplir."
                : `Bienvenue ! ${rewarded.length} équipements ajoutés (${preview.join(", ")}...)`;

            setPendingReward(message);
          }
        }
      } else {
        setNotification("Impossible de recruter cette Blade.");
      }
    } catch (e) {
      console.error("❌ Erreur adoption:", e);
      setNotification("Erreur lors du recrutement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CyberPage
      header={{ title: "Recruter une Blade", subtitle: "Analyse ton nouveau partenaire avant de confirmer." }}
      contentClassName="items-center"
    >
      <button
        onClick={onBack}
        className="rounded-full border border-cyan-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200 transition-colors hover:bg-cyan-500/10"
      >
        ⬅ Retour
      </button>

      <Card className="w-full max-w-xl border border-emerald-400/60 bg-gray-900/80 shadow-[0_0_24px_rgba(0,255,180,0.25)]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-emerald-300">
            {adoptCandidate.name}
          </CardTitle>
          <CardDescription className="text-gray-300">
            Aperçu de ta future Blade
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-4">
          <ImageWithFallback
            src={adoptCandidate.image_url}
            alt={adoptCandidate.name ?? "Blade"}
            size={140}
            fallback="✨"
          />

          <div className="w-full rounded-xl bg-emerald-400/5 p-4 text-sm text-gray-200">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <dt className="text-emerald-300">Attaque</dt>
                <dd>{adoptCandidate.attack ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-emerald-300">Défense</dt>
                <dd>{adoptCandidate.defense ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-emerald-300">Endurance</dt>
                <dd>{adoptCandidate.stamina ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-emerald-300">Hauteur</dt>
                <dd>{adoptCandidate.height ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-emerald-300">Propulsion</dt>
                <dd>{adoptCandidate.propulsion ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-emerald-300">Burst</dt>
                <dd>{adoptCandidate.burst ?? "-"}</dd>
              </div>
            </dl>
          </div>

          {notification && <p className="text-sm text-red-400">{notification}</p>}

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              onClick={handleAdopt}
              disabled={loading}
              className="flex-1 rounded-xl border border-emerald-400 bg-emerald-500/20 py-3 font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Recrutement..." : "Valider l&apos;adoption"}
            </button>

            <button
              onClick={onBack}
              className="flex-1 rounded-xl border border-gray-500 bg-gray-800/60 py-3 font-semibold uppercase tracking-[0.2em] text-gray-200 transition hover:bg-gray-700/60"
            >
              Annuler
            </button>
          </div>
        </CardContent>
      </Card>
    </CyberPage>
  );
}
