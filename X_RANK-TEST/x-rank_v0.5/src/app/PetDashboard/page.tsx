"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

type Pet = {
  pet_id: string;
  name: string;
};

type PetLevel = {
  level_id: string;
  pet_id: string;
  name: string;
};

type UserPetRow = {
  user_pet_id: string;
  user_id: string;
  pet_id: string;
  level_id: string | null;
  xp: number | null;
  hunger: number | null;
  happiness: number | null;
  last_interaction: string | null;
  pet?: Pet[];
  level?: PetLevel[];
};

type UserPet = {
  user_pet_id: string;
  pet_id: string;
  pet_name: string;
  level_name: string | null;
  xp: number;
  hunger: number;
  happiness: number;
  last_interaction: string;
};

export default function PetDashboard() {
  const [userPets, setUserPets] = useState<UserPet[]>([]);
  const [availablePets, setAvailablePets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<UserPet | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPets = async () => {
    try {
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) return;

      // Récupération des pets possédés avec niveau
      const { data: userPetsData, error: userPetsError } = await supabase
        .from("user_pets")
        .select(`
          user_pet_id,
          pet_id,
          xp,
          hunger,
          happiness,
          last_interaction,
          pet:pets(name),
          level:pet_levels(name)
        `)
        .eq("user_id", user.id);

      if (userPetsError) {
        console.error("Supabase user_pets error:", userPetsError);
        return;
      }

      // Tous les pets
      const { data: allPets, error: allPetsError } = await supabase
        .from("pets")
        .select("*");

      if (allPetsError) {
        console.error("Supabase pets error:", allPetsError);
        return;
      }

      // Transformation
      const transformedUserPets: UserPet[] = (userPetsData ?? []).map((p) => {
        const basePetName = p.pet?.[0]?.name ?? "Inconnu";
        const levelName = p.level?.[0]?.name ?? null;
        return {
          user_pet_id: p.user_pet_id,
          pet_id: p.pet_id,
          pet_name: levelName ?? basePetName,
          level_name: levelName,
          xp: p.xp ?? 0,
          hunger: p.hunger ?? 100,
          happiness: p.happiness ?? 100,
          last_interaction: p.last_interaction ?? new Date().toISOString(),
        };
      });

      // Pets non possédés
      const ownedIds = transformedUserPets.map((p) => p.pet_id);
      const nonOwnedPetsList = (allPets ?? []).filter((p) => !ownedIds.includes(p.pet_id));

      setUserPets(transformedUserPets);
      setAvailablePets(nonOwnedPetsList as Pet[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  const handleSelectPet = (pet: UserPet) => {
    const last = new Date(pet.last_interaction);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

    const hunger = Math.max(Math.min(pet.hunger - 30 * daysDiff, 100), 0);
    const happiness = Math.max(Math.min(pet.happiness - 30 * daysDiff, 100), 0);

    setSelectedPet({ ...pet, hunger, happiness });
  };

  const handleAction = async (action: "feed" | "play") => {
    if (!selectedPet) return;

    const updates: Partial<UserPet> =
      action === "feed"
        ? { hunger: Math.max(selectedPet.hunger - 10, 0) }
        : { happiness: Math.min(selectedPet.happiness + 10, 100) };

    const { data } = await supabase
      .from("user_pets")
      .update({ ...updates, last_interaction: new Date().toISOString() })
      .eq("user_pet_id", selectedPet.user_pet_id)
      .select()
      .single();

    if (data)
      setSelectedPet({
        ...selectedPet,
        ...updates,
        last_interaction: data.last_interaction ?? new Date().toISOString(),
      });
  };

  const handleAcquirePet = async (petId: string) => {
    const userRes = await supabase.auth.getUser();
    const user = userRes.data.user;
    if (!user) return;

    await supabase
      .from("user_pets")
      .insert({ user_id: user.id, pet_id: petId, level_id: null })
      .select()
      .single();

    fetchPets();
  };

  if (loading) return <p className="text-white text-center p-6">Chargement...</p>;

  return (
    <main className="p-6 text-white min-h-screen flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6 text-center">🐾 Pet Dashboard</h1>

      {!selectedPet && (
        <div className="flex gap-8 w-full max-w-5xl">
          <div className="flex-1 bg-gray-800/50 p-4 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Vos Pets</h2>
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
              {userPets.map((p) => (
                <Button key={p.user_pet_id} onClick={() => handleSelectPet(p)} className="justify-start">
                  {p.pet_name} ({p.level_name || "Niveau de base"})
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-gray-800/50 p-4 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Disponible</h2>
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
              {availablePets.map((p) => (
                <Button key={p.pet_id} onClick={() => handleAcquirePet(p.pet_id)} className="justify-start">
                  {p.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedPet && (
        <div className="flex flex-col items-center space-y-6">
          <h2 className="text-2xl font-bold">
            {selectedPet.pet_name} ({selectedPet.level_name || "Niveau de base"})
          </h2>
          <div className="w-48 h-48 bg-gray-700 rounded-full flex items-center justify-center text-5xl">🐶</div>

          <div className="space-y-2 w-64">
            <p>Faim</p>
            <Progress value={selectedPet.hunger} max={100} />
            <p>Bonheur</p>
            <Progress value={selectedPet.happiness} max={100} />
          </div>

          <div className="flex gap-4">
            <Button onClick={() => handleAction("feed")}>🍖 Nourrir</Button>
            <Button onClick={() => handleAction("play")}>🎮 Jouer</Button>
            <Button onClick={() => setSelectedPet(null)}>🔙 Retour</Button>
          </div>
        </div>
      )}
    </main>
  );
}
