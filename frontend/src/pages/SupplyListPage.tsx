import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Package, Trash2 } from 'lucide-react'

export default function SupplyListPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    try {
      const res = await fetch('/api/supply', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setList(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  const removeItem = async (productId: number) => {
    if (!confirm('آیا از حذف این کالا مطمئن هستید؟')) return

    const res = await fetch(`/api/supply/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.ok) {
      setList(list.filter((i) => i.product_id !== productId))
    }
  }

  if (loading) {
    return <div className="text-center text-calm-500 py-20">در حال بارگذاری...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-calm-800">لیست تأمین من</h1>
          <p className="text-sm text-calm-500 mt-1">
            کالاهایی که می‌توانید تأمین کنید
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card p-12 text-center text-calm-400">
          هنوز کالایی به لیست تأمین اضافه نکرده‌اید
          <p className="text-sm mt-2">
            (قابلیت جستجو و افزودن کالا به‌زودی کامل‌تر می‌شود)
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <div key={item.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${primaryClass}`}>
                  <Package size={20} />
                </div>
                <div>
                  <div className="font-medium text-calm-800">{item.title}</div>
                  {item.brand && (
                    <div className="text-xs text-calm-400">{item.brand}</div>
                  )}
                  {item.notes && (
                    <div className="text-xs text-calm-500 mt-0.5">{item.notes}</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeItem(item.product_id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
