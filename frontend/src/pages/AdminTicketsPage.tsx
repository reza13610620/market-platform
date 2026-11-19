import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { MessageSquare, Send, X } from 'lucide-react'

export default function AdminTicketsPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [tickets, setTickets] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setTickets(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  const openTicket = async (t: any) => {
    setSelected(t)
    const res = await fetch(`/api/admin/tickets/${t.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.success) {
      setMessages(data.messages || [])
      setSelected(data.ticket || t)
    }
  }

  const sendReply = async () => {
    if (!selected || !reply.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/tickets/${selected.id}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: reply.trim() }),
      })
      if (res.ok) {
        setReply('')
        await openTicket(selected)
        fetchTickets()
      }
    } finally {
      setSending(false)
    }
  }

  const closeTicket = async () => {
    if (!selected) return
    if (!confirm('تیکت بسته شود؟')) return
    await fetch(`/api/admin/tickets/${selected.id}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    setSelected(null)
    fetchTickets()
  }

  if (loading) {
    return <div className="text-center text-calm-400 py-20">در حال بارگذاری...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-calm-800 flex items-center gap-2">
          <MessageSquare size={22} />
          تیکت‌های پشتیبانی (ادمین)
        </h1>
        <p className="text-sm text-calm-400 mt-1">پاسخ به تیکت‌های باز کاربران</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-2">
          {tickets.length === 0 ? (
            <div className="card p-8 text-center text-sm text-calm-400">تیکت بازی وجود ندارد</div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                className={`w-full text-right card p-4 transition-all ${
                  selected?.id === t.id ? 'ring-2 ring-teal-400' : 'hover:bg-calm-50'
                }`}
              >
                <div className="font-medium text-calm-800 text-sm">{t.subject}</div>
                <div className="text-xs text-calm-400 mt-1">
                  {t.user_name} · {t.user_phone} · {t.status}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Chat */}
        <div className="card p-4 min-h-[320px] flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-calm-400">
              یک تیکت انتخاب کنید
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-calm-100 pb-3 mb-3">
                <div>
                  <div className="font-medium text-calm-800">{selected.subject}</div>
                  <div className="text-xs text-calm-400">{selected.status}</div>
                </div>
                <button onClick={closeTicket} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg">
                  بستن تیکت
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-64 mb-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl text-sm ${
                      m.is_admin
                        ? 'bg-teal-50 text-teal-800 mr-6'
                        : 'bg-calm-50 text-calm-700 ml-6'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">{m.sender_name}</div>
                    {m.message}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="پاسخ شما..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className={`btn-primary text-white ${primaryClass}`}
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
