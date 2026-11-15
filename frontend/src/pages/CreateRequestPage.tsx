import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Plus, Trash2 } from 'lucide-react'

interface Item {
  title: string
  quantity: number
  notes: string
}

export default function CreateRequestPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [city, setCity] = useState('')
  const [items, setItems] = useState<Item[]>([{ title: '', quantity: 1, notes: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  const addItem = () => {
    setItems([...items, { title: '', quantity: 1, notes: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async () => {
    setError('')
    const validItems = items.filter((i) => i.title.trim().length >= 2)
    if (validItems.length === 0) {
      setError('حداقل یک کالا با عنوان معتبر وارد کنید')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city_name: city || null,
          items: validItems.map((i) => ({
            title: i.title.trim(),
            quantity: i.quantity || 1,
            notes: i.notes || null,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'خطا در ثبت درخواست')
        return
      }

      navigate('/requests')
    } catch {
      setError('ارتباط با سرور برقرار نشد')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-calm-800">ثبت درخواست کالا</h1>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>
      )}

      <div className="card p-6 space-y-5">
        <div>
          <label className="text-sm text-calm-600 mb-1 block">شهر (اختیاری)</label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="مثلاً تهران"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-calm-700">کالاها</label>
            <button onClick={addItem} className="btn-secondary text-sm py-1.5">
              <Plus size={16} />
              افزودن کالا
            </button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="p-4 rounded-xl bg-calm-50 border border-calm-100 space-y-3">
              <div className="flex gap-3">
                <input
                  className="input flex-1"
                  placeholder="نام کالا"
                  value={item.title}
                  onChange={(e) => updateItem(index, 'title', e.target.value)}
                />
                <input
                  type="number"
                  className="input w-24"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                />
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <input
                className="input"
                placeholder="توضیحات (اختیاری)"
                value={item.notes}
                onChange={(e) => updateItem(index, 'notes', e.target.value)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`btn-primary w-full text-white ${primaryClass}`}
        >
          {loading ? 'در حال ثبت...' : 'ثبت درخواست'}
        </button>
      </div>
    </div>
  )
}
