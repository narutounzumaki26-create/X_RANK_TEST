'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type Assist = { assist_id: string; name: string; type: string }
type Blade = { blade_id: string; name: string; type: string; line: string }
type LockChip = { lock_chip_id: string; name: string; type: string }
type Ratchet = { ratchet_id: string; name: string; type: string }
type Bit = { bit_id: string; name: string; type: string }

export default function ComponentsPage() {
  const [assists, setAssists] = useState<Assist[]>([])
  const [blades, setBlades] = useState<Blade[]>([])
  const [lockChips, setLockChips] = useState<LockChip[]>([])
  const [ratchets, setRatchets] = useState<Ratchet[]>([])
  const [bits, setBits] = useState<Bit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: assistsData } = await supabase.from("assists").select("*")
        const { data: bladesData } = await supabase.from("blades").select("*")
        const { data: lockChipsData } = await supabase.from("lock_chips").select("*")
        const { data: ratchetsData } = await supabase.from("ratchets").select("*")
        const { data: bitsData } = await supabase.from("bits").select("*")

        setAssists((assistsData ?? []).sort((a, b) => a.name.localeCompare(b.name)))
        setBlades((bladesData ?? []).sort((a, b) => a.name.localeCompare(b.name)))
        setLockChips((lockChipsData ?? []).sort((a, b) => a.name.localeCompare(b.name)))
        setRatchets((ratchetsData ?? []).sort((a, b) => a.name.localeCompare(b.name)))
        setBits((bitsData ?? []).sort((a, b) => a.name.localeCompare(b.name)))
        
      } catch (err) {
        console.error("Erreur lors de la récupération des composants :", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <p className="p-6 text-center text-white">Chargement des composants...</p>
  }

  return (
    <main className="flex flex-col items-center min-h-screen p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <h1 className="text-4xl font-extrabold text-purple-400 mb-8 text-center tracking-wide">
        ⚡ Liste des Composants
      </h1>

      <div className="w-full max-w-3xl space-y-4">
        <Accordion type="single" collapsible className="w-full space-y-2">
          {/* Assists */}
          <AccordionItem value="assists">
            <AccordionTrigger className="bg-gray-800/70 text-white rounded-xl px-4 py-2">
              Assists
            </AccordionTrigger>
            <AccordionContent className="bg-gray-800/60 rounded-xl p-4 text-white">
              <ul className="list-disc pl-6">
                {assists.map(a => (
                  <li key={a.assist_id}>
                    {a.name} ({a.type})
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Blades */}
          <AccordionItem value="blades">
            <AccordionTrigger className="bg-gray-800/70 text-white rounded-xl px-4 py-2">
              Blades
            </AccordionTrigger>
            <AccordionContent className="bg-gray-800/60 rounded-xl p-4 text-white">
              <ul className="list-disc pl-6">
                {blades.map(b => (
                  <li key={b.blade_id}>
                    {b.name} ({b.type}) – Ligne: {b.line}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Lock Chips */}
          <AccordionItem value="lock_chips">
            <AccordionTrigger className="bg-gray-800/70 text-white rounded-xl px-4 py-2">
              Lock Chips
            </AccordionTrigger>
            <AccordionContent className="bg-gray-800/60 rounded-xl p-4 text-white">
              <ul className="list-disc pl-6">
                {lockChips.map(lc => (
                  <li key={lc.lock_chip_id}>
                    {lc.name} ({lc.type})
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Ratchets */}
          <AccordionItem value="ratchets">
            <AccordionTrigger className="bg-gray-800/70 text-white rounded-xl px-4 py-2">
              Ratchets
            </AccordionTrigger>
            <AccordionContent className="bg-gray-800/60 rounded-xl p-4 text-white">
              <ul className="list-disc pl-6">
                {ratchets.map(r => (
                  <li key={r.ratchet_id}>
                    {r.name} ({r.type})
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Bits */}
          <AccordionItem value="bits">
            <AccordionTrigger className="bg-gray-800/70 text-white rounded-xl px-4 py-2">
              Bits
            </AccordionTrigger>
            <AccordionContent className="bg-gray-800/60 rounded-xl p-4 text-white">
              <ul className="list-disc pl-6">
                {bits.map(bit => (
                  <li key={bit.bit_id}>
                    {bit.name} ({bit.type})
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </main>
  )
}
