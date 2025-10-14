// src/types/tournament.ts
// ============================================================
// 🏆 Types globaux pour le système de tournois X-RANK
// ============================================================

// -----------------------------
// 🔹 Players
// -----------------------------
export type players = {
  player_id: string
  player_name: string
  player_first_name?: string
  player_last_name?: string
  player_region?: string
  user_id?: string
  Admin: boolean
  Arbitre: boolean
  created_at: string
}

// -----------------------------
// 🔹 Tournaments
// -----------------------------
export type tournaments = {
  tournament_id: string
  name: string
  description?: string
  location?: string
  date: string
  status: string // planned | ongoing | finished
  max_combos: number
  created_by?: string // FK -> players.player_id
  winner_id?: string
}

// -----------------------------
// 🔹 Combos
// -----------------------------
export type combos = {
  combo_id: string
  name: string
  blade_id: string
  ratchet_id: string
  bit_id: string
  assist_id?: string | null
  lock_chip_id?: string | null
}

// -----------------------------
// 🔹 Tournament Decks
// -----------------------------
export type tournament_decks = {
  deck_id: string
  tournament_id: string
  player_id: string
  combo_id_1?: string | null
  combo_id_2?: string | null
  combo_id_3?: string | null
}

// -----------------------------
// 🔹 Tournament Participants
// -----------------------------
export type tournament_participants = {
  inscription_id: string
  tournament_id: string
  player_id: string
  tournament_deck?: string | null // FK -> tournament_decks.deck_id
  is_validated: boolean
  validated_at?: string | null
}

// -----------------------------
// 🔹 Matches
// -----------------------------
export type matches = {
  match_id: string
  tournament_id?: string
  created_by?: string
  player1_id?: string
  player2_id?: string
  winner_id?: string
  loser_id?: string
  rounds: number
  created_at?: string
}

// -----------------------------
// 🔹 Match Logs
// -----------------------------
export type match_logs = {
  log_id: string
  match_id: string
  player: number // 1 ou 2
  player_tag?: string | null // player_id
  round: number
  action: match_action
  points: number
  winner_combo: string
  loser_combo: string
  created_at: string
}

export type match_action = "Spin" | "Over" | "Burst" | "Xtreme"

// -----------------------------
// 🔹 Player Stats
// -----------------------------
export type player_stats = {
  player_id: string
  matches_played: number
  matches_won: number
  matches_lost: number
  matches_draw: number
  spin_finishes: number
  over_finishes: number
  burst_finishes: number
  xtreme_finishes: number
}

// -----------------------------
// 🔹 Points
// -----------------------------
export type points = {
  player_id: string
  player_score_given: number
  player_score_global: number
  player_score_stats: number
}

// ============================================================
// 🔸 Relations & Types composés
// ============================================================

// 🎯 Participant avec son deck
export type participant_with_deck = tournament_participants & {
  player?: players
  deck?: tournament_decks
}

// 🌀 Deck avec ses combos
export type deck_with_combos = tournament_decks & {
  combo_1?: combos | null
  combo_2?: combos | null
  combo_3?: combos | null
}

// 🏟️ Tournoi avec ses participants
export type tournament_with_participants = tournaments & {
  participants: participant_with_deck[]
}

// ⚔️ Match avec les joueurs et les decks
export type match_with_players = matches & {
  player1?: players
  player2?: players
  winner?: players
  logs?: match_logs[]
}

// 📊 Classement / Leaderboard
export type leaderboard_entry = {
  player_id: string
  player_name: string
  player_score_global: number
}

// ============================================================
// 🔹 Types utilitaires
// ============================================================

export type match_result = {
  winner_id: string
  loser_id: string
  player1_score: number
  player2_score: number
  round_logs: match_logs[]
}

export type combo_piece_type = {
  id: string
  name: string
  type?: string
  image_url?: string
}

// ============================================================
// ✅ Fin du fichier
// ============================================================
