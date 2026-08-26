const NUMBER_FORMATTER = new Intl.NumberFormat('uk-UA')

function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '0'
  return NUMBER_FORMATTER.format(Number(value))
}

function formatMoney(value) {
  if (!value) return '—'
  return `$${formatNumber(value)}`
}

function BarChart({ data = [], labelKey, valueKey, barClassName = 'bg-deepOcean' }) {
  if (!data.length) {
    return (
      <div className="admin-empty-state py-8">
        <i className="ri-bar-chart-line" aria-hidden="true"></i>
        <p>Даних поки немає</p>
        <span>Графік з’явиться після синхронізації об’єктів.</span>
      </div>
    )
  }

  const max = Math.max(...data.map((item) => Number(item[valueKey]) || 0), 1)

  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((item, index) => {
        const value = Number(item[valueKey]) || 0

        return (
          <div key={`${item[labelKey]}-${index}`} className="flex items-center gap-3">
            <span className="w-32 truncate text-right text-xs text-gray-500">
              {item[labelKey] || 'Інше'}
            </span>
            <div className="h-7 flex-1 overflow-hidden rounded-lg bg-gray-100">
              <div
                className={`h-full rounded-lg ${barClassName}`}
                style={{ width: `${Math.max((value / max) * 100, value > 0 ? 6 : 0)}%` }}
              ></div>
            </div>
            <span className="w-10 text-right text-xs font-semibold text-deepOcean">
              {formatNumber(value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MiniBarChart({ data = [], height = 112 }) {
  if (!data.length) {
    return (
      <div className="admin-empty-state py-8">
        <i className="ri-calendar-line" aria-hidden="true"></i>
        <p>Немає історії</p>
        <span>Нові об’єкти з’являться тут помісячно.</span>
      </div>
    )
  }

  const max = Math.max(...data.map((item) => Number(item.count) || 0), 1)

  return (
    <div className="flex items-end gap-2" style={{ minHeight: height }}>
      {data.map((item) => {
        const count = Number(item.count) || 0
        const heightValue = Math.max((count / max) * (height - 28), count > 0 ? 6 : 0)

        return (
          <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-gray-400">{formatNumber(count)}</span>
            <div
              className="w-full rounded-t-lg bg-deepOcean transition-all duration-300"
              style={{ height: `${heightValue}px` }}
              title={`${item.month}: ${count}`}
            ></div>
            <span className="max-w-full truncate text-[10px] text-gray-400">
              {String(item.month || '').slice(5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({ label, value, icon, tone }) {
  return (
    <article className={`admin-metric-card admin-metric-card--${tone}`}>
      <span className="admin-metric-card__icon" aria-hidden="true">
        <i className={icon}></i>
      </span>
      <div>
        <p className="admin-metric-card__label">{label}</p>
        <p className="admin-metric-card__value">{value}</p>
      </div>
    </article>
  )
}

function AdminDashboard({ stats, onRefresh }) {
  const loading = Boolean(stats?.loading)
  const activeShare = stats?.total ? Math.round((stats.active / stats.total) * 100) : 0

  const statCards = [
    {
      label: 'Всього об’єктів',
      value: loading ? '...' : formatNumber(stats?.total),
      icon: 'ri-home-4-line',
      tone: 'green',
    },
    {
      label: 'Зображення',
      value: loading ? '...' : formatNumber(stats?.total_images),
      icon: 'ri-image-line',
      tone: 'blue',
    },
    {
      label: 'Сер. ціна',
      value: loading ? '...' : formatMoney(stats?.avg_price),
      icon: 'ri-money-dollar-circle-line',
      tone: 'gold',
    },
    {
      label: 'Сер. площа',
      value: loading ? '...' : stats?.avg_area ? `${formatNumber(stats.avg_area)} м²` : '—',
      icon: 'ri-ruler-line',
      tone: 'neutral',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2 className="admin-panel__title">
              <i className="ri-dashboard-line mr-2" aria-hidden="true"></i>
              Дашборд
            </h2>
            <p className="admin-panel__subtitle">
              Огляд бази об’єктів, візуального контенту та структури пропозицій.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="admin-button admin-button--secondary"
            disabled={loading}
          >
            <i className={`ri-refresh-line ${loading ? 'admin-spin' : ''}`}></i>
            Оновити
          </button>
        </div>

        {stats?.error ? (
          <div className="mx-5 mt-5">
            <div className="admin-alert admin-alert--error">
              <i className="ri-error-warning-line" aria-hidden="true"></i>
              {stats.error}
            </div>
          </div>
        ) : null}

        <div className="p-5">
          <div className="admin-metric-grid">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="admin-form-section">
              <h3 className="admin-form-section__title">
                <i className="ri-bar-chart-line mr-2 text-gray-400" aria-hidden="true"></i>
                Об’єкти по місяцях
              </h3>
              <MiniBarChart data={stats?.monthly || []} />
            </section>

            <section className="admin-form-section">
              <h3 className="admin-form-section__title">
                <i className="ri-pie-chart-line mr-2 text-gray-400" aria-hidden="true"></i>
                За типом нерухомості
              </h3>
              <BarChart data={stats?.by_type || []} labelKey="type" valueKey="count" barClassName="bg-blue-500" />
            </section>

            <section className="admin-form-section">
              <h3 className="admin-form-section__title">
                <i className="ri-exchange-line mr-2 text-gray-400" aria-hidden="true"></i>
                За типом угоди
              </h3>
              <BarChart data={stats?.by_deal || []} labelKey="deal" valueKey="count" barClassName="bg-coolSage" />
            </section>

            <section className="admin-form-section flex min-h-[220px] flex-col items-center justify-center text-center">
              <div className="relative h-36 w-36">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#133E44"
                    strokeDasharray={`${activeShare} 100`}
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-deepOcean">
                    {loading ? '...' : `${activeShare}%`}
                  </span>
                  <span className="text-xs text-gray-500">активних</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {formatNumber(stats?.active)} активних із {formatNumber(stats?.total)} загалом
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
