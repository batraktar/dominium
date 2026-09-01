import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useAdminDashboard from '../hooks/useAdminDashboard.js'
import AdminDashboard from '../components/AdminDashboard.jsx'
import AdminPropertiesTable from '../components/AdminPropertiesTable.jsx'
import PropertyEditModal from '../components/PropertyEditModal.jsx'
import HighlightTab from '../components/HighlightTab.jsx'
import SettingsTab from '../components/SettingsTab.jsx'
import ClientsTab from '../components/ClientsTab.jsx'
import './admin-api-admin.css'

const NUMBER_FORMATTER = new Intl.NumberFormat('uk-UA')

function formatCount(value) {
  if (value == null || Number.isNaN(Number(value))) return '0'
  return NUMBER_FORMATTER.format(Number(value))
}

function AdminNav({ activeTab, onTabChange, stats }) {
  const activeButtonRef = useRef(null)
  const tabs = [
    {
      id: 'properties',
      label: 'Об’єкти',
      icon: 'ri-home-4-line',
      count: stats.active,
    },
    {
      id: 'dashboard',
      label: 'Дашборд',
      icon: 'ri-dashboard-line',
      count: stats.total,
    },
    {
      id: 'clients',
      label: 'Клієнти',
      icon: 'ri-user-line',
      count: stats.total_clients,
    },
    {
      id: 'highlight',
      label: 'Топ',
      icon: 'ri-star-smile-line',
      count: stats.featured,
    },
    {
      id: 'settings',
      label: 'Налаштування',
      icon: 'ri-settings-3-line',
    },
  ]

  useEffect(() => {
    const revealActiveTab = () => {
      activeButtonRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
    }
    revealActiveTab()
    window.addEventListener('resize', revealActiveTab)
    return () => window.removeEventListener('resize', revealActiveTab)
  }, [activeTab])

  return (
    <nav className="admin-tab-nav" aria-label="Розділи адмінки">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id

        return (
          <button
            ref={isActive ? activeButtonRef : null}
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`admin-tab-button ${isActive ? 'is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="admin-tab-button__label">
              <i className={tab.icon} aria-hidden="true"></i>
              {tab.label}
            </span>
            {tab.count != null ? (
              <span className="admin-tab-button__count">{formatCount(tab.count)}</span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

function AdminMetricCards({ stats }) {
  const cards = useMemo(
    () => [
      {
        label: 'Активні',
        value: stats.active,
        icon: 'ri-checkbox-circle-line',
        tone: 'green',
      },
      {
        label: 'В архіві',
        value: stats.archived,
        icon: 'ri-archive-line',
        tone: 'neutral',
      },
      {
        label: 'У блоці Топ',
        value: stats.featured,
        icon: 'ri-star-smile-line',
        tone: 'gold',
      },
      {
        label: 'Клієнти',
        value: stats.total_clients,
        icon: 'ri-user-line',
        tone: 'blue',
      },
    ],
    [stats],
  )

  return (
    <div className="admin-metric-grid" aria-label="Ключові показники">
      {cards.map((card) => (
        <article key={card.label} className={`admin-metric-card admin-metric-card--${card.tone}`}>
          <span className="admin-metric-card__icon" aria-hidden="true">
            <i className={card.icon}></i>
          </span>
          <div>
            <p className="admin-metric-card__label">{card.label}</p>
            <p className="admin-metric-card__value">
              {stats.loading ? '...' : formatCount(card.value)}
            </p>
          </div>
        </article>
      ))}
    </div>
  )
}

function AdminApiAdminPage() {
  const [activeTab, setActiveTab] = useState('properties')
  const { stats, refreshStats } = useAdminDashboard()
  const [editingPropertyId, setEditingPropertyId] = useState(null)

  const clearEditQuery = useCallback(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('edit')) return

    url.searchParams.delete('edit')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  const closeEditModal = useCallback(() => {
    setEditingPropertyId(null)
    clearEditQuery()
  }, [clearEditQuery])

  useEffect(() => {
    const openFromQuery = () => {
      const params = new URLSearchParams(window.location.search)
      const editId = params.get('edit')
      if (!editId) return

      const parsedId = Number.parseInt(editId, 10)
      if (!Number.isFinite(parsedId) || String(parsedId) !== editId.trim() || parsedId <= 0) {
        clearEditQuery()
        return
      }

      setActiveTab('properties')
      setEditingPropertyId(parsedId)
    }

    openFromQuery()
    window.addEventListener('popstate', openFromQuery)
    return () => window.removeEventListener('popstate', openFromQuery)
  }, [clearEditQuery])

  return (
    <section className="admin-page">
      <div className="admin-page__inner">
        <header className="admin-page__header">
          <div className="admin-page__title-block">
            <span className="admin-page__eyebrow">DOMINIUM admin</span>
            <h1>Керування об’єктами</h1>
            <p>
              Єдиний робочий простір для об’єктів, клієнтів, блоку «Топ 3» і CRM-налаштувань.
            </p>
          </div>

          <div className="admin-page__actions" aria-label="Швидкі дії">
            <button
              type="button"
              onClick={refreshStats}
              className="admin-button admin-button--secondary"
              disabled={stats.loading}
            >
              <i className={`ri-refresh-line ${stats.loading ? 'admin-spin' : ''}`}></i>
              Оновити
            </button>
            <a href="/admin/house/property/add/" className="admin-button admin-button--primary">
              <i className="ri-add-line"></i>
              Новий об’єкт
            </a>
          </div>
        </header>

        {stats.error ? (
          <div className="admin-alert admin-alert--error" role="status">
            <i className="ri-error-warning-line" aria-hidden="true"></i>
            {stats.error}
          </div>
        ) : null}

        <AdminMetricCards stats={stats} />

        <div className="admin-sticky-nav">
          <AdminNav activeTab={activeTab} onTabChange={setActiveTab} stats={stats} />
        </div>

        <div className="admin-content">
          {activeTab === 'dashboard' && (
            <AdminDashboard stats={stats} onRefresh={refreshStats} />
          )}

          {activeTab === 'properties' && (
            <AdminPropertiesTable
              onEditProperty={(property) => {
                setEditingPropertyId(property.id)
                clearEditQuery()
              }}
              onDataChange={refreshStats}
            />
          )}

          {activeTab === 'clients' && <ClientsTab />}

          {activeTab === 'highlight' && <HighlightTab />}

          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>

      {editingPropertyId && (
        <PropertyEditModal
          propertyId={editingPropertyId}
          onClose={closeEditModal}
          onSave={() => {
            setEditingPropertyId(null)
            clearEditQuery()
            refreshStats()
          }}
        />
      )}
    </section>
  )
}

export default AdminApiAdminPage
