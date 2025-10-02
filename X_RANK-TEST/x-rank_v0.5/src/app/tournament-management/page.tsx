'use client';
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from "@/lib/supabaseClient";

interface Player { player_id: string; player_name: string; }
interface Tournament { tournament_id: string; name: string; }
interface Combo { combo_id: string; blade_id: string; ratchet_id: string; bit_id: string; assist_id?: string | null; lock_chip_id?: string | null; name: string; }
interface Deck { deck_id: string; combo_id_1: string | null; combo_id_2: string | null; combo_id_3: string | null; }
interface _piecesMap { blades: Record<string, string>; ratchets: Record<string, string>; bits: Record<string, string>; assists: Record<string, string>; lock_chips: Record<string, string>; }
interface RoundLog { round: number; player: 1 | 2; action: "Spin" | "Over" | "Burst" | "Xtreme"; points: number; winnerCombo: string; loserCombo: string; }

export default function TournamentManagementPage() {

  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([]);
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: players, error: playerError } = await supabase
      .from("players")
      .select("player_name,Admin")
      .eq("user_id", user?.id)
      .single()
      if (players?.Admin === false) {
        router.push("/");
      }
    };

    checkAuth();}, [supabase, router, players]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [participants, setParticipants] = useState<Player[]>([]);
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>('');
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>('');
  const [player1Deck, setPlayer1Deck] = useState<Deck | null>(null);
  const [player2Deck, setPlayer2Deck] = useState<Deck | null>(null);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [_piecesMap, set_piecesMap] = useState<_piecesMap>({ blades: {}, ratchets: {}, bits: {}, assists: {}, lock_chips: {} });

  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [round, setRound] = useState(0);
  const [selectedCombo1, setSelectedCombo1] = useState<string>('');
  const [selectedCombo2, setSelectedCombo2] = useState<string>('');
  const [roundLogs, setRoundLogs] = useState<RoundLog[]>([]);
  const [matchValidated, setMatchValidated] = useState(false);

    const resetMatch = () => {
    setSelectedPlayer1('');
    setSelectedPlayer2('');
    setPlayer1Deck(null);
    setPlayer2Deck(null);
    setSelectedCombo1('');
    setSelectedCombo2('');
    setPlayer1Score(0);
    setPlayer2Score(0);
    setRound(0);
    setRoundLogs([]);
    setMatchValidated(false);
  };

  const playerColors: Record<1 | 2, string> = { 1: "bg-blue-600", 2: "bg-red-500" };

  // --- Fetch tournaments ---
  useEffect(() => {
    supabase.from('tournaments').select('*').then(({ data, error }) => {
      if (error) console.error(error);
      else setTournaments(data as Tournament[]);
    });
  }, []);

 // --- Fetch participants ---
useEffect(() => {
  if (!selectedTournament) return setParticipants([]);
  const fetchParticipants = async () => {
    try {
      const { data: tpData, error: tpError } = await supabase
        .from('tournament_participants')
        .select('player_id')
        .eq('tournament_id', selectedTournament);
      if (tpError) throw tpError;

      const playerIds = (tpData || []).map(r => r.player_id).filter(Boolean);
      if (playerIds.length === 0) return setParticipants([]);

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('player_id, player_name')
        .in('player_id', playerIds);
      if (playersError) throw playersError;

      // 🔽 ICI on trie par ordre alphabétique
      const sortedPlayers = (playersData || []).sort((a, b) =>
        a.player_name.localeCompare(b.player_name, 'fr', { sensitivity: 'base' })
      );

      setParticipants(sortedPlayers as Player[]);
    } catch (err) {
      console.error(err);
      setParticipants([]);
    }
  };
  fetchParticipants();
}, [selectedTournament]);

  // --- Fetch combos ---
  useEffect(() => {
    supabase.from('combos').select('*').then(({ data, error }) => {
      if (error) console.error(error);
      else setCombos(data as Combo[]);
    });
  }, []);

  // --- Fetch pieces ---
  useEffect(() => {
    const fetchPieces = async () => {
      const [bladeData, ratchetData, bitData, assistData, lockChipData] = await Promise.all([
        supabase.from('blades').select('blade_id, name'),
        supabase.from('ratchets').select('ratchet_id, name'),
        supabase.from('bits').select('bit_id, name'),
        supabase.from('assists').select('assist_id, name'),
        supabase.from('lock_chips').select('lock_chip_id, name'),
      ]);
      set_piecesMap({
        blades: (bladeData.data || []).reduce((acc, b) => ({ ...acc, [b.blade_id]: b.name }), {}),
        ratchets: (ratchetData.data || []).reduce((acc, r) => ({ ...acc, [r.ratchet_id]: r.name }), {}),
        bits: (bitData.data || []).reduce((acc, b) => ({ ...acc, [b.bit_id]: b.name }), {}),
        assists: (assistData.data || []).reduce((acc, a) => ({ ...acc, [a.assist_id]: a.name }), {}),
        lock_chips: (lockChipData.data || []).reduce((acc, l) => ({ ...acc, [l.lock_chip_id]: l.name }), {}),
      });
    };
    fetchPieces();
  }, []);

  // --- Fetch decks ---
  const fetchPlayerDeck = useCallback(async (playerId: string, setDeck: (d: Deck | null) => void) => {
    if (!selectedTournament || !playerId) return;
    const { data, error } = await supabase
      .from('tournament_decks')
      .select('*')
      .eq('tournament_id', selectedTournament)
      .eq('player_id', playerId)
      .single();
    if (error) setDeck(null);
    else setDeck(data as Deck);
  }, [selectedTournament]);

  useEffect(() => { fetchPlayerDeck(selectedPlayer1, setPlayer1Deck); }, [selectedPlayer1, selectedTournament, fetchPlayerDeck]);
  useEffect(() => { fetchPlayerDeck(selectedPlayer2, setPlayer2Deck); }, [selectedPlayer2, selectedTournament, fetchPlayerDeck]);

  // --- Combo rendering ---
  const getComboName = useCallback((comboId: string | null) => {
    if (!comboId) return "Combo inconnu";
    const combo = combos.find(c => c.combo_id === comboId);
    if (!combo) return "Combo inconnu";
    const lockChip = combo.lock_chip_id ? _piecesMap.lock_chips[combo.lock_chip_id] : null;
    const blade = _piecesMap.blades[combo.blade_id] || combo.blade_id;
    const assist = combo.assist_id ? _piecesMap.assists[combo.assist_id] : null;
    const ratchet = _piecesMap.ratchets[combo.ratchet_id] || combo.ratchet_id;
    const bit = _piecesMap.bits[combo.bit_id] || combo.bit_id;
    return `${lockChip ? lockChip + " / " : ""}${blade}${assist ? " / " + assist : ""} / ${ratchet} / ${bit}`;
  }, [_piecesMap, combos]);

  // --- Player names ---
  const player1Name = useMemo(() => participants.find(p => p.player_id === selectedPlayer1)?.player_name || "Joueur 1", [participants, selectedPlayer1]);
  const player2Name = useMemo(() => participants.find(p => p.player_id === selectedPlayer2)?.player_name || "Joueur 2", [participants, selectedPlayer2]);

  // --- Handle scoring ---
  const handleScore = (player: 1 | 2, points: number, action: RoundLog["action"]) => {
    if (!selectedCombo1 || !selectedCombo2) return alert("Sélectionne un combo pour chaque joueur !");
    const winnerCombo = player === 1 ? selectedCombo1 : selectedCombo2;
    const loserCombo = player === 1 ? selectedCombo2 : selectedCombo1;
    if (player === 1) setPlayer1Score(prev => prev + points);
    else setPlayer2Score(prev => prev + points);

    setRound(prev => {
      const newRound = prev + 1;
      setRoundLogs(prevLogs => [...prevLogs, { round: newRound, player, action, points, winnerCombo, loserCombo }]);
      return newRound;
    });
  };

  // --- Update stats ---
  const updatePlayerStats = async () => {
    if (!selectedPlayer1 || !selectedPlayer2) return;

    const statsInit = { matches_played: 1, matches_won: 0, matches_lost: 0, matches_draw: 0, spin_finishes: 0, over_finishes: 0, burst_finishes: 0, xtreme_finishes: 0 };
    const statsP1 = { ...statsInit }, statsP2 = { ...statsInit };

    if (player1Score > player2Score) { statsP1.matches_won = 1; statsP2.matches_lost = 1; }
    else if (player2Score > player1Score) { statsP2.matches_won = 1; statsP1.matches_lost = 1; }
    else { statsP1.matches_draw = 1; statsP2.matches_draw = 1; }

    roundLogs.forEach(log => {
      const target = log.player === 1 ? statsP1 : statsP2;
      if (log.action === "Spin") target.spin_finishes++;
      if (log.action === "Over") target.over_finishes++;
      if (log.action === "Burst") target.burst_finishes++;
      if (log.action === "Xtreme") target.xtreme_finishes++;
    });

    const applyStats = async (playerId: string, newStats: typeof statsP1) => {
      const { data: existing } = await supabase.from("player_stats").select("*").eq("player_id", playerId).single();
      const base = existing || { player_id: playerId, matches_played:0, matches_won:0, matches_lost:0, matches_draw:0, spin_finishes:0, over_finishes:0, burst_finishes:0, xtreme_finishes:0 };
      const updated = { ...base, matches_played: base.matches_played + newStats.matches_played, matches_won: base.matches_won + newStats.matches_won, matches_lost: base.matches_lost + newStats.matches_lost, matches_draw: base.matches_draw + newStats.matches_draw, spin_finishes: base.spin_finishes + newStats.spin_finishes, over_finishes: base.over_finishes + newStats.over_finishes, burst_finishes: base.burst_finishes + newStats.burst_finishes, xtreme_finishes: base.xtreme_finishes + newStats.xtreme_finishes };
      await supabase.from("player_stats").upsert(updated);
    };
    await applyStats(selectedPlayer1, statsP1);
    await applyStats(selectedPlayer2, statsP2);
    console.log("Stats mises à jour ✅");
  };

  type PlayerComboInfo = [string, Deck | null, string, (comboId: string) => void, number, 1 | 2];
  const playersInfo: PlayerComboInfo[] = [
    [selectedPlayer1, player1Deck, player1Name, setSelectedCombo1, player1Score, 1],
    [selectedPlayer2, player2Deck, player2Name, setSelectedCombo2, player2Score, 2],
  ];

  return (
  <div className="max-w-4xl mx-auto p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl shadow-2xl">
    <h1 className="text-4xl font-extrabold mb-8 text-center tracking-wide text-purple-400">
      ⚔️ Gestion Tournoi
    </h1>

    {/* Sélection du tournoi */}
    <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-purple-500 shadow-lg">
      <label className="block mb-3 font-semibold text-purple-300">🎯 Tournoi :</label>
      <select
        className="bg-gray-900 border border-purple-600 rounded-lg p-3 w-full text-white"
        value={selectedTournament}
        onChange={e => {
          setSelectedTournament(e.target.value);
          resetMatch();
        }}
      >
        <option value="">Sélectionnez un tournoi</option>
        {tournaments.map(t => <option key={t.tournament_id} value={t.tournament_id}>{t.name}</option>)}
      </select>
    </div>

    {/* Sélection joueurs */}
    {selectedTournament && (
      <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-lg flex gap-4">
        {[{label:"Joueur 1", value:selectedPlayer1, set: setSelectedPlayer1},{label:"Joueur 2", value:selectedPlayer2, set: setSelectedPlayer2}].map((p,i) => (
          <div key={i} className="flex-1">
            <label className="block mb-3 font-semibold text-green-300">{p.label}</label>
            <select
              className="bg-gray-900 border border-green-600 rounded-lg p-3 w-full text-white"
              value={p.value}
              onChange={e => {
                p.set(e.target.value);
                if(i===0) setSelectedCombo1(''); else setSelectedCombo2('');
              }}
            >
              <option value="">Sélectionnez un joueur</option>
              {participants.map(player => <option key={player.player_id} value={player.player_id}>{player.player_name}</option>)}
            </select>
          </div>
        ))}
      </div>
    )}

    {/* Combos et scoring */}
    <div className="flex flex-col md:flex-row gap-4 mb-8">
      {playersInfo.map(([player, deck, name, setCombo, score, playerNum], i) => (
        <div key={i} className="border p-6 rounded-xl bg-gray-800/70 border-pink-500 shadow-xl flex flex-col w-full md:w-1/2">
          <h2 className="font-bold mb-4 text-pink-300">Combos de {name}</h2>
          {deck ? (
            [deck.combo_id_1, deck.combo_id_2, deck.combo_id_3].map((cid, idx) => cid && (
              <label key={cid} className="block mb-2">
                <input type="radio" name={`combo${playerNum}`} value={cid} checked={(playerNum===1?selectedCombo1:selectedCombo2)===cid} onChange={()=>setCombo(cid)} className="mr-2"/>
                Combo {idx+1} - {getComboName(cid)}
              </label>
            ))
          ) : <p className="text-gray-400">Pas de deck sélectionné</p>}

          <div className="grid grid-cols-2 gap-2 mt-4">
            {["Spin","Over","Burst","Xtreme"].map((action, idx) => (
              <button
                key={idx}
                className={`${playerColors[playerNum]} text-white py-3 rounded-xl w-full text-lg`}
                disabled={!(playerNum===1?selectedCombo1:selectedCombo2)}
                onClick={()=>handleScore(playerNum, action==="Spin"?1:action==="Over"?2:action==="Burst"?2:3, action as RoundLog["action"])}
              >
                {action} (+{action==="Spin"?1:action==="Over"?2:action==="Burst"?2:3})
              </button>
            ))}
          </div>
          <p className="mt-2 font-semibold">Score : {score}</p>
        </div>
      ))}
    </div>

    {/* Historique des tours */}
    <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-blue-500 shadow-md">
      <h3 className="font-semibold text-blue-300 mb-2">Historique des tours :</h3>
      <ul className="list-disc ml-5 text-white">
        {roundLogs.map((log, idx)=>(
          <li key={idx}>
            Tour {log.round} : {log.player===1?player1Name:player2Name} ({log.action}, +{log.points}) avec <strong>{getComboName(log.winnerCombo)}</strong> contre <strong>{getComboName(log.loserCombo)}</strong>
          </li>
        ))}
      </ul>
    </div>

    {/* Validation / Nouveau match */}
    {!matchValidated && round>0 && (
      <button className="w-full py-3 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 mb-4" onClick={async ()=>{/* validation match */}}>
        Match validé
      </button>
    )}

    {matchValidated && (
      <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-blue-500 shadow-md">
        <h2 className="text-xl font-bold mb-2 text-blue-300">Rapport du match</h2>
        <p>Nombre de tours : {round}</p>
        <p>Score final : {player1Name} {player1Score} - {player2Score} {player2Name}</p>
        <p>Vainqueur : {player1Score > player2Score ? player1Name : player2Score > player1Score ? player2Name : "Égalité"}</p>
        <h3 className="font-semibold mt-3">Détails :</h3>
        <ul className="list-disc ml-5">
          {roundLogs.map((log, idx) => (
            <li key={idx}>
              Tour {log.round} : {log.player===1?player1Name:player2Name} ({log.action}, +{log.points}) avec {getComboName(log.winnerCombo)} contre {getComboName(log.loserCombo)}
            </li>
          ))}
        </ul>
        <button onClick={resetMatch} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl mt-4 font-bold shadow-lg transition-all duration-200">
          Nouveau match
        </button>
      </div>
    )}
  </div>
);

}
