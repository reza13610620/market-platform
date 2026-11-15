import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Package, Send } from 'lucide-react'

export default function PoolPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [pool, setPool] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [offerPrice, setOfferPrice] = useState<{ [key: number]: string }>({})
  const [submitting, setSubmitting] = useState<number | null>(null)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  useEffect(() => {
    fetchPool()
  }, [])

  const fetchPool = async () => {
    try {
      const res = await fetch('/api/pool', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setPool(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  const submitOffer = async (requestId: number) => {
    const price = Number(offerPrice[requestId])
    if (!price || price <= 0) return

    setSubmitting(requestId)
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          price,
          quantity: 1,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        // Refresh pool
        await fetchPool()
        setOfferPrice({ ...offerPrice, [requestId]: '' })
      } else {
        alert(data.error || 'خطا در ثبت پیشنهاد')
      }
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return <div className="text-center text-calm-500 py-20">در حال بارگذاری...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-calm-800">استخر درخواست‌ها</h1>
      <p className="text-sm text-calm-500">درخواست‌های باز را ببینید و پیشنهاد قیمت ثبت کنید</p>

      {pool.length === 0 ? (
        <div className="card p-12 text-center text-calm-400">
          در حال حاضر درخواست بازی وجود ندارد
        </div>
      ) : (
        <div className="space-y-4">
          {pool.map((req) => (
            <div key={req.id} className="card p-5">
              <div className="flex flex-wrap gap-2 mb-3">
                {req.items?.map((item: any) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-calm-50 text-sm text-calm-700"
                  >
                    <Package size={14} />
                    {item.title_snapshot}
                    {item.quantity > 1 && ` × ${item.quantity}`}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs text-calm-400 mb-4">
                {req.city_name && <span>{req.city_name}</span>}
                <span>{new Date(req.created_at).toLocaleDateString('fa-IR')}</span>
              </div>

              {req.my_offer ? (
                <div className="p-3 rounded-xl bg-green-50 text-green-700 text-sm">
                  پیشنهاد شما ثبت شده: {req.my_offer.price.toLocaleString('fa-IR')} تومان
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="number"
                    className="input flex-1"
                    placeholder="قیمت پیشنهادی (تومان)"
                    value={offerPrice[req.id] || ''}
                    onChange={(e) =>
                      setOfferPrice({ ...offerPrice, [req.id]: e.target.value })
                    }
                  />
                  <button
                    onClick={() => submitOffer(req.id)}
                    disabled={submitting === req.id}
                    className={`btn-primary text-white ${primaryClass}`}
                  >
                    <Send size={18} />
                    {submitting === req.id ? '...' : 'پیشنهاد'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
