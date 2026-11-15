import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

export default function WalletPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [wallet, setWallet] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [quota, setQuota] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500'
      : theme === 'male'
      ? 'bg-male-500'
      : 'bg-teal-600'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [walletRes, txRes, quotaRes] = await Promise.all([
        fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/wallet/transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/contact/quota', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const walletData = await walletRes.json()
      const txData = await txRes.json()
      const quotaData = await quotaRes.json()

      if (walletData.success) setWallet(walletData.data)
      if (txData.success) setTransactions(txData.data.transactions || [])
      if (quotaData.success) setQuota(quotaData.data.remaining_quota)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center text-calm-500 py-20">در حال بارگذاری...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-calm-800">کیف پول</h1>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`card p-5 text-white ${primaryClass}`}>
          <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
            <Wallet size={16} />
            موجودی قابل استفاده
          </div>
          <div className="text-2xl font-bold">
            {(wallet?.available || 0).toLocaleString('fa-IR')} تومان
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-calm-500 mb-1">موجودی کل</div>
          <div className="text-xl font-semibold text-calm-800">
            {(wallet?.balance || 0).toLocaleString('fa-IR')}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-calm-500 mb-1">قفل‌شده</div>
          <div className="text-xl font-semibold text-calm-800">
            {(wallet?.locked_balance || 0).toLocaleString('fa-IR')}
          </div>
        </div>
      </div>

      {/* Quota */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-calm-500">سهمیه مشاهده اطلاعات تماس</div>
          <div className="text-lg font-semibold text-calm-800 mt-1">
            {quota === null ? 'نامحدود' : `${quota.toLocaleString('fa-IR')} باقی‌مانده`}
          </div>
        </div>
        <button className="btn-secondary text-sm">ارتقای پلن</button>
      </div>

      {/* Transactions */}
      <div className="card">
        <div className="p-5 border-b border-calm-100">
          <h2 className="font-semibold text-calm-800">تاریخچه تراکنش‌ها</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-calm-400 text-sm">هنوز تراکنشی ثبت نشده</div>
        ) : (
          <div className="divide-y divide-calm-50">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      tx.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                    }`}
                  >
                    {tx.amount > 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-calm-800">
                      {tx.description || tx.type}
                    </div>
                    <div className="text-xs text-calm-400">
                      {new Date(tx.created_at).toLocaleDateString('fa-IR')}
                    </div>
                  </div>
                </div>
                <div
                  className={`font-semibold text-sm ${
                    tx.amount > 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {tx.amount > 0 ? '+' : ''}
                  {tx.amount.toLocaleString('fa-IR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
