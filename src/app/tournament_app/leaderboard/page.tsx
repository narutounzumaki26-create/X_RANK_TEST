// src/app/leaderboard/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { Trophy, Globe, MapPin, Tournament } from "lucide-react"
import { CyberPage } from "@/components/layout/CyberPage"
import { MainMenuButton } from "@/components/navigation/MainMenuButton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { calculateLeaderboard } from "@/lib/leaderboard-calculations"

async function getRegions() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('players')
    .select('player_region')
    .not('player_region', 'is', null)
    .not('player_region', 'eq', '')
  
  const regions = [...new Set(data?.map(item => item.player_region) || [])]
  return regions as string[]
}

async function getTournaments() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('tournaments')
    .select('tournament_id, name, date')
    .order('date', { ascending: false })
  
  return data || []
}

export default async function LeaderboardPage() {
  const [globalLeaderboard, regionalLeaderboards, tournamentLeaderboards, officialMatchesLeaderboard, regions, tournaments] = await Promise.all([
    calculateLeaderboard(), // Global leaderboard
    Promise.all((await getRegions()).map(region => 
      calculateLeaderboard({ region })
    )),
    Promise.all((await getTournaments()).map(tournament => 
      calculateLeaderboard({ tournamentId: tournament.tournament_id })
    )),
    calculateLeaderboard({ tournamentId: null }), // Official matches
    getRegions(),
    getTournaments()
  ])

  const LeaderboardSection = ({ 
    title, 
    subtitle, 
    icon: Icon,
    data,
    emptyMessage = "Aucune donnée disponible"
  }: {
    title: string
    subtitle: string
    icon: any
    data: any[]
    emptyMessage?: string
  }) => (
    <Card className="border border-white/10 bg-black/70 shadow-[0_0_28px_rgba(0,255,255,0.25)]">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-xl text-cyan-200 drop-shadow-[0_0_16px_rgba(0,255,255,0.45)] flex items-center justify-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-gray-200/80">
          {subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length > 0 ? data.map((entry, index) => {
          let bgColor = "bg-white/5 border border-white/15"
          let trophyIcon = null

          if (index === 0) {
            bgColor = "bg-yellow-400/15 border border-yellow-400/70 shadow-[0_0_18px_rgba(255,215,0,0.45)]"
            trophyIcon = <Trophy className="mr-2 h-5 w-5 text-yellow-300" />
          } else if (index === 1) {
            bgColor = "bg-gray-300/10 border border-gray-300/60 shadow-[0_0_18px_rgba(192,192,192,0.35)]"
            trophyIcon = <Trophy className="mr-2 h-5 w-5 text-gray-200" />
          } else if (index === 2) {
            bgColor = "bg-orange-400/15 border border-orange-400/70 shadow-[0_0_18px_rgba(255,140,0,0.35)]"
            trophyIcon = <Trophy className="mr-2 h-5 w-5 text-orange-300" />
          }

          return (
            <div
              key={entry.player_id}
              className={`flex items-center justify-between rounded-2xl px-5 py-4 font-mono text-white transition hover:-translate-y-1 ${bgColor}`}
            >
              <span className="flex items-center text-sm font-semibold tracking-wide">
                {trophyIcon}
                {index + 1}. {entry.player_name}
                {entry.player_region && (
                  <span className="ml-2 text-xs text-gray-400">[{entry.player_region}]</span>
                )}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400">
                  {entry.wins}W/{entry.total_matches}M ({(entry.win_rate).toFixed(1)}%)
                </span>
                <span className="text-base text-cyan-200">{entry.total_score}</span>
              </div>
            </div>
          )
        }) : (
          <div className="text-center py-8 text-gray-400">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <CyberPage
      header={{
        eyebrow: "datastream//multi_ranking",
        title: "🏆 Multi-Leaderboards",
        subtitle: "Classements par région, tournois et matchs officiels",
        actions: <MainMenuButton />,
      }}
      contentClassName="mx-auto w-full max-w-6xl gap-8"
    >
      {/* Global Leaderboard */}
      <div>
        <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
          <Globe className="h-6 w-6" />
          Classement Global
        </h2>
        <LeaderboardSection
          title="Champions Mondiaux"
          subtitle="Les meilleurs joueurs toutes régions et tournois confondus"
          icon={Globe}
          data={globalLeaderboard.slice(0, 10)}
        />
      </div>

      {/* Regional Leaderboards */}
      <div>
        <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Classements Régionaux
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regionalLeaderboards.map((leaderboard, index) => {
            const region = regions[index]
            if (!leaderboard.length) return null
            
            return (
              <LeaderboardSection
                key={region}
                title={`Champions ${region}`}
                subtitle={`Top joueurs de la région ${region}`}
                icon={MapPin}
                data={leaderboard.slice(0, 5)}
                emptyMessage={`Aucun match enregistré pour ${region}`}
              />
            )
          })}
        </div>
      </div>

      {/* Tournament Leaderboards */}
      <div>
        <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
          <Tournament className="h-6 w-6" />
          Classements Tournois
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournamentLeaderboards.map((leaderboard, index) => {
            const tournament = tournaments[index]
            if (!leaderboard.length) return null
            
            return (
              <LeaderboardSection
                key={tournament.tournament_id}
                title={tournament.name}
                subtitle={`Tournois du ${new Date(tournament.date).toLocaleDateString('fr-FR')}`}
                icon={Tournament}
                data={leaderboard.slice(0, 5)}
                emptyMessage={`Aucun match pour ${tournament.name}`}
              />
            )
          })}
        </div>
      </div>

      {/* Official Matches Leaderboard */}
      <div>
        <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
          <Trophy className="h-6 w-6" />
          Matchs Officiels
        </h2>
        <LeaderboardSection
          title="Ligue Principale"
          subtitle="Classement des matchs officiels (hors tournois)"
          icon={Trophy}
          data={officialMatchesLeaderboard.slice(0, 10)}
          emptyMessage="Aucun match officiel enregistré"
        />
      </div>

      <p className="text-center text-xs font-mono uppercase tracking-[0.35em] text-gray-400/80">
        datastream :: multi_leaderboard_active
      </p>
    </CyberPage>
  )
}
