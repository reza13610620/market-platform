import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { MessageSquare, Plus, Clock } from 'lucide-react'

const statusStyles: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  closed: 'bg-calm-100 text-calm-500',
}

export default function TicketsPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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
      const res = await fetch('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setList(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setError('')
    if (subject.trim().length < 3) {
      setError('موضوع باید حداقل ۳ حرف باشد')
      return
    }
    if (message.trim().length < 5) {
      setError('پیام باید حداقل ۵ حرف باشد')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'خطا در ثبت تیکت')
        return
      }
      setShowForm(false)
      setSubject('')
      setMessage('')
      navigate(`/tickets/${data.ticket_id}`)
    } catch {
      setError('ارتباط با سرور برقرار نشد')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-calm-800">تیکت‌های پشتیبانی</h1>
          <p className="text-sm text-calm-400 mt-1">سوالات و مشکلات خود را مطرح کنید</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={`btn-primary text-white text-sm flex items-center gap-1.5 ${primaryClass}`}
        >
          <Plus size={16} />
          تیکت جدید
        </button>
      </div>

      {showForm && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-calm-800">ثبت تیکت جدید</h2>
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-sm">{error}</div>
          )}
          <div>
            <label className="text-sm text-calm-600 mb-1.5 block">موضوع *</label>
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثلاً مشکل در مشاهده اطلاعات تماس"
            />
          </div>
          <div>
            <label className="text-sm text-calm-600 mb-1.5 block">توضیحات *</label>
            <textarea
              className="input min-h-[120px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="مشکل یا سوال خود را با جزئیات بنویسید..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={submitting}
              className={`btn-primary text-white ${primaryClass}`}
            >
              {submitting ? 'در حال ثبت...' : 'ثبت تیکت'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setError('')
              }}
              className="btn-secondary"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-calm-400 py-16">در حال بارگذاری...</div>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare size={36} className="mx-auto text-calm-300 mb-4" />
          <p className="text-calm-500 text-sm">هنوز تیکتی ثبت نکرده‌اید</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <Link
              key={item.id}
              to={`/tickets/${item.id}`}
              className="card p-5 block hover:shadow-soft transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-calm-800 truncate">{item.subject}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-calm-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(item.updated_at).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                    statusStyles[item.status] || 'bg-calm-100 text-calm-600'
                  }`}
                >
                  {item.status_label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
