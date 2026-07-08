import { useState } from 'react'

function CrmSyncPanel({ onSyncComplete }) {
  const [syncStatus, setSyncStatus] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncLog, setSyncLog] = useState([])

  const startSync = async () => {
    setIsSyncing(true)
    setSyncStatus('running')
    setSyncLog(prev => [...prev, { time: new Date().toLocaleTimeString(), message: 'Запуск синхронізації...' }])

    try {
      const response = await fetch('/api/crm/sync/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      })
      const data = await response.json()
      
      setSyncLog(prev => [...prev, { 
        time: new Date().toLocaleTimeString(), 
        message: data.output || 'Sync завершено' 
      }])
      setSyncStatus('completed')
      onSyncComplete?.()
    } catch (error) {
      setSyncLog(prev => [...prev, { 
        time: new Date().toLocaleTimeString(), 
        message: `Помилка: ${error.message}`,
        isError: true 
      }])
      setSyncStatus('error')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-deepOcean">
          <i className="ri-cloud-line mr-2"></i>
          Realtsoft CRM Синхронізація
        </h2>
        <button
          onClick={startSync}
          disabled={isSyncing}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-fixel transition ${
            isSyncing 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-coolSage text-white hover:bg-coolSage/90'
          }`}
        >
          {isSyncing ? (
            <>
              <i className="ri-loader-4-line animate-spin"></i>
              Синхронізація...
            </>
          ) : (
            <>
              <i className="ri-refresh-line"></i>
              Запустити sync
            </>
          )}
        </button>
      </div>

      {syncLog.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
          {syncLog.map((entry, i) => (
            <div key={i} className={`text-sm font-mono ${entry.isError ? 'text-red-600' : 'text-gray-700'}`}>
              <span className="text-gray-400">[{entry.time}]</span> {entry.message}
            </div>
          ))}
        </div>
      )}

      {syncStatus === 'completed' && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
          <i className="ri-check-line mr-1"></i>
          Синхронізацію завершено успішно
        </div>
      )}
    </div>
  )
}

export default CrmSyncPanel
