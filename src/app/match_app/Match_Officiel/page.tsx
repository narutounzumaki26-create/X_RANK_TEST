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

// Type for match data to be inserted - UPDATED: removed official_match_id
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
  // official_match_id REMOVED
};

// Types for deck management
type TournamentDeck = {
  player_id: string;
  combo_id_1?: string;
  combo_id_2?: string;
  combo_id_3?: string;
  deck_id: string;
  Date_Creation: string;
  // official_match_id removed
  // Added combo names for display
  combo_1_name?: string;
  combo_2_name?: string;
  combo_3_name?: string;
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
  // 🧭 Vérification admin + récupération du player_id - FIXED
  // ======================================================
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) {
        router.push('/user_app/login')
        return
      }

      // First get player data to check Admin status
      const { data: playerData } = await supabase
        .from("players")
        .select("Admin")
        .eq("user_id", user.id)
        .single();

      if (!playerData?.Admin) {
        router.push("/");
        return;
      }

      // Then get the full player data including player_id
      const { data: player, error } = await supabase
        .from('players')
        .select('player_id, Admin')
        .eq('user_id', user.id)
        .single<players & { Admin: boolean }>()

      if (error || !player) {
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
      if (error) return
      else setPlayersList(data || [])
    }

    const fetchCombos = async () => {
      const { data, error } = await supabase.from('combos').select('*').returns<combos[]>()
      if (error) return
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
  // 🧩 Fetch Decks for Match Players - IMPROVED with combo names
  // ======================================================
  const fetchPlayerDeck = useCallback(
    async (playerId: string, setDeck: (d: TournamentDeck | null) => void) => {
      if (!playerId) return
      
      // First, get the deck
      const { data: deckData, error: deckError } = await supabase
        .from('official_matchs_decks')
        .select('*')
        .eq('player_id', playerId)
        .order('Date_Creation', { ascending: false })
        .limit(1)
        .single()

      if (deckError) {
        //❌ Erreur lors de la récupération du deck:', deckError)
        setDeck(null)
        return
      }

      if (!deckData) {
        setDeck(null)
        return
      }

      // Get all combo IDs from the deck
      const comboIds = [
        deckData.combo_id_1,
        deckData.combo_id_2,
        deckData.combo_id_3,
      ].filter(Boolean) as string[]

      if (comboIds.length === 0) {
        setDeck(deckData)
        return
      }

      // Fetch combo details with their names
      const { data: combosData, error: combosError } = await supabase
        .from('combos')
        .select('combo_id, name')
        .in('combo_id', comboIds)

      if (combosError) {
        //❌ Erreur lors de la récupération des combos:', combosError)
        setDeck(deckData)
        return
      }

      // Create a map of combo_id to combo name
      const comboNameMap = new Map(
        combosData?.map(combo => [combo.combo_id, combo.name]) || []
      )

      // Enhance deck data with combo names
      const enhancedDeck: TournamentDeck = {
        ...deckData,
        combo_1_name: deckData.combo_id_1 ? comboNameMap.get(deckData.combo_id_1) : undefined,
        combo_2_name: deckData.combo_id_2 ? comboNameMap.get(deckData.combo_id_2) : undefined,
        combo_3_name: deckData.combo_id_3 ? comboNameMap.get(deckData.combo_id_3) : undefined,
      }

      setDeck(enhancedDeck)
    },
    []
  )

  useEffect(() => {
    if (selectedPlayer1) {
      fetchPlayerDeck(selectedPlayer1, setPlayer1Deck)
    } else {
      setPlayer1Deck(null)
    }
  }, [selectedPlayer1, fetchPlayerDeck])

  useEffect(() => {
    if (selectedPlayer2) {
      fetchPlayerDeck(selectedPlayer2, setPlayer2Deck)
    } else {
      setPlayer2Deck(null)
    }
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

  // IMPROVED: Better combo name lookup with fallback
  const getComboName = useCallback(
    (comboId: string | null) => {
      if (!comboId) return 'Aucun combo sélectionné'
      
      // First check if we have the combo in our local list
      const combo = combosList.find((c) => c.combo_id === comboId)
      if (combo) return combo.name

      // If not found in local list, try to find it in the deck data
      if (player1Deck) {
        if (player1Deck.combo_id_1 === comboId) return player1Deck.combo_1_name || 'Combo inconnu'
        if (player1Deck.combo_id_2 === comboId) return player1Deck.combo_2_name || 'Combo inconnu'
        if (player1Deck.combo_id_3 === comboId) return player1Deck.combo_3_name || 'Combo inconnu'
      }
      
      if (player2Deck) {
        if (player2Deck.combo_id_1 === comboId) return player2Deck.combo_1_name || 'Combo inconnu'
        if (player2Deck.combo_id_2 === comboId) return player2Deck.combo_2_name || 'Combo inconnu'
        if (player2Deck.combo_id_3 === comboId) return player2Deck.combo_3_name || 'Combo inconnu'
      }

      return 'Combo inconnu'
    },
    [combosList, player1Deck, player2Deck]
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
  // 🗄️ Match Creation & Database Storage - FIXED
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

    // Prepare match data - REMOVED official_match_id
    const matchData: MatchInsertData = {
      player1_id: selectedPlayer1,
      player2_id: selectedPlayer2,
      winner_id: winner_id,
      loser_id: loser_id,
      rounds: round,
      created_by: created_by,
      match_logs: formattedLogs,
      spin_finishes: spinFinishesP1,
      over_finishes: overFinishesP1,
      burst_finishes: burstFinishesP1,
      xtreme_finishes: xtremeFinishesP1,
      spin_finishes2: spinFinishesP2,
      over_finishes2: overFinishesP2,
      burst_finishes2: burstFinishesP2,
      xtreme_finishes2: xtremeFinishesP2,
      // official_match_id REMOVED
    }

    try {
      //('📤 Envoi des données du match:', matchData)
      
      const { data, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select('match_id')
        .single()

      if (error) {
        //❌ Erreur lors de la création du match:', error)
        alert(`Erreur lors de la création du match: ${error.message}`)
        return null
      }

      //('✅ Match créé avec succès, ID:', data.match_id)
      return data.match_id
    } catch (error) {
      //❌ Exception lors de la création du match:', error)
      return null
    }
  }

  // ======================================================
  // 📊 Update stats and create match
  // ======================================================
  const updatePlayerStatsAndCreateMatch = async () => {
    if (!selectedPlayer1 || !selectedPlayer2) return

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
  // 🛠️ Deck Management Functions
  // ======================================================
  const handlePlayerSelectForDeck = async (playerId: string) => {
    setSelectedPlayerForDeck(playerId)
    setSelectedComboCount(0)
    setBeys([])

    if (playerId) {
      // Check for existing deck with enhanced data
      const { data: deckData, error } = await supabase
        .from('official_matchs_decks')
        .select('*')
        .eq('player_id', playerId)
        .order('Date_Creation', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        //Error fetching deck:', error)
        setExistingDeck(null)
        return
      }

      if (deckData) {
        // Get combo names for the existing deck
        const comboIds = [
          deckData.combo_id_1,
          deckData.combo_id_2,
          deckData.combo_id_3,
        ].filter(Boolean) as string[]

        if (comboIds.length > 0) {
          const { data: combosData } = await supabase
            .from('combos')
            .select('combo_id, name')
            .in('combo_id', comboIds)

          const comboNameMap = new Map(
            combosData?.map(combo => [combo.combo_id, combo.name]) || []
          )

          const enhancedDeck: TournamentDeck = {
            ...deckData,
            combo_1_name: deckData.combo_id_1 ? comboNameMap.get(deckData.combo_id_1) : undefined,
            combo_2_name: deckData.combo_id_2 ? comboNameMap.get(deckData.combo_id_2) : undefined,
            combo_3_name: deckData.combo_id_3 ? comboNameMap.get(deckData.combo_id_3) : undefined,
          }

          setExistingDeck(enhancedDeck)
          await loadExistingCombos(enhancedDeck)
        } else {
          setExistingDeck(deckData)
        }
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
        // Update existing deck
        const deckUpdate: Record<string, string> = {}
        comboIds.forEach((id, idx) => {
          deckUpdate[`combo_id_${idx + 1}`] = id
        })

        const { error: deckError } = await supabase
          .from("official_matchs_decks")
          .update(deckUpdate)
          .eq("deck_id", existingDeck.deck_id)

        if (deckError) throw deckError

        alert("Deck mis à jour avec succès !")
      } else {
        // Create new deck
        const deckInsert: Record<string, string> = {
          player_id: selectedPlayerForDeck,
        }
        comboIds.forEach((id, idx) => {
          deckInsert[`combo_id_${idx + 1}`] = id
        })

        const { data: deck, error: deckError } = await supabase
          .from("official_matchs_decks")
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
        //console.error(err.message)
        alert(`Erreur : ${err.message}`)
      } else {
        //console.error(err)
        alert("Erreur lors de la création du deck.")
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

  const player1Name = playersList.find((p) => p.player_id === selectedPlayer1)?.player_name || 'Joueur 1'
  const player2Name = playersList.find((p) => p.player_id === selectedPlayer2)?.player_name || 'Joueur 2'

  return (
  <div className="min-h-screen relative overflow-hidden text-white">
    {/* Fond cyberpunk */}
    <div
      className="absolute inset-0 animate-gradient-shift pointer-events-none"
      style={{
        backgroundImage:
          'linear-gradient(135deg,#0b0215,#1b0b2b,#3a0c4a,#5b136b,#8b1da1,#3a0c4a,#1b0b2b,#0b0215)',
      }}
    />
    <div className="absolute inset-0 bg-cyber-grid opacity-40 pointer-events-none" />
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,.65) 100%)',
      }}
    />
    <div className="absolute inset-0 scanlines pointer-events-none" />

    {/* Contenu */}
    <main className="relative z-10 max-w-6xl mx-auto px-5 py-8">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm text-purple-200/80">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_15px_#34d399]" />
          Mode Admin
        </span>
        <MainMenuButton />
      </div>

      {/* Title */}
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-wide">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-purple-300 to-cyan-300 drop-shadow-[0_0_8px_rgba(216,180,254,.35)]">
            ⚔️ Gestion des Matchs Officiels
          </span>
        </h1>
        <p className="mt-2 text-sm text-purple-100/70">Enregistre, valide et gère les decks en temps réel.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Colonne gauche : match */}
        <section className="space-y-6">
          {/* Sélection joueurs */}
          <div className="rounded-2xl border border-emerald-400/30 bg-white/5 backdrop-blur-md shadow-2xl shadow-emerald-500/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-emerald-200">🎮 Gestion du Match</h2>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] bg-emerald-400/10 border border-emerald-400/30 text-emerald-200">
                  {round > 0 ? 'En cours' : 'Prêt'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] bg-fuchsia-400/10 border border-fuchsia-400/30 text-fuchsia-200">
                  Rounds: {round}
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              {[{ label: 'Joueur 1', value: selectedPlayer1, set: setSelectedPlayer1 }, { label: 'Joueur 2', value: selectedPlayer2, set: setSelectedPlayer2 }].map(
                (p, i) => (
                  <div key={i} className="flex-1">
                    <label className="block mb-2 text-sm font-semibold text-emerald-200">{p.label}</label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-xl bg-black/40 border border-emerald-400/30 focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-400/30 outline-none text-white px-3 py-2.5 pr-9 transition"
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
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200/80">▾</span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Combos + score */}
          {[1, 2].map((num) => {
            const playerDeck = num === 1 ? player1Deck : player2Deck
            const setCombo = num === 1 ? setSelectedCombo1 : setSelectedCombo2
            const score = num === 1 ? player1Score : player2Score
            const name = num === 1 ? player1Name : player2Name

            return (
              <div
                key={num}
                className="rounded-2xl border border-pink-400/30 bg-white/5 backdrop-blur-md shadow-2xl shadow-pink-500/10 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-pink-200 font-bold">Combos de {name}</h3>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] border ${
                      (num as 1 | 2) === 1
                        ? 'bg-blue-400/10 border-blue-400/30 text-blue-200'
                        : 'bg-rose-400/10 border-rose-400/30 text-rose-200'
                    }`}
                  >
                    Score: {score}
                  </span>
                </div>

                {playerDeck ? (
                  <div>
                    <p className="text-xs text-pink-100/70 mb-2">Deck sélectionné (le plus récent)</p>
                    <div className="space-y-1.5">
                      {playerDeck.combo_id_1 && (
                        <label className="flex items-center gap-2 rounded-lg border border-pink-400/20 bg-black/30 px-3 py-2 hover:border-pink-300/40 transition">
                          <input
                            type="radio"
                            name={`combo${num}`}
                            value={playerDeck.combo_id_1}
                            checked={(num === 1 ? selectedCombo1 : selectedCombo2) === playerDeck.combo_id_1}
                            onChange={() => setCombo(playerDeck.combo_id_1!)}
                            className="accent-pink-400"
                          />
                          <span className="text-sm">
                            Combo 1 — {playerDeck.combo_1_name || getComboName(playerDeck.combo_id_1)}
                          </span>
                        </label>
                      )}
                      {playerDeck.combo_id_2 && (
                        <label className="flex items-center gap-2 rounded-lg border border-pink-400/20 bg-black/30 px-3 py-2 hover:border-pink-300/40 transition">
                          <input
                            type="radio"
                            name={`combo${num}`}
                            value={playerDeck.combo_id_2}
                            checked={(num === 1 ? selectedCombo1 : selectedCombo2) === playerDeck.combo_id_2}
                            onChange={() => setCombo(playerDeck.combo_id_2!)}
                            className="accent-pink-400"
                          />
                          <span className="text-sm">
                            Combo 2 — {playerDeck.combo_2_name || getComboName(playerDeck.combo_id_2)}
                          </span>
                        </label>
                      )}
                      {playerDeck.combo_id_3 && (
                        <label className="flex items-center gap-2 rounded-lg border border-pink-400/20 bg-black/30 px-3 py-2 hover:border-pink-300/40 transition">
                          <input
                            type="radio"
                            name={`combo${num}`}
                            value={playerDeck.combo_id_3}
                            checked={(num === 1 ? selectedCombo1 : selectedCombo2) === playerDeck.combo_id_3}
                            onChange={() => setCombo(playerDeck.combo_id_3!)}
                            className="accent-pink-400"
                          />
                          <span className="text-sm">
                            Combo 3 — {playerDeck.combo_3_name || getComboName(playerDeck.combo_id_3)}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-pink-100/70 text-sm">Pas de deck sélectionné</p>
                )}

                <div className="grid grid-cols-2 gap-2 mt-4">
                  {['Spin', 'Over', 'Burst', 'Xtreme'].map((action) => (
                    <button
                      key={action}
                      className={`group relative overflow-hidden rounded-xl py-3 text-sm font-semibold
                        ${(num as 1 | 2) === 1 ? 'bg-blue-600/80 hover:bg-blue-500' : 'bg-rose-600/80 hover:bg-rose-500'}
                        disabled:bg-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition`}
                      disabled={!(num === 1 ? selectedCombo1 : selectedCombo2)}
                      onClick={() =>
                        handleScore(
                          num as 1 | 2,
                          action === 'Spin' ? 1 : action === 'Over' ? 2 : action === 'Burst' ? 2 : 3,
                          action as match_action
                        )
                      }
                    >
                      <span className="relative z-10">{action}</span>
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform bg-white/10" />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Historique */}
          {roundLogs.length > 0 && (
            <div className="rounded-2xl border border-cyan-400/30 bg-white/5 backdrop-blur-md shadow-2xl shadow-cyan-500/10 p-5">
              <h3 className="text-cyan-200 font-semibold mb-2">Historique des tours</h3>
              <ul className="space-y-1.5 text-sm">
                {roundLogs.map((log, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" />
                    <span>
                      <span className="text-cyan-100/80">Tour {log.round}</span> :{' '}
                      {log.player === 1 ? player1Name : player2Name} ({log.action}, +{log.points}) avec{' '}
                      <strong className="text-white">{getComboName(log.winnerCombo)}</strong> contre{' '}
                      <strong className="text-white">{getComboName(log.loserCombo)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Validation */}
          {!matchValidated && round > 0 && (
            <button
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-600 hover:from-fuchsia-500 hover:via-purple-500 hover:to-cyan-500 text-white py-3 text-base font-bold shadow-xl shadow-purple-500/20 border border-white/10 transition"
              onClick={updatePlayerStatsAndCreateMatch}
            >
              ✅ Valider & enregistrer le match
            </button>
          )}

          {matchValidated && createdMatchId && (
            <div className="rounded-2xl border border-emerald-400/30 bg-white/5 backdrop-blur-md shadow-2xl shadow-emerald-500/10 p-5">
              <h2 className="text-lg font-bold text-emerald-200 mb-2">Match enregistré !</h2>
              <p className="text-sm text-emerald-50/90 mb-1">
                Score final : {player1Name} {player1Score} - {player2Score} {player2Name}
              </p>
              <p className="text-sm text-emerald-50/90 mb-2">
                Vainqueur : {player1Score > player2Score ? player1Name : player2Score > player1Score ? player2Name : 'Égalité'}
              </p>
              <p className="text-xs text-emerald-100/80 mb-4">ID du match : {createdMatchId}</p>
              <button
                onClick={resetMatch}
                className="w-full rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white py-2.5 font-semibold transition"
              >
                🔁 Nouveau match
              </button>
            </div>
          )}
        </section>

        {/* Colonne droite : decks */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-purple-400/30 bg-white/5 backdrop-blur-md shadow-2xl shadow-purple-500/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-purple-200">🛠️ Gestion des Decks</h2>
              {existingDeck && (
                <span className="px-2.5 py-1 rounded-full text-[11px] bg-blue-400/10 border border-blue-400/30 text-blue-200">
                  Dernier deck : {new Date(existingDeck.Date_Creation).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Joueur deck */}
            <div className="mb-4">
              <label className="block mb-2 text-sm font-semibold text-purple-200">Joueur</label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl bg-black/40 border border-purple-400/30 focus:border-purple-300/70 focus:ring-2 focus:ring-purple-400/30 outline-none text-white px-3 py-2.5 pr-9 transition"
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
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-purple-200/80">▾</span>
              </div>
            </div>

            {/* Nombre de combos */}
            {selectedPlayerForDeck && (
              <div className="mb-4">
                <label className="block mb-2 text-sm font-semibold text-yellow-200">Nombre de combos</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl bg-black/40 border border-yellow-400/30 focus:border-yellow-300/70 focus:ring-2 focus:ring-yellow-400/30 outline-none text-white px-3 py-2.5 pr-9 transition"
                    value={selectedComboCount}
                    onChange={(e) => handleComboCountChange(parseInt(e.target.value))}
                  >
                    <option value="0">Sélectionner…</option>
                    {[1, 2, 3].map((count) => (
                      <option key={count} value={count}>
                        {count} combo{count > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-yellow-200/80">▾</span>
                </div>
              </div>
            )}

            {/* Builder */}
            {selectedPlayerForDeck &&
              selectedComboCount > 0 &&
              beys.slice(0, selectedComboCount).map((bey, index) => (
                <div
                  key={`bey-${index}-${bey.existingComboId || 'new'}`}
                  className="mb-4 rounded-xl border border-pink-400/30 bg-gradient-to-r from-black/30 to-black/20 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-pink-200 font-semibold">
                      🔥 Combo {index + 1}{' '}
                      {bey.existingComboId && <span className="text-xs opacity-70">(existant)</span>}
                    </p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-pink-400/10 border border-pink-400/30 text-pink-100">
                      {getCurrentComboName(bey, index)}
                    </span>
                  </div>

                  <div className="mb-3 flex items-center gap-2">
                    <label className="text-sm text-pink-100/80">CX ?</label>
                    <input
                      type="checkbox"
                      checked={bey.cx}
                      onChange={(e) => handleBeyCxChange(index, e.target.checked)}
                      className="w-4 h-4 accent-pink-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {(bey.cx
                      ? [
                          { key: 'lockChip' as const, label: 'Lock Chip' },
                          { key: 'blade' as const, label: 'Blade' },
                          { key: 'assist' as const, label: 'Assist' },
                          { key: 'ratchet' as const, label: 'Ratchet' },
                          { key: 'bit' as const, label: 'Bit' },
                        ]
                      : [
                          { key: 'blade' as const, label: 'Blade' },
                          { key: 'ratchet' as const, label: 'Ratchet' },
                          { key: 'bit' as const, label: 'Bit' },
                        ]
                    ).map(({ key, label }) => {
                      const selectedValue = bey[key] || ''

                      // Sélection du bon tableau typé pour chaque clé
                      const list =
                        key === 'lockChip'
                          ? lockChips
                          : key === 'blade'
                          ? blades
                          : key === 'assist'
                          ? assists
                          : key === 'ratchet'
                          ? ratchets
                          : bits

                      return (
                        <select
                          key={key}
                          value={selectedValue}
                          onChange={(e) => handleBeyPieceSelect(index, key, e.target.value)}
                          className="w-full rounded-lg bg-black/40 border border-pink-400/30 focus:border-pink-300/70 focus:ring-2 focus:ring-pink-400/20 outline-none text-white px-3 py-2 text-sm transition"
                        >
                          <option value="">{label}</option>

                          {/* mapping sans any, avec résolution d'ID par clé */}
                          {list.map((o) => {
                            const optionValue =
                              key === 'lockChip'
                                ? (o as typeof lockChips[number]).lock_chip_id
                                : key === 'blade'
                                ? (o as typeof blades[number]).blade_id
                                : key === 'assist'
                                ? (o as typeof assists[number]).assist_id
                                : key === 'ratchet'
                                ? (o as typeof ratchets[number]).ratchet_id
                                : (o as typeof bits[number]).bit_id

                            return (
                              <option key={optionValue} value={optionValue}>
                                {o.name}{' '}
                                {'type' in o && o.type ? `(${o.type})` : ''}
                              </option>
                            )
                          })}
                        </select>
                      )
                    })}
                  </div>
                </div>
              ))}

            {/* Submit */}
            {selectedPlayerForDeck && selectedComboCount > 0 && (
              <button
                onClick={handleDeckSubmit}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white py-3 font-bold shadow-xl shadow-emerald-500/20 border border-white/10 transition"
              >
                {existingDeck ? '💾 Modifier le Deck' : '⚡ Créer le Deck'}
              </button>
            )}
          </div>
        </aside>
      </div>
    </main>
  </div>
)
}
