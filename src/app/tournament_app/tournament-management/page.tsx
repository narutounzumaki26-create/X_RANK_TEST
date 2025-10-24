'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { MainMenuButton } from '@/components/navigation/MainMenuButton'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type {
  players,
  tournaments,
  combos,
  tournament_decks,
  match_action,
  player_stats,
} from 'src/app/tournament_app/tournament'

// Types
type RoundLog = {
  round: number
  player: 1 | 2
  action: match_action
  points: number
  winnerCombo: string
  loserCombo: string
}

type BeyPieceKey = "blade" | "bit" | "ratchet" | "assist" | "lockChip"

type Bey = {
  cx: boolean
  blade?: string
  bladeType?: string
  bit?: string
  bitType?: string
  ratchet?: string
  ratchetType?: string
  assist?: string
  assistType?: string
  lockChip?: string
  lockChipType?: string
}

type TournamentManagementMode = 'inscription' | 'match'

export default function TournamentManagementPage() {
  const router = useRouter()

  // ============================
  // 🔹 État principal
  // ============================
  const [admin, setAdmin] = useState<boolean | null>(null)
  const [mode, setMode] = useState<TournamentManagementMode>('inscription')
  const [tournamentsList, setTournamentsList] = useState<tournaments[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>('')
  const [participants, setParticipants] = useState<players[]>([])
  const [combosList, setCombosList] = useState<combos[]>([])
  const [playersList, setPlayersList] = useState<players[]>([])

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

  // ============================
  // 🔹 Inscription state
  // ============================
  const [beys, setBeys] = useState<Bey[]>([])
  const [selectedComboCount, setSelectedComboCount] = useState<number>(0)
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [tournamentDetails, setTournamentDetails] = useState<tournaments | null>(null)

  // ============================
  // 🔹 Pièces pour les combos
  // ============================
  const [blades, setBlades] = useState<{ blade_id: string; name: string; type?: string }[]>([])
  const [bits, setBits] = useState<{ bit_id: string; name: string; type?: string }[]>([])
  const [assists, setAssists] = useState<{ assist_id: string; name: string; type?: string }[]>([])
  const [lockChips, setLockChips] = useState<{ lock_chip_id: string; name: string; type?: string }[]>([])
  const [ratchets, setRatchets] = useState<{ ratchet_id: string; name: string; type?: string }[]>([])

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
  // 📋 Fetch données globales
  // ======================================================
  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase.from('tournaments').select('*').returns<tournaments[]>()
      if (error) console.error(error)
      else setTournamentsList(data || [])
    }
    fetchTournaments()
  }, [])

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase.from('players').select('*').returns<players[]>()
      if (error) console.error(error)
      else if (data) setPlayersList(data.sort((a, b) => a.player_name.localeCompare(b.player_name, 'fr', { sensitivity: 'base' })))
    }
    fetchPlayers()
  }, [])

  useEffect(() => {
    const fetchCombos = async () => {
      const { data, error } = await supabase.from('combos').select('*').returns<combos[]>()
      if (error) console.error(error)
      else setCombosList(data || [])
    }
    fetchCombos()
  }, [])

  useEffect(() => {
    const fetchPieces = async () => {
      const { data: bladeData } = await supabase.from('blade').select('*')
      const { data: bitData } = await supabase.from('bit').select('*')
      const { data: assistData } = await supabase.from('assist').select('*')
      const { data: lockChipData } = await supabase.from('lock_chip').select('*')
      const { data: ratchetData } = await supabase.from('ratchet').select('*')

      if (bladeData) setBlades(bladeData.sort((a, b) => a.name.localeCompare(b.name)))
      if (bitData) setBits(bitData.sort((a, b) => a.name.localeCompare(b.name)))
      if (assistData) setAssists(assistData.sort((a, b) => a.name.localeCompare(b.name)))
      if (lockChipData) setLockChips(lockChipData.sort((a, b) => a.name.localeCompare(b.name)))
      if (ratchetData) setRatchets(ratchetData.sort((a, b) => a.name.localeCompare(b.name)))
    }
    fetchPieces()
  }, [])

  // ======================================================
  // 📋 Participants du tournoi sélectionné
  // ======================================================
  useEffect(() => {
    if (!selectedTournament) {
      setParticipants([])
      return
    }

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
  // 🧩 Fetch Decks pour les matchs
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

      if (error) setDeck(null)
      else setDeck(data)
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
      
      if (!combo) {
        console.warn('Combo not found for ID:', comboId)
        return 'Combo inconnu'
      }
      
      const comboName = combo.name || ''
      
      if (comboName.includes(' - ') && comboName.length > 36) {
        const parts = comboName.split(' - ')
        if (parts.length >= 2) {
          return parts[0]
        }
      }
      
      return comboName || 'Combo sans nom'
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
  // 📝 Fonctions Inscription
  // ======================================================
  const handleTournamentSelect = (tournamentId: string) => {
    setSelectedTournament(tournamentId)
    const details = tournamentsList.find((t) => t.tournament_id === tournamentId) || null
    setTournamentDetails(details)

    if (details) {
      setSelectedComboCount(0)
      setBeys([])
    }
  }

  const handleComboCountChange = (count: number) => {
    setSelectedComboCount(count)
    
    if (count > 0) {
      const initialBeys: Bey[] = Array(count).fill(null).map(() => ({ cx: false }))
      setBeys(initialBeys)
    } else {
      setBeys([])
    }
  }

  const handleBeyCxChange = (index: number, value: boolean) => {
    setBeys(prev => {
      const newBeys = [...prev]
      newBeys[index].cx = value
      return newBeys
    })
  }

  const handleBeyPieceSelect = (
    index: number,
    type: BeyPieceKey,
    value: string,
    pieceType?: string
  ) => {
    const newBeys = [...beys]
    newBeys[index][type] = value

    if (pieceType) {
      const typeKey = `${type}Type` as keyof Bey
      newBeys[index][typeKey] = pieceType
    }

    setBeys(newBeys)
  }

  const generateComboName = (bey: Bey, index: number): string => {
    const parts: string[] = []

    if (bey.blade) {
      const blade = blades.find(b => b.blade_id === bey.blade)
      if (blade) parts.push(blade.name)
    }

    if (bey.ratchet) {
      const ratchet = ratchets.find(r => r.ratchet_id === bey.ratchet)
      if (ratchet) parts.push(ratchet.name)
    }

    if (bey.bit) {
      const bit = bits.find(b => b.bit_id === bey.bit)
      if (bit) parts.push(bit.name)
    }

    if (bey.cx) {
      if (bey.assist) {
        const assist = assists.find(a => a.assist_id === bey.assist)
        if (assist) parts.push(assist.name)
      }
      if (bey.lockChip) {
        const lockChip = lockChips.find(l => l.lock_chip_id === bey.lockChip)
        if (lockChip) parts.push(lockChip.name)
      }
    }

    if (parts.length > 0) {
      return `Combo ${index + 1} - ${parts.join('-')}`
    }

    return `Combo ${index + 1}`
  }

  const getCurrentComboName = (bey: Bey, index: number): string => {
    return generateComboName(bey, index)
  }

  const handleInscription = async () => {
    if (!selectedPlayer || !selectedTournament) {
      alert('Veuillez sélectionner un joueur et un tournoi !')
      return
    }

    if (selectedComboCount === 0) {
      alert('Veuillez sélectionner le nombre de combos !')
      return
    }

    const incompleteBeys = beys.some((bey, index) => {
      if (bey.cx) {
        return !bey.lockChip || !bey.blade || !bey.assist || !bey.ratchet || !bey.bit
      } else {
        return !bey.blade || !bey.ratchet || !bey.bit
      }
    })

    if (incompleteBeys) {
      alert('Veuillez sélectionner toutes les pièces requises pour chaque combo !')
      return
    }

    try {
      const comboIds: string[] = []

      for (let i = 0; i < beys.length; i++) {
        const bey = beys[i]
        const comboName = generateComboName(bey, i)
        
        const { data: combo, error: comboError } = await supabase
          .from('combos')
          .insert({
            blade_id: bey.blade,
            ratchet_id: bey.ratchet,
            bit_id: bey.bit,
            assist_id: bey.assist || null,
            lock_chip_id: bey.lockChip || null,
            name: comboName,
          })
          .select()
          .single()
        if (comboError) throw comboError
        comboIds.push(combo.combo_id)
      }

      const deckInsert: Record<string, string> = {
        player_id: selectedPlayer,
        tournament_id: selectedTournament,
      }
      comboIds.forEach((id, idx) => {
        deckInsert[`combo_id_${idx + 1}`] = id
      })

      const { data: deck, error: deckError } = await supabase
        .from('tournament_decks')
        .insert(deckInsert)
        .select()
        .single()
      if (deckError) throw deckError

      const { error: participantError } = await supabase
        .from('tournament_participants')
        .insert({
          player_id: selectedPlayer,
          tournament_id: selectedTournament,
          tournament_deck: deck.deck_id,
          is_validated: false,
        })
      if (participantError) throw participantError

      alert('Inscription réussie !')
      
      // Reset form
      setSelectedPlayer('')
      setSelectedComboCount(0)
      setBeys([])
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message)
        alert(`Erreur : ${err.message}`)
      } else {
        console.error(err)
        alert('Erreur lors de l\'inscription.')
      }
    }
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

  const player1Name = participants.find((p) => p.player_id === selectedPlayer1)?.player_name || 'Joueur 1'
  const player2Name = participants.find((p) => p.player_id === selectedPlayer2)?.player_name || 'Joueur 2'
  const comboCountOptions = tournamentDetails 
    ? Array.from({ length: tournamentDetails.max_combos }, (_, i) => i + 1)
    : []

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl shadow-2xl">
      <div className="mb-6 flex justify-between items-center">
        <MainMenuButton />
        <div className="flex gap-2">
          <Button
            onClick={() => setMode('inscription')}
            className={`px-4 py-2 rounded-lg ${
              mode === 'inscription' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            📝 Inscription
          </Button>
          <Button
            onClick={() => setMode('match')}
            className={`px-4 py-2 rounded-lg ${
              mode === 'match' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            ⚔️ Gestion Match
          </Button>
        </div>
      </div>

      <h1 className="text-4xl font-extrabold mb-8 text-center tracking-wide text-purple-400">
        {mode === 'inscription' ? '🚀 Inscription Tournoi' : '⚔️ Gestion Tournoi'}
      </h1>

      {/* Sélection tournoi */}
      <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-purple-500 shadow-lg">
        <label className="block mb-3 font-semibold text-purple-300">🎯 Tournoi :</label>
        <Select onValueChange={handleTournamentSelect} value={selectedTournament}>
          <SelectTrigger className="bg-gray-900 border border-purple-600">
            <SelectValue placeholder="Choisir un tournoi" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 text-white">
            {tournamentsList.map((t) => (
              <SelectItem key={t.tournament_id} value={t.tournament_id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Récap tournoi */}
      {tournamentDetails && (
        <div className="mb-8 p-6 bg-gray-800/70 rounded-xl border border-blue-500 shadow-md">
          <p><span className="font-bold text-blue-300">🏆 Nom :</span> {tournamentDetails.name}</p>
          <p><span className="font-bold text-blue-300">📍 Lieu :</span> {tournamentDetails.location || 'Non spécifié'}</p>
          <p><span className="font-bold text-blue-300">📅 Date :</span> {new Date(tournamentDetails.date).toLocaleDateString()}</p>
          <p><span className="font-bold text-blue-300">🔢 Combos maximum :</span> {tournamentDetails.max_combos}</p>
        </div>
      )}

      {/* MODE INSCRIPTION */}
      {mode === 'inscription' && (
        <>
          {/* Sélection du nombre de combos */}
          {tournamentDetails && (
            <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-yellow-500 shadow-lg">
              <label className="block mb-3 font-semibold text-yellow-300">🔢 Nombre de combos :</label>
              <Select 
                onValueChange={(value) => handleComboCountChange(parseInt(value))} 
                value={selectedComboCount.toString()}
              >
                <SelectTrigger className="bg-gray-900 border border-yellow-600">
                  <SelectValue placeholder="Choisir le nombre de combos" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 text-white">
                  <SelectItem value="0">Sélectionner...</SelectItem>
                  {comboCountOptions.map(count => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} combo{count > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-sm text-yellow-200">
                Choisissez entre 1 et {tournamentDetails.max_combos} combo(s) pour ce tournoi
              </p>
            </div>
          )}

          {/* Sélection joueur */}
          <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-lg">
            <label className="block mb-3 font-semibold text-green-300">👤 Joueur :</label>
            <Select onValueChange={setSelectedPlayer} value={selectedPlayer} disabled={!selectedTournament}>
              <SelectTrigger className="bg-gray-900 border border-green-600">
                <SelectValue placeholder="Choisir un joueur" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 text-white">
                {playersList.map(p => (
                  <SelectItem key={p.player_id} value={p.player_id}>
                    {p.player_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Beys */}
          {selectedComboCount > 0 && beys.map((bey, index) => (
            <div
              key={`bey-${index}`}
              className="mb-8 p-6 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 border border-pink-500 shadow-xl"
            >
              <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-pink-600">
                <p className="text-sm font-semibold text-pink-300 mb-1">Nom du Combo :</p>
                <p className="text-white font-mono">{getCurrentComboName(bey, index)}</p>
              </div>

              <p className="text-lg font-bold mb-4 text-pink-300">🔥 Combo {index + 1}</p>
              <div className="mb-4 flex items-center gap-2">
                <label className="font-semibold">CX ?</label>
                <input
                  type="checkbox"
                  checked={bey.cx}
                  onChange={e => handleBeyCxChange(index, e.target.checked)}
                  className="w-5 h-5 accent-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(bey.cx
                  ? [
                      { key: 'lockChip', options: lockChips, label: 'Lock Chip' },
                      { key: 'blade', options: blades, label: 'Blade' },
                      { key: 'assist', options: assists, label: 'Assist' },
                      { key: 'ratchet', options: ratchets, label: 'Ratchet' },
                      { key: 'bit', options: bits, label: 'Bit' },
                    ]
                  : [
                      { key: 'blade', options: blades, label: 'Blade' },
                      { key: 'ratchet', options: ratchets, label: 'Ratchet' },
                      { key: 'bit', options: bits, label: 'Bit' },
                    ]
                ).map(({ key, options, label }) => {
                  const pieceKey = key as BeyPieceKey
                  const selectedValue = bey[pieceKey] ?? ''

                  return (
                    <Select
                      key={pieceKey}
                      onValueChange={v => handleBeyPieceSelect(index, pieceKey, v)}
                      value={selectedValue}
                    >
                      <SelectTrigger className="bg-gray-900 border border-pink-600">
                        <SelectValue placeholder={label} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white">
                        {options.map(o => {
                          const idKey = pieceKey === 'lockChip' ? 'lock_chip_id' : `${pieceKey}_id`
                          const optionValue = o[idKey as keyof typeof o] as string
                          return (
                            <SelectItem key={optionValue} value={optionValue}>
                              {o.name} {o.type ? `(${o.type})` : ''}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  )
                })}
              </div>
            </div>
          ))}

          <Button
            onClick={handleInscription}
            disabled={!selectedTournament || !selectedPlayer || selectedComboCount === 0}
            className="w-full py-3 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            ⚡ S&apos;inscrire maintenant
          </Button>
        </>
      )}

      {/* MODE MATCH */}
      {mode === 'match' && (
        <>
          {/* Sélection joueurs */}
          {selectedTournament && (
            <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-lg flex gap-4">
              {[
                { label: 'Joueur 1', value: selectedPlayer1, set: setSelectedPlayer1 }, 
                { label: 'Joueur 2', value: selectedPlayer2, set: setSelectedPlayer2 }
              ].map((p, i) => (
                <div key={i} className="flex-1">
                  <label className="block mb-3 font-semibold text-green-300">{p.label}</label>
                  <Select
                    value={p.value}
                    onValueChange={(value) => {
                      p.set(value)
                      if (i === 0) setSelectedCombo1('')
                      else setSelectedCombo2('')
                    }}
                  >
                    <SelectTrigger className="bg-gray-900 border border-green-600">
                      <SelectValue placeholder="Sélectionnez un joueur" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 text-white">
                      {participants.map((pl) => (
                        <SelectItem key={pl.player_id} value={pl.player_id}>
                          {pl.player_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    [playerDeck.combo_id_1, playerDeck.combo_id_2, playerDeck.combo_id_3].map(
                      (cid, idx) =>
                        cid && (
                          <label key={cid} className="block mb-2">
                            <input
                              type="radio"
                              name={`combo${num}`}
                              value={cid}
                              checked={selectedCombo === cid}
                              onChange={() => setCombo(cid)}
                              className="mr-2"
                            />
                            Combo {idx + 1} - {getComboName(cid)}
                          </label>
                        )
                    )
                  ) : (
                    <p className="text-gray-400">Pas de deck sélectionné</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {['Spin', 'Over', 'Burst', 'Xtreme'].map((action) => (
                      <Button
                        key={action}
                        className={`${playerColors[num as 1 | 2]} text-white py-3 rounded-xl w-full text-lg`}
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
                      </Button>
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
            <Button
              className="w-full py-3 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 mb-4"
              onClick={updatePlayerStats}
            >
              ✅ Valider le match
            </Button>
          )}

          {matchValidated && (
            <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-blue-500 shadow-md">
              <h2 className="text-xl font-bold mb-2 text-blue-300">Rapport du match</h2>
              <p>
                Score final : {player1Name} {player1Score} - {player2Score} {player2Name}
              </p>
              <p>
                Vainqueur :{' '}
                {player1Score > player2Score
                  ? player1Name
                  : player2Score > player1Score
                  ? player2Name
                  : 'Égalité'}
              </p>
              <Button
                onClick={resetMatch}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl mt-4 font-bold shadow-lg transition-all duration-200"
              >
                🔁 Nouveau match
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
