import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Package, Send, Filter, Sparkles } from 'lucide-react'

export default function PoolPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [pool, setPool] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onlyMySupply, setOnlyMySupply] = useState(false)
  const [offerPrice, setOfferPrice] = useState<{ [key: number]: string }>({})
  const [submitting, setSubmitting] = useState<number | null>(null)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  const softClass =
    theme === 'female'
      ? 'bg-female-50 text-female-700 border-female-200'
      : theme === 'male'
      ? 'bg-male-50 text-male-700 border-male-200'
      : 'bg-teal-50 text-teal-700 border-teal-200'

  useEffect(() => {
    fetchPool()
  }, [onlyMySupply])

  const fetchPool = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '30',
        only_my_supply: onlyMySupply ? '1' : '0',
      })
      const res = await fetch(`/api/pool?${params}`, {
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
        await fetchPool()
        setOfferPrice({ ...offerPrice, [requestId]: '' })
      } else {
        alert(data.error || 'خطا در ثبت پیشنهاد')
      }
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-calm-800">استخر درخواست‌ها</h1>
          <p className="text-sm text-calm-400 mt-1">
            درخواست‌های باز را ببینید و پیشنهاد قیمت ثبت کنید
          </p>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setOnlyMySupply(!onlyMySupply)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium border transition-all ${
            onlyMySupply
              ? softClass + ' border'
              : 'bg-white text-calm-600 border-calm-200 hover:bg-calm-50'
          }`}
        >
          {onlyMySupply ? <Sparkles size={16} /> : <Filter size={16} />}
          {onlyMySupply ? 'فقط لیست تأمین من' : 'همه درخواست‌ها'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-calm-400 py-16">در حال بارگذاری...</div>
      ) : pool.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-calm-400 text-sm">
            {onlyMySupply
              ? 'درخواستی مرتبط با لیست تأمین شما پیدا نشد'
              : 'در حال حاضر درخواست بازی وجود ندارد'}
          </div>
          {onlyMySupply && (
            <button
              onClick={() => setOnlyMySupply(false)}
              className="btn-secondary mt-4 text-sm"
            >
              نمایش همه درخواست‌ها
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pool.map((req) => (
            <div key={req.id} className="card p-5">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {req.matches_my_supply && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${softClass}`}>
                    <Sparkles size={12} />
                    مرتبط با لیست شما
                  </span>
                )}
                {req.is_bulk && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700">
                    درخواست چندکالایی
                  </span>
                )}
              </div>

              {/* Items */}
              <div className="flex flex-wrap gap-2 mb-3">
                {req.items?.map((item: any) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-calm-50 text-sm text-calm-700"
                  >
                    <Package size={13} className="text-calm-400" />
                    {item.title_snapshot}
                    {item.quantity > 1 && (
                      <span className="text-calm-400">× {item.quantity}</span>
                    )}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs text-calm-400 mb-4">
                {req.city_name && <span>{req.city_name}</span>}
                <span>{new Date(req.created_at).toLocaleDateString('fa-IR')}</span>
              </div>

              {req.my_offer ? (
                <div className="p-3.5 rounded-2xl bg-green-50 text-green-700 text-sm font-medium">
                  پیشنهاد شما ثبت شده: {Number(req.my_offer.price).toLocaleString('fa-IR')} تومان
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
                    className={`btn-primary text-white shrink-0 ${primaryClass}`}
                  >
                    <Send size={16} />
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
