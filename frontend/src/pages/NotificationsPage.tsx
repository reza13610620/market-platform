import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Bell, CheckCheck } from 'lucide-react'

export default function NotificationsPage() {
  const { token } = useAuth()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchList()
  }, [])

  const fetchList = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setList(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  const markAllRead = async () => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    await fetchList()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-calm-800">اعلان‌ها</h1>
          <p className="text-sm text-calm-400 mt-1">رویدادهای مهم حساب شما</p>
        </div>
        {list.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-1.5">
            <CheckCheck size={15} />
            همه خوانده شد
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-calm-400 py-16">در حال بارگذاری...</div>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell size={36} className="mx-auto text-calm-300 mb-4" />
          <p className="text-calm-500 text-sm">اعلانی وجود ندارد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <div
              key={n.id}
              className={`card p-4 ${!n.is_read ? 'border-teal-200 bg-teal-50/30' : ''}`}
            >
              <div className="flex items-start gap-3">
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-calm-800 text-sm">{n.title}</h3>
                  <p className="text-sm text-calm-600 mt-1 leading-relaxed">{n.body}</p>
                  <p className="text-xs text-calm-400 mt-2">
                    {new Date(n.created_at).toLocaleString('fa-IR')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
