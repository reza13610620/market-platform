import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ArrowRight, Star, Clock, Eye, Phone, MapPin, Shield } from 'lucide-react'

interface Offer {
  id: number
  price: number
  quantity: number
  valid_until: string
  status: string
  created_at: string
  seller_reputation: number
}

interface RevealedSeller {
  phone: string
  first_name: string | null
  last_name: string | null
  city_name: string | null
  reputation_score: number
}

export default function RequestOffersPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [revealing, setRevealing] = useState<number | null>(null)
  const [revealed, setRevealed] = useState<{ [offerId: number]: RevealedSeller }>({})
  const [error, setError] = useState('')
  const [quota, setQuota] = useState<number | null>(null)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  const softClass =
    theme === 'female'
      ? 'bg-female-50 text-female-700'
      : theme === 'male'
      ? 'bg-male-50 text-male-700'
      : 'bg-teal-50 text-teal-700'

  useEffect(() => {
    if (id) {
      fetchOffers()
      fetchQuota()
    }
  }, [id])

  const fetchOffers = async () => {
    try {
      const res = await fetch(`/api/requests/${id}/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setOffers(data.data || [])
      } else {
        setError(data.error || 'خطا در دریافت پیشنهادها')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchQuota = async () => {
    const res = await fetch('/api/contact/quota', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.success) setQuota(data.data.remaining_quota)
  }

  const handleReveal = async (offerId: number) => {
    setError('')
    setRevealing(offerId)

    try {
      const res = await fetch(`/api/offers/${offerId}/reveal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'خطا در نمایش اطلاعات')
        return
      }

      setRevealed((prev) => ({
        ...prev,
        [offerId]: data.data.seller,
      }))

      if (data.data.remaining_quota !== undefined) {
        setQuota(data.data.remaining_quota)
      }
    } catch {
      setError('ارتباط با سرور برقرار نشد')
    } finally {
      setRevealing(null)
    }
  }

  if (loading) {
    return <div className="text-center text-calm-500 py-20">در حال بارگذاری پیشنهادها...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/requests')}
          className="p-2 rounded-xl hover:bg-calm-100 transition-colors"
        >
          <ArrowRight size={22} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-calm-800">پیشنهادهای رسیده</h1>
          <p className="text-sm text-calm-500">
            {offers.length} پیشنهاد فعال
            {quota !== null && (
              <span className="mr-2">• سهمیه باقی‌مانده: {quota}</span>
            )}
            {quota === null && <span className="mr-2">• سهمیه نامحدود</span>}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>
      )}

      {offers.length === 0 ? (
        <div className="card p-12 text-center text-calm-400">
          هنوز پیشنهادی برای این درخواست ثبت نشده
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer, index) => {
            const seller = revealed[offer.id]
            const isRevealed = !!seller

            return (
              <div key={offer.id} className="card overflow-hidden">
                {/* Rank badge for cheapest */}
                {index === 0 && (
                  <div className={`px-4 py-1.5 text-xs font-medium ${softClass}`}>
                    کمترین قیمت
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-2xl font-bold text-calm-800">
                        {offer.price.toLocaleString('fa-IR')}
                        <span className="text-sm font-normal text-calm-500 mr-1">تومان</span>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-sm text-calm-500">
                        <span className="flex items-center gap-1">
                          <Star size={14} className="text-amber-400" />
                          {offer.seller_reputation}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          تا {new Date(offer.valid_until).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                    </div>

                    {!isRevealed ? (
                      <button
                        onClick={() => handleReveal(offer.id)}
                        disabled={revealing === offer.id}
                        className={`btn-primary text-white text-sm ${primaryClass}`}
                      >
                        <Eye size={16} />
                        {revealing === offer.id ? '...' : 'نمایش اطلاعات'}
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium">
                        مشاهده شده
                      </div>
                    )}
                  </div>

                  {/* Revealed Seller Info */}
                  {isRevealed && (
                    <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-100 space-y-2">
                      <div className="flex items-center gap-2 text-green-800 font-medium text-sm">
                        <Shield size={16} />
                        اطلاعات فروشنده
                      </div>

                      <div className="flex items-center gap-2 text-calm-800">
                        <Phone size={16} className="text-calm-400" />
                        <span className="font-semibold" dir="ltr">
                          {seller.phone}
                        </span>
                      </div>

                      {(seller.first_name || seller.last_name) && (
                        <div className="text-sm text-calm-700">
                          {seller.first_name} {seller.last_name}
                        </div>
                      )}

                      {seller.city_name && (
                        <div className="flex items-center gap-1 text-sm text-calm-500">
                          <MapPin size={14} />
                          {seller.city_name}
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-sm text-calm-500">
                        <Star size={14} className="text-amber-400" />
                        امتیاز اعتبار: {seller.reputation_score}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
