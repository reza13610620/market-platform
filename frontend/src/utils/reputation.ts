/** برچسب کیفی امتیاز اعتبار */

export function getReputationLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'عالی', color: 'text-emerald-600 bg-emerald-50' }
  if (score >= 75) return { label: 'خوب', color: 'text-teal-600 bg-teal-50' }
  if (score >= 60) return { label: 'متوسط', color: 'text-amber-600 bg-amber-50' }
  return { label: 'ضعیف', color: 'text-red-600 bg-red-50' }
}

export function ReputationBadge({ score }: { score: number }) {
  const { label, color } = getReputationLabel(score)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {score} · {label}
    </span>
  )
}
