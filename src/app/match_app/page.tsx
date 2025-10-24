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

// Types basés uniquement sur matches et official_matches_decks
type Match = {
  match_id: string
  tournament_id: string | null
  player1_id: string | null
  player2_id: string | null
  winner_id: string | null
  loser_id: string | null
  rounds: number
  created_by: string | null
  match_logs: string | null
  spin_finishes: number | null
  over_finishes: number | null
  burst_finishes: number | null
  xtreme_finishes: number | null
  spin_finishes2: number | null
  over_finishes2: number | null
  burst_finishes2: number | null
  xtreme_finishes2: number | null
}

type OfficialMatchDeck = {
  match_id: string
  player_id: string
  combo_id_1: string | null
  combo_id_2: string | null
  combo_id_3: string | null
  deck_id: string
  Date_Creation: string | null
}

type Player = {
  player_id: string
  player_name: string
  user_id: string | null
  Admin: boolean | null
}

type Combo = {
  combo_id: string
  name: string
  blade_id: string | null
  ratchet_id: string | null
  bit_id: string | null
  assist_id: string | null
  lock_chip_id: string | null
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

type PieceOption = {
  blade_id?: string
  bit_id?: string
  ratchet_id?: string
  assist_id?: string
  lock_chip_id?: string
  name: string
  type?: string
}

type MatchAction = 'Spin' | 'Over' | 'Burst' | 'Xtreme'

type RoundLog = {
  round: number
  player: 1 | 2
  action: MatchAction
  points: number
  winnerCombo: string
  loserCombo: string
}

type Mode = 'create-deck' | 'manage-match'

export default function TournamentManagementPage() {
  const router = useRouter()

  // ============================
  // 🔹 État principal
  // ============================
  const [admin, setAdmin] = useState<boolean | null>(null)
  const [mode, setMode] = useState<Mode>('create-deck')
  const [playersList, setPlayersList] = useState<Player[]>([])
  const [combosList, setCombosList] = useState<Combo[]>([])

  // ============================
  // 🔹 État pour création de deck
  // ============================
  const [selectedPlayerForDeck, setSelectedPlayerForDeck] = useState<string>('')
  const [beys, setBeys] = useState<Bey[]>([])
  const [selectedComboCount, setSelectedComboCount] = useState<number>(0)

  // ============================
  // 🔹 État pour gestion de match
  // ============================
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>('')
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>('')
  const [player1Decks, setPlayer1Decks] = useState<OfficialMatchDeck[]>([])
  const [player2Decks, setPlayer2Decks] = useState<OfficialMatchDeck[]>([])
  const [selectedDeck1, setSelectedDeck1] = useState<string>('')
  const [selectedDeck2, setSelectedDeck2] = useState<string>('')
  const [player1Score, setPlayer1Score] = useState(0)
  const [player2Score, setPlayer2Score] = useState(0)
  const [round, setRound] = useState(0)
  const [roundLogs, setRoundLogs] = useState<RoundLog[]>([])
  const [selectedCombo1, setSelectedCombo1] = useState<string>('')
  const [selectedCombo2, setSelectedCombo2] = useState<string>('')
  const [matchValidated, setMatchValidated] = useState(false)
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('')

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
        .select('player_id, Admin')
        .eq('user_id', user.id)
        .single<Player>()

      if (error || !player || !player.Admin) {
        router.push('/')
        return
      }

      setAdmin(true)
      setCurrentPlayerId(player.player_id)
    }

    checkAdmin()
  }, [router])

  // ======================================================
  // 📋 Fetch données globales
  // ======================================================
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase.from('players').select('*').returns<Player[]>()
      if (error) console.error('Erreur joueurs:', error)
      else if (data) setPlayersList(data.sort((a, b) => a.player_name.localeCompare(b.player_name, 'fr', { sensitivity: 'base' })))
    }
    fetchPlayers()
  }, [])

  useEffect(() => {
    const fetchCombos = async () => {
      const { data, error } = await supabase.from('combos').select('*').returns<Combo[]>()
      if (error) console.error('Erreur combos:', error)
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
  // 🧩 Fetch Decks pour les joueurs sélectionnés
  // ======================================================
  const fetchPlayerDecks = useCallback(async (playerId: string, setDecks: (d: OfficialMatchDeck[]) => void) => {
    if (!playerId) {
      setDecks([])
      return
    }

    const { data, error } = await supabase
      .from('official_matches_decks') // ✅ CORRIGÉ
      .select('*')
      .eq('player_id', playerId)
      .order('Date_Creation', { ascending: false })

    if (error) {
      console.error('Erreur decks:', error)
      setDecks([])
    } else {
      setDecks(data || [])
    }
  }, [])

  useEffect(() => {
    fetchPlayerDecks(selectedPlayer1, setPlayer1Decks)
    setSelectedDeck1('')
    setSelectedCombo1('')
  }, [selectedPlayer1, fetchPlayerDecks])

  useEffect(() => {
    fetchPlayerDecks(selectedPlayer2, setPlayer2Decks)
    setSelectedDeck2('')
    setSelectedCombo2('')
  }, [selectedPlayer2, fetchPlayerDecks])

  // ======================================================
  // 🎴 Fonctions pour création de deck
  // ======================================================
  const resetDeckCreation = () => {
    setSelectedPlayerForDeck('')
    setSelectedComboCount(0)
    setBeys([])
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
    setBeys(prev => {
      const newBeys = [...prev]
      
      // Update the main piece
      newBeys[index][type] = value

      // Update the type field
      if (pieceType) {
        const typeKey = `${type}Type` as keyof Bey
        if (typeKey === 'bladeType') {
          newBeys[index].bladeType = pieceType
        } else if (typeKey === 'bitType') {
          newBeys[index].bitType = pieceType
        } else if (typeKey === 'ratchetType') {
          newBeys[index].ratchetType = pieceType
        } else if (typeKey === 'assistType') {
          newBeys[index].assistType = pieceType
        } else if (typeKey === 'lockChipType') {
          newBeys[index].lockChipType = pieceType
        }
      }

      return newBeys
    })
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

  const handleCreateDeck = async () => {
    if (!selectedPlayerForDeck) {
      alert('Veuillez sélectionner un joueur !')
      return
    }

    if (selectedComboCount === 0) {
      alert('Veuillez sélectionner le nombre de combos !')
      return
    }

    const incompleteBeys = beys.some((bey) => {
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

      // Créer chaque combo
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

      // Créer le deck dans official_matches_decks
      const deckData = {
        player_id: selectedPlayerForDeck,
        match_id: null, // Pas encore associé à un match
        combo_id_1: comboIds[0] || null,
        combo_id_2: comboIds[1] || null,
        combo_id_3: comboIds[2] || null,
        deck_id: crypto.randomUUID(),
        Date_Creation: new Date().toISOString()
      }

      const { error: deckError } = await supabase
        .from('official_matches_decks') // ✅ CORRIGÉ
        .insert(deckData)

      if (deckError) throw deckError

      alert('🎴 Deck créé avec succès !')
      
      // Reset et recharger les decks
      resetDeckCreation()
      if (selectedPlayerForDeck === selectedPlayer1) {
        fetchPlayerDecks(selectedPlayer1, setPlayer1Decks)
      }
      if (selectedPlayerForDeck === selectedPlayer2) {
        fetchPlayerDecks(selectedPlayer2, setPlayer2Decks)
      }
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message)
        alert(`Erreur : ${err.message}`)
      } else {
        console.error(err)
        alert('Erreur lors de la création du deck.')
      }
    }
  }

  // Helper function to get piece ID
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
  // 🎯 Fonctions Match
  // ======================================================
  const resetMatch = () => {
    setSelectedPlayer1('')
    setSelectedPlayer2('')
    setPlayer1Decks([])
    setPlayer2Decks([])
    setSelectedDeck1('')
    setSelectedDeck2('')
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
      return combo?.name || 'Combo sans nom'
    },
    [combosList]
  )

  const getPlayerDecks = (playerNum: 1 | 2) => {
    return playerNum === 1 ? player1Decks : player2Decks
  }

  const getSelectedDeck = (playerNum: 1 | 2) => {
    return playerNum === 1 ? selectedDeck1 : selectedDeck2
  }

  const getDeckCombos = (deckId: string, playerNum: 1 | 2) => {
    const decks = playerNum === 1 ? player1Decks : player2Decks
    const deck = decks.find(d => d.deck_id === deckId)
    if (!deck) return []
    
    return [deck.combo_id_1, deck.combo_id_2, deck.combo_id_3].filter(Boolean) as string[]
  }

  const handleScore = (player: 1 | 2, points: number, action: MatchAction) => {
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
  // 🗄️ Création du match dans la base de données
  // ======================================================
  const createMatchInDatabase = async (): Promise<string | null> => {
    if (!selectedPlayer1 || !selectedPlayer2 || round === 0) {
      alert('Impossible de créer le match: données manquantes')
      return null
    }

    if (!currentPlayerId) {
      alert('Erreur: Impossible de déterminer l\'administrateur du match')
      return null
    }

    // Déterminer le gagnant et le perdant
    let winner_id: string | null = null
    let loser_id: string | null = null
    
    if (player1Score > player2Score) {
      winner_id = selectedPlayer1
      loser_id = selectedPlayer2
    } else if (player2Score > player1Score) {
      winner_id = selectedPlayer2
      loser_id = selectedPlayer1
    }

    // Compter les types de finishes
    const spinFinishesP1 = roundLogs.filter(log => log.action === 'Spin' && log.player === 1).length
    const overFinishesP1 = roundLogs.filter(log => log.action === 'Over' && log.player === 1).length
    const burstFinishesP1 = roundLogs.filter(log => log.action === 'Burst' && log.player === 1).length
    const xtremeFinishesP1 = roundLogs.filter(log => log.action === 'Xtreme' && log.player === 1).length

    const spinFinishesP2 = roundLogs.filter(log => log.action === 'Spin' && log.player === 2).length
    const overFinishesP2 = roundLogs.filter(log => log.action === 'Over' && log.player === 2).length
    const burstFinishesP2 = roundLogs.filter(log => log.action === 'Burst' && log.player === 2).length
    const xtremeFinishesP2 = roundLogs.filter(log => log.action === 'Xtreme' && log.player === 2).length

    // Formater les logs du match
    const formattedLogs = JSON.stringify(roundLogs.map(log => ({
      round: log.round,
      player: log.player,
      action: log.action,
      points: log.points,
      winner_combo_name: getComboName(log.winnerCombo),
      loser_combo_name: getComboName(log.loserCombo),
      winner_combo_id: log.winnerCombo,
      loser_combo_id: log.loserCombo,
      timestamp: new Date().toISOString()
    })), null, 2)

    // Préparer les données du match
    const matchData: Omit<Match, 'match_id' | 'tournament_id'> = {
      player1_id: selectedPlayer1,
      player2_id: selectedPlayer2,
      winner_id: winner_id,
      loser_id: loser_id,
      rounds: round,
      created_by: currentPlayerId,
      match_logs: formattedLogs,
      // Joueur 1
      spin_finishes: spinFinishesP1,
      over_finishes: overFinishesP1,
      burst_finishes: burstFinishesP1,
      xtreme_finishes: xtremeFinishesP1,
      // Joueur 2
      spin_finishes2: spinFinishesP2,
      over_finishes2: overFinishesP2,
      burst_finishes2: burstFinishesP2,
      xtreme_finishes2: xtremeFinishesP2,
    }

    try {
      console.log('📤 Envoi des données du match:', matchData)
      
      const { data, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select('match_id')
        .single()

      if (error) {
        console.error('❌ Erreur création match:', error)
        alert(`Erreur: ${error.message}`)
        return null
      }

      console.log('✅ Match créé avec succès, ID:', data.match_id)
      return data.match_id
    } catch (error) {
      console.error('❌ Exception création match:', error)
      return null
    }
  }

  const handleCreateMatch = async () => {
    if (!selectedPlayer1 || !selectedPlayer2) return

    // Créer d'abord le match dans la base de données
    const matchId = await createMatchInDatabase()
    if (!matchId) {
      return
    }

    alert(`✅ Match officiel enregistré avec succès! ID: ${matchId}`)
    setMatchValidated(true)
    resetMatch()
  }

  // ======================================================
  // 🎨 Interface utilisateur
  // ======================================================
  if (admin === null) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        <MainMenuButton />
        <p>Chargement...</p>
      </main>
    )
  }

  const player1Name = playersList.find((p) => p.player_id === selectedPlayer1)?.player_name || 'Joueur 1'
  const player2Name = playersList.find((p) => p.player_id === selectedPlayer2)?.player_name || 'Joueur 2'

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl shadow-2xl">
      <div className="mb-6 flex justify-between items-center">
        <MainMenuButton />
        <div className="flex gap-2">
          <Button
            onClick={() => setMode('create-deck')}
            className={`px-4 py-2 rounded-lg ${
              mode === 'create-deck' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            🎴 Créer Deck
          </Button>
          <Button
            onClick={() => setMode('manage-match')}
            className={`px-4 py-2 rounded-lg ${
              mode === 'manage-match' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            ⚔️ Gérer Match
          </Button>
        </div>
      </div>
      
      <h1 className="text-4xl font-extrabold mb-8 text-center tracking-wide text-purple-400">
        {mode === 'create-deck' ? '🎴 Création de Deck' : '⚔️ Gestion des Matchs Officiels'}
      </h1>

      {/* MODE CRÉATION DE DECK */}
      {mode === 'create-deck' && (
        <>
          {/* Sélection joueur */}
          <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-lg">
            <label className="block mb-3 font-semibold text-green-300">👤 Joueur :</label>
            <Select onValueChange={setSelectedPlayerForDeck} value={selectedPlayerForDeck}>
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

          {/* Sélection du nombre de combos */}
          {selectedPlayerForDeck && (
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
                  {[1, 2, 3].map(count => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} combo{count > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                  const selectedValue = bey[key] ?? ''

                  return (
                    <Select
                      key={key}
                      onValueChange={v => handleBeyPieceSelect(index, key, v)}
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
            </div>
          ))}

          {selectedComboCount > 0 && (
            <Button
              onClick={handleCreateDeck}
              className="w-full py-3 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-all duration-200"
            >
              ⚡ Créer le Deck
            </Button>
          )}
        </>
      )}

      {/* MODE GESTION DE MATCH */}
      {mode === 'manage-match' && (
        <>
          {/* Sélection joueurs */}
          <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((playerNum) => {
              const selectedPlayer = playerNum === 1 ? selectedPlayer1 : selectedPlayer2
              const setSelectedPlayer = playerNum === 1 ? setSelectedPlayer1 : setSelectedPlayer2
              const playerDecks = getPlayerDecks(playerNum as 1 | 2)
              const selectedDeck = getSelectedDeck(playerNum as 1 | 2)
              const setSelectedDeck = playerNum === 1 ? setSelectedDeck1 : setSelectedDeck2
              const setSelectedCombo = playerNum === 1 ? setSelectedCombo1 : setSelectedCombo2

              return (
                <div key={playerNum} className="space-y-4">
                  <div>
                    <label className="block mb-3 font-semibold text-green-300">
                      👤 Joueur {playerNum}
                    </label>
                    <Select
                      value={selectedPlayer}
                      onValueChange={(value) => {
                        setSelectedPlayer(value)
                        setSelectedDeck('')
                        setSelectedCombo('')
                      }}
                    >
                      <SelectTrigger className="bg-gray-900 border border-green-600">
                        <SelectValue placeholder={`Sélectionner Joueur ${playerNum}`} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white">
                        {playersList.map((player) => (
                          <SelectItem key={player.player_id} value={player.player_id}>
                            {player.player_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sélection du deck */}
                  {selectedPlayer && (
                    <div>
                      <label className="block mb-3 font-semibold text-blue-300">
                        🎴 Deck du joueur
                      </label>
                      <Select
                        value={selectedDeck}
                        onValueChange={(value) => {
                          setSelectedDeck(value)
                          setSelectedCombo('')
                        }}
                      >
                        <SelectTrigger className="bg-gray-900 border border-blue-600">
                          <SelectValue placeholder="Choisir un deck" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 text-white">
                          {playerDecks.map((deck) => (
                            <SelectItem key={deck.deck_id} value={deck.deck_id}>
                              Deck du {new Date(deck.Date_Creation || '').toLocaleDateString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-400 mt-1">
                        {playerDecks.length} deck(s) disponible(s)
                      </p>
                    </div>
                  )}

                  {/* Sélection du combo */}
                  {selectedDeck && (
                    <div>
                      <label className="block mb-3 font-semibold text-pink-300">
                        🔥 Combo sélectionné
                      </label>
                      <div className="space-y-2">
                        {getDeckCombos(selectedDeck, playerNum as 1 | 2).map((comboId, index) => (
                          <label key={comboId} className="flex items-center space-x-3 p-2 bg-gray-700 rounded-lg border border-gray-600 hover:bg-gray-600 cursor-pointer">
                            <input
                              type="radio"
                              name={`combo${playerNum}`}
                              value={comboId}
                              checked={(playerNum === 1 ? selectedCombo1 : selectedCombo2) === comboId}
                              onChange={() => setSelectedCombo(comboId)}
                              className="w-4 h-4 text-purple-600"
                            />
                            <span className="flex-1">
                              Combo {index + 1} - {getComboName(comboId)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Zone de score */}
          {selectedCombo1 && selectedCombo2 && (
            <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-yellow-500 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-center text-yellow-300">🎯 Gestion du Score</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {[1, 2].map((playerNum) => {
                  const score = playerNum === 1 ? player1Score : player2Score
                  const name = playerNum === 1 ? player1Name : player2Name
                  const selectedCombo = playerNum === 1 ? selectedCombo1 : selectedCombo2

                  return (
                    <div key={playerNum} className="text-center p-4 bg-gray-700 rounded-lg border border-gray-600">
                      <h3 className="font-bold text-lg mb-2">{name}</h3>
                      <p className="text-sm text-gray-300 mb-3">
                        Combo: {getComboName(selectedCombo)}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Spin', 'Over', 'Burst', 'Xtreme'] as MatchAction[]).map((action) => (
                          <Button
                            key={action}
                            className={`${playerColors[playerNum as 1 | 2]} text-white py-2 rounded-lg w-full`}
                            onClick={() =>
                              handleScore(
                                playerNum as 1 | 2,
                                action === 'Spin' ? 1 : action === 'Over' ? 2 : action === 'Burst' ? 2 : 3,
                                action
                              )
                            }
                          >
                            {action}
                          </Button>
                        ))}
                      </div>
                      <div className="mt-3 p-2 bg-gray-800 rounded border">
                        <span className="text-2xl font-bold">{score}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Score total */}
              <div className="text-center p-4 bg-purple-900 rounded-lg border border-purple-500">
                <h3 className="font-bold text-lg mb-2">Score Total</h3>
                <div className="text-3xl font-bold">
                  {player1Score} - {player2Score}
                </div>
                <div className="text-sm text-gray-300 mt-2">
                  Rounds joués: {round}
                </div>
              </div>
            </div>
          )}

          {/* Historique des rounds */}
          {roundLogs.length > 0 && (
            <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-blue-500 shadow-md">
              <h3 className="font-semibold text-blue-300 mb-4">📋 Historique des Rounds</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {roundLogs.map((log, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-gray-700 border border-gray-600">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold">Round {log.round}</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          log.player === 1 ? 'bg-blue-600' : 'bg-red-600'
                        }`}>
                          {log.player === 1 ? player1Name : player2Name}
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        log.action === 'Spin' ? 'bg-blue-500' :
                        log.action === 'Over' ? 'bg-green-500' :
                        log.action === 'Burst' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}>
                        {log.action} (+{log.points})
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-300">
                      <span className="text-green-400">{getComboName(log.winnerCombo)}</span>
                      <span className="mx-2">vs</span>
                      <span className="text-red-400">{getComboName(log.loserCombo)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation du match */}
          {!matchValidated && round > 0 && (
            <Button
              className="w-full py-4 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 mb-4"
              onClick={handleCreateMatch}
            >
              ✅ Valider et Enregistrer le Match Officiel
            </Button>
          )}

          {matchValidated && (
            <div className="mb-8 p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-md text-center">
              <h2 className="text-2xl font-bold mb-4 text-green-300">🎉 Match Enregistré !</h2>
              <p className="text-lg mb-2">
                Le match officiel a été enregistré avec succès dans la base de données.
              </p>
              <Button
                onClick={resetMatch}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-bold shadow-lg transition-all duration-200"
              >
                🔁 Nouveau Match
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
