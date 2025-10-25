'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { MainMenuButton } from '@/components/navigation/MainMenuButton'
import type {
  players,
  combos,
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

// Type for match data to be inserted - UPDATED to match your matches table
type MatchInsertData = {
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
  spin_finishes2: number | null;
  over_finishes2: number | null;
  burst_finishes2: number | null;
  xtreme_finishes2: number | null;
  official_match_id: string | null; // Added this field
};

// Types for deck management - UPDATED to match official_matches_decks table
type TournamentDeck = {
  player_id: string;
  combo_id_1?: string;
  combo_id_2?: string;
  combo_id_3?: string;
  deck_id: string;
  Date_Creation: string;
  official_match_id?: string; // Made optional to match your table structure
}

type Bey = {
  cx: boolean;
  blade?: string;
  bladeType?: string;
  bit?: string;
  bitType?: string;
  ratchet?: string;
  ratchetType?: string;
  assist?: string;
  assistType?: string;
  lockChip?: string;
  lockChipType?: string;
  existingComboId?: string;
};

export default function OfficialMatch() {
  const router = useRouter()

  // ============================
  // 🔹 État principal
  // ============================
  const [admin, setAdmin] = useState<boolean | null>(null)
  const [playersList, setPlayersList] = useState<players[]>([])
  const [combosList, setCombosList] = useState<combos[]>([])
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('')

  // ============================
  // 🔹 Match / Round state
  // ============================
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>('')
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>('')
  const [player1Deck, setPlayer1Deck] = useState<TournamentDeck | null>(null)
  const [player2Deck, setPlayer2Deck] = useState<TournamentDeck | null>(null)
  const [player1Score, setPlayer1Score] = useState(0)
  const [player2Score, setPlayer2Score] = useState(0)
  const [round, setRound] = useState(0)
  const [roundLogs, setRoundLogs] = useState<RoundLog[]>([])
  const [selectedCombo1, setSelectedCombo1] = useState<string>('')
  const [selectedCombo2, setSelectedCombo2] = useState<string>('')
  const [matchValidated, setMatchValidated] = useState(false)
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null)

  // ============================
  // 🔹 Deck Creation State
  // ============================
  const [beys, setBeys] = useState<Bey[]>([])
  const [selectedComboCount, setSelectedComboCount] = useState<number>(0)
  const [selectedPlayerForDeck, setSelectedPlayerForDeck] = useState<string>('')
  const [existingDeck, setExistingDeck] = useState<TournamentDeck | null>(null)

  // Pièces
  const [blades, setBlades] = useState<{ blade_id: string; name: string; type?: string }[]>([])
  const [bits, setBits] = useState<{ bit_id: string; name: string; type?: string }[]>([])
  const [assists, setAssists] = useState<{ assist_id: string; name: string; type?: string }[]>([])
  const [lockChips, setLockChips] = useState<{ lock_chip_id: string; name: string; type?: string }[]>([])
  const [ratchets, setRatchets] = useState<{ ratchet_id: string; name: string; type?: string }[]>([])

  const playerColors: Record<1 | 2, string> = { 1: 'bg-blue-600', 2: 'bg-red-500' }

  // ======================================================
  // 🧭 Vérification admin + récupération du player_id
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
        .single<players & { Admin: boolean }>()

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
  // 📋 Fetch données
  // ======================================================
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('player_name')
        .returns<players[]>()
      if (error) console.error(error)
      else setPlayersList(data || [])
    }

    const fetchCombos = async () => {
      const { data, error } = await supabase.from('combos').select('*').returns<combos[]>()
      if (error) console.error(error)
      else setCombosList(data || [])
    }

    const fetchPieces = async () => {
      const { data: bladeData } = await supabase.from("blade").select("*")
      const { data: bitData } = await supabase.from("bit").select("*")
      const { data: assistData } = await supabase.from("assist").select("*")
      const { data: lockChipData } = await supabase.from("lock_chip").select("*")
      const { data: ratchetData } = await supabase.from("ratchet").select("*")

      if (bladeData) setBlades(bladeData.sort((a, b) => a.name.localeCompare(b.name)))
      if (bitData) setBits(bitData.sort((a, b) => a.name.localeCompare(b.name)))
      if (assistData) setAssists(assistData.sort((a, b) => a.name.localeCompare(b.name)))
      if (lockChipData) setLockChips(lockChipData.sort((a, b) => a.name.localeCompare(b.name)))
      if (ratchetData) setRatchets(ratchetData.sort((a, b) => a.name.localeCompare(b.name)))
    }

    fetchPlayers()
    fetchCombos()
    fetchPieces()
  }, [])

  // ======================================================
  // 🧩 Fetch Decks for Match Players - UPDATED table name
  // ======================================================
  const fetchPlayerDeck = useCallback(
    async (playerId: string, setDeck: (d: TournamentDeck | null) => void) => {
      if (!playerId) return
      
      const { data, error } = await supabase
        .from('official_matches_decks') // CORRECTED TABLE NAME
        .select('*')
        .eq('player_id', playerId)
        .order('Date_Creation', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Erreur lors de la récupération du deck:', error)
        setDeck(null)
      } else if (data && data.length > 0) {
        setDeck(data[0])
      } else {
        setDeck(null)
      }
    },
    []
  )

  useEffect(() => {
    fetchPlayerDeck(selectedPlayer1, setPlayer1Deck)
  }, [selectedPlayer1, fetchPlayerDeck])

  useEffect(() => {
    fetchPlayerDeck(selectedPlayer2, setPlayer2Deck)
  }, [selectedPlayer2, fetchPlayerDeck])

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
  // 🗄️ Match Creation & Database Storage - UPDATED with official_match_id
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

    // Generate a unique ID for official_match_id
    const officialMatchId = crypto.randomUUID()

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

    // COMPTAGE DES FINISHES PAR JOUEUR
    const spinFinishesP1 = roundLogs.filter(log => log.action === 'Spin' && log.player === 1).length
    const overFinishesP1 = roundLogs.filter(log => log.action === 'Over' && log.player === 1).length
    const burstFinishesP1 = roundLogs.filter(log => log.action === 'Burst' && log.player === 1).length
    const xtremeFinishesP1 = roundLogs.filter(log => log.action === 'Xtreme' && log.player === 1).length

    const spinFinishesP2 = roundLogs.filter(log => log.action === 'Spin' && log.player === 2).length
    const overFinishesP2 = roundLogs.filter(log => log.action === 'Over' && log.player === 2).length
    const burstFinishesP2 = roundLogs.filter(log => log.action === 'Burst' && log.player === 2).length
    const xtremeFinishesP2 = roundLogs.filter(log => log.action === 'Xtreme' && log.player === 2).length

    const created_by = currentPlayerId

    // FORMATAGE DES LOGS AVEC NOMS DE COMBOS
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

    // Prepare match data - UPDATED to include official_match_id
    const matchData: MatchInsertData = {
      player1_id: selectedPlayer1,
      player2_id: selectedPlayer2,
      winner_id: winner_id,
      loser_id: loser_id,
      rounds: round,
      created_by: created_by,
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
      official_match_id: officialMatchId, // Added this field
    }

    try {
      console.log('📤 Envoi des données du match:', matchData)
      
      const { data, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select('match_id, official_match_id')
        .single()

      if (error) {
        console.error('❌ Erreur lors de la création du match:', error)
        alert(`Erreur lors de la création du match: ${error.message}`)
        return null
      }

      console.log('✅ Match créé avec succès, ID:', data.match_id, 'Official Match ID:', data.official_match_id)
      return data.match_id
    } catch (error) {
      console.error('❌ Exception lors de la création du match:', error)
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

    // COMPTAGE CORRECT PAR JOUEUR
    roundLogs.forEach((log) => {
      if (log.player === 1) {
        if (log.action === 'Spin') statsP1.spin_finishes++
        if (log.action === 'Over') statsP1.over_finishes++
        if (log.action === 'Burst') statsP1.burst_finishes++
        if (log.action === 'Xtreme') statsP1.xtreme_finishes++
      } else {
        if (log.action === 'Spin') statsP2.spin_finishes++
        if (log.action === 'Over') statsP2.over_finishes++
        if (log.action === 'Burst') statsP2.burst_finishes++
        if (log.action === 'Xtreme') statsP2.xtreme_finishes++
      }
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
  // 🛠️ Deck Management Functions - UPDATED table name
  // ======================================================
  const handlePlayerSelectForDeck = async (playerId: string) => {
    setSelectedPlayerForDeck(playerId)
    setSelectedComboCount(0)
    setBeys([])

    if (playerId) {
      // Check for existing deck - UPDATED table name
      const { data: deckData } = await supabase
        .from('official_matches_decks') // CORRECTED TABLE NAME
        .select('*')
        .eq('player_id', playerId)
        .order('Date_Creation', { ascending: false })
        .limit(1)
        .single()

      if (deckData) {
        setExistingDeck(deckData)
        await loadExistingCombos(deckData)
      } else {
        setExistingDeck(null)
      }
    }
  }

  const loadExistingCombos = async (deck: TournamentDeck) => {
    const comboIds = [
      deck.combo_id_1,
      deck.combo_id_2,
      deck.combo_id_3,
    ].filter(Boolean) as string[]

    setSelectedComboCount(comboIds.length)

    // Fetch combo details
    const { data: combosData } = await supabase
      .from('combos')
      .select('*')
      .in('combo_id', comboIds)

    if (combosData) {
      const existingBeys: Bey[] = combosData.map(combo => {
        const isCx = !!(combo.assist_id && combo.lock_chip_id)
        
        return {
          cx: isCx,
          blade: combo.blade_id,
          ratchet: combo.ratchet_id,
          bit: combo.bit_id,
          assist: combo.assist_id || undefined,
          lockChip: combo.lock_chip_id || undefined,
          existingComboId: combo.combo_id
        }
      })

      // Fill remaining slots with empty beys if needed
      while (existingBeys.length < 3) {
        existingBeys.push({ cx: false })
      }

      setBeys(existingBeys.slice(0, 3))
    }
  }

  const handleComboCountChange = (count: number) => {
    setSelectedComboCount(count)
    
    if (count > 0) {
      const newBeys: Bey[] = []
      for (let i = 0; i < count; i++) {
        if (i < beys.length && beys[i].existingComboId) {
          newBeys.push(beys[i])
        } else {
          newBeys.push({ cx: false })
        }
      }
      setBeys(newBeys)
    } else {
      setBeys([])
    }
  }

  const handleBeyCxChange = (index: number, value: boolean) => {
    setBeys(prev => {
      const newBeys = [...prev]
      newBeys[index] = {
        ...newBeys[index],
        cx: value,
        ...(value === false ? { assist: undefined, lockChip: undefined } : {})
      }
      return newBeys
    })
  }

  const handleBeyPieceSelect = (
    index: number,
    type: keyof Bey,
    value: string
  ) => {
    const newBeys = [...beys]
    newBeys[index] = {
      ...newBeys[index],
      [type]: value,
      existingComboId: undefined
    }

    setBeys(newBeys)
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

    return "Nouveau Combo"
  }

  const getCurrentComboName = (bey: Bey, index: number): string => {
    const baseName = generateComboName(bey)
    return baseName === "Nouveau Combo" ? `Combo ${index + 1}` : `Combo ${index + 1} - ${baseName}`
  }

  const handleDeckSubmit = async () => {
    if (!selectedPlayerForDeck) {
      alert("Veuillez sélectionner un joueur !")
      return
    }

    if (selectedComboCount === 0) {
      alert("Veuillez sélectionner le nombre de combos !")
      return
    }

    // Check if all required pieces are selected for each bey
    const incompleteBeys = beys.slice(0, selectedComboCount).some((bey) => {
      if (bey.cx) {
        return !bey.lockChip || !bey.blade || !bey.assist || !bey.ratchet || !bey.bit
      } else {
        return !bey.blade || !bey.ratchet || !bey.bit
      }
    })

    if (incompleteBeys) {
      alert("Veuillez sélectionner toutes les pièces requises pour chaque combo !")
      return
    }

    try {
      const comboIds: string[] = []

      for (let i = 0; i < selectedComboCount; i++) {
        const bey = beys[i]
        
        if (bey.existingComboId) {
          // Update existing combo
          const comboName = generateComboName(bey)
          const { error: updateError } = await supabase
            .from("combos")
            .update({
              blade_id: bey.blade,
              ratchet_id: bey.ratchet,
              bit_id: bey.bit,
              assist_id: bey.assist || null,
              lock_chip_id: bey.lockChip || null,
              name: comboName,
            })
            .eq("combo_id", bey.existingComboId)

          if (updateError) throw updateError
          comboIds.push(bey.existingComboId)
        } else {
          // Create new combo
          const comboName = generateComboName(bey)
          const { data: combo, error: comboError } = await supabase
            .from("combos")
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
      }

      if (existingDeck) {
        // Update existing deck - UPDATED table name
        const deckUpdate: Record<string, string> = {}
        comboIds.forEach((id, idx) => {
          deckUpdate[`combo_id_${idx + 1}`] = id
        })

        const { error: deckError } = await supabase
          .from("official_matches_decks") // CORRECTED TABLE NAME
          .update(deckUpdate)
          .eq("deck_id", existingDeck.deck_id)

        if (deckError) throw deckError

        alert("Deck mis à jour avec succès !")
      } else {
        // Create new deck - UPDATED table name
        const deckInsert: Record<string, string> = {
          player_id: selectedPlayerForDeck,
        }
        comboIds.forEach((id, idx) => {
          deckInsert[`combo_id_${idx + 1}`] = id
        })

        const { data: deck, error: deckError } = await supabase
          .from("official_matches_decks") // CORRECTED TABLE NAME
          .insert(deckInsert)
          .select()
          .single()
        if (deckError) throw deckError

        alert("Deck créé avec succès !")
      }

      // Refresh data
      if (selectedPlayerForDeck) {
        handlePlayerSelectForDeck(selectedPlayerForDeck)
      }
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message)
        alert(`Erreur : ${err.message}`)
      } else {
        console.error(err)
        alert("Erreur lors de la création du deck.")
      }
    }
  }

  // ======================================================
  // 🎨 UI (unchanged)
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
      <div className="mb-6 flex justify-end">
        <MainMenuButton />
      </div>
      <h1 className="text-4xl font-extrabold mb-8 text-center tracking-wide text-purple-400">
        ⚔️ Gestion des Matchs Officiels
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Match Management */}
        <div className="space-y-8">
          {/* Sélection joueurs */}
          <div className="p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-green-300">🎮 Gestion du Match</h2>
            <div className="flex gap-4">
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
                      {playersList.map((pl) => (
                        <option key={pl.player_id} value={pl.player_id}>
                          {pl.player_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Combos + Score */}
          <div className="flex flex-col gap-4">
            {[1, 2].map((num) => {
              const playerDeck = num === 1 ? player1Deck : player2Deck
              const setCombo = num === 1 ? setSelectedCombo1 : setSelectedCombo2
              const score = num === 1 ? player1Score : player2Score
              const name = num === 1 ? player1Name : player2Name

              return (
                <div
                  key={num}
                  className="border p-6 rounded-xl bg-gray-800/70 border-pink-500 shadow-xl flex flex-col"
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
            <div className="p-6 rounded-xl bg-gray-800/70 border border-blue-500 shadow-md">
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
            <div className="p-6 rounded-xl bg-gray-800/70 border border-green-500 shadow-md">
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

        {/* Right Column - Deck Management */}
        <div className="space-y-8">
          <div className="p-6 rounded-xl bg-gray-800/70 border border-purple-500 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-purple-300">🛠️ Gestion des Decks</h2>
            
            {/* Sélection joueur pour deck */}
            <div className="mb-4">
              <label className="block mb-3 font-semibold text-purple-300">Joueur :</label>
              <select
                className="bg-gray-900 border border-purple-600 rounded-lg p-3 w-full text-white"
                value={selectedPlayerForDeck}
                onChange={(e) => handlePlayerSelectForDeck(e.target.value)}
              >
                <option value="">Sélectionnez un joueur</option>
                {playersList.map((pl) => (
                  <option key={pl.player_id} value={pl.player_id}>
                    {pl.player_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection nombre de combos */}
            {selectedPlayerForDeck && (
              <div className="mb-4">
                <label className="block mb-3 font-semibold text-yellow-300">Nombre de combos :</label>
                <select
                  className="bg-gray-900 border border-yellow-600 rounded-lg p-3 w-full text-white"
                  value={selectedComboCount}
                  onChange={(e) => handleComboCountChange(parseInt(e.target.value))}
                >
                  <option value="0">Sélectionner...</option>
                  {[1, 2, 3].map(count => (
                    <option key={count} value={count}>
                      {count} combo{count > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Beys - FIXED SECTION */}
            {selectedComboCount > 0 && beys.slice(0, selectedComboCount).map((bey, index) => (
              <div
                key={`bey-${index}-${bey.existingComboId || 'new'}`}
                className="mb-4 p-4 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 border border-pink-500 shadow-xl"
              >
                {/* Display auto-generated combo name */}
                <div className="mb-3 p-2 bg-gray-900 rounded-lg border border-pink-600">
                  <p className="text-sm font-semibold text-pink-300 mb-1">Nom du Combo :</p>
                  <p className="text-white font-mono text-sm">{getCurrentComboName(bey, index)}</p>
                  {bey.existingComboId && (
                    <p className="text-xs text-green-400 mt-1">
                      ✨ Combo existant
                    </p>
                  )}
                </div>

                <p className="text-md font-bold mb-3 text-pink-300">
                  🔥 Combo {index + 1} 
                  {bey.existingComboId && " (Existant)"}
                </p>
                
                <div className="mb-3 flex items-center gap-2">
                  <label className="font-semibold text-sm">CX ?</label>
                  <input
                    type="checkbox"
                    checked={bey.cx}
                    onChange={e => handleBeyCxChange(index, e.target.checked)}
                    className="w-4 h-4 accent-pink-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {(bey.cx
                    ? [
                        { key: "lockChip" as const, options: lockChips, label: "Lock Chip" },
                        { key: "blade" as const, options: blades, label: "Blade" },
                        { key: "assist" as const, options: assists, label: "Assist" },
                        { key: "ratchet" as const, options: ratchets, label: "Ratchet" },
                        { key: "bit" as const, options: bits, label: "Bit" },
                      ]
                    : [
                        { key: "blade" as const, options: blades, label: "Blade" },
                        { key: "ratchet" as const, options: ratchets, label: "Ratchet" },
                        { key: "bit" as const, options: bits, label: "Bit" },
                      ]
                  ).map(({ key, options, label }) => {
                    // Ensure selectedValue is always a string or undefined
                    const selectedValue = bey[key] || ""

                    return (
                      <select
                        key={key}
                        value={selectedValue}
                        onChange={(e) => handleBeyPieceSelect(index, key, e.target.value)}
                        className="bg-gray-900 border border-pink-600 rounded p-2 text-white text-sm"
                      >
                        <option value="">{label}</option>
                        {options.map(o => {
                          const idKey =
                            key === "lockChip"
                              ? "lock_chip_id"
                              : `${key}_id`
                          const optionValue = o[idKey as keyof typeof o] as string
                          return (
                            <option key={optionValue} value={optionValue}>
                              {o.name} {o.type ? `(${o.type})` : ""}
                            </option>
                          )
                        })}
                      </select>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Submit Button */}
            {selectedPlayerForDeck && selectedComboCount > 0 && (
              <button
                onClick={handleDeckSubmit}
                className="w-full py-3 text-lg font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg transition-all duration-200"
              >
                {existingDeck ? "💾 Modifier le Deck" : "⚡ Créer le Deck"}
              </button>
            )}

            {existingDeck && (
              <div className="mt-3 p-3 bg-blue-600/20 rounded-lg border border-blue-500">
                <p className="text-blue-300 text-sm">
                  📅 Deck créé le: {new Date(existingDeck.Date_Creation).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
