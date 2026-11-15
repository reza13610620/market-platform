import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ArrowRight, Star, Clock, Eye, Phone, MapPin, Shield, AlertCircle, Zap } from 'lucide-react'

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
  const [confirmOfferId, setConfirmOfferId] = useState<number | null>(null)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  const softClass =
    theme === 'female'
      ? 'bg-female-50 text-female-700 border-female-100'
      : theme === 'male'
      ? 'bg-male-50 text-male-700 border-male-100'
      : 'bg-teal-50 text-teal-700 border-teal-100'

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

  const handleRevealClick = (offerId: number) => {
    setError('')

    // If quota is 0, show upgrade message instead of calling API
    if (quota === 0) {
      setError('سهمیه مشاهده اطلاعات تماس شما تمام شده است. برای ادامه، پلن خود را ارتقا دهید.')
      return
    }

    // Show confirmation if quota is low (1 or 2 remaining)
    if (quota !== null && quota <= 2) {
      setConfirmOfferId(offerId)
      return
    }

    // Normal case → reveal directly
    doReveal(offerId)
  }

  const doReveal = async (offerId: number) => {
    setConfirmOfferId(null)
    setRevealing(offerId)
    setError('')

    try {
      const res = await fetch(`/api/offers/${offerId}/reveal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'NO_QUOTA') {
          setError('سهمیه مشاهده اطلاعات تماس شما تمام شده است. لطفاً پلن خود را ارتقا دهید.')
          setQuota(0)
        } else {
          setError(data.error || 'خطا در نمایش اطلاعات')
        }
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-calm-500">در حال بارگذاری پیشنهادها...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/requests')}
          className="p-2 rounded-xl hover:bg-calm-100 transition-colors"
        >
          <ArrowRight size={22} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-calm-800">پیشنهادهای رسیده</h1>
          <p className="text-sm text-calm-500">{offers.length} پیشنهاد فعال</p>
        </div>
      </div>

      {/* Quota Banner */}
      <div className={`card p-4 flex items-center justify-between border ${softClass}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-sm font-medium">
              {quota === null
                ? 'سهمیه نامحدود'
                : quota === 0
                ? 'سهمیه تمام شده'
                : `${quota.toLocaleString('fa-IR')} سهمیه باقی‌مانده`}
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              برای دیدن اطلاعات تماس فروشنده استفاده می‌شود
            </div>
          </div>
        </div>
        {quota !== null && quota <= 3 && (
          <button
            onClick={() => navigate('/wallet')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white transition-colors"
          >
            ارتقای پلن
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Confirmation Modal (when quota is low) */}
      {confirmOfferId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-soft-lg space-y-4">
            <h3 className="font-bold text-calm-800 text-lg">تأیید مشاهده اطلاعات</h3>
            <p className="text-sm text-calm-600 leading-relaxed">
              با مشاهده اطلاعات این فروشنده،{' '}
              <strong>یک واحد از سهمیه</strong> شما کم می‌شود.
              {quota !== null && (
                <>
                  <br />
                  سهمیه فعلی شما: <strong>{quota}</strong>
                </>
              )}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmOfferId(null)}
                className="btn-secondary flex-1"
              >
                انصراف
              </button>
              <button
                onClick={() => doReveal(confirmOfferId)}
                className={`btn-primary flex-1 text-white ${primaryClass}`}
              >
                تأیید و مشاهده
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offers List */}
      {offers.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-calm-400 text-sm">هنوز پیشنهادی برای این درخواست ثبت نشده</div>
          <p className="text-xs text-calm-400 mt-2">فروشندگان به‌زودی قیمت خواهند داد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer, index) => {
            const seller = revealed[offer.id]
            const isRevealed = !!seller

            return (
              <div key={offer.id} className="card overflow-hidden">
                {index === 0 && (
                  <div className={`px-4 py-1.5 text-xs font-medium border-b ${softClass}`}>
                    ★ کمترین قیمت
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-2xl font-bold text-calm-800 tracking-tight">
                        {offer.price.toLocaleString('fa-IR')}
                        <span className="text-sm font-normal text-calm-500 mr-1.5">تومان</span>
                      </div>

                      <div className="flex items-center gap-4 mt-2.5 text-sm text-calm-500">
                        <span className="flex items-center gap-1">
                          <Star size={15} className="text-amber-400 fill-amber-400" />
                          {offer.seller_reputation}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={15} />
                          تا {new Date(offer.valid_until).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                    </div>

                    {!isRevealed ? (
                      <button
                        onClick={() => handleRevealClick(offer.id)}
                        disabled={revealing === offer.id || quota === 0}
                        className={`btn-primary text-white text-sm shrink-0 ${primaryClass} ${
                          quota === 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Eye size={16} />
                        {revealing === offer.id ? '...' : 'نمایش اطلاعات'}
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium shrink-0">
                        مشاهده شده
                      </div>
                    )}
                  </div>

                  {/* Revealed Seller Info */}
                  {isRevealed && (
                    <div className="mt-5 p-4 rounded-xl bg-green-50 border border-green-100 space-y-3">
                      <div className="flex items-center gap-2 text-green-800 font-medium text-sm">
                        <Shield size={16} />
                        اطلاعات فروشنده نمایش داده شد
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-green-600" />
                        <span className="font-bold text-calm-800 text-lg" dir="ltr">
                          {seller.phone}
                        </span>
                      </div>

                      {(seller.first_name || seller.last_name) && (
                        <div className="text-sm text-calm-700">
                          {seller.first_name} {seller.last_name}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-calm-500">
                        {seller.city_name && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {seller.city_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star size={14} className="text-amber-400" />
                          امتیاز: {seller.reputation_score}
                        </span>
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
