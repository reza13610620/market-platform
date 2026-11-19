import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Package, Send, Filter, Sparkles, XCircle } from 'lucide-react'

export default function PoolPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [pool, setPool] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onlyMySupply, setOnlyMySupply] = useState(false)
  const [cityFilter, setCityFilter] = useState<'all' | 'my'>('all')
  const [timeFilter, setTimeFilter] = useState<'all' | 'today'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'single' | 'bulk'>('all')
  const [offerPrice, setOfferPrice] = useState<{ [key: number]: string }>({})
  const [submitting, setSubmitting] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)

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
  }, [onlyMySupply, cityFilter, timeFilter, typeFilter])

  const fetchPool = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '30',
        only_my_supply: onlyMySupply ? '1' : '0',
        city: cityFilter,
        time: timeFilter,
        type: typeFilter,
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

  const cancelOffer = async (offerId: number) => {
    const confirmed = confirm(
      'آیا مطمئن هستید؟\n\nبا لغو این پیشنهاد:\n• محدودیت موقت ثبت پیشنهاد جدید\n• کاهش امتیاز اعتبار\n\nاین عمل قابل برگشت نیست.'
    )
    if (!confirmed) return

    setCancelling(offerId)
    try {
      const res = await fetch(`/api/offers/${offerId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (res.ok) {
        alert(data.message || 'پیشنهاد لغو شد')
        await fetchPool()
      } else {
        alert(data.error || 'خطا در لغو پیشنهاد')
      }
    } catch {
      alert('ارتباط با سرور برقرار نشد')
    } finally {
      setCancelling(null)
    }
  }

  const chip = (active: boolean) =>
    active
      ? softClass + ' border'
      : 'bg-white text-calm-600 border-calm-200 hover:bg-calm-50'

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-calm-800">استخر درخواست‌ها</h1>
          <p className="text-sm text-calm-400 mt-1">
            درخواست‌های باز را ببینید و پیشنهاد قیمت ثبت کنید
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOnlyMySupply(!onlyMySupply)}
            className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium border transition-all ${chip(onlyMySupply)}`}
          >
            {onlyMySupply ? <Sparkles size={15} /> : <Filter size={15} />}
            {onlyMySupply ? 'فقط لیست تأمین' : 'همه'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium border transition-all ${chip(showFilters)}`}
          >
            <Filter size={15} />
            فیلترها
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-calm-400 w-14">شهر:</span>
            <button onClick={() => setCityFilter('all')} className={`px-3 py-1.5 rounded-xl text-xs border ${chip(cityFilter === 'all')}`}>همه</button>
            <button onClick={() => setCityFilter('my')} className={`px-3 py-1.5 rounded-xl text-xs border ${chip(cityFilter === 'my')}`}>شهر من</button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-calm-400 w-14">زمان:</span>
            <button onClick={() => setTimeFilter('all')} className={`px-3 py-1.5 rounded-xl text-xs border ${chip(timeFilter === 'all')}`}>همه</button>
            <button onClick={() => setTimeFilter('today')} className={`px-3 py-1.5 rounded-xl text-xs border ${chip(timeFilter === 'today')}`}>امروز</button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-calm-400 w-14">نوع:</span>
            <button onClick={() => setTypeFilter('all')} className={`px-3 py-1.5 rounded-xl text-xs border ${chip(typeFilter === 'all')}`}>همه</button>
            <button onClick={() => setTypeFilter('single')} className={`px-3 py-1.5 rounded-xl text-xs border ${chip(typeFilter === 'single')}`}>تکی</button>
            <button onClick={() => setTypeFilter('bulk')} className={`px-3 py-1.5 rounded-xl text-xs border ${chip(typeFilter === 'bulk')}`}>عمده</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-calm-400 py-16">در حال بارگذاری...</div>
      ) : pool.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-calm-400 text-sm">
            {onlyMySupply
              ? 'درخواستی مرتبط با لیست تأمین شما پیدا نشد'
              : 'در حال حاضر درخواست بازی با این فیلتر وجود ندارد'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {pool.map((req) => (
            <div key={req.id} className="card p-5">
              <div className="flex flex-wrap gap-2 mb-3">
                {req.matches_my_supply && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${softClass}`}>
                    <Sparkles size={12} />
                    مرتبط با لیست شما
                  </span>
                )}
                {req.is_bulk && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700">
                    عمده
                  </span>
                )}
              </div>

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
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-green-50 text-green-700 text-sm font-medium">
                    پیشنهاد شما: {Number(req.my_offer.price).toLocaleString('fa-IR')} تومان
                  </div>
                  <button
                    onClick={() => cancelOffer(req.my_offer.id)}
                    disabled={cancelling === req.my_offer.id}
                    className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
                  >
                    <XCircle size={15} />
                    {cancelling === req.my_offer.id ? '...' : 'لغو پیشنهاد'}
                  </button>
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
