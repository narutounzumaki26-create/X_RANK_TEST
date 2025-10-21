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

  // --- Combos avec les noms ---
  useEffect(() => {
    const fetchCombos = async () => {
      const { data, error } = await supabase
        .from('combos')
        .select('*')
        .returns<combos[]>()
      
      if (error) {
        console.error('Error fetching combos:', error)
      } else {
        console.log('Combos fetched:', data) // Debug log
        setCombosList(data || [])
      }
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
  // 🧩 Fetch Decks avec les détails des combos
  // ======================================================
  const fetchPlayerDeck = useCallback(
    async (playerId: string, setDeck: (d: tournament_decks | null) => void) => {
      if (!selectedTournament || !playerId) return
      
      const { data, error } = await supabase
        .from('tournament_decks')
        .select('*')
        .eq('tournament_id', selectedTournament)
        .eq('player_id', playerId)
        .single<tournament_decks>()

      if (error) {
        console.error('Error fetching deck:', error)
        setDeck(null)
      } else {
        console.log('Deck fetched:', data) // Debug log
        setDeck(data)
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
  }

  const getComboName = useCallback(
    (comboId: string | null) => {
      if (!comboId) return 'Combo inconnu'
      const combo = combosList.find((c) => c.combo_id === comboId)
      console.log('Looking for combo:', comboId, 'Found:', combo) // Debug log
      if (!combo) return 'Combo inconnu'
      return combo.name || 'Combo sans nom'
    },
    [combosList]
  )

  const getComboDisplayName = useCallback(
    (comboId: string | null) => {
      if (!comboId) return 'Combo inconnu'
      const combo = combosList.find((c) => c.combo_id === comboId)
      if (!combo) return 'Combo inconnu'
      
      // Return just the name for now - you can enhance this with piece details later
      return combo.name || `Combo ${comboId.slice(0, 8)}...`
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
  // 📊 Update stats
  // ======================================================
  const updatePlayerStats = async () => {
    if (!selectedPlayer1 || !selectedPlayer2) return

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
          {[
            { label: 'Joueur 1', value: selectedPlayer1, set: setSelectedPlayer1 }, 
            { label: 'Joueur 2', value: selectedPlayer2, set: setSelectedPlayer2 }
          ].map((p, i) => (
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
          ))}
        </div>
      )}

      {/* Combos + Score */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {[1, 2].map((num) => {
          const playerDeck = num === 1 ? player1Deck : player2Deck
          const setCombo = num === 1 ? setSelectedCombo1 : setSelectedCombo2
          const selectedCombo = num === 1 ? selectedCombo1 : selectedCombo2
          const score = num === 1 ? player1Score : player2Score
          const name = num === 1 ? player1Name : player2Name

          return (
            <div
              key={num}
              className="border p-6 rounded-xl bg-gray-800/70 border-pink-500 shadow-xl flex flex-col w-full md:w-1/2"
            >
              <h2 className="font-bold mb-4 text-pink-300">Combos de {name}</h2>
              {playerDeck ? (
                [playerDeck.combo_id_1, playerDeck.combo_id_2, playerDeck.combo_id_3]
                  .filter((cid): cid is string => !!cid) // Filter out null/undefined
                  .map((cid, idx) => (
                    <label key={cid} className="block mb-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
                      <input
                        type="radio"
                        name={`combo${num}`}
                        value={cid}
                        checked={selectedCombo === cid}
                        onChange={() => setCombo(cid)}
                        className="mr-2"
                      />
                      <span className="font-medium">
                        Combo {idx + 1} - {getComboDisplayName(cid)}
                      </span>
                    </label>
                  ))
              ) : (
                <p className="text-gray-400">Pas de deck sélectionné</p>
              )}

              <div className="grid grid-cols-2 gap-2 mt-4">
                {['Spin', 'Over', 'Burst', 'Xtreme'].map((action) => (
                  <button
                    key={action}
                    className={`${playerColors[num as 1 | 2]} text-white py-3 rounded-xl w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={!selectedCombo}
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
              <p className="mt-2 font-semibold text-lg">Score : {score}</p>
            </div>
          )
        })}
      </div>

      {/* Historique */}
      {roundLogs.length > 0 && (
        <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-blue-500 shadow-md">
          <h3 className="font-semibold text-blue-300 mb-4 text-lg">Historique des tours :</h3>
          <ul className="space-y-2">
            {roundLogs.map((log, idx) => (
              <li key={idx} className="bg-gray-900/50 p-3 rounded-lg">
                <span className="font-semibold">Tour {log.round}</span> : 
                <span className={`ml-2 ${log.player === 1 ? 'text-blue-400' : 'text-red-400'}`}>
                  {log.player === 1 ? player1Name : player2Name}
                </span>{' '}
                ({log.action}, +{log.points}) avec{' '}
                <strong className="text-yellow-300">{getComboName(log.winnerCombo)}</strong> contre{' '}
                <strong className="text-yellow-300">{getComboName(log.loserCombo)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Validation */}
      {!matchValidated && round > 0 && (
        <button
          className="w-full py-3 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={updatePlayerStats}
          disabled={!selectedCombo1 || !selectedCombo2}
        >
          ✅ Valider le match
        </button>
      )}

      {matchValidated && (
        <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-md">
          <h2 className="text-xl font-bold mb-4 text-green-300">🎉 Rapport du match</h2>
          <p className="text-lg mb-2">
            <span className="font-semibold">Score final :</span> {player1Name} {player1Score} - {player2Score} {player2Name}
          </p>
          <p className="text-lg mb-4">
            <span className="font-semibold">Vainqueur :</span>{' '}
            {player1Score > player2Score
              ? <span className="text-blue-400">{player1Name}</span>
              : player2Score > player1Score
              ? <span className="text-red-400">{player2Name}</span>
              : <span className="text-yellow-400">Égalité</span>}
          </p>
          <button
            onClick={resetMatch}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl mt-4 font-bold shadow-lg transition-all duration-200"
          >
            🔁 Nouveau match
          </button>
        </div>
      )}
    </div>
  )
}
