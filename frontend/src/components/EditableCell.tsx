import React, { useState } from 'react'
import { Check, X } from 'lucide-react'

type Props = {
  value: string | number
  onChange: (val: string) => void
  source?: string
}

export default function EditableCell({ value, onChange, source }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))

  const handleSave = () => {
    onChange(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(String(value))
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
        />
        <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={handleCancel} className="p-1 text-red-600 hover:bg-red-50 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  const cellStyle =
    source === 'annotated'
      ? 'bg-green-100 border-l-4 border-green-600 text-green-900'
      : source === 'estimated'
      ? 'bg-amber-100 border-l-4 border-amber-500 text-amber-900'
      : 'bg-white'

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`px-3 py-1.5 cursor-pointer hover:opacity-80 rounded-r font-medium ${cellStyle}`}
      title={source ? `Source: ${source}` : 'Click to edit'}
    >
      {value}
    </div>
  )
}
