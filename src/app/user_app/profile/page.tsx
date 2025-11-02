'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { MainMenuButton } from '@/components/navigation/MainMenuButton'

type CSSVars = React.CSSProperties & {
  ['--dur']?: string;
  ['--delay']?: string;
  ['--tx']?: string;
  ['--ty']?: string;
};

// Types inchangés
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
  tournaments?: { name: string }
  player1?: { player_name: string }
  player2?: { player_name: string }
}

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
  const [error, setError] = useState<string>('')

  const [page, setPage] = useState<number>(1);

  // nombre total de pages (au moins 1 pour éviter les divisions par 0)
  const totalPages = Math.max(1, Math.ceil(matches.length / 5));

  // slice des matchs pour la page courante
  const paginatedMatches = matches.slice((page - 1) * 5, page * 5);

  useEffect(() => {
      const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
    try {
      if (page > totalPages) setPage(totalPages);
    } catch {
      setError('Veuillez contacter un administrateur LFBX')
    }
  }, [page, totalPages]);

  // === DATA ===
  const fetchPlayerMatches = useCallback(async (pId: string) => {
    setLoading(true)
    try {
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
        setError('Veuillez contacter un administrateur LFBX')
        return
      }

      const { data: simpleData, error: simpleError } = await supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${pId},player2_id.eq.${pId}`)

      if (simpleError) {
        setError('Veuillez contacter un administrateur LFBX')
        return
      }

      setMatches(matchesData || [])
      setPage(1);
      calculateStats(matchesData || [], pId)
    } catch {
      setError('Veuillez contacter un administrateur LFBX')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const getCurrentPlayer = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) {
          setError('Veuillez contacter un administrateur LFBX')
          return
        }
        if (!user) {
          setError('Veuillez contacter un administrateur LFBX')
          return
        }
        const { data: player, error: playerError } = await supabase
          .from('players')
          .select('player_id, player_name')
          .eq('user_id', user.id)
          .single()
        if (playerError) {
          setError('Veuillez contacter un administrateur LFBX')
          return
        }
        if (player) {
          setPlayerId(player.player_id)
          setPlayerName(player.player_name)
          fetchPlayerMatches(player.player_id)
        } else {
          setError('Veuillez contacter un administrateur LFBX')
        }
      } catch {
        setError('Veuillez contacter un administrateur LFBX')
      }
    }
    try {
      getCurrentPlayer()
    } catch {
      setError('Veuillez contacter un administrateur LFBX')
    }
  }, [fetchPlayerMatches])

  const calculateStats = (playerMatches: Match[], pId: string) => {
    try {
      const totalMatches = playerMatches.length
      let wins = 0, losses = 0, draws = 0
      let totalRounds = 0, totalFinishes = 0
      let spinFinishes = 0, overFinishes = 0, burstFinishes = 0, xtremeFinishes = 0
      const comboUsage = new Map<string, number>()
      const finishUsage = new Map<string, number>()

      playerMatches.forEach(match => {
        try {
          const isPlayer1 = match.player1_id === pId
          const isPlayer2 = match.player2_id === pId

          if (match.winner_id === pId) wins++
          else if (match.loser_id === pId) losses++
          else if (match.winner_id === null && match.loser_id === null) draws++

          totalRounds += match.rounds || 0

          if (isPlayer1) {
            spinFinishes   += match.spin_finishes   || 0
            overFinishes   += match.over_finishes   || 0
            burstFinishes  += match.burst_finishes  || 0
            xtremeFinishes += match.xtreme_finishes || 0
            totalFinishes  += (match.spin_finishes || 0) + (match.over_finishes || 0) +
                              (match.burst_finishes || 0) + (match.xtreme_finishes || 0)
          } else if (isPlayer2) {
            spinFinishes   += match.spin_finishes2   || 0
            overFinishes   += match.over_finishes2   || 0
            burstFinishes  += match.burst_finishes2  || 0
            xtremeFinishes += match.xtreme_finishes2 || 0
            totalFinishes  += (match.spin_finishes2 || 0) + (match.over_finishes2 || 0) +
                              (match.burst_finishes2 || 0) + (match.xtreme_finishes2 || 0)
          }

          if (match.match_logs) {
            try {
              const logs: MatchLog[] = JSON.parse(match.match_logs)
              logs.forEach(log => {
                try {
                  if (log.player === (isPlayer1 ? 1 : 2)) {
                    comboUsage.set(log.winner_combo_name, (comboUsage.get(log.winner_combo_name) || 0) + 1)
                    finishUsage.set(log.action, (finishUsage.get(log.action) || 0) + 1)
                  }
                } catch {
                  setError('Veuillez contacter un administrateur LFBX')
                }
              })
            } catch {
              setError('Veuillez contacter un administrateur LFBX')
            }
          }
        } catch {
          setError('Veuillez contacter un administrateur LFBX')
        }
      })

      let mostUsedCombo = 'Aucun', favoriteFinish = 'Aucun'
      let maxCombo = 0, maxFinish = 0
      try {
        comboUsage.forEach((count, combo) => { 
          try {
            if (count > maxCombo) { maxCombo = count; mostUsedCombo = combo }
          } catch {
            setError('Veuillez contacter un administrateur LFBX')
          }
        })
        finishUsage.forEach((count, finish) => { 
          try {
            if (count > maxFinish) { maxFinish = count; favoriteFinish = finish }
          } catch {
            setError('Veuillez contacter un administrateur LFBX')
          }
        })
      } catch {
        setError('Veuillez contacter un administrateur LFBX')
      }

      setStats({
        total_matches: totalMatches,
        wins, losses, draws,
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
      })
    } catch {
      setError('Veuillez contacter un administrateur LFBX')
    }
  }

  const showMatchLogs = (match: Match) => {
    try {
      if (!match.match_logs) { 
        setSelectedMatchLogs([]); 
        return 
      }
      try {
        const logs: MatchLog[] = JSON.parse(match.match_logs)
        setSelectedMatchLogs(logs)
        setSelectedMatchId(match.match_id)
      } catch {
        setError('Veuillez contacter un administrateur LFBX')
      }
    } catch {
      setError('Veuillez contacter un administrateur LFBX')
    }
  }

  // === UI ===
  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden text-white flex items-center justify-center">
        <div
          className="absolute inset-0 animate-gradient-shift pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(135deg,#0b0215,#1b0b2b,#3a0c4a,#5b136b,#8b1da1,#3a0c4a,#1b0b2b,#0b0215)' }}
        />
        <div className="absolute inset-0 bg-cyber-grid opacity-40 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,.65) 100%)' }}
        />
        <div className="relative z-10 text-center">
          <MainMenuButton />
          <p className="mt-4 text-xl text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden text-white flex items-center justify-center">
        <div
          className="absolute inset-0 animate-gradient-shift pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(135deg,#0b0215,#1b0b2b,#3a0c4a,#5b136b,#8b1da1,#3a0c4a,#1b0b2b,#0b0215)' }}
        />
        <div className="absolute inset-0 bg-cyber-grid opacity-40 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,.65) 100%)' }}
        />
        <div className="relative z-10 text-center">
          <MainMenuButton />
          <p className="mt-4 text-xl">Chargement des statistiques...</p>
        </div>
      </div>
    )
  }

  const hasLogs = selectedMatchLogs.length > 0

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      {/* === FOND : grand gradient blanc chromatique + petites orbes + accent vert === */}
      <div
        className="absolute inset-0 animate-gradient-shift pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(135deg,#ffffff,#f8fbff,#fff2fb,#f3fff7,#ffffff,#f8fbff,#fff2fb,#ffffff)',
          backgroundSize: '450% 450%'
        }}
      />

      {/* Orbes multiples (petites) qui pulsent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="orb" style={{
          width: 90, height: 90, left: '8%',  top: '72%',
          '--dur': '6.5s', '--delay': '0s',   '--tx': '6px',  '--ty': '-4px'
        } as CSSVars} />
        <div className="orb" style={{
          width: 70, height: 70, left: '18%', top: '30%',
          '--dur': '7.8s', '--delay': '1.2s', '--tx': '-5px', '--ty': '3px'
        } as CSSVars} />
        <div className="orb" style={{
          width: 110, height: 110, left: '32%', top: '12%',
          '--dur': '8.2s', '--delay': '0.4s', '--tx': '4px',  '--ty': '5px'
        } as CSSVars} />
        <div className="orb" style={{
          width: 80, height: 80, left: '56%', top: '18%',
          '--dur': '7.2s', '--delay': '2s',   '--tx': '-3px', '--ty': '-2px'
        } as CSSVars} />
        <div className="orb" style={{
          width: 65, height: 65, left: '68%', top: '68%',
          '--dur': '6.8s', '--delay': '1.6s', '--tx': '2px',  '--ty': '-3px'
        } as CSSVars} />
        <div className="orb" style={{
          width: 95, height: 95, left: '84%', top: '26%',
          '--dur': '7.6s', '--delay': '0.8s', '--tx': '-6px', '--ty': '2px'
        } as CSSVars} />
        <div className="orb" style={{
          width: 75, height: 75, left: '42%', top: '78%',
          '--dur': '7.1s', '--delay': '2.4s', '--tx': '3px',  '--ty': '-2px'
        } as CSSVars} />
      </div>

      {/* Accent vert subtil */}
      <div
        className="absolute inset-0 animate-pulse pointer-events-none"
        style={{
          background:
            'radial-gradient(900px 900px at 20% 75%, rgba(16,185,129,0.16), transparent 55%), radial-gradient(800px 800px at 82% 18%, rgba(16,185,129,0.12), transparent 52%)'
        }}
      />

      {/* Vignette pour lisibilité */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 38%, rgba(0,0,0,.65) 100%)'
        }}
      />

      {/* === CONTENU === */}
      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white drop-shadow-[0_2px_0_#000]">
              📊 Profil & Statistiques
            </h1>
            <MainMenuButton />
          </div>

          {/* Informations joueur (flottant) */}
          <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 mb-8 border border-black animate-float-slow hover-lift">
            <h2 className="text-2xl font-bold mb-2 text-white drop-shadow-[0_1px_0_#000]">👤 {playerName}</h2>
            <p className="text-white/90 drop-shadow-[0_1px_0_#000]">
              ID: <span className="font-mono">{playerId}</span>
            </p>
            <p className="text-white/70 text-sm mt-2 drop-shadow-[0_1px_0_#000]">
              {matches.length} match(s) trouvé(s) dans la base de données
            </p>
          </div>

          {/* Statistiques (flottant) */}
          {stats && stats.total_matches > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="rounded-xl p-6 text-center bg-gradient-to-br from-emerald-400/20 to-emerald-300/10 border border-black animate-float-slow hover-lift">
                  <div className="text-3xl font-bold text-emerald-300 drop-shadow-[0_1px_0_#000]">{stats.wins}</div>
                  <div className="text-emerald-200/90 drop-shadow-[0_1px_0_#000]">Victoires</div>
                  <div className="text-sm text-emerald-200/80 mt-2 drop-shadow-[0_1px_0_#000]">{stats.win_rate}% de win rate</div>
                </div>
                <div className="rounded-xl p-6 text-center bg-black/60 border border-black animate-float-slow hover-lift">
                  <div className="text-3xl font-bold text-white drop-shadow-[0_1px_0_#000]">{stats.losses}</div>
                  <div className="text-white/90 drop-shadow-[0_1px_0_#000]">Défaites</div>
                  <div className="text-sm text-white/80 mt-2 drop-shadow-[0_1px_0_#000]">{stats.draws} matchs nuls</div>
                </div>
                <div className="rounded-xl p-6 text-center bg-gradient-to-br from-emerald-400/20 to-emerald-300/10 border border-black animate-float-slow hover-lift">
                  <div className="text-3xl font-bold text-emerald-300 drop-shadow-[0_1px_0_#000]">{stats.total_finishes}</div>
                  <div className="text-emerald-200/90 drop-shadow-[0_1px_0_#000]">Finishes totaux</div>
                  <div className="text-sm text-emerald-200/80 mt-2 drop-shadow-[0_1px_0_#000]">
                    Finish préféré: {stats.favorite_finish}
                  </div>
                </div>
                <div className="rounded-xl p-6 text-center bg-black/60 border border-black animate-float-slow hover-lift">
                  <div className="text-3xl font-bold text-white drop-shadow-[0_1px_0_#000]">{stats.total_rounds}</div>
                  <div className="text-white/90 drop-shadow-[0_1px_0_#000]">Rounds joués</div>
                  <div className="text-sm text-white/80 mt-2 drop-shadow-[0_1px_0_#000]">
                    {stats.average_rounds_per_match} rounds/match
                  </div>
                </div>
              </div>

              {/* Détails (flottant) */}
              <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 mb-8 border border-black animate-float-slow hover-lift">
                <h3 className="text-2xl font-bold mb-4 text-white drop-shadow-[0_2px_0_#000]">📈 Détails des Statistiques</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="rounded-lg bg-black/50 border border-black p-4 text-center">
                    <div className="text-xs uppercase tracking-wide text-white/70 drop-shadow-[0_1px_0_#000]">Matches</div>
                    <div className="text-2xl font-semibold text-white drop-shadow-[0_1px_0_#000]">{stats.total_matches}</div>
                  </div>
                  <div className="rounded-lg bg-black/50 border border-black p-4 text-center">
                    <div className="text-xs uppercase tracking-wide text-white/70 drop-shadow-[0_1px_0_#000]">Spin</div>
                    <div className="text-2xl font-semibold text-emerald-300 drop-shadow-[0_1px_0_#000]">{stats.spin_finishes}</div>
                  </div>
                  <div className="rounded-lg bg-black/50 border border-black p-4 text-center">
                    <div className="text-xs uppercase tracking-wide text-white/70 drop-shadow-[0_1px_0_#000]">Over</div>
                    <div className="text-2xl font-semibold text-emerald-300 drop-shadow-[0_1px_0_#000]">{stats.over_finishes}</div>
                  </div>
                  <div className="rounded-lg bg-black/50 border border-black p-4 text-center">
                    <div className="text-xs uppercase tracking-wide text-white/70 drop-shadow-[0_1px_0_#000]">Burst</div>
                    <div className="text-2xl font-semibold text-emerald-300 drop-shadow-[0_1px_0_#000]">{stats.burst_finishes}</div>
                  </div>
                  <div className="rounded-lg bg-black/50 border border-black p-4 text-center">
                    <div className="text-xs uppercase tracking-wide text-white/70 drop-shadow-[0_1px_0_#000]">Xtreme</div>
                    <div className="text-2xl font-semibold text-emerald-300 drop-shadow-[0_1px_0_#000]">{stats.xtreme_finishes}</div>
                  </div>
                  <div className="rounded-lg bg-black/50 border border-black p-4 text-center">
                    <div className="text-xs uppercase tracking-wide text-white/70 drop-shadow-[0_1px_0_#000]">Combo favori</div>
                    <div className="text-sm font-medium text-white truncate drop-shadow-[0_1px_0_#000]" title={stats.most_used_combo}>
                      {stats.most_used_combo}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 mb-8 border border-black animate-float-slow hover-lift">
              <h3 className="text-2xl font-bold mb-4 text-white drop-shadow-[0_2px_0_#000]">📊 Aucune statistique disponible</h3>
              <p className="text-white/90 mb-4 drop-shadow-[0_1px_0_#000]">
                Vous n&apos;avez pas encore joué de matchs enregistrés dans le système.
              </p>
              <p className="text-white/70 text-sm drop-shadow-[0_1px_0_#000]">
                Les statistiques apparaîtront ici après votre premier match.
              </p>
            </div>
          )}

          {/* === FLIP 3D : Historique <-> Logs === */}
          <div className="flip-3d mb-8">
            <div className={`flip-inner ${hasLogs ? 'rotate-y-180' : ''}`}>
              {/* FACE AVANT : Historique */}
              <div className="flip-face">
                <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-black animate-float-slow hover-lift">
                  <h3 className="text-2xl font-bold mb-4 text-white drop-shadow-[0_2px_0_#000]">🎮 Historique des Matches</h3>
                  <div className="space-y-4">
                    {matches.length === 0 ? (
                      <p className="text-white/70 text-center py-8 drop-shadow-[0_1px_0_#000]">Aucun match trouvé</p>
                    ) : (
                      paginatedMatches.map((match) => (
                        <div
                          key={match.match_id}
                          className={`p-4 rounded-lg border border-black cursor-pointer transition-transform hover:translate-y-[-2px] hover:scale-[1.01] ${
                            match.winner_id === playerId
                              ? 'bg-emerald-500/15'
                              : match.loser_id === playerId
                              ? 'bg-black/50'
                              : 'bg-emerald-500/10'
                          }`}
                          onClick={() => showMatchLogs(match)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-semibold text-white drop-shadow-[0_1px_0_#000]">
                                {match.player1?.player_name || 'Joueur 1'} <span className="opacity-70">vs</span> {match.player2?.player_name || 'Joueur 2'}
                              </div>
                              <div className="text-sm text-white/80 drop-shadow-[0_1px_0_#000]">
                                {match.tournaments?.name || 'Match Officiel'} • Rounds: {match.rounds}
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-lg font-bold drop-shadow-[0_1px_0_#000] ${
                                  match.winner_id === playerId
                                    ? 'text-emerald-300'
                                    : match.loser_id === playerId
                                    ? 'text-white'
                                    : 'text-emerald-200'
                                }`}
                              >
                                {match.winner_id === playerId ? 'VICTOIRE' : match.loser_id === playerId ? 'DÉFAITE' : 'ÉGALITÉ'}
                              </div>
                              <div className="text-sm text-white/80 drop-shadow-[0_1px_0_#000]">
                                Finishes:{' '}
                                {(match.spin_finishes || 0) +
                                  (match.over_finishes || 0) +
                                  (match.burst_finishes || 0) +
                                  (match.xtreme_finishes || 0) +
                                  (match.spin_finishes2 || 0) +
                                  (match.over_finishes2 || 0) +
                                  (match.burst_finishes2 || 0) +
                                  (match.xtreme_finishes2 || 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Pagination */}
                  <div className="mt-6 flex items-center justify-between">
                    <button
                      onClick={() => {
                        try {
                          setPage(p => Math.max(1, p - 1))
                        } catch {
                          setError('Veuillez contacter un administrateur LFBX')
                        }
                      }}
                      disabled={page === 1}
                      className={`px-3 py-1.5 rounded-md border border-black bg-black/60 text-white transition
                                  ${page === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-black/70'}`}
                    >
                      ← Précédent
                    </button>

                    <div className="text-white/80 text-sm">
                      Page <span className="font-semibold text-white">{page}</span> / {totalPages}
                    </div>

                    <button
                      onClick={() => {
                        try {
                          setPage(p => Math.min(totalPages, p + 1))
                        } catch {
                          setError('Veuillez contacter un administrateur LFBX')
                        }
                      }}
                      disabled={page === totalPages}
                      className={`px-3 py-1.5 rounded-md border border-black bg-emerald-500/20 text-white transition
                                  ${page === totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-emerald-500/30'}`}
                    >
                      Suivant →
                    </button>
                  </div>
                  {/* Numéros de pages (compact) */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        onClick={() => {
                          try {
                            setPage(n)
                          } catch {
                            setError('Veuillez contacter un administrateur LFBX')
                          }
                        }}
                        className={`h-8 min-w-8 px-2 rounded-md border border-black text-sm
                                    ${n === page ? 'bg-emerald-500/30 text-white' : 'bg-black/60 text-white/80 hover:bg-black/70'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* FACE ARRIÈRE : Logs (avec bouton Retour) */}
              <div className="flip-face flip-back absolute inset-0">
                <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-black h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white drop-shadow-[0_2px_0_#000]">
                      📋 Logs du Match {selectedMatchId?.substring(0, 8)}...
                    </h3>
                    <button
                      onClick={() => { 
                        try {
                          setSelectedMatchLogs([]); 
                          setSelectedMatchId(null); 
                        } catch {
                          setError('Veuillez contacter un administrateur LFBX')
                        }
                      }}
                      className="px-3 py-1.5 rounded-md border border-black bg-emerald-500/20 text-white hover:bg-emerald-500/30 transition-colors drop-shadow-[0_1px_0_#000]"
                    >
                      ← Retour
                    </button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {selectedMatchLogs.map((log, index) => (
                      <div key={index} className="p-3 rounded-lg bg-black/50 border border-black">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-white drop-shadow-[0_1px_0_#000]">Tour {log.round}</span>
                            <span
                              className={`ml-2 px-2 py-1 rounded text-xs drop-shadow-[0_1px_0_#000] ${
                                log.player === 1 ? 'bg-emerald-600/60' : 'bg-white/10'
                              }`}
                            >
                              Joueur {log.player}
                            </span>
                          </div>
                          <div
                            className={`px-2 py-1 rounded text-xs font-bold drop-shadow-[0_1px_0_#000] ${
                              log.action === 'Spin'
                                ? 'bg-white/10'
                                : log.action === 'Over'
                                ? 'bg-emerald-500/60'
                                : log.action === 'Burst'
                                ? 'bg-white/20'
                                : 'bg-emerald-500/40'
                            }`}
                          >
                            {log.action} (+{log.points})
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-white drop-shadow-[0_1px_0_#000]">
                          <span className="text-emerald-300">{log.winner_combo_name}</span>
                          <span className="mx-2 text-white/70">vs</span>
                          <span className="text-white">{log.loser_combo_name}</span>
                        </div>
                        <div className="text-xs text-white/70 mt-1 drop-shadow-[0_1px_0_#000]">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    {selectedMatchLogs.length === 0 && (
                      <div className="text-white/70 drop-shadow-[0_1px_0_#000]">Aucun log disponible.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* === fin flip === */}
        </div>
      </div>
    </div>
  )
}
