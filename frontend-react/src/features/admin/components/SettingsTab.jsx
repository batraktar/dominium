import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

const EVENT_TYPES = [
  { value: 'new_property', label: 'Новий об\'єкт', icon: 'ri-home-add-line', color: 'bg-blue-100 text-blue-700' },
  { value: 'price_changed', label: 'Зміна ціни', icon: 'ri-money-dollar-circle-line', color: 'bg-green-100 text-green-700' },
  { value: 'new_inquiry', label: 'Нова заявка', icon: 'ri-message-3-line', color: 'bg-purple-100 text-purple-700' },
  { value: 'status_changed', label: 'Зміна статусу', icon: 'ri-loop-right-line', color: 'bg-orange-100 text-orange-700' },
]

const AVAILABLE_VARS = [
  { key: '{title}', label: 'Назва' },
  { key: '{price}', label: 'Ціна' },
  { key: '{address}', label: 'Адреса' },
  { key: '{rooms}', label: 'Кімнат' },
  { key: '{area}', label: 'Площа' },
  { key: '{link}', label: 'Посилання' },
  { key: '{deal_type}', label: 'Угода' },
  { key: '{property_type}', label: 'Тип' },
]

function TemplateCard({ template, index, onChange, onRemove, onDragStart, onDragOver, onDrop, onDragEnd, dragOver }) {
  const eventType = EVENT_TYPES.find(t => t.value === template.event_type) || EVENT_TYPES[0]

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index) }}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      className={`bg-gray-50 rounded-xl border-2 p-4 transition cursor-grab hover:border-gray-300 ${
        dragOver === index ? 'border-deepOcean scale-[1.01]' : 'border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-gray-300 hover:text-gray-500 cursor-grab">
          <i className="ri-draggable text-lg"></i>
        </span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${eventType.color}`}>
          <i className={`${eventType.icon} mr-1`}></i>{eventType.label}
        </span>
        <input
          type="text"
          value={template.name}
          onChange={e => onChange({ ...template, name: e.target.value })}
          placeholder="Назва шаблону"
          className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean"
        />
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={template.is_active}
            onChange={e => onChange({ ...template, is_active: e.target.checked })}
            className="accent-deepOcean w-4 h-4"
          />
        </label>
        <button onClick={onRemove} className="text-gray-300 hover:text-red-500 transition p-1">
          <i className="ri-delete-bin-line text-sm"></i>
        </button>
      </div>

      <div className="relative">
        <select
          value={template.event_type}
          onChange={e => onChange({ ...template, event_type: e.target.value })}
          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 mb-2"
        >
          {EVENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <textarea
          value={template.template}
          onChange={e => onChange({ ...template, template: e.target.value })}
          rows={4}
          placeholder="Введіть текст повідомлення..."
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean resize-none"
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {AVAILABLE_VARS.map(v => (
            <button
              key={v.key}
              onClick={() => {
                const pos = document.querySelector(`#tpl-${index}`)?.selectionStart || template.template.length
                const before = template.template.slice(0, pos)
                const after = template.template.slice(pos)
                onChange({ ...template, template: before + v.key + after })
              }}
              className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded text-xs hover:bg-deepOcean hover:text-white hover:border-deepOcean transition"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SyncLogEntry({ log }) {
  const statusColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }
  const statusIcons = {
    success: 'ri-check-line text-green-600',
    error: 'ri-error-warning-line text-red-600',
    warning: 'ri-alert-line text-yellow-600',
    info: 'ri-information-line text-blue-600',
  }

  return (
    <div className={`border rounded-lg p-3 ${statusColors[log.status] || statusColors.info}`}>
      <div className="flex items-center gap-2 mb-1">
        <i className={statusIcons[log.status] || statusIcons.info}></i>
        <span className="text-sm font-medium text-deepOcean">{log.message}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 ml-6">
        <span>{log.time}</span>
        {log.created !== undefined && <span>+{log.created} ств.</span>}
        {log.updated !== undefined && <span>+{log.updated} онов.</span>}
        {log.duration && <span>{log.duration}</span>}
      </div>
    </div>
  )
}

function SettingsTab() {
  const [activeSection, setActiveSection] = useState('crm')
  const [crmSettings, setCrmSettings] = useState({ url: '', api_key: '', secret_key: '', sync_interval: 30 })
  const [tgSettings, setTgSettings] = useState({ bot_token: '', chat_id: '', enabled: false })
  const [templates, setTemplates] = useState([])
  const [syncLogs, setSyncLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, templatesRes] = await Promise.all([
        apiClient.get(apiEndpoints.appSettings),
        apiClient.get(apiEndpoints.telegramTemplates),
      ])
      const s = settingsRes.data?.result || {}
      if (s.crm) setCrmSettings(prev => ({ ...prev, ...s.crm }))
      if (s.telegram) setTgSettings(prev => ({ ...prev, ...s.telegram }))
      setTemplates(templatesRes.data?.results || [])

      const logsRes = await apiClient.get(apiEndpoints.appSettings, { query: { key: 'sync_logs' } })
      const logsData = logsRes.data?.result?.sync_logs || []
      setSyncLogs(logsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const saveCrm = async () => {
    setSaving(true)
    setStatus(null)
    try {
      await apiClient.request(apiEndpoints.appSettings, {
        method: 'POST', json: { key: 'crm', value: crmSettings }, csrf: true,
      })
      setStatus({ type: 'success', message: 'CRM налаштування збережено' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const saveTelegram = async () => {
    setSaving(true)
    setStatus(null)
    try {
      await apiClient.request(apiEndpoints.appSettings, {
        method: 'POST', json: { key: 'telegram', value: tgSettings }, csrf: true,
      })
      setStatus({ type: 'success', message: 'Telegram налаштування збережено' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const saveTemplates = async () => {
    setSaving(true)
    setStatus(null)
    try {
      await apiClient.request(apiEndpoints.telegramTemplates, {
        method: 'POST', json: { action: 'save', templates }, csrf: true,
      })
      setStatus({ type: 'success', message: 'Шаблони збережено' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTestingConnection(true)
    setConnectionResult(null)
    const start = Date.now()
    try {
      const res = await apiClient.get(apiEndpoints.properties, { query: { page_size: 1 } })
      const duration = Date.now() - start
      setConnectionResult({
        success: true,
        message: `API доступне. ${res.data?.count || 0} об'єктів в базі.`,
        duration: `${duration}ms`,
      })
    } catch (err) {
      const duration = Date.now() - start
      setConnectionResult({
        success: false,
        message: `Помилка: ${err.message}`,
        duration: `${duration}ms`,
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const testTelegram = async () => {
    if (!tgSettings.bot_token || !tgSettings.chat_id) {
      setStatus({ type: 'error', message: 'Вкажіть токен бота та Chat ID' })
      return
    }
    setSaving(true)
    try {
      await apiClient.request(apiEndpoints.appSettings, {
        method: 'POST',
        json: { key: 'telegram', value: { ...tgSettings, enabled: true } },
        csrf: true,
      })
      setTgSettings(prev => ({ ...prev, enabled: true }))
      setStatus({ type: 'success', message: 'Telegram налаштування збережено. Тестове повідомлення буде надіслано при наступній синхронізації.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const addTemplate = () => {
    setTemplates(prev => [...prev, {
      name: '',
      event_type: 'new_property',
      template: "Новий об'єкт:\n{title}\n{price} $\n{address}\n{link}",
      is_active: true,
    }])
  }

  const updateTemplate = (index, data) => {
    setTemplates(prev => prev.map((t, i) => i === index ? data : t))
  }

  const removeTemplate = (index) => {
    setTemplates(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragStart = (index) => setDragOver(index)
  const handleDragOver = (index) => setDragOver(index)
  const handleDrop = (toIndex) => {
    if (dragOver === null || dragOver === toIndex) { setDragOver(null); return }
    const newTemplates = [...templates]
    const [moved] = newTemplates.splice(dragOver, 1)
    newTemplates.splice(toIndex, 0, moved)
    setTemplates(newTemplates)
    setDragOver(null)
  }
  const handleDragEnd = () => setDragOver(null)

  const groupedLogs = syncLogs.reduce((acc, log) => {
    const day = log.time?.split(' ')[0] || 'Невідомо'
    if (!acc[day]) acc[day] = []
    acc[day].push(log)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-deepOcean">
        <i className="ri-settings-3-line mr-2"></i>
        Налаштування
      </h2>

      {status && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          <i className={status.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}></i>
          {status.message}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'crm', label: 'CRM', icon: 'ri-cloud-line' },
          { id: 'telegram', label: 'Telegram', icon: 'ri-telegram-line' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeSection === tab.id
                ? 'bg-white text-deepOcean shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className={tab.icon}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === 'crm' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-deepOcean">Realtsoft CRM</h3>
              <button onClick={testConnection} disabled={testingConnection}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition disabled:opacity-50">
                <i className={`ri-signal-tower-line ${testingConnection ? 'animate-pulse' : ''}`}></i>
                {testingConnection ? 'Перевірка...' : 'Перевірити з\'єднання'}
              </button>
            </div>

            {connectionResult && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${connectionResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                <i className={connectionResult.success ? 'ri-check-line' : 'ri-error-warning-line'}></i>
                <span>{connectionResult.message}</span>
                <span className="text-xs text-gray-400 ml-auto">{connectionResult.duration}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">API URL</label>
                <input type="url" value={crmSettings.url} onChange={e => setCrmSettings({ ...crmSettings, url: e.target.value })}
                  placeholder="https://crm-dominium.realtsoft.net" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input type="text" value={crmSettings.api_key} onChange={e => setCrmSettings({ ...crmSettings, api_key: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                <input type="password" value={crmSettings.secret_key} onChange={e => setCrmSettings({ ...crmSettings, secret_key: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <button onClick={saveCrm} disabled={saving}
              className="px-4 py-2 bg-deepOcean text-white rounded-lg text-sm hover:bg-deepOcean/90 transition disabled:opacity-50">
              {saving ? 'Збереження...' : 'Зберегти CRM'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-deepOcean flex items-center gap-2">
              <i className="ri-history-line text-gray-400"></i>
              Логи синхронізації
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-deepOcean">{syncLogs.length}</p>
                <p className="text-xs text-gray-500">Всього записів</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{syncLogs.filter(l => l.status === 'success').length}</p>
                <p className="text-xs text-gray-500">Успішних</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{syncLogs.filter(l => l.status === 'error').length}</p>
                <p className="text-xs text-gray-500">Помилок</p>
              </div>
            </div>
            {syncLogs.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Логів поки немає. Запустіть синхронізацію.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(groupedLogs).reverse().map(([day, logs]) => (
                  <div key={day}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{day}</p>
                    <div className="space-y-1.5">
                      {logs.map((log, i) => <SyncLogEntry key={i} log={log} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'telegram' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-deepOcean">Telegram Бот</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Токен бота</label>
                <input type="password" value={tgSettings.bot_token} onChange={e => setTgSettings({ ...tgSettings, bot_token: e.target.value })}
                  placeholder="123456789:ABC..." className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
                <p className="text-xs text-gray-400 mt-1">Отримати у @BotFather</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chat ID</label>
                <input type="text" value={tgSettings.chat_id} onChange={e => setTgSettings({ ...tgSettings, chat_id: e.target.value })}
                  placeholder="-100..." className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
                <p className="text-xs text-gray-400 mt-1">Отримати у @userinfobot</p>
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={tgSettings.enabled}
                    onChange={e => setTgSettings({ ...tgSettings, enabled: e.target.checked })}
                    className="w-5 h-5 accent-deepOcean" />
                  <span className="text-sm font-medium text-gray-700">Увімкнути</span>
                </label>
                <button onClick={testTelegram} disabled={saving}
                  className="px-3 py-1.5 bg-telegram/10 text-telegram rounded-lg text-sm hover:bg-telegram/20 transition disabled:opacity-50">
                  <i className="ri-send-plane-line mr-1"></i> Зберегти та тест
                </button>
              </div>
            </div>
            <button onClick={saveTelegram} disabled={saving}
              className="px-4 py-2 bg-deepOcean text-white rounded-lg text-sm hover:bg-deepOcean/90 transition disabled:opacity-50">
              {saving ? 'Збереження...' : 'Зберегти Telegram'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-deepOcean">Шаблони повідомлень</h3>
              <div className="flex gap-2">
                <button onClick={addTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-coolSage text-white rounded-lg text-sm hover:bg-coolSage/90 transition">
                  <i className="ri-add-line"></i> Додати
                </button>
                <button onClick={saveTemplates} disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-deepOcean text-white rounded-lg text-sm hover:bg-deepOcean/90 transition disabled:opacity-50">
                  <i className="ri-save-line"></i> {saving ? '...' : 'Зберегти'}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400">Перетягуйте блоки для зміни порядку. Натискайте на теги для вставки змінних.</p>
            <div className="space-y-3">
              {templates.map((t, i) => (
                <TemplateCard
                  key={i} template={t} index={i}
                  onChange={(data) => updateTemplate(i, data)}
                  onRemove={() => removeTemplate(i)}
                  onDragStart={() => {}}
                  onDragOver={() => {}}
                  onDrop={() => {}}
                  onDragEnd={() => {}}
                  dragOver={null}
                />
              ))}
              {templates.length === 0 && (
                <div className="text-center py-8">
                  <i className="ri-file-text-line text-3xl text-gray-200 mb-2 block"></i>
                  <p className="text-gray-400 text-sm">Шаблонів ще немає</p>
                  <button onClick={addTemplate} className="mt-2 text-sm text-deepOcean hover:underline">Додати перший</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsTab
