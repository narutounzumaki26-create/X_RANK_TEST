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

// Types
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

interface Combo {
  combo_id: string
  name: string
  blade_id: string
  ratchet_id: string
  bit_id: string
  assist_id: string | null
  lock_chip_id: string | null
  created_at: string
  created_by?: string
}

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

export default function ComboManagementPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')
  const [playerId, setPlayerId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // ============================
  // 🔹 État principal
  // ============================
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view')
  const [combos, setCombos] = useState<Combo[]>([])
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null)

  // ============================
  // 🔹 Combo Builder state
  // ============================
  const [currentCombo, setCurrentCombo] = useState<Bey>({ cx: false })
  const [comboName, setComboName] = useState('')
  const [customName, setCustomName] = useState('')

  // ============================
  // 🔹 Pièces pour les combos
  // ============================
  const [blades, setBlades] = useState<PieceOption[]>([])
  const [bits, setBits] = useState<PieceOption[]>([])
  const [assists, setAssists] = useState<PieceOption[]>([])
  const [lockChips, setLockChips] = useState<PieceOption[]>([])
  const [ratchets, setRatchets] = useState<PieceOption[]>([])

  // ======================================================
  // 🧭 Vérification auth et récupération user
  // ======================================================
  useEffect(() => {
    const checkAuth = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      
      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      // Récupérer le player_id associé
      const { data: player, error } = await supabase
        .from('players')
        .select('player_id')
        .eq('user_id', user.id)
        .single()

      if (error || !player) {
        console.error('Error fetching player:', error)
        router.push('/')
        return
      }

      setPlayerId(player.player_id)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  // ======================================================
  // 📋 Fetch données
  // ======================================================
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

    if (playerId) {
      fetchPieces()
      fetchUserCombos()
    }
  }, [playerId])

  const fetchUserCombos = async () => {
    if (!playerId) return

    try {
      // Try multiple approaches to fetch user combos
      let userCombos: Combo[] = []

      // Approach 1: Direct query using created_by (most reliable)
      const { data: directData, error: directError } = await supabase
        .from('combos')
        .select('*')
        .or(`created_by.eq.${playerId},player_id.eq.${playerId}`)
        .order('created_at', { ascending: false })

      if (!directError && directData) {
        userCombos = directData as Combo[]
      } else {
        // Approach 2: Try player_combos table
        const { data: playerCombosData, error: playerCombosError } = await supabase
          .from('player_combos')
          .select('combo_id')
          .eq('player_id', playerId)

        if (!playerCombosError && playerCombosData && playerCombosData.length > 0) {
          const comboIds = playerCombosData.map(pc => pc.combo_id)
          const { data: combosData, error: combosError } = await supabase
            .from('combos')
            .select('*')
            .in('combo_id', comboIds)
            .order('created_at', { ascending: false })

          if (!combosError && combosData) {
            userCombos = combosData as Combo[]
          }
        }
      }

      setCombos(userCombos)
    } catch (error) {
      console.error('Error fetching user combos:', error)
      setCombos([])
    }
  }

  // ======================================================
  // 🔧 Fonctions Combo Builder
  // ======================================================
  const handleBeyPieceSelect = (
    type: BeyPieceKey,
    value: string,
    pieceType?: string
  ) => {
    setCurrentCombo(prev => {
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

      // Generate auto name
      const name = generateComboName(newCombo)
      setComboName(name)
      if (!customName || customName === 'Nouveau Combo') {
        setCustomName(name)
      }

      return newCombo
    })
  }

  const handleBeyCxChange = (value: boolean) => {
    setCurrentCombo(prev => {
      const newCombo = { ...prev, cx: value }
      const name = generateComboName(newCombo)
      setComboName(name)
      if (!customName || customName === 'Nouveau Combo') {
        setCustomName(name)
      }
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

    return 'Nouveau Combo'
  }

  const validateCombo = (): boolean => {
    if (currentCombo.cx) {
      if (!currentCombo.lockChip || !currentCombo.blade || !currentCombo.assist || !currentCombo.ratchet || !currentCombo.bit) {
        alert('Combo CX incomplet ! Toutes les pièces sont requises.')
        return false
      }
    } else {
      if (!currentCombo.blade || !currentCombo.ratchet || !currentCombo.bit) {
        alert('Combo incomplet ! Blade, Ratchet et Bit sont requis.')
        return false
      }
    }

    if (!customName.trim()) {
      alert('Veuillez donner un nom à votre combo !')
      return false
    }

    return true
  }

  const saveCombo = async (): Promise<string | null> => {
    if (!validateCombo()) return null

    try {
      const comboData = {
        blade_id: currentCombo.blade,
        ratchet_id: currentCombo.ratchet,
        bit_id: currentCombo.bit,
        assist_id: currentCombo.assist || null,
        lock_chip_id: currentCombo.lockChip || null,
        name: customName,
        created_by: playerId,
        player_id: playerId, // Support both field names
      }

      let comboId: string

      if (editingCombo) {
        // Update existing combo - ensure user owns this combo
        const { data, error } = await supabase
          .from('combos')
          .update(comboData)
          .eq('combo_id', editingCombo.combo_id)
          .or(`created_by.eq.${playerId},player_id.eq.${playerId}`)
          .select()
          .single()

        if (error) throw error
        if (!data) throw new Error('Combo not found or access denied')
        
        comboId = editingCombo.combo_id
      } else {
        // Create new combo
        const { data, error } = await supabase
          .from('combos')
          .insert(comboData)
          .select()
          .single()

        if (error) throw error
        comboId = data.combo_id
      }

      await fetchUserCombos()
      resetComboBuilder()
      setMode('view')
      
      alert(editingCombo ? 'Combo modifié avec succès !' : 'Combo créé avec succès !')
      return comboId
    } catch (error) {
      console.error('Error saving combo:', error)
      alert('Erreur lors de la sauvegarde du combo')
      return null
    }
  }

  const deleteCombo = async (comboId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce combo ?')) return

    try {
      // Delete the combo ensuring ownership
      const { error: deleteError } = await supabase
        .from('combos')
        .delete()
        .eq('combo_id', comboId)
        .or(`created_by.eq.${playerId},player_id.eq.${playerId}`)

      if (deleteError) throw deleteError

      await fetchUserCombos()
      alert('Combo supprimé avec succès !')
    } catch (error) {
      console.error('Error deleting combo:', error)
      alert('Erreur lors de la suppression du combo')
    }
  }

  const startEditCombo = (combo: Combo) => {
    setEditingCombo(combo)
    setCurrentCombo({
      cx: !!(combo.assist_id && combo.lock_chip_id),
      blade: combo.blade_id,
      ratchet: combo.ratchet_id,
      bit: combo.bit_id,
      assist: combo.assist_id || undefined,
      lockChip: combo.lock_chip_id || undefined,
    })
    setCustomName(combo.name)
    setComboName(combo.name)
    setMode('edit')
  }

  const resetComboBuilder = () => {
    setCurrentCombo({ cx: false })
    setComboName('')
    setCustomName('')
    setEditingCombo(null)
  }

  const cancelEdit = () => {
    resetComboBuilder()
    setMode('view')
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
  // 🎨 UI Components
  // ======================================================
  const renderComboBuilder = () => (
    <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 border border-pink-500 shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-pink-300">
        {editingCombo ? '✏️ Modifier le Combo' : '🚀 Créer un Nouveau Combo'}
      </h2>

      {/* Combo Name */}
      <div className="mb-6">
        <label className="block mb-2 font-semibold text-pink-300">Nom du Combo :</label>
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Donnez un nom à votre combo..."
          className="w-full p-3 bg-gray-900 border border-pink-600 rounded-lg text-white"
        />
        <p className="mt-1 text-sm text-gray-400">
          Nom auto-généré: <span className="text-pink-300">{comboName}</span>
        </p>
      </div>

      {/* CX Toggle */}
      <div className="mb-6 flex items-center gap-2">
        <label className="font-semibold text-pink-300">Système CX ?</label>
        <input
          type="checkbox"
          checked={currentCombo.cx}
          onChange={e => handleBeyCxChange(e.target.checked)}
          className="w-5 h-5 accent-pink-500"
        />
      </div>

      {/* Piece Selection */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {(currentCombo.cx
          ? [
              { key: 'lockChip' as BeyPieceKey, options: lockChips, label: '🔒 Lock Chip' },
              { key: 'blade' as BeyPieceKey, options: blades, label: '⚔️ Blade' },
              { key: 'assist' as BeyPieceKey, options: assists, label: '🛡️ Assist' },
              { key: 'ratchet' as BeyPieceKey, options: ratchets, label: '⚙️ Ratchet' },
              { key: 'bit' as BeyPieceKey, options: bits, label: '🎯 Bit' },
            ]
          : [
              { key: 'blade' as BeyPieceKey, options: blades, label: '⚔️ Blade' },
              { key: 'ratchet' as BeyPieceKey, options: ratchets, label: '⚙️ Ratchet' },
              { key: 'bit' as BeyPieceKey, options: bits, label: '🎯 Bit' },
            ]
        ).map(({ key, options, label }) => {
          const selectedValue = currentCombo[key] ?? ''

          return (
            <div key={key}>
              <label className="block mb-2 font-semibold text-pink-300">{label}</label>
              <Select
                onValueChange={v => handleBeyPieceSelect(key, v)}
                value={selectedValue}
              >
                <SelectTrigger className="bg-gray-900 border border-pink-600">
                  <SelectValue placeholder={`Sélectionner un ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 text-white max-h-60">
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
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={saveCombo}
          disabled={!customName.trim()}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold"
        >
          💾 {editingCombo ? 'Modifier le Combo' : 'Créer le Combo'}
        </Button>
        <Button
          onClick={cancelEdit}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl font-bold"
        >
          ❌ Annuler
        </Button>
      </div>
    </div>
  )

  const renderCombosList = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-300">📋 Mes Combos</h2>
        <Button
          onClick={() => setMode('create')}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          ➕ Nouveau Combo
        </Button>
      </div>

      {combos.length === 0 ? (
        <div className="text-center p-8 bg-gray-800 rounded-xl border border-blue-500">
          <p className="text-gray-400 text-lg">Aucun combo enregistré</p>
          <p className="text-gray-500">Créez votre premier combo pour commencer !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map((combo) => (
            <div
              key={combo.combo_id}
              className="p-4 bg-gray-800 rounded-xl border border-green-500 hover:border-green-400 transition-all"
            >
              <h3 className="font-bold text-lg mb-2 text-green-300 truncate">{combo.name}</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>• Blade: {blades.find(b => b.blade_id === combo.blade_id)?.name || 'Inconnu'}</p>
                <p>• Ratchet: {ratchets.find(r => r.ratchet_id === combo.ratchet_id)?.name || 'Inconnu'}</p>
                <p>• Bit: {bits.find(b => b.bit_id === combo.bit_id)?.name || 'Inconnu'}</p>
                {combo.assist_id && (
                  <p>• Assist: {assists.find(a => a.assist_id === combo.assist_id)?.name || 'Inconnu'}</p>
                )}
                {combo.lock_chip_id && (
                  <p>• Lock Chip: {lockChips.find(l => l.lock_chip_id === combo.lock_chip_id)?.name || 'Inconnu'}</p>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => startEditCombo(combo)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  ✏️ Modifier
                </Button>
                <Button
                  onClick={() => deleteCombo(combo.combo_id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm"
                >
                  🗑️ Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ======================================================
  // 🎨 Main UI
  // ======================================================
  if (loading) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        <MainMenuButton />
        <p>Chargement...</p>
      </main>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl shadow-2xl">
      <div className="mb-6 flex justify-between items-center">
        <MainMenuButton />
        <h1 className="text-4xl font-extrabold text-center tracking-wide text-purple-400">
          🎯 Gestion des Combos
        </h1>
        <div className="w-12"></div> {/* Spacer for balance */}
      </div>

      <p className="text-center text-gray-300 mb-8">
        Créez et gérez vos combos personnalisés pour les utiliser dans les tournois
      </p>

      {mode === 'view' ? renderCombosList() : renderComboBuilder()}
    </div>
  )
}
