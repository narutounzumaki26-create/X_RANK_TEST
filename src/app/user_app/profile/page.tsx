'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { MainMenuButton } from '@/components/navigation/MainMenuButton'

// Types pour les matches
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
  created_at?: string
  tournaments?: {
    name: string
  }
  player1?: {
    player_name: string
  }
  player2?: {
    player_name: string
  }
}

// Type pour les logs de match
type MatchLog = {
  round: number
  player: number
  action: string
  points: number
  winner_combo_name: string
  loser_combo_name: string
  winner_combo_id: string
  loser_combo_id: string
  timestamp: string
}

// Type pour les statistiques calculées
type PlayerStats = {
  total_matches: number
  wins: number
  losses: number
  draws: number
  win_rate: number
  total_rounds: number
  total_finishes: number
  spin_finishes: number
  over_finishes: number
  burst_finishes: number
  xtreme_finishes: number
  average_rounds_per_match: number
  favorite_finish: string
  most_used_combo: string
}

export default function ProfileStatsPage() {
  const [playerId, setPlayerId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatchLogs, setSelectedMatchLogs] = useState<MatchLog[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)

  // ======================================================
  // 📊 Récupération des matches du joueur - CORRIGÉ
  // ======================================================
  const fetchPlayerMatches = useCallback(async (pId: string) => {
    setLoading(true)
    console.log('🔍 Recherche des matches pour le joueur:', pId)
    
    try {
      // CORRIGÉ: 'const' au lieu de 'let' pour 'query'
      const query = supabase
        .from('matches')
        .select(`
          *,
          tournaments:tournament_id (name),
          player1:player1_id (player_name),
          player2:player2_id (player_name)
        `)
        .or(`player1_id.eq.${pId},player2_id.eq.${pId}`)

      const { data: matchesData, error } = await query

      if (error) {
        console.error('❌ Erreur lors de la récupération des matches:', error)
        
        // Essayer sans les relations si ça échoue
        const { data: simpleData, error: simpleError } = await supabase
          .from('matches')
          .select('*')
          .or(`player1_id.eq.${pId},player2_id.eq.${pId}`)

        if (simpleError) {
          console.error('❌ Erreur même avec requête simple:', simpleError)
          setMatches([])
          calculateStats([], pId)
        } else {
          console.log('✅ Matches récupérés (sans relations):', simpleData?.length)
          setMatches(simpleData || [])
          calculateStats(simpleData || [], pId)
        }
      } else {
        console.log('✅ Matches récupérés:', matchesData?.length)
        setMatches(matchesData || [])
        calculateStats(matchesData || [], pId)
      }
    } catch (error) {
      console.error('❌ Exception lors de la récupération:', error)
      setMatches([])
      calculateStats([], pId)
    } finally {
      setLoading(false)
    }
  }, [])

  // ======================================================
  // 🔍 Récupération du joueur connecté
  // ======================================================
  useEffect(() => {
    const getCurrentPlayer = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('❌ Aucun utilisateur connecté')
          return
        }

        console.log('👤 Utilisateur connecté:', user.id)

        const { data: player, error } = await supabase
          .from('players')
          .select('player_id, player_name')
          .eq('user_id', user.id)
          .single()

        if (error) {
          console.error('❌ Erreur récupération joueur:', error)
          return
        }

        if (player) {
          console.log('🎯 Joueur trouvé:', player.player_name, player.player_id)
          setPlayerId(player.player_id)
          setPlayerName(player.player_name)
          fetchPlayerMatches(player.player_id)
        }
      } catch (error) {
        console.error('❌ Exception récupération joueur:', error)
      }
    }

    getCurrentPlayer()
  }, [fetchPlayerMatches])

  // ======================================================
  // 🧮 Calcul des statistiques
  // ======================================================
  const calculateStats = (playerMatches: Match[], pId: string) => {
    console.log('🧮 Calcul des stats pour', playerMatches.length, 'matches')
    
    const totalMatches = playerMatches.length
    let wins = 0
    let losses = 0
    let draws = 0
    let totalRounds = 0
    let totalFinishes = 0
    let spinFinishes = 0
    let overFinishes = 0
    let burstFinishes = 0
    let xtremeFinishes = 0
    
    const comboUsage = new Map<string, number>()
    const finishUsage = new Map<string, number>()

    playerMatches.forEach(match => {
      const isPlayer1 = match.player1_id === pId
      const isPlayer2 = match.player2_id === pId
      
      console.log(`📊 Match ${match.match_id}: P1=${isPlayer1}, P2=${isPlayer2}, Winner=${match.winner_id}`)
      
      // Compter wins/losses/draws
      if (match.winner_id === pId) {
        wins++
        console.log('✅ Victoire comptée')
      } else if (match.loser_id === pId) {
        losses++
        console.log('❌ Défaite comptée')
      } else if (match.winner_id === null && match.loser_id === null) {
        draws++
        console.log('⚡ Égalité comptée')
      }

      // Compter les rounds
      totalRounds += match.rounds || 0

      // Compter les finishes selon si le joueur est player1 ou player2
      if (isPlayer1) {
        spinFinishes += match.spin_finishes || 0
        overFinishes += match.over_finishes || 0
        burstFinishes += match.burst_finishes || 0
        xtremeFinishes += match.xtreme_finishes || 0
        
        totalFinishes += (match.spin_finishes || 0) + (match.over_finishes || 0) + 
                        (match.burst_finishes || 0) + (match.xtreme_finishes || 0)
        console.log(`🎯 Finishes P1: Spin=${match.spin_finishes}, Over=${match.over_finishes}, Burst=${match.burst_finishes}, Xtreme=${match.xtreme_finishes}`)
      } else if (isPlayer2) {
        spinFinishes += match.spin_finishes2 || 0
        overFinishes += match.over_finishes2 || 0
        burstFinishes += match.burst_finishes2 || 0
        xtremeFinishes += match.xtreme_finishes2 || 0
        
        totalFinishes += (match.spin_finishes2 || 0) + (match.over_finishes2 || 0) + 
                        (match.burst_finishes2 || 0) + (match.xtreme_finishes2 || 0)
        console.log(`🎯 Finishes P2: Spin=${match.spin_finishes2}, Over=${match.over_finishes2}, Burst=${match.burst_finishes2}, Xtreme=${match.xtreme_finishes2}`)
      }

      // Analyser les logs pour l'usage des combos
      if (match.match_logs) {
        try {
          const logs: MatchLog[] = JSON.parse(match.match_logs)
          console.log(`📝 ${logs.length} logs trouvés pour ce match`)
          logs.forEach(log => {
            if (log.player === (isPlayer1 ? 1 : 2)) {
              // Usage des combos
              const winnerCombo = log.winner_combo_name
              comboUsage.set(winnerCombo, (comboUsage.get(winnerCombo) || 0) + 1)
              
              // Usage des finishes
              finishUsage.set(log.action, (finishUsage.get(log.action) || 0) + 1)
            }
          })
        } catch (e) {
          console.error('❌ Erreur parsing match logs:', e)
        }
      } else {
        console.log('📝 Aucun log pour ce match')
      }
    })

    // Trouver le combo le plus utilisé
    let mostUsedCombo = 'Aucun'
    let maxComboUsage = 0
    comboUsage.forEach((count, combo) => {
      if (count > maxComboUsage) {
        maxComboUsage = count
        mostUsedCombo = combo
      }
    })

    // Trouver le finish préféré
    let favoriteFinish = 'Aucun'
    let maxFinishUsage = 0
    finishUsage.forEach((count, finish) => {
      if (count > maxFinishUsage) {
        maxFinishUsage = count
        favoriteFinish = finish
      }
    })

    const calculatedStats: PlayerStats = {
      total_matches: totalMatches,
      wins,
      losses,
      draws,
      win_rate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
      total_rounds: totalRounds,
      total_finishes: totalFinishes,
      spin_finishes: spinFinishes,
      over_finishes: overFinishes,
      burst_finishes: burstFinishes,
      xtreme_finishes: xtremeFinishes,
      average_rounds_per_match: totalMatches > 0 ? Math.round((totalRounds / totalMatches) * 10) / 10 : 0,
      favorite_finish: favoriteFinish,
      most_used_combo: mostUsedCombo
    }

    console.log('📈 Statistiques calculées:', calculatedStats)
    setStats(calculatedStats)
  }

  // ======================================================
  // 📝 Affichage des logs d'un match
  // ======================================================
  const showMatchLogs = (match: Match) => {
    if (match.match_logs) {
      try {
        const logs: MatchLog[] = JSON.parse(match.match_logs)
        setSelectedMatchLogs(logs)
        setSelectedMatchId(match.match_id)
        console.log('📋 Logs affichés:', logs.length)
      } catch (e) {
        console.error('❌ Erreur parsing match logs:', e)
        setSelectedMatchLogs([])
      }
    } else {
      console.log('📋 Aucun log disponible')
      setSelectedMatchLogs([])
    }
  }

  // ======================================================
  // 🎨 Interface utilisateur
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <MainMenuButton />
          <p className="mt-4 text-xl">Chargement des statistiques...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-purple-400">📊 Profil & Statistiques</h1>
          <MainMenuButton />
        </div>

        {/* Informations joueur */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-purple-500">
          <h2 className="text-2xl font-bold mb-4 text-purple-300">👤 {playerName}</h2>
          <p className="text-gray-300">ID: {playerId}</p>
          <p className="text-gray-400 text-sm mt-2">
            {matches.length} match(s) trouvé(s) dans la base de données
          </p>
        </div>

        {/* Statistiques */}
        {stats && stats.total_matches > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Carte Victoires */}
              <div className="bg-green-600 rounded-xl p-6 text-center shadow-lg">
                <div className="text-3xl font-bold">{stats.wins}</div>
                <div className="text-green-200">Victoires</div>
                <div className="text-sm text-green-300 mt-2">{stats.win_rate}% de win rate</div>
              </div>

              {/* Carte Défaites */}
              <div className="bg-red-600 rounded-xl p-6 text-center shadow-lg">
                <div className="text-3xl font-bold">{stats.losses}</div>
                <div className="text-red-200">Défaites</div>
                <div className="text-sm text-red-300 mt-2">{stats.draws} matchs nuls</div>
              </div>

              {/* Carte Finishes */}
              <div className="bg-blue-600 rounded-xl p-6 text-center shadow-lg">
                <div className="text-3xl font-bold">{stats.total_finishes}</div>
                <div className="text-blue-200">Finishes totaux</div>
                <div className="text-sm text-blue-300 mt-2">Finish préféré: {stats.favorite_finish}</div>
              </div>

              {/* Carte Rounds */}
              <div className="bg-yellow-600 rounded-xl p-6 text-center shadow-lg">
                <div className="text-3xl font-bold">{stats.total_rounds}</div>
                <div className="text-yellow-200">Rounds joués</div>
                <div className="text-sm text-yellow-300 mt-2">{stats.average_rounds_per_match} rounds/match</div>
              </div>
            </div>

            {/* Détails des statistiques */}
            <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-blue-500">
              <h3 className="text-2xl font-bold mb-4 text-blue-300">📈 Détails des Statistiques</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">Matches</div>
                  <div className="text-2xl text-purple-400">{stats.total_matches}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">Spin Finishes</div>
                  <div className="text-2xl text-blue-400">{stats.spin_finishes}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">Over Finishes</div>
                  <div className="text-2xl text-green-400">{stats.over_finishes}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">Burst Finishes</div>
                  <div className="text-2xl text-red-400">{stats.burst_finishes}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">Xtreme Finishes</div>
                  <div className="text-2xl text-yellow-400">{stats.xtreme_finishes}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">Combo favori</div>
                  <div className="text-lg text-pink-400 truncate" title={stats.most_used_combo}>
                    {stats.most_used_combo}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gray-800 rounded-xl p-8 mb-8 border border-yellow-500 text-center">
            <h3 className="text-2xl font-bold mb-4 text-yellow-300">📊 Aucune statistique disponible</h3>
            <p className="text-gray-300 mb-4">
              Vous n&apos;avez pas encore joué de matchs enregistrés dans le système.
            </p>
            <p className="text-gray-400 text-sm">
              Les statistiques apparaîtront ici après votre premier match.
            </p>
          </div>
        )}

        {/* Liste des matches */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-green-500">
          <h3 className="text-2xl font-bold mb-4 text-green-300">🎮 Historique des Matches</h3>
          <div className="space-y-4">
            {matches.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Aucun match trouvé</p>
            ) : (
              matches.map((match) => (
                <div
                  key={match.match_id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:scale-105 ${
                    match.winner_id === playerId
                      ? 'bg-green-900 border-green-500'
                      : match.loser_id === playerId
                      ? 'bg-red-900 border-red-500'
                      : 'bg-yellow-900 border-yellow-500'
                  }`}
                  onClick={() => showMatchLogs(match)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-semibold">
                        {match.player1?.player_name || 'Joueur 1'} vs {match.player2?.player_name || 'Joueur 2'}
                      </div>
                      <div className="text-sm text-gray-300">
                        Tournoi: {match.tournaments?.name || 'N/A'} • Rounds: {match.rounds}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        match.winner_id === playerId
                          ? 'text-green-400'
                          : match.loser_id === playerId
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}>
                        {match.winner_id === playerId ? 'VICTOIRE' : 
                         match.loser_id === playerId ? 'DÉFAITE' : 'ÉGALITÉ'}
                      </div>
                      <div className="text-sm text-gray-300">
                        Finishes: {(match.spin_finishes || 0) + (match.over_finishes || 0) + 
                                 (match.burst_finishes || 0) + (match.xtreme_finishes || 0) +
                                 (match.spin_finishes2 || 0) + (match.over_finishes2 || 0) + 
                                 (match.burst_finishes2 || 0) + (match.xtreme_finishes2 || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logs du match sélectionné */}
        {selectedMatchLogs.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 border border-yellow-500">
            <h3 className="text-2xl font-bold mb-4 text-yellow-300">
              📋 Logs du Match {selectedMatchId?.substring(0, 8)}...
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedMatchLogs.map((log, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-gray-700 border border-gray-600"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">Tour {log.round}</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        log.player === 1 ? 'bg-blue-600' : 'bg-red-600'
                      }`}>
                        Joueur {log.player}
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
                    <span className="text-green-400">{log.winner_combo_name}</span>
                    <span className="mx-2">vs</span>
                    <span className="text-red-400">{log.loser_combo_name}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
