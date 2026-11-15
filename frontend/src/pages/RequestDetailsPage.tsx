import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  ArrowRight,
  Star,
  Clock,
  Eye,
  Phone,
  MapPin,
  Shield,
  AlertCircle,
  Package,
  Calendar,
  CheckCircle2,
  Circle,
  Zap
} from 'lucide-react'

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

interface RequestItem {
  id: number
  title_snapshot: string
  quantity: number
  notes: string | null
}

interface RequestData {
  id: number
  city_name: string | null
  is_bulk: boolean
  status: string
  expires_at: string
  created_at: string
  items: RequestItem[]
  active_offers_count: number
}

const statusMap: Record<string, { label: string; color: string }> = {
  open: { label: 'باز', color: 'bg-green-50 text-green-700 border-green-100' },
  matched: { label: 'تطبیق یافته', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  cancelled: { label: 'لغو شده', color: 'bg-red-50 text-red-600 border-red-100' },
  expired: { label: 'منقضی شده', color: 'bg-calm-100 text-calm-500 border-calm-200' },
  completed: { label: 'تکمیل شده', color: 'bg-teal-50 text-teal-700 border-teal-100' },
}

export default function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [request, setRequest] = useState<RequestData | null>(null)
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
      fetchAll()
    }
  }, [id])

  const fetchAll = async () => {
    setLoading(true)
    try {
      // Fetch buyer's requests to find this one
      const reqRes = await fetch('/api/requests/my', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const reqData = await reqRes.json()
      if (reqData.success) {
        const found = (reqData.data || []).find((r: any) => r.id === Number(id))
        if (found) setRequest(found)
      }

      // Fetch offers
      const offersRes = await fetch(`/api/requests/${id}/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const offersData = await offersRes.json()
      if (offersData.success) setOffers(offersData.data || [])

      // Quota
      const quotaRes = await fetch('/api/contact/quota', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const quotaData = await quotaRes.json()
      if (quotaData.success) setQuota(quotaData.data.remaining_quota)
    } catch {
      setError('خطا در بارگذاری اطلاعات')
    } finally {
      setLoading(false)
    }
  }

  const handleRevealClick = (offerId: number) => {
    setError('')
    if (quota === 0) {
      setError('سهمیه مشاهده اطلاعات تماس شما تمام شده است. برای ادامه، پلن خود را ارتقا دهید.')
      return
    }
    if (quota !== null && quota <= 2) {
      setConfirmOfferId(offerId)
      return
    }
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
          setError('سهمیه مشاهده اطلاعات تماس شما تمام شده است.')
          setQuota(0)
        } else {
          setError(data.error || 'خطا در نمایش اطلاعات')
        }
        return
      }

      setRevealed((prev) => ({ ...prev, [offerId]: data.data.seller }))
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
        <div className="text-calm-500">در حال بارگذاری...</div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-calm-500">درخواست یافت نشد</p>
        <button onClick={() => navigate('/requests')} className="btn-secondary mt-4">
          بازگشت
        </button>
      </div>
    )
  }

  const statusInfo = statusMap[request.status] || {
    label: request.status,
    color: 'bg-calm-100 text-calm-600',
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
          <h1 className="text-xl font-bold text-calm-800">جزئیات درخواست</h1>
          <p className="text-sm text-calm-400">شماره درخواست: {request.id}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Request Info Card */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {request.items?.map((item) => (
            <div
              key={item.id}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-calm-50 text-sm text-calm-700"
            >
              <Package size={15} className="text-calm-400" />
              <span>{item.title_snapshot}</span>
              {item.quantity > 1 && (
                <span className="text-calm-400">× {item.quantity}</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-calm-500 pt-1">
          {request.city_name && (
            <span className="flex items-center gap-1.5">
              <MapPin size={15} />
              {request.city_name}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar size={15} />
            ثبت: {new Date(request.created_at).toLocaleDateString('fa-IR')}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={15} />
            انقضا: {new Date(request.expires_at).toLocaleDateString('fa-IR')}
          </span>
        </div>

        {/* Simple status timeline */}
        <div className="pt-3 border-t border-calm-100">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 size={14} />
              ثبت شده
            </div>
            <div className={`flex items-center gap-1.5 ${
              offers.length > 0 ? 'text-green-600' : 'text-calm-300'
            }`}>
              {offers.length > 0 ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              دریافت پیشنهاد
            </div>
            <div className="flex items-center gap-1.5 text-calm-300">
              <Circle size={14} />
              انتخاب فروشنده
            </div>
          </div>
        </div>
      </div>

      {/* Quota Banner */}
      <div className={`card p-4 flex items-center justify-between border ${softClass}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center">
            <Zap size={18} />
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
              برای دیدن اطلاعات تماس فروشنده
            </div>
          </div>
        </div>
        {quota !== null && quota <= 3 && (
          <Link
            to="/wallet"
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white transition-colors"
          >
            ارتقای پلن
          </Link>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmOfferId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-soft-lg space-y-4">
            <h3 className="font-bold text-calm-800 text-lg">تأیید مشاهده اطلاعات</h3>
            <p className="text-sm text-calm-600 leading-relaxed">
              با مشاهده اطلاعات این فروشنده، <strong>یک واحد از سهمیه</strong> شما کم می‌شود.
              {quota !== null && (
                <>
                  <br />
                  سهمیه فعلی: <strong>{quota}</strong>
                </>
              )}
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmOfferId(null)} className="btn-secondary flex-1">
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

      {/* Offers Section */}
      <div>
        <h2 className="font-semibold text-calm-800 mb-3 flex items-center gap-2">
          پیشنهادهای رسیده
          <span className="text-sm font-normal text-calm-400">({offers.length})</span>
        </h2>

        {offers.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-calm-400 text-sm">هنوز پیشنهادی ثبت نشده</div>
            <p className="text-xs text-calm-400 mt-1.5">فروشندگان به‌زودی قیمت خواهند داد</p>
          </div>
        ) : (
          <div className="space-y-3">
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
                        <div className="flex items-center gap-4 mt-2 text-sm text-calm-500">
                          <span className="flex items-center gap-1">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
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
                        <div className="px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-medium">
                          مشاهده شده
                        </div>
                      )}
                    </div>

                    {isRevealed && (
                      <div className="mt-4 p-4 rounded-2xl bg-green-50 border border-green-100 space-y-2.5">
                        <div className="flex items-center gap-2 text-green-800 font-medium text-sm">
                          <Shield size={15} />
                          اطلاعات فروشنده
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={15} className="text-green-600" />
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
                              <MapPin size={13} />
                              {seller.city_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star size={13} className="text-amber-400" />
                            {seller.reputation_score}
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
    </div>
  )
}
