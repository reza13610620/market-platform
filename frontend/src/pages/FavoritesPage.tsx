import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Heart, Trash2, Package } from 'lucide-react'

export default function FavoritesPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<number | null>(null)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  useEffect(() => {
    fetchList()
  }, [])

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setList(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  const remove = async (productId: number) => {
    setRemoving(productId)
    try {
      await fetch(`/api/favorites/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setList((prev) => prev.filter((x) => x.product_id !== productId))
    } finally {
      setRemoving(null)
    }
  }

  if (loading) {
    return <div className="text-center text-calm-400 py-20">در حال بارگذاری...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-calm-800 flex items-center gap-2">
          <Heart size={22} className="text-rose-500" />
          علاقه‌مندی‌ها
        </h1>
        <p className="text-sm text-calm-400 mt-1">کالاهایی که علامت زده‌اید</p>
      </div>

      {list.length === 0 ? (
        <div className="card p-12 text-center text-sm text-calm-400">
          هنوز کالایی به علاقه‌مندی‌ها اضافه نکرده‌اید.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <div key={item.product_id} className="card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-calm-50 flex items-center justify-center shrink-0">
                  <Package size={18} className="text-calm-400" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-calm-800 truncate">{item.title}</div>
                  {item.brand && (
                    <div className="text-xs text-calm-400">{item.brand}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => remove(item.product_id)}
                disabled={removing === item.product_id}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                title="حذف"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
