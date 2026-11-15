import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import { Clock, Package } from 'lucide-react'

export default function MyRequestsPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500'
      : theme === 'male'
      ? 'bg-male-500'
      : 'bg-teal-600'

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/requests/my', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setRequests(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center text-calm-500 py-20">در حال بارگذاری...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-calm-800">درخواست‌های من</h1>
        <Link to="/requests/new" className={`btn-primary text-white text-sm ${primaryClass}`}>
          درخواست جدید
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="card p-12 text-center text-calm-400">
          هنوز درخواستی ثبت نکرده‌اید
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
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

                  <div className="flex items-center gap-4 text-xs text-calm-400 mt-3">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(req.created_at).toLocaleDateString('fa-IR')}
                    </span>
                    {req.city_name && <span>{req.city_name}</span>}
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        req.status === 'open'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-calm-100 text-calm-500'
                      }`}
                    >
                      {req.status === 'open' ? 'باز' : req.status}
                    </span>
                  </div>
                </div>

                <div className="text-left">
                  <div className="text-sm font-semibold text-calm-800">
                    {req.active_offers_count || 0} پیشنهاد
                  </div>
                  {req.active_offers_count > 0 && (
                    <Link
                      to={`/requests/${req.id}/offers`}
                      className="text-xs text-teal-600 hover:underline mt-1 inline-block"
                    >
                      مشاهده پیشنهادها
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
