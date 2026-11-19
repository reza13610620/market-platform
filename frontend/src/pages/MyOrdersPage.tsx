import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Star, CheckCircle, Clock, MessageSquare } from 'lucide-react'

interface Order {
  id: number
  request_id: number
  offer_id: number
  total_amount: number
  status: string
  completed_at: string | null
  created_at: string
  my_role: 'buyer' | 'seller'
  has_reviewed: boolean
  my_rating: number | null
  can_review: boolean
}

export default function MyOrdersPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [reviewOrderId, setReviewOrderId] = useState<number | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/me/orders', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setOrders(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (orderId: number) => {
    if (!confirm('آیا معامله را تکمیل‌شده علامت می‌زنید؟ بعد از این کار می‌توانید به طرف مقابل امتیاز بدهید.')) return
    setActionId(orderId)
    setError('')
    setMessage('')
    try {
      const res = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(data.message || 'معامله تکمیل شد')
        fetchOrders()
      } else {
        setError(data.error || 'خطا')
      }
    } finally {
      setActionId(null)
    }
  }

  const handleReview = async () => {
    if (!reviewOrderId) return
    setActionId(reviewOrderId)
    setError('')
    setMessage('')
    try {
      const res = await fetch(`/api/orders/${reviewOrderId}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('بازخورد شما ثبت شد. ممنون!')
        setReviewOrderId(null)
        setRating(5)
        setComment('')
        fetchOrders()
      } else {
        setError(data.error || 'خطا در ثبت بازخورد')
      }
    } finally {
      setActionId(null)
    }
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      contact_revealed: 'در حال هماهنگی',
      in_progress: 'در حال انجام',
      completed: 'تکمیل‌شده',
      pending_payment: 'در انتظار پرداخت',
      shipped: 'ارسال‌شده',
      delivered: 'تحویل‌شده',
    }
    return map[s] || s
  }

  if (loading) {
    return <div className="text-center text-calm-400 py-20">در حال بارگذاری معاملات...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-calm-800">معاملات من</h1>
        <p className="text-sm text-calm-400 mt-1">
          بعد از مشاهده اطلاعات تماس، معامله اینجا ظاهر می‌شود. پس از هماهنگی، آن را تکمیل کنید و امتیاز بدهید.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
      )}

      {orders.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-calm-400 text-sm">هنوز معامله‌ای ندارید</div>
          <p className="text-xs text-calm-400 mt-2">
            وقتی اطلاعات تماس فروشنده را ببینید، معامله اینجا نمایش داده می‌شود.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-calm-800">
                    معامله #{o.id}
                    <span className="text-xs font-normal text-calm-400 mr-2">
                      ({o.my_role === 'buyer' ? 'خریدار' : 'فروشنده'})
                    </span>
                  </div>
                  <div className="text-sm text-calm-500 mt-1">
                    مبلغ: {Number(o.total_amount).toLocaleString('fa-IR')} تومان
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-calm-400">
                    <Clock size={13} />
                    {new Date(o.created_at).toLocaleDateString('fa-IR')}
                    <span className="px-2 py-0.5 rounded-full bg-calm-50 text-calm-600">
                      {statusLabel(o.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {o.status !== 'completed' && (
                  <button
                    onClick={() => handleComplete(o.id)}
                    disabled={actionId === o.id}
                    className={`btn-primary text-white text-sm ${primaryClass}`}
                  >
                    <CheckCircle size={16} />
                    {actionId === o.id ? '...' : 'تکمیل معامله'}
                  </button>
                )}

                {o.can_review && (
                  <button
                    onClick={() => {
                      setReviewOrderId(o.id)
                      setRating(5)
                      setComment('')
                    }}
                    className="btn-secondary text-sm"
                  >
                    <Star size={16} />
                    ثبت امتیاز
                  </button>
                )}

                {o.has_reviewed && (
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <Star size={15} className="fill-amber-400 text-amber-400" />
                    شما {o.my_rating} ستاره دادید
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewOrderId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-soft-lg space-y-5">
            <h3 className="font-bold text-calm-800 text-lg flex items-center gap-2">
              <MessageSquare size={20} />
              ثبت بازخورد
            </h3>

            <div>
              <div className="text-sm text-calm-600 mb-2">امتیاز شما:</div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      size={28}
                      className={
                        n <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-calm-200'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm text-calm-600 mb-1.5">توضیح (اختیاری)</div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="تجربه‌تان را بنویسید..."
                className="w-full rounded-xl border border-calm-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setReviewOrderId(null)}
                className="btn-secondary flex-1"
              >
                انصراف
              </button>
              <button
                onClick={handleReview}
                disabled={actionId === reviewOrderId}
                className={`btn-primary flex-1 text-white ${primaryClass}`}
              >
                {actionId === reviewOrderId ? '...' : 'ثبت امتیاز'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
