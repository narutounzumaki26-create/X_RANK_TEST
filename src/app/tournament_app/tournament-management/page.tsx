'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { MainMenuButton } from '@/components/navigation/MainMenuButton'
import type {
  players,
  tournaments,
  combos,
  tournament_decks,
  match_action,
  player_stats,
} from 'src/app/tournament_app/tournament'

// Type local juste pour la gestion du score en front
type RoundLog = {
  round: number
  player: 1 | 2
  action: match_action
  points: number
  winnerCombo: string
  loserCombo: string
}

// Type for match data to be inserted
type MatchInsertData = {
  tournament_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  loser_id: string | null;
  rounds: number;
  created_by: string | null;
  match_logs: string | null;
  spin_finishes: number | null;
  over_finishes: number | null;
  burst_finishes: number | null;
  xtreme_finishes: number | null;
};

export default function TournamentManagementPage() {
  const router = useRouter()

  // ============================
  // 🔹 État principal
  // ============================
  const [admin, setAdmin] = useState<boolean | null>(null)
  const [tournamentsList, setTournamentsList] = useState<tournaments[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>('')
  const [participants, setParticipants] = useState<players[]>([])
  const [combosList, setCombosList] = useState<combos[]>([])

  // ============================
  // 🔹 Match / Round state
  // ============================
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>('')
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>('')
  const [player1Deck, setPlayer1Deck] = useState<tournament_decks | null>(null)
  const [player2Deck, setPlayer2Deck] = useState<tournament_decks | null>(null)
  const [player1Score, setPlayer1Score] = useState(0)
  const [player2Score, setPlayer2Score] = useState(0)
  const [round, setRound] = useState(0)
  const [roundLogs, setRoundLogs] = useState<RoundLog[]>([])
  const [selectedCombo1, setSelectedCombo1] = useState<string>('')
  const [selectedCombo2, setSelectedCombo2] = useState<string>('')
  const [matchValidated, setMatchValidated] = useState(false)
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null)

  const playerColors: Record<1 | 2, string> = { 1: 'bg-blue-600', 2: 'bg-red-500' }

  // ======================================================
  // 🧭 Vérification admin
  // ======================================================
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: player, error } = await supabase
        .from('players')
        .select('Admin')
        .eq('user_id', user.id)
        .single<players>()

      if (error || !player || !player.Admin) {
        router.push('/')
        return
      }

      setAdmin(true)
    }

    checkAdmin()
  }, [router])

  // ======================================================
  // 📋 Fetch tournois et données
  // ======================================================
  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase.from('tournaments').select('*').returns<tournaments[]>()
      if (error) console.error(error)
      else setTournamentsList(data || [])
    }
    fetchTournaments()
  }, [])

  // --- Combos ---
  useEffect(() => {
    const fetchCombos = async () => {
      const { data, error } = await supabase.from('combos').select('*').returns<combos[]>()
      if (error) console.error(error)
      else setCombosList(data || [])
    }
    fetchCombos()
  }, [])

  // --- Participants ---
  useEffect(() => {
    if (!selectedTournament) return setParticipants([])

    const fetchParticipants = async () => {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('player_id')
        .eq('tournament_id', selectedTournament)

      if (error || !data) {
        setParticipants([])
        return
      }

      const ids = data.map((d) => d.player_id)
      const { data: playersData } = await supabase
        .from('players')
        .select('player_id, player_name')
        .in('player_id', ids)
        .returns<players[]>()

      if (playersData) {
        const sorted = playersData.sort((a, b) =>
          a.player_name.localeCompare(b.player_name, 'fr', { sensitivity: 'base' })
        )
        setParticipants(sorted)
      }
    }

    fetchParticipants()
  }, [selectedTournament])

  // ======================================================
  // 🧩 Fetch Decks - CORRIGÉ AVEC Date_Creation
  // ======================================================
  const fetchPlayerDeck = useCallback(
    async (playerId: string, setDeck: (d: tournament_decks | null) => void) => {
      if (!selectedTournament || !playerId) return
      
      // Récupérer TOUS les decks du joueur pour ce tournoi, triés par Date_Creation (le plus récent en premier)
      const { data, error } = await supabase
        .from('tournament_decks')
        .select('*')
        .eq('tournament_id', selectedTournament)
        .eq('player_id', playerId)
        .order('Date_Creation', { ascending: false }) // Le plus récent en premier - CORRIGÉ
        .limit(1) // Prendre seulement le premier (le plus récent)

      if (error) {
        console.error('Erreur lors de la récupération du deck:', error)
        setDeck(null)
      } else if (data && data.length > 0) {
        // Prendre le premier deck (le plus récent)
        setDeck(data[0])
      } else {
        setDeck(null)
      }
    },
    [selectedTournament]
  )

  useEffect(() => {
    fetchPlayerDeck(selectedPlayer1, setPlayer1Deck)
  }, [selectedPlayer1, selectedTournament, fetchPlayerDeck])

  useEffect(() => {
    fetchPlayerDeck(selectedPlayer2, setPlayer2Deck)
  }, [selectedPlayer2, selectedTournament, fetchPlayerDeck])

  // ======================================================
  // 🎯 Fonctions Match
  // ======================================================
  const resetMatch = () => {
    setSelectedPlayer1('')
    setSelectedPlayer2('')
    setPlayer1Deck(null)
    setPlayer2Deck(null)
    setSelectedCombo1('')
    setSelectedCombo2('')
    setPlayer1Score(0)
    setPlayer2Score(0)
    setRound(0)
    setRoundLogs([])
    setMatchValidated(false)
    setCreatedMatchId(null)
  }

  const getComboName = useCallback(
    (comboId: string | null) => {
      if (!comboId) return 'Combo inconnu'
      const combo = combosList.find((c) => c.combo_id === comboId)
      if (!combo) return 'Combo inconnu'
      return combo.name
    },
    [combosList]
  )

  const handleScore = (player: 1 | 2, points: number, action: match_action) => {
    if (!selectedCombo1 || !selectedCombo2) {
      alert('Sélectionne un combo pour chaque joueur !')
      return
    }

    const winnerCombo = player === 1 ? selectedCombo1 : selectedCombo2
    const loserCombo = player === 1 ? selectedCombo2 : selectedCombo1

    if (player === 1) setPlayer1Score((p) => p + points)
    else setPlayer2Score((p) => p + points)

    setRound((prev) => {
      const newRound = prev + 1
      setRoundLogs((logs) => [
        ...logs,
        { round: newRound, player, action, points, winnerCombo, loserCombo },
      ])
      return newRound
    })
  }

  // ======================================================
  // 🗄️ Match Creation & Database Storage
  // ======================================================
  const createMatchInDatabase = async (): Promise<string | null> => {
    if (!selectedTournament || !selectedPlayer1 || !selectedPlayer2 || round === 0) {
      alert('Impossible de créer le match: données manquantes')
      return null
    }

    // Determine winner and loser
    let winner_id: string | null = null
    let loser_id: string | null = null
    
    if (player1Score > player2Score) {
      winner_id = selectedPlayer1
      loser_id = selectedPlayer2
    } else if (player2Score > player1Score) {
      winner_id = selectedPlayer2
      loser_id = selectedPlayer1
    }
    // If draw, both winner_id and loser_id remain null

    // Count finish types
    const spinFinishes = roundLogs.filter(log => log.action === 'Spin').length
    const overFinishes = roundLogs.filter(log => log.action === 'Over').length
    const burstFinishes = roundLogs.filter(log => log.action === 'Burst').length
    const xtremeFinishes = roundLogs.filter(log => log.action === 'Xtreme').length

    // Get current user for created_by
    const { data: { user } } = await supabase.auth.getUser()
    const created_by = user?.id || null

    // Format match logs as JSON string
    const formattedLogs = JSON.stringify(roundLogs.map(log => ({
      round: log.round,
      player: log.player,
      action: log.action,
      points: log.points,
      winner_combo: log.winnerCombo,
      loser_combo: log.loserCombo,
      timestamp: new Date().toISOString()
    })), null, 2)

    // Prepare match data
    const matchData: MatchInsertData = {
      tournament_id: selectedTournament,
      player1_id: selectedPlayer1,
      player2_id: selectedPlayer2,
      winner_id: winner_id,
      loser_id: loser_id,
      rounds: round,
      created_by: created_by,
      match_logs: formattedLogs,
      spin_finishes: spinFinishes,
      over_finishes: overFinishes,
      burst_finishes: burstFinishes,
      xtreme_finishes: xtremeFinishes,
    }

    try {
      const { data, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select('match_id')
        .single()

      if (error) {
        console.error('Erreur lors de la création du match:', error)
        alert(`Erreur: ${error.message}`)
        return null
      }

      console.log('✅ Match créé avec succès, ID:', data.match_id)
      return data.match_id
    } catch (error) {
      console.error('Exception lors de la création du match:', error)
      return null
    }
  }

  // ======================================================
  // 📊 Update stats and create match
  // ======================================================
  const updatePlayerStatsAndCreateMatch = async () => {
    if (!selectedPlayer1 || !selectedPlayer2) return

    // First create the match in database
    const matchId = await createMatchInDatabase()
    if (!matchId) {
      alert('Échec de la création du match dans la base de données')
      return
    }

    setCreatedMatchId(matchId)

    // Then update player stats
    const statsInit: Omit<player_stats, 'player_id'> = {
      matches_played: 1,
      matches_won: 0,
      matches_lost: 0,
      matches_draw: 0,
      spin_finishes: 0,
      over_finishes: 0,
      burst_finishes: 0,
      xtreme_finishes: 0,
    }

    const statsP1 = { ...statsInit }
    const statsP2 = { ...statsInit }

    if (player1Score > player2Score) {
      statsP1.matches_won = 1
      statsP2.matches_lost = 1
    } else if (player2Score > player1Score) {
      statsP2.matches_won = 1
      statsP1.matches_lost = 1
    } else {
      statsP1.matches_draw = 1
      statsP2.matches_draw = 1
    }

    roundLogs.forEach((log) => {
      const target = log.player === 1 ? statsP1 : statsP2
      if (log.action === 'Spin') target.spin_finishes++
      if (log.action === 'Over') target.over_finishes++
      if (log.action === 'Burst') target.burst_finishes++
      if (log.action === 'Xtreme') target.xtreme_finishes++
    })

    const applyStats = async (playerId: string, s: typeof statsP1) => {
      const { data: existing } = await supabase
        .from('player_stats')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle<player_stats>()

      const base = existing || {
        player_id: playerId,
        matches_played: 0,
        matches_won: 0,
        matches_lost: 0,
        matches_draw: 0,
        spin_finishes: 0,
        over_finishes: 0,
        burst_finishes: 0,
        xtreme_finishes: 0,
      }

      const updated = {
        ...base,
        matches_played: base.matches_played + s.matches_played,
        matches_won: base.matches_won + s.matches_won,
        matches_lost: base.matches_lost + s.matches_lost,
        matches_draw: base.matches_draw + s.matches_draw,
        spin_finishes: base.spin_finishes + s.spin_finishes,
        over_finishes: base.over_finishes + s.over_finishes,
        burst_finishes: base.burst_finishes + s.burst_finishes,
        xtreme_finishes: base.xtreme_finishes + s.xtreme_finishes,
      }

      await supabase.from('player_stats').upsert(updated)
    }

    await applyStats(selectedPlayer1, statsP1)
    await applyStats(selectedPlayer2, statsP2)
    setMatchValidated(true)
    
    alert(`✅ Match enregistré avec succès! ID: ${matchId}`)
  }

  // ======================================================
  // 🎨 UI
  // ======================================================
  if (admin === null) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        <MainMenuButton />
        <p>Chargement...</p>
      </main>
    )
  }

  const player1Name =
    participants.find((p) => p.player_id === selectedPlayer1)?.player_name || 'Joueur 1'
  const player2Name =
    participants.find((p) => p.player_id === selectedPlayer2)?.player_name || 'Joueur 2'

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl shadow-2xl">
      <div className="mb-6 flex justify-end">
        <MainMenuButton />
      </div>
      <h1 className="text-4xl font-extrabold mb-8 text-center tracking-wide text-purple-400">
        ⚔️ Gestion Tournoi
      </h1>

      {/* Sélection tournoi */}
      <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-purple-500 shadow-lg">
        <label className="block mb-3 font-semibold text-purple-300">🎯 Tournoi :</label>
        <select
          className="bg-gray-900 border border-purple-600 rounded-lg p-3 w-full text-white"
          value={selectedTournament}
          onChange={(e) => {
            setSelectedTournament(e.target.value)
            resetMatch()
          }}
        >
          <option value="">Sélectionnez un tournoi</option>
          {tournamentsList.map((t) => (
            <option key={t.tournament_id} value={t.tournament_id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sélection joueurs */}
      {selectedTournament && (
        <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-lg flex gap-4">
          {[{ label: 'Joueur 1', value: selectedPlayer1, set: setSelectedPlayer1 }, { label: 'Joueur 2', value: selectedPlayer2, set: setSelectedPlayer2 }].map(
            (p, i) => (
              <div key={i} className="flex-1">
                <label className="block mb-3 font-semibold text-green-300">{p.label}</label>
                <select
                  className="bg-gray-900 border border-green-600 rounded-lg p-3 w-full text-white"
                  value={p.value}
                  onChange={(e) => {
                    p.set(e.target.value)
                    if (i === 0) setSelectedCombo1('')
                    else setSelectedCombo2('')
                  }}
                >
                  <option value="">Sélectionnez un joueur</option>
                  {participants.map((pl) => (
                    <option key={pl.player_id} value={pl.player_id}>
                      {pl.player_name}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}
        </div>
      )}

      {/* Combos + Score */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {[1, 2].map((num) => {
          const playerDeck = num === 1 ? player1Deck : player2Deck
          const setCombo = num === 1 ? setSelectedCombo1 : setSelectedCombo2
          const score = num === 1 ? player1Score : player2Score
          const name = num === 1 ? player1Name : player2Name

          return (
            <div
              key={num}
              className="border p-6 rounded-xl bg-gray-800/70 border-pink-500 shadow-xl flex flex-col w-full md:w-1/2"
            >
              <h2 className="font-bold mb-4 text-pink-300">Combos de {name}</h2>
              {playerDeck ? (
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    Deck sélectionné (le plus récent)
                  </p>
                  {[playerDeck.combo_id_1, playerDeck.combo_id_2, playerDeck.combo_id_3].map(
                    (cid, idx) =>
                      cid && (
                        <label key={cid} className="block mb-2">
                          <input
                            type="radio"
                            name={`combo${num}`}
                            value={cid}
                            checked={(num === 1 ? selectedCombo1 : selectedCombo2) === cid}
                            onChange={() => setCombo(cid)}
                            className="mr-2"
                          />
                          Combo {idx + 1} - {getComboName(cid)}
                        </label>
                      )
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Pas de deck sélectionné</p>
              )}

              <div className="grid grid-cols-2 gap-2 mt-4">
                {['Spin', 'Over', 'Burst', 'Xtreme'].map((action) => (
                  <button
                    key={action}
                    className={`${playerColors[num as 1 | 2]} text-white py-3 rounded-xl w-full text-lg`}
                    disabled={!(num === 1 ? selectedCombo1 : selectedCombo2)}
                    onClick={() =>
                      handleScore(
                        num as 1 | 2,
                        action === 'Spin' ? 1 : action === 'Over' ? 2 : action === 'Burst' ? 2 : 3,
                        action as match_action
                      )
                    }
                  >
                    {action}
                  </button>
                ))}
              </div>
              <p className="mt-2 font-semibold">Score : {score}</p>
            </div>
          )
        })}
      </div>

      {/* Historique */}
      {roundLogs.length > 0 && (
        <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-blue-500 shadow-md">
          <h3 className="font-semibold text-blue-300 mb-2">Historique des tours :</h3>
          <ul className="list-disc ml-5 text-white">
            {roundLogs.map((log, idx) => (
              <li key={idx}>
                Tour {log.round} : {log.player === 1 ? player1Name : player2Name} ({log.action},{' '}
                +{log.points}) avec <strong>{getComboName(log.winnerCombo)}</strong> contre{' '}
                <strong>{getComboName(log.loserCombo)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Validation */}
      {!matchValidated && round > 0 && (
        <button
          className="w-full py-3 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 mb-4"
          onClick={updatePlayerStatsAndCreateMatch}
        >
          ✅ Valider et enregistrer le match
        </button>
      )}

      {matchValidated && createdMatchId && (
        <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-md">
          <h2 className="text-xl font-bold mb-2 text-green-300">Match enregistré !</h2>
          <p className="mb-2">
            Score final : {player1Name} {player1Score} - {player2Score} {player2Name}
          </p>
          <p className="mb-2">
            Vainqueur :{' '}
            {player1Score > player2Score
              ? player1Name
              : player2Score > player1Score
              ? player2Name
              : 'Égalité'}
          </p>
          <p className="text-sm text-gray-300 mb-4">
            ID du match : {createdMatchId}
          </p>
          <button
            onClick={resetMatch}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl mt-2 font-bold shadow-lg transition-all duration-200"
          >
            🔁 Nouveau match
          </button>
        </div>
      )}
    </div>
  )
}
