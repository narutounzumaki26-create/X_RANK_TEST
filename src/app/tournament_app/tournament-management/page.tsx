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
  comboId: string
  comboName: string
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

type TournamentManagementMode = 'match'

// Helper type for piece options
type PieceOption = {
  blade_id?: string
  bit_id?: string
  ratchet_id?: string
  assist_id?: string
  lock_chip_id?: string
  name: string
  type?: string
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
  const [player1Score, setPlayer1Score] = useState(0)
  const [player2Score, setPlayer2Score] = useState(0)
  const [round, setRound] = useState(0)
  const [roundLogs, setRoundLogs] = useState<RoundLog[]>([])
  const [matchValidated, setMatchValidated] = useState(false)

  // ============================
  // 🔹 Combo Builder state (for both players)
  // ============================
  const [player1Combo, setPlayer1Combo] = useState<Bey>({ cx: false })
  const [player2Combo, setPlayer2Combo] = useState<Bey>({ cx: false })
  const [player1ComboName, setPlayer1ComboName] = useState('')
  const [player2ComboName, setPlayer2ComboName] = useState('')
  const [savedCombos, setSavedCombos] = useState<{player1: combos[], player2: combos[]}>({player1: [], player2: []})

  // ============================
  // 🔹 Pièces pour les combos
  // ============================
  const [blades, setBlades] = useState<PieceOption[]>([])
  const [bits, setBits] = useState<PieceOption[]>([])
  const [assists, setAssists] = useState<PieceOption[]>([])
  const [lockChips, setLockChips] = useState<PieceOption[]>([])
  const [ratchets, setRatchets] = useState<PieceOption[]>([])

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
  // 🎯 Fonctions Match
  // ======================================================
  const resetMatch = () => {
    setSelectedPlayer1('')
    setSelectedPlayer2('')
    setPlayer1Score(0)
    setPlayer2Score(0)
    setRound(0)
    setRoundLogs([])
    setMatchValidated(false)
    setPlayer1Combo({ cx: false })
    setPlayer2Combo({ cx: false })
    setPlayer1ComboName('')
    setPlayer2ComboName('')
    setSavedCombos({player1: [], player2: []})
  }

  // ======================================================
  // 🔧 Fonctions Combo Builder
  // ======================================================
  const handleBeyPieceSelect = (
    player: 1 | 2,
    type: BeyPieceKey,
    value: string,
    pieceType?: string
  ) => {
    const setCombo = player === 1 ? setPlayer1Combo : setPlayer2Combo
    const setComboName = player === 1 ? setPlayer1ComboName : setPlayer2ComboName

    setCombo(prev => {
      const newCombo = { ...prev, [type]: value }
      
      // Update type field
      if (pieceType) {
        const typeKey = `${type}Type` as keyof Bey
        if (typeKey === 'bladeType') {
          newCombo.bladeType = pieceType
        } else if (typeKey === 'bitType') {
          newCombo.bitType = pieceType
        } else if (typeKey === 'ratchetType') {
          newCombo.ratchetType = pieceType
        } else if (typeKey === 'assistType') {
          newCombo.assistType = pieceType
        } else if (typeKey === 'lockChipType') {
          newCombo.lockChipType = pieceType
        }
      }

      // Generate combo name
      const name = generateComboName(newCombo)
      setComboName(name)

      return newCombo
    })
  }

  const handleBeyCxChange = (player: 1 | 2, value: boolean) => {
    const setCombo = player === 1 ? setPlayer1Combo : setPlayer2Combo
    const setComboName = player === 1 ? setPlayer1ComboName : setPlayer2ComboName

    setCombo(prev => {
      const newCombo = { ...prev, cx: value }
      const name = generateComboName(newCombo)
      setComboName(name)
      return newCombo
    })
  }

  const generateComboName = (bey: Bey): string => {
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
      return parts.join('-')
    }

    return 'Combo incomplet'
  }

  const saveCombo = async (player: 1 | 2): Promise<string | null> => {
    const combo = player === 1 ? player1Combo : player2Combo
    const comboName = player === 1 ? player1ComboName : player2ComboName

    // Validate combo
    if (combo.cx) {
      if (!combo.lockChip || !combo.blade || !combo.assist || !combo.ratchet || !combo.bit) {
        alert('Combo CX incomplet ! Toutes les pièces sont requises.')
        return null
      }
    } else {
      if (!combo.blade || !combo.ratchet || !combo.bit) {
        alert('Combo incomplet ! Blade, Ratchet et Bit sont requis.')
        return null
      }
    }

    try {
      const { data: savedCombo, error } = await supabase
        .from('combos')
        .insert({
          blade_id: combo.blade,
          ratchet_id: combo.ratchet,
          bit_id: combo.bit,
          assist_id: combo.assist || null,
          lock_chip_id: combo.lockChip || null,
          name: comboName,
        })
        .select()
        .single()

      if (error) throw error

      // Update saved combos list
      setSavedCombos(prev => ({
        ...prev,
        [player === 1 ? 'player1' : 'player2']: [...prev[player === 1 ? 'player1' : 'player2'], savedCombo]
      }))

      return savedCombo.combo_id
    } catch (error) {
      console.error('Error saving combo:', error)
      alert('Erreur lors de la sauvegarde du combo')
      return null
    }
  }

  const handleScore = async (player: 1 | 2, points: number, action: match_action) => {
    // Save the current combo for this round
    const comboId = await saveCombo(player)
    if (!comboId) return

    const comboName = player === 1 ? player1ComboName : player2ComboName

    if (player === 1) setPlayer1Score((p) => p + points)
    else setPlayer2Score((p) => p + points)

    setRound((prev) => {
      const newRound = prev + 1
      setRoundLogs((logs) => [
        ...logs,
        { round: newRound, player, action, points, comboId, comboName },
      ])
      return newRound
    })

    // Reset combo for next round
    if (player === 1) {
      setPlayer1Combo({ cx: false })
      setPlayer1ComboName('')
    } else {
      setPlayer2Combo({ cx: false })
      setPlayer2ComboName('')
    }
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

  // Helper function to get piece ID based on type
  const getPieceId = (piece: PieceOption, type: BeyPieceKey): string => {
    switch (type) {
      case 'blade': return piece.blade_id!
      case 'bit': return piece.bit_id!
      case 'ratchet': return piece.ratchet_id!
      case 'assist': return piece.assist_id!
      case 'lockChip': return piece.lock_chip_id!
      default: return ''
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

  const renderComboBuilder = (player: 1 | 2) => {
    const combo = player === 1 ? player1Combo : player2Combo
    const comboName = player === 1 ? player1ComboName : player2ComboName
    const savedPlayerCombos = player === 1 ? savedCombos.player1 : savedCombos.player2

    return (
      <div className="border p-6 rounded-xl bg-gray-800/70 border-pink-500 shadow-xl flex flex-col">
        <h2 className="font-bold mb-4 text-pink-300">Constructeur de Combo - {player === 1 ? player1Name : player2Name}</h2>
        
        {/* Current Combo Display */}
        <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-pink-600">
          <p className="text-sm font-semibold text-pink-300 mb-1">Combo actuel :</p>
          <p className="text-white font-mono">{comboName || 'Aucun combo construit'}</p>
        </div>

        {/* CX Toggle */}
        <div className="mb-4 flex items-center gap-2">
          <label className="font-semibold">CX ?</label>
          <input
            type="checkbox"
            checked={combo.cx}
            onChange={e => handleBeyCxChange(player, e.target.checked)}
            className="w-5 h-5 accent-pink-500"
          />
        </div>

        {/* Piece Selection */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          {(combo.cx
            ? [
                { key: 'lockChip' as BeyPieceKey, options: lockChips, label: 'Lock Chip' },
                { key: 'blade' as BeyPieceKey, options: blades, label: 'Blade' },
                { key: 'assist' as BeyPieceKey, options: assists, label: 'Assist' },
                { key: 'ratchet' as BeyPieceKey, options: ratchets, label: 'Ratchet' },
                { key: 'bit' as BeyPieceKey, options: bits, label: 'Bit' },
              ]
            : [
                { key: 'blade' as BeyPieceKey, options: blades, label: 'Blade' },
                { key: 'ratchet' as BeyPieceKey, options: ratchets, label: 'Ratchet' },
                { key: 'bit' as BeyPieceKey, options: bits, label: 'Bit' },
              ]
          ).map(({ key, options, label }) => {
            const selectedValue = combo[key] ?? ''

            return (
              <Select
                key={key}
                onValueChange={v => handleBeyPieceSelect(player, key, v)}
                value={selectedValue}
              >
                <SelectTrigger className="bg-gray-900 border border-pink-600">
                  <SelectValue placeholder={label} />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 text-white">
                  {options.map(o => {
                    const optionValue = getPieceId(o, key)
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {['Spin', 'Over', 'Burst', 'Xtreme'].map((action) => (
            <Button
              key={action}
              className={`${playerColors[player]} text-white py-3 rounded-xl w-full text-lg`}
              disabled={!comboName || comboName === 'Combo incomplet'}
              onClick={() =>
                handleScore(
                  player,
                  action === 'Spin' ? 1 : action === 'Over' ? 2 : action === 'Burst' ? 2 : 3,
                  action as match_action
                )
              }
            >
              {action}
            </Button>
          ))}
        </div>

        {/* Saved Combos */}
        {savedPlayerCombos.length > 0 && (
          <div className="mt-4 p-3 bg-gray-900 rounded-lg">
            <p className="text-sm font-semibold text-pink-300 mb-2">Combos utilisés :</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {savedPlayerCombos.map((combo, index) => (
                <div key={combo.combo_id} className="text-xs text-gray-300">
                  Round {index + 1}: {combo.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl shadow-2xl">
      <div className="mb-6 flex justify-end">
        <MainMenuButton />
      </div>

      <h1 className="text-4xl font-extrabold mb-8 text-center tracking-wide text-purple-400">
        ⚔️ Gestion Tournoi - Combos Dynamiques
      </h1>

      {/* Sélection tournoi */}
      <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-purple-500 shadow-lg">
        <label className="block mb-3 font-semibold text-purple-300">🎯 Tournoi :</label>
        <Select onValueChange={setSelectedTournament} value={selectedTournament}>
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
                onValueChange={p.set}
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

      {/* Score Display */}
      {selectedPlayer1 && selectedPlayer2 && (
        <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-blue-500 shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4 text-blue-300">Score du Match</h2>
          <div className="flex justify-center items-center gap-8 text-3xl font-bold">
            <div className="text-blue-400">
              {player1Name}: <span className="text-white">{player1Score}</span>
            </div>
            <div className="text-gray-400">-</div>
            <div className="text-red-400">
              {player2Name}: <span className="text-white">{player2Score}</span>
            </div>
          </div>
          <p className="mt-2 text-gray-300">Round: {round}</p>
        </div>
      )}

      {/* Combo Builders */}
      {selectedPlayer1 && selectedPlayer2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {renderComboBuilder(1)}
          {renderComboBuilder(2)}
        </div>
      )}

      {/* Historique */}
      {roundLogs.length > 0 && (
        <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-blue-500 shadow-md">
          <h3 className="font-semibold text-blue-300 mb-2">Historique des tours :</h3>
          <ul className="list-disc ml-5 text-white">
            {roundLogs.map((log, idx) => (
              <li key={idx}>
                Tour {log.round} : {log.player === 1 ? player1Name : player2Name} ({log.action},{' '}
                +{log.points}) avec <strong>{log.comboName}</strong>
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
    </div>
  )
}
