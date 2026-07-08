import { useState, useEffect, useCallback, useRef } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

const EVENT_TYPES = [
  { value: 'new_property', label: 'Новий об\'єкт', icon: 'ri-home-add-line', color: 'bg-blue-100 text-blue-700' },
  { value: 'price_changed', label: 'Зміна ціни', icon: 'ri-money-dollar-circle-line', color: 'bg-green-100 text-green-700' },
  { value: 'new_inquiry', label: 'Нова заявка', icon: 'ri-message-3-line', color: 'bg-purple-100 text-purple-700' },
  { value: 'status_changed', label: 'Зміна статусу', icon: 'ri-loop-right-line', color: 'bg-orange-100 text-orange-700' },
]

const BLOCK_TYPES = [
  { type: 'text', label: 'Текст', icon: 'ri-text' },
  { type: 'title', label: 'Назва', icon: 'ri-price-tag-line' },
  { type: 'price', label: 'Ціна', icon: 'ri-money-dollar-circle-line' },
  { type: 'address', label: 'Адреса', icon: 'ri-map-pin-line' },
  { type: 'rooms', label: 'Кімнат', icon: 'ri-home-line' },
  { type: 'area', label: 'Площа', icon: 'ri-ruler-line' },
  { type: 'link', label: 'Посилання', icon: 'ri-link' },
  { type: 'deal_type', label: 'Угода', icon: 'ri-exchange-line' },
  { type: 'property_type', label: 'Тип', icon: 'ri-building-line' },
  { type: 'newline', label: 'Переніс', icon: 'ri-corner-down-left-line' },
]

function parseTemplateToBlocks(template) {
  if (!template) return []
  const blocks = []
  const parts = template.split(/(\{[a-z_]+\})/g)
  for (const part of parts) {
    if (!part) continue
    const varMatch = part.match(/^\{([a-z_]+)\}$/)
    if (varMatch) {
      const type = varMatch[1]
      if (BLOCK_TYPES.find(b => b.type === type)) {
        blocks.push({ type, value: '' })
      }
    } else {
      const lines = part.split('\n')
      lines.forEach((line, i) => {
        if (i > 0) blocks.push({ type: 'newline', value: '' })
        if (line) blocks.push({ type: 'text', value: line })
      })
    }
  }
  return blocks
}

function blocksToTemplate(blocks) {
  return blocks.map(block => {
    if (block.type === 'text') return block.value
    if (block.type === 'newline') return '\n'
    return `{${block.type}}`
  }).join('')
}

function TemplateBlock({ block, index, onChange, onRemove, dragHandlers, isDragOver }) {
  const bt = BLOCK_TYPES.find(b => b.type === block.type)
  const isVariable = block.type !== 'text' && block.type !== 'newline'

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(index))
        dragHandlers.onStart(index)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        dragHandlers.onOver(index)
      }}
      onDrop={(e) => {
        e.preventDefault()
        dragHandlers.onDrop(index)
      }}
      onDragEnd={dragHandlers.onEnd}
      className={`flex items-center gap-2 p-2 rounded-lg border transition ${
        isDragOver ? 'border-deepOcean bg-deepOcean/5' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <span className="text-gray-300 hover:text-gray-500 cursor-grab shrink-0 select-none">
        <i className="ri-draggable text-base"></i>
      </span>

      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
        block.type === 'text' ? 'bg-gray-100 text-gray-600' :
        block.type === 'newline' ? 'bg-yellow-100 text-yellow-700' :
        'bg-deepOcean/10 text-deepOcean'
      }`}>
        <i className={`${bt?.icon || 'ri-text'} mr-1`}></i>
        {bt?.label || 'Блок'}
      </span>

      {block.type === 'text' ? (
        <input
          type="text"
          value={block.value}
          onChange={e => onChange({ ...block, value: e.target.value })}
          placeholder="Текст..."
          className="flex-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm min-w-0"
        />
      ) : block.type === 'newline' ? (
        <span className="flex-1 text-xs text-gray-400 italic">переніс рядка</span>
      ) : (
        <span className="flex-1 px-2 py-1 bg-deepOcean/5 border border-dashed border-deepOcean/20 rounded text-sm text-deepOcean font-mono truncate">
          {`{${block.type}}`}
        </span>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded border border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 transition text-xs"
      >
        <i className="ri-close-line"></i>
      </button>
    </div>
  )
}

function TemplateCard({ template, index, onChange, onRemove }) {
  const [blocks, setBlocks] = useState(() => parseTemplateToBlocks(template.template))
  const [dragOver, setDragOver] = useState(null)
  const dragRef = useRef(null)
  const eventType = EVENT_TYPES.find(t => t.value === template.event_type) || EVENT_TYPES[0]

  useEffect(() => {
    setBlocks(parseTemplateToBlocks(template.template))
  }, [template.template])

  const emitBlocks = (newBlocks) => {
    setBlocks(newBlocks)
    onChange({ ...template, template: blocksToTemplate(newBlocks) })
  }

  const addBlock = (type) => emitBlocks([...blocks, { type, value: '' }])
  const updateBlock = (i, data) => emitBlocks(blocks.map((b, idx) => idx === i ? data : b))
  const removeBlock = (i) => emitBlocks(blocks.filter((_, idx) => idx !== i))

  const dragHandlers = {
    onStart: (i) => { dragRef.current = i },
    onOver: (i) => setDragOver(i),
    onDrop: (toIndex) => {
      const fromIndex = dragRef.current
      if (fromIndex === null || fromIndex === undefined || fromIndex === toIndex) {
        setDragOver(null); dragRef.current = null; return
      }
      const newBlocks = [...blocks]
      const [moved] = newBlocks.splice(fromIndex, 1)
      newBlocks.splice(toIndex, 0, moved)
      emitBlocks(newBlocks)
      setDragOver(null)
      dragRef.current = null
    },
    onEnd: () => { setDragOver(null); dragRef.current = null },
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${eventType.color}`}>
          <i className={`${eventType.icon} mr-1`}></i>{eventType.label}
        </span>
        <input
          type="text"
          value={template.name}
          onChange={e => onChange({ ...template, name: e.target.value })}
          placeholder="Назва шаблону"
          className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
        />
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={template.is_active}
            onChange={e => onChange({ ...template, is_active: e.target.checked })}
            className="accent-deepOcean w-4 h-4" />
          Активний
        </label>
        <button onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 transition">
          <i className="ri-delete-bin-line text-sm"></i>
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-1.5 flex-wrap">
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} onClick={() => addBlock(bt.type)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-deepOcean hover:text-white transition">
              <i className={bt.icon}></i>{bt.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5 min-h-[48px]">
          {blocks.map((block, i) => (
            <TemplateBlock
              key={`${index}-${i}-${block.type}-${block.value?.slice(0, 10)}`}
              block={block}
              index={i}
              onChange={(data) => updateBlock(i, data)}
              onRemove={() => removeBlock(i)}
              dragHandlers={dragHandlers}
              isDragOver={dragOver === i}
            />
          ))}
          {blocks.length === 0 && (
            <p className="text-gray-400 text-xs text-center py-3">Додайте блоки зверху</p>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 font-mono break-all">
            {template.template || '(пусто)'}
          </p>
        </div>
      </div>
    </div>
  )
}

function SyncLogsModal({ onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get(apiEndpoints.appSettings, { query: { key: 'sync_logs' } })
      .then(res => setLogs(res.data?.result?.sync_logs || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const grouped = logs.reduce((acc, log) => {
    const day = log.time?.split(' ')[0] || '?'
    if (!acc[day]) acc[day] = []
    acc[day].push(log)
    return acc
  }, {})

  const style = { success: 'bg-green-50 border-green-200 text-green-700', error: 'bg-red-50 border-red-200 text-red-600', info: 'bg-blue-50 border-blue-200 text-blue-600' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-deepOcean">Логи синхронізації</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? <p className="text-gray-400 text-center py-8">Завантаження...</p>
            : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <i className="ri-history-line text-4xl text-gray-200 mb-3 block"></i>
                <p className="text-sm">Логів поки немає</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).reverse().map(([day, dayLogs]) => (
                  <div key={day}>
                    <p className="text-sm font-semibold text-deepOcean mb-2 flex items-center gap-2">
                      <i className="ri-calendar-line text-gray-400"></i> {day}
                      <span className="text-xs text-gray-400">({dayLogs.length})</span>
                    </p>
                    <div className="space-y-1.5 ml-5 border-l-2 border-gray-100 pl-4">
                      {dayLogs.map((log, i) => (
                        <div key={i} className={`${style[log.status] || style.info} border rounded-lg px-3 py-2`}>
                          <span className="text-sm">{log.message}</span>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {log.time?.split(' ')[1]}
                            {log.created !== undefined && ` +${log.created} ств.`}
                            {log.updated !== undefined && ` +${log.updated} онов.`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

function CityAutocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value || '')
  const [cities, setCities] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    apiClient.get(apiEndpoints.properties, { query: { page_size: 200 } })
      .then(res => {
        const addrs = (res.data?.results || []).map(p => p.address || '')
        const unique = [...new Set(addrs.map(a => a.split(',')[0].trim()).filter(Boolean))].sort()
        setCities(unique)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query
    ? cities.filter(c => c.toLowerCase().includes(query.toLowerCase()))
    : cities

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); onChange(e.target.value) }}
            onFocus={() => setOpen(true)}
            placeholder="Введіть або оберіть місто..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean pr-8"
          />
          {query && (
            <button onClick={() => { setQuery(''); onChange('') }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <i className="ri-close-line text-sm"></i>
            </button>
          )}
        </div>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading && <div className="px-4 py-2 text-sm text-gray-400">Завантаження...</div>}
          {filtered.slice(0, 30).map((city, i) => (
            <button key={i}
              onClick={() => { setQuery(city); onChange(city); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-deepOcean/5 transition flex items-center gap-2">
              <i className="ri-map-pin-line text-gray-400 text-xs"></i>
              {city}
            </button>
          ))}
          {filtered.length > 30 && (
            <div className="px-4 py-2 text-xs text-gray-400">...і ще {filtered.length - 30}</div>
          )}
        </div>
      )}
    </div>
  )
}

function SettingsTab() {
  const [activeSection, setActiveSection] = useState('crm')
  const [crmSettings, setCrmSettings] = useState({ url: '', api_key: '', secret_key: '', sync_interval: 30 })
  const [tgSettings, setTgSettings] = useState({ bot_token: '', chat_id: '', enabled: false })
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState(null)
  const [showLogs, setShowLogs] = useState(false)

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
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const saveCrm = async () => {
    setSaving(true); setStatus(null)
    try {
      await apiClient.request(apiEndpoints.appSettings, { method: 'POST', json: { key: 'crm', value: crmSettings }, csrf: true })
      setStatus({ type: 'success', message: 'CRM збережено' })
    } catch (err) { setStatus({ type: 'error', message: err.message }) }
    finally { setSaving(false) }
  }

  const saveTelegram = async () => {
    setSaving(true); setStatus(null)
    try {
      await apiClient.request(apiEndpoints.appSettings, { method: 'POST', json: { key: 'telegram', value: tgSettings }, csrf: true })
      setStatus({ type: 'success', message: 'Telegram збережено' })
    } catch (err) { setStatus({ type: 'error', message: err.message }) }
    finally { setSaving(false) }
  }

  const saveTemplates = async () => {
    setSaving(true); setStatus(null)
    try {
      await apiClient.request(apiEndpoints.telegramTemplates, { method: 'POST', json: { action: 'save', templates }, csrf: true })
      setStatus({ type: 'success', message: 'Шаблони збережено' })
    } catch (err) { setStatus({ type: 'error', message: err.message }) }
    finally { setSaving(false) }
  }

  const testConnection = async () => {
    setTestingConnection(true); setConnectionResult(null)
    const start = Date.now()
    try {
      const res = await apiClient.get(apiEndpoints.properties, { query: { page_size: 1 } })
      setConnectionResult({ success: true, message: `API доступне. ${res.data?.count || 0} об'єктів.`, duration: `${Date.now() - start}ms` })
    } catch (err) {
      setConnectionResult({ success: false, message: `Помилка: ${err.message}`, duration: `${Date.now() - start}ms` })
    } finally { setTestingConnection(false) }
  }

  const addTemplate = () => {
    setTemplates(prev => [...prev, {
      name: '', event_type: 'new_property', template: "{title}\n{price} $\n{address}\n{link}", is_active: true,
    }])
  }
  const updateTemplate = (i, data) => setTemplates(prev => prev.map((t, idx) => idx === i ? data : t))
  const removeTemplate = (i) => setTemplates(prev => prev.filter((_, idx) => idx !== i))

  const INTERVALS = [
    { value: 15, label: 'Кожні 15 хв' },
    { value: 30, label: 'Кожні 30 хв' },
    { value: 60, label: 'Кожну годину' },
    { value: 360, label: 'Кожні 6 годин' },
    { value: 1440, label: 'Раз на день' },
  ]

  return (
    <div className="space-y-6">
      {showLogs && <SyncLogsModal onClose={() => setShowLogs(false)} />}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-deepOcean">
          <i className="ri-settings-3-line mr-2"></i>Налаштування
        </h2>
        <button onClick={() => setShowLogs(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">
          <i className="ri-history-line"></i> Логи sync
        </button>
      </div>

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
          <button key={tab.id} onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeSection === tab.id ? 'bg-white text-deepOcean shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <i className={tab.icon}></i>{tab.label}
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
                {testingConnection ? 'Перевірка...' : 'Тест з\'єднання'}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Автосинхронізація</label>
              <select value={crmSettings.sync_interval} onChange={e => setCrmSettings({ ...crmSettings, sync_interval: Number(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm">
                {INTERVALS.map(iv => <option key={iv.value} value={iv.value}>{iv.label}</option>)}
              </select>
            </div>
            <button onClick={saveCrm} disabled={saving}
              className="px-4 py-2 bg-deepOcean text-white rounded-lg text-sm hover:bg-deepOcean/90 transition disabled:opacity-50">
              {saving ? 'Збереження...' : 'Зберегти CRM'}
            </button>
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
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={tgSettings.enabled}
                    onChange={e => setTgSettings({ ...tgSettings, enabled: e.target.checked })}
                    className="w-5 h-5 accent-deepOcean" />
                  <span className="text-sm font-medium text-gray-700">Увімкнути</span>
                </label>
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
            <p className="text-xs text-gray-400">Додавайте блоки та перетягуйте для зміни порядку.</p>
            <div className="space-y-4">
              {templates.map((t, i) => (
                <TemplateCard key={i} template={t} index={i}
                  onChange={(data) => updateTemplate(i, data)}
                  onRemove={() => removeTemplate(i)} />
              ))}
              {templates.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <i className="ri-file-text-line text-3xl text-gray-200 mb-2 block"></i>
                  <p className="text-gray-400 text-sm mb-2">Шаблонів ще немає</p>
                  <button onClick={addTemplate} className="text-sm text-deepOcean hover:underline font-medium">Додати перший</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { CityAutocomplete }
export default SettingsTab
