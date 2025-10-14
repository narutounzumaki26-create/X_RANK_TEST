"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const REGIONS = [
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Hauts-de-France",
  "Île-de-France",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d'Azur",
];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerBirthDate, setPlayerBirthDate] = useState("");
  const [playerFirstName, setPlayerFirstName] = useState("");
  const [playerLastName, setPlayerLastName] = useState("");
  const [playerRegion, setPlayerRegion] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // --- Vérifications de base ---
    if (
      !email ||
      !password ||
      !confirmPassword ||
      !playerName ||
      !playerBirthDate ||
      !playerFirstName ||
      !playerLastName ||
      !playerRegion
    ) {
      setError("⚠️ Merci de remplir tous les champs");
      return setLoading(false);
    }

    if (password !== confirmPassword) {
      setError("⚠️ Les mots de passe ne correspondent pas");
      return setLoading(false);
    }

    if (password.length < 8) {
      setError("⚠️ Le mot de passe doit contenir au moins 8 caractères");
      return setLoading(false);
    }

    const today = new Date().toISOString().split("T")[0];
    if (playerBirthDate > today) {
      setError("⚠️ La date de naissance ne peut pas être dans le futur");
      return setLoading(false);
    }

    try {
      // --- Création du compte Supabase ---
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError("❌ " + signUpError.message);
        return;
      }

      if (!data.user) {
        setError("❌ Erreur : impossible de créer le compte utilisateur");
        return;
      }

      // --- Insertion dans la table players ---
      const playerData = {
        user_id: data.user.id,
        player_name: playerName,
        player_birth_date: playerBirthDate,
        player_first_name: playerFirstName,
        player_last_name: playerLastName,
        player_region: playerRegion,
        Arbitre: false,
        Admin: false,
      };

      const { error: insertError } = await supabase.from("players").insert(playerData);

      if (insertError) {
        console.error("INSERT ERROR:", insertError);
        setError("❌ " + insertError.message);
        return;
      }

      // --- Succès ---
      setSuccess("✅ Inscription réussie !");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPlayerName("");
      setPlayerBirthDate("");
      setPlayerFirstName("");
      setPlayerLastName("");
      setPlayerRegion("");

      // --- Redirection ---
      router.push("/user_app/main-menu");
    } catch (err) {
      console.error("CATCH ERROR:", err);
      setError("❌ Une erreur inattendue est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md bg-gray-900/80 border-2 border-purple-500 rounded-2xl shadow-2xl p-6 space-y-6">
        <h1 className="text-3xl font-extrabold text-purple-400 text-center">
          ⚡ Inscription
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Infos personnelles */}
          <input
            type="text"
            placeholder="Nom de Blader"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full rounded-xl p-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400"
            required
          />

          <input
            type="date"
            value={playerBirthDate}
            onChange={(e) => setPlayerBirthDate(e.target.value)}
            className="w-full rounded-xl p-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400"
            required
          />

          <input
            type="text"
            placeholder="Prénom"
            value={playerFirstName}
            onChange={(e) => setPlayerFirstName(e.target.value)}
            className="w-full rounded-xl p-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400"
            required
          />

          <input
            type="text"
            placeholder="Nom de famille"
            value={playerLastName}
            onChange={(e) => setPlayerLastName(e.target.value)}
            className="w-full rounded-xl p-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400"
            required
          />

          <select
            value={playerRegion}
            onChange={(e) => setPlayerRegion(e.target.value)}
            className="w-full rounded-xl p-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400"
            required
          >
            <option value="">-- Sélectionne ta région --</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>

          {/* Connexion */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl p-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400"
            required
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl p-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400"
            required
            minLength={8}
          />

          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl p-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400"
            required
          />

          {error && <p className="text-red-400 text-center">{error}</p>}
          {success && <p className="text-green-400 text-center">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white py-3 rounded-xl shadow-lg font-semibold transition"
          >
            {loading ? "Inscription..." : "S’inscrire"}
          </button>
        </form>

        <div className="flex justify-between gap-3 pt-2">
          <button
            onClick={() => router.push("/")}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl shadow-md transition"
          >
            ⬅ Accueil
          </button>

          <button
            onClick={() => router.push("/user_app/login")}
            className="flex-1 bg-purple-700 hover:bg-purple-600 text-white py-2 rounded-xl shadow-md transition"
          >
            🔐 Connexion
          </button>
        </div>
      </div>
    </main>
  );
}
