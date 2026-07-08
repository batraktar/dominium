import { useState, useEffect } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

function BarChart({ data, labelKey, valueKey, color = 'bg-deepOcean' }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-32 truncate text-right">{d[labelKey]}</span>
          <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
            <div className={`h-full ${color} rounded transition-all duration-500`}
              style={{ width: `${(d[valueKey] / max) * 100}%` }}></div>
          </div>
          <span className="text-xs font-medium text-deepOcean w-10 text-right">{d[valueKey]}</span>
        </div>
      ))}
    </div>
  )
}

function MiniBarChart({ data, height = 80 }) {
  if (!data.length) return <div className="h-20 flex items-center justify-center text-gray-300 text-xs">Немає даних</div>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-400">{d.count}</span>
          <div className="w-full bg-deepOcean rounded-t transition-all duration-300"
            style={{ height: `${(d.count / max) * (height - 20)}px`, minHeight: d.count > 0 ? '4px' : '0' }}
            title={`${d.month}: ${d.count}`}></div>
          <span className="text-[9px] text-gray-400 -rotate-45 origin-left">{d.month?.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

function AdminDashboard({ stats: externalStats, onRefresh }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get(apiEndpoints.stats)
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const s = stats || {}
  const statCards = [
    { label: 'Всього об\'єктів', value: s.total || 0, icon: 'ri-home-4-line', color: 'bg-deepOcean' },
    { label: 'Активних', value: s.active || 0, icon: 'ri-checkbox-circle-line', color: 'bg-green-600' },
    { label: 'В архіві', value: s.archived || 0, icon: 'ri-archive-line', color: 'bg-gray-500' },
    { label: 'Топ', value: s.featured || 0, icon: 'ri-star-fill', color: 'bg-yellow-500' },
    { label: 'Клієнтів', value: s.total_clients || 0, icon: 'ri-user-line', color: 'bg-blue-500' },
    { label: 'Зображень', value: s.total_images || 0, icon: 'ri-image-line', color: 'bg-purple-500' },
    { label: 'Сер. ціна', value: s.avg_price ? `$${s.avg_price.toLocaleString()}` : '—', icon: 'ri-money-dollar-circle-line', color: 'bg-green-500' },
    { label: 'Сер. площа', value: s.avg_area ? `${s.avg_area} м²` : '—', icon: 'ri-ruler-line', color: 'bg-blue-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-deepOcean">
          <i className="ri-dashboard-line mr-2"></i>Дашборд
        </h2>
        <button onClick={onRefresh} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">
          <i className="ri-refresh-line"></i>Оновити
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((c, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${c.color} text-white flex items-center justify-center text-lg shrink-0`}>
              <i className={c.icon}></i>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{c.label}</p>
              <p className="text-lg font-bold text-deepOcean">{loading ? '—' : c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-deepOcean mb-4">
            <i className="ri-bar-chart-line mr-1 text-gray-400"></i>Об'єкти по місяцях
          </h3>
          <MiniBarChart data={s.monthly || []} height={100} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-deepOcean mb-4">
            <i className="ri-pie-chart-line mr-1 text-gray-400"></i>За типом нерухомості
          </h3>
          <BarChart data={s.by_type || []} labelKey="type" valueKey="count" color="bg-blue-500" />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-deepOcean mb-4">
            <i className="ri-exchange-line mr-1 text-gray-400"></i>За типом угоди
          </h3>
          <BarChart data={s.by_deal || []} labelKey="deal" valueKey="count" color="bg-coolSage" />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col items-center justify-center">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#133E44" strokeWidth="3"
                strokeDasharray={`${((s.active || 0) / Math.max(s.total || 1, 1)) * 100} 100`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-deepOcean">{s.active || 0}</span>
              <span className="text-[10px] text-gray-400">активних</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {s.active || 0} з {s.total || 0} активних ({s.total ? Math.round((s.active / s.total) * 100) : 0}%)
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
