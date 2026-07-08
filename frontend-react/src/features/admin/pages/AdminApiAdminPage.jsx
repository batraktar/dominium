import { useState } from 'react'
import useAdminDashboard from '../hooks/useAdminDashboard.js'
import AdminDashboard from '../components/AdminDashboard.jsx'
import AdminPropertiesTable from '../components/AdminPropertiesTable.jsx'
import CrmSyncPanel from '../components/CrmSyncPanel.jsx'
import PropertyEditModal from '../components/PropertyEditModal.jsx'
import HighlightTab from '../components/HighlightTab.jsx'
import SettingsTab from '../components/SettingsTab.jsx'

function AdminNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'dashboard', label: 'Дашборд', icon: 'ri-dashboard-line' },
    { id: 'properties', label: 'Об\'єкти', icon: 'ri-home-4-line' },
    { id: 'highlight', label: 'Топ 3', icon: 'ri-star-smile-line' },
    { id: 'settings', label: 'Налаштування', icon: 'ri-settings-3-line' },
    { id: 'sync', label: 'CRM Sync', icon: 'ri-cloud-line' },
  ]

  return (
    <nav className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === tab.id
              ? 'bg-white text-deepOcean shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className={tab.icon}></i>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

function AdminApiAdminPage() {
  const [activeTab, setActiveTab] = useState('properties')
  const { stats, refreshStats } = useAdminDashboard()
  const [editingPropertyId, setEditingPropertyId] = useState(null)

  return (
    <section className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AdminNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'dashboard' && (
          <AdminDashboard stats={stats} onRefresh={refreshStats} />
        )}

        {activeTab === 'properties' && (
          <AdminPropertiesTable
            onEditProperty={(property) => setEditingPropertyId(property.id)}
          />
        )}

        {activeTab === 'highlight' && <HighlightTab />}

        {activeTab === 'settings' && <SettingsTab />}

        {activeTab === 'sync' && (
          <CrmSyncPanel onSyncComplete={refreshStats} />
        )}
      </div>

      {editingPropertyId && (
        <PropertyEditModal
          propertyId={editingPropertyId}
          onClose={() => setEditingPropertyId(null)}
          onSave={() => {
            setEditingPropertyId(null)
            refreshStats()
          }}
        />
      )}

    </section>
  )
}

export default AdminApiAdminPage
