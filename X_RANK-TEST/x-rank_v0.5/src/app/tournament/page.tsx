'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Tournament {
  tournament_id: string
  name: string
  location?: string
  description?: string
  date: string
  status: string
  max_combos: number
}

export default function TournamentPage() {
  const supabased = supabase
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [maxCombos, setMaxCombos] = useState(3)
  const [message, setMessage] = useState('')
  const [tournaments, setTournaments] = useState<Tournament[]>([])

  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabased
        .from('tournaments')
        .select('*')
        .order('date', { ascending: true })

      if (!error && data) {
        setTournaments(data as Tournament[])
      }
    }
    fetchTournaments()
  }, [supabased])

  const handleCreateTournament = async () => {
    setMessage('')
    if (!name || !date) {
      setMessage('Le nom et la date sont obligatoires.')
      return
    }

    try {
      const { data: { user }, error: authError } = await supabased.auth.getUser()
      if (authError || !user) {
        setMessage('Impossible de récupérer l’utilisateur connecté.')
        return
      }

      const { data: playerData, error: playerError } = await supabased
        .from('players')
        .select('player_id')
        .eq('user_id', user.id)
        .single()

      if (playerError || !playerData) {
        setMessage('Impossible de récupérer le player_id de l’admin.')
        return
      }

      const { data: newTournament, error } = await supabased
        .from('tournaments')
        .insert([{
          name,
          location,
          description,
          date,
          max_combos: maxCombos,
          created_by: playerData.player_id,
        }])
        .select()
        .single()

      if (error) {
        setMessage(`Erreur : ${error.message}`)
      } else {
        setMessage(`Tournoi créé ! ID: ${newTournament.tournament_id}`)
        setTournaments([...tournaments, newTournament as Tournament])
        setName('')
        setLocation('')
        setDescription('')
        setDate('')
        setMaxCombos(3)
      }
    } catch (err) {
      setMessage('Erreur inattendue lors de la création du tournoi.')
      console.error(err)
    }
  }

  const handleManageMatches = (tournamentId: string) => {
    alert(`Ici tu pourras gérer les matchs pour le tournoi ${tournamentId}`)
  }

  const handleToggleStatus = (tournamentId: string) => {
    alert(`Ici tu pourras démarrer ou finir le tournoi ${tournamentId}`)
  }

  return (
    <main className="flex flex-col items-center min-h-screen p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <h1 className="text-4xl font-bold text-purple-400 mb-8 text-center">
        ⚡ Gestion des Tournois
      </h1>

      {/* Formulaire création */}
      <Card className="w-full max-w-3xl mb-8 bg-gray-800/70 text-white shadow-lg">
        <CardHeader>
          <CardTitle>Créer un tournoi</CardTitle>
          <CardDescription>Remplissez les informations pour créer un nouveau tournoi.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <input
            className="border p-2 rounded w-full bg-gray-700 text-white placeholder-gray-300"
            placeholder="Nom du tournoi"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className="border p-2 rounded w-full bg-gray-700 text-white placeholder-gray-300"
            placeholder="Lieu"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
          <textarea
            className="border p-2 rounded w-full col-span-2 bg-gray-700 text-white placeholder-gray-300"
            placeholder="Description courte du tournoi"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
          <input
            className="border p-2 rounded bg-gray-700 text-white placeholder-gray-300"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <input
            className="border p-2 rounded w-20 bg-gray-700 text-white placeholder-gray-300"
            type="number"
            min={1}
            max={5}
            value={maxCombos}
            onChange={e => setMaxCombos(Number(e.target.value))}
          />
          <Button
            onClick={handleCreateTournament}
            className="col-span-2 bg-blue-500 hover:bg-blue-600"
          >
            Créer
          </Button>
          {message && <p className="text-red-500 col-span-2">{message}</p>}
        </CardContent>
      </Card>

      {/* Liste des tournois existants */}
      <div className="w-full max-w-3xl space-y-4">
        <h2 className="text-3xl font-semibold mb-4 text-white">Tournois existants</h2>
        {tournaments.length === 0 ? (
          <p className="text-white">Aucun tournoi pour le moment.</p>
        ) : (
          <div className="grid gap-4">
            {tournaments.map(t => (
              <Card
                key={t.tournament_id}
                className="hover:shadow-xl transition bg-gray-800/60 text-white"
              >
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold">{t.name}</h3>
                      <p className="text-gray-300 text-sm">
                        {t.date} {t.location && `- ${t.location}`} - Status : {t.status}
                      </p>
                      {t.description && (
                        <p className="text-gray-400 text-sm mt-1">{t.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="bg-yellow-400 text-black hover:bg-yellow-500"
                        onClick={() => handleManageMatches(t.tournament_id)}
                      >
                        Gérer
                      </Button>
                      <Button
                        className="bg-green-500 text-white hover:bg-green-600"
                        onClick={() => handleToggleStatus(t.tournament_id)}
                      >
                        Commencer/Finir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
