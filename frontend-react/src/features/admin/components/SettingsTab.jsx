import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(index)); dragHandlers.onStart(index) }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; dragHandlers.onOver(index) }}
      onDrop={(e) => { e.preventDefault(); dragHandlers.onDrop(index) }}
      onDragEnd={dragHandlers.onEnd}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded border transition text-sm ${
        isDragOver ? 'border-deepOcean bg-deepOcean/5' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <span className="text-gray-300 cursor-grab shrink-0 select-none text-xs">
        <i className="ri-draggable"></i>
      </span>

      {isVariable ? (
        <span className="shrink-0 px-1.5 py-0.5 rounded bg-deepOcean/10 text-deepOcean text-xs font-medium">
          {bt?.label}
        </span>
      ) : block.type === 'newline' ? (
        <span className="shrink-0 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs">
          ↵
        </span>
      ) : null}

      {block.type === 'text' ? (
        <textarea value={block.value} onChange={e => onChange({ ...block, value: e.target.value })}
          placeholder="Текст..." rows={2}
          className="flex-1 min-w-0 px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-sm resize-none" />
      ) : block.type === 'newline' ? (
        <span className="flex-1 text-xs text-gray-400 italic">переніс</span>
      ) : (
        <span className="flex-1 px-1.5 py-0.5 bg-deepOcean/5 border border-dashed border-deepOcean/20 rounded text-xs text-deepOcean font-mono truncate">
          {`{${block.type}}`}
        </span>
      )}

      <button onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded border border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 transition text-xs">
        <i className="ri-close-line"></i>
      </button>
    </div>
  )
}

function TemplateCard({ template, index, onChange, onRemove }) {
  const blocks = useMemo(() => parseTemplateToBlocks(template.template), [template.template])
  const [dragOver, setDragOver] = useState(null)
  const dragRef = useRef(null)
  const eventType = EVENT_TYPES.find(t => t.value === template.event_type) || EVENT_TYPES[0]

  const emitBlocks = (newBlocks) => {
    onChange({ ...template, template: blocksToTemplate(newBlocks) })
  }

  const addBlock = (type) => emitBlocks([...blocks, { type, value: '' }])
  const updateBlock = (i, data) => emitBlocks(blocks.map((b, idx) => idx === i ? data : b))
  const removeBlock = (i) => emitBlocks(blocks.filter((_, idx) => idx !== i))

  const dragHandlers = {
    onStart: (i) => { dragRef.current = i },
    onOver: (i) => setDragOver(i),
    onDrop: (toIndex) => {
      const from = dragRef.current
      if (from === null || from === undefined || from === toIndex) { setDragOver(null); dragRef.current = null; return }
      const nb = [...blocks]; const [moved] = nb.splice(from, 1); nb.splice(toIndex, 0, moved)
      emitBlocks(nb); setDragOver(null); dragRef.current = null
    },
    onEnd: () => { setDragOver(null); dragRef.current = null },
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${eventType.color}`}>
          <i className={`${eventType.icon} mr-0.5`}></i>{eventType.label}
        </span>
        <input type="text" value={template.name} onChange={e => onChange({ ...template, name: e.target.value })}
          placeholder="Назва" className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded text-sm" />
        <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
          <input type="checkbox" checked={template.is_active}
            onChange={e => onChange({ ...template, is_active: e.target.checked })} className="accent-deepOcean w-3.5 h-3.5" />
          <span className="hidden sm:inline">Активний</span>
        </div>
        <button onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center rounded border border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 transition shrink-0">
          <i className="ri-close-line text-xs"></i>
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex gap-1 flex-wrap">
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} onClick={() => addBlock(bt.type)}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs hover:bg-deepOcean hover:text-white transition">
              <i className={bt.icon}></i>{bt.label}
            </button>
          ))}
        </div>
        <div className="space-y-1 min-h-[32px]">
          {blocks.map((block, i) => (
            <TemplateBlock key={`${index}-${i}-${block.type}-${block.value?.slice(0, 5)}`}
              block={block} index={i} onChange={(d) => updateBlock(i, d)}
              onRemove={() => removeBlock(i)} dragHandlers={dragHandlers} isDragOver={dragOver === i} />
          ))}
          {blocks.length === 0 && <p className="text-gray-400 text-xs text-center py-2">Додайте блоки</p>}
        </div>
        {template.template && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 mb-1 font-medium">Превʼю повідомлення:</p>
            <div className="bg-[#E3F2FD] rounded-xl p-3 max-w-sm">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-fixel">
                {template.template
                  .replace(/\{title\}/g, 'Продаж будинку в Хусті')
                  .replace(/\{price\}/g, '85 000')
                  .replace(/\{address\}/g, 'вул. Шевченка, 10')
                  .replace(/\{rooms\}/g, '3')
                  .replace(/\{area\}/g, '95')
                  .replace(/\{link\}/g, 'https://dominium.ua/property/abc123/')
                  .replace(/\{deal_type\}/g, 'Продаж')
                  .replace(/\{property_type\}/g, 'Будинок')
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SyncLogsModal({ onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get(apiEndpoints.appSettings, { query: { key: 'sync_logs' } })
      .then(r => setLogs(r.data?.result?.sync_logs || []))
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  const grouped = logs.reduce((acc, l) => { const d = l.time?.split(' ')[0] || '?'; (acc[d] = acc[d] || []).push(l); return acc }, {})
  const st = { success: 'bg-green-50 border-green-200', error: 'bg-red-50 border-red-200', info: 'bg-blue-50 border-blue-200' }

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
            : logs.length === 0 ? <div className="text-center py-12 text-gray-400"><i className="ri-history-line text-4xl text-gray-200 mb-3 block"></i><p className="text-sm">Логів поки немає</p></div>
            : (
              <div className="space-y-6">
                {Object.entries(grouped).reverse().map(([day, dayLogs]) => (
                  <div key={day}>
                    <p className="text-sm font-semibold text-deepOcean mb-2 flex items-center gap-2">
                      <i className="ri-calendar-line text-gray-400"></i> {day}
                      <span className="text-xs text-gray-400">({dayLogs.length})</span>
                    </p>
                    <div className="space-y-1.5 ml-5 border-l-2 border-gray-100 pl-4">
                      {dayLogs.map((log, i) => (
                        <div key={i} className={`${st[log.status] || st.info} border rounded-lg px-3 py-2`}>
                          <span className="text-sm">{log.message}</span>
                          <div className="text-xs text-gray-500 mt-0.5">{log.time?.split(' ')[1]}{log.created !== undefined && ` +${log.created} ств.`}{log.updated !== undefined && ` +${log.updated} онов.`}</div>
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
  const [cities, setCities] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  const hasLoadedCities = useRef(false)

  const query = value || ''

  const loadCities = useCallback(async () => {
    if (hasLoadedCities.current || loading) return
    setLoading(true)
    try {
      const response = await apiClient.get(apiEndpoints.propertyCities)
      setCities(response.data?.results || [])
      hasLoadedCities.current = true
    } catch {
      setCities([])
    } finally {
      setLoading(false)
    }
  }, [loading])

  const openCityList = () => {
    setOpen(true)
    loadCities()
  }

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = query ? cities.filter(c => c.toLowerCase().includes(query.toLowerCase())) : cities

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input type="text" value={query}
          onChange={e => { onChange(e.target.value); openCityList() }}
          onFocus={openCityList}
          placeholder="Введіть або оберіть місто..."
          className="admin-input pr-8" />
        {query && <button type="button" onClick={() => { onChange('') }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <i className="ri-close-line text-sm"></i></button>}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading && <div className="px-4 py-2 text-sm text-gray-400">Завантаження...</div>}
          {filtered.slice(0, 30).map((city, i) => (
            <button key={i} type="button" onClick={() => { onChange(city); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-deepOcean/5 transition flex items-center gap-2">
              <i className="ri-map-pin-line text-gray-400 text-xs"></i>{city}
            </button>
          ))}
          {filtered.length > 30 && <div className="px-4 py-2 text-xs text-gray-400">...і ще {filtered.length - 30}</div>}
        </div>
      )}
    </div>
  )
}

function SettingsTab() {
  const [activeSection, setActiveSection] = useState('general')
  const [crmSettings, setCrmSettings] = useState({ url: '', api_key: '', secret_key: '', sync_interval: 30 })
  const [tgSettings, setTgSettings] = useState({ bot_token: '', chat_id: '', enabled: false })
  const [templates, setTemplates] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState(null)
  const [showLogs, setShowLogs] = useState(false)

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const response = await apiClient.get(apiEndpoints.appSettings, { query: { key: 'sync_logs' } })
      setLogs(response.data?.result?.sync_logs || [])
    } catch (e) {
      setStatus({ type: 'error', message: e.message || 'Не вдалося завантажити логи' })
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, t, l] = await Promise.all([
        apiClient.get(apiEndpoints.appSettings),
        apiClient.get(apiEndpoints.telegramTemplates),
        apiClient.get(apiEndpoints.appSettings, { query: { key: 'sync_logs' } }),
      ])
      const d = s.data?.result || {}
      if (d.crm) setCrmSettings(p => ({ ...p, ...d.crm }))
      if (d.telegram) setTgSettings(p => ({ ...p, ...d.telegram }))
      setTemplates(t.data?.results || [])
      setLogs(l.data?.result?.sync_logs || [])
    } catch (e) { setStatus({ type: 'error', message: e.message || 'Не вдалося завантажити налаштування' }) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (key, value) => {
    setSaving(true); setStatus(null)
    try {
      if (key === 'templates') {
        await apiClient.request(apiEndpoints.telegramTemplates, { method: 'POST', json: { action: 'save', templates: value }, csrf: true })
        const templatesResponse = await apiClient.get(apiEndpoints.telegramTemplates)
        setTemplates(templatesResponse.data?.results || [])
      } else {
        await apiClient.request(apiEndpoints.appSettings, { method: 'POST', json: { key, value }, csrf: true })
        const settingsResponse = await apiClient.get(apiEndpoints.appSettings)
        const nextSettings = settingsResponse.data?.result || {}
        if (nextSettings.crm) setCrmSettings(p => ({ ...p, ...nextSettings.crm }))
        if (nextSettings.telegram) setTgSettings(p => ({ ...p, ...nextSettings.telegram }))
      }
      setStatus({ type: 'success', message: 'Збережено' })
    } catch (e) { setStatus({ type: 'error', message: e.message || 'Не вдалося зберегти налаштування' }) }
    finally { setSaving(false) }
  }

  const testConnection = async () => {
    setTestingConnection(true); setConnectionResult(null); const s = Date.now()
    try {
      const r = await apiClient.get(apiEndpoints.properties, { query: { page_size: 1 } })
      setConnectionResult({ ok: true, msg: `API доступне. ${r.data?.count || 0} об'єктів.`, dur: `${Date.now() - s}ms` })
    } catch (e) { setConnectionResult({ ok: false, msg: `Помилка: ${e.message}`, dur: `${Date.now() - s}ms` }) }
    finally { setTestingConnection(false) }
  }

  const addTemplate = () => setTemplates(p => [...p, { name: '', event_type: 'new_property', template: "{title}\n{price} $\n{address}\n{link}", is_active: true }])
  const updateTemplate = (i, d) => setTemplates(p => p.map((t, idx) => idx === i ? d : t))
  const removeTemplate = (i) => setTemplates(p => p.filter((_, idx) => idx !== i))
  const activeTemplatesCount = templates.filter(template => template.is_active).length
  const lastLog = logs[logs.length - 1]
  const settingsSections = [
    { id: 'general', label: 'Статус', icon: 'ri-dashboard-line' },
    { id: 'crm', label: 'CRM', icon: 'ri-cloud-line' },
    { id: 'telegram', label: 'Telegram', icon: 'ri-telegram-line' },
    { id: 'templates', label: 'Шаблони', icon: 'ri-chat-settings-line', count: templates.length },
    { id: 'logs', label: 'Історія', icon: 'ri-history-line', count: logs.length },
  ]

  return (
    <div className="settings-tab">
      {showLogs && <SyncLogsModal onClose={() => setShowLogs(false)} />}
      <div className="settings-tab__header">
        <div>
          <h2 className="settings-tab__title"><i className="ri-settings-3-line"></i>Налаштування</h2>
          <p className="settings-tab__subtitle">CRM, Telegram-сповіщення, шаблони повідомлень та історія синхронізації.</p>
        </div>
        <button onClick={load} disabled={loading} className="admin-button admin-button--secondary">
          <i className={`ri-refresh-line ${loading ? 'admin-spin' : ''}`}></i>
          Оновити
        </button>
      </div>

      {status && <div className={`p-2.5 rounded-lg text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
        <i className={status.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}></i>{status.message}
      </div>}
      {loading && (
        <div className="admin-alert admin-alert--info" role="status">
          <i className="ri-loader-4-line admin-spin" aria-hidden="true"></i>
          Завантаження налаштувань...
        </div>
      )}

      <div className="settings-tab__nav" aria-label="Розділи налаштувань">
        {settingsSections.map(section => (
          <button key={section.id} onClick={() => setActiveSection(section.id)}
            className={`settings-tab__nav-button ${activeSection === section.id ? 'is-active' : ''}`}>
            <span><i className={section.icon}></i>{section.label}</span>
            {section.count !== undefined && <small>{section.count}</small>}
          </button>
        ))}
      </div>

      {activeSection === 'general' && (
        <div className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3>Загальний стан</h3>
              <p>Короткий зріз підключень і активності без зміни даних.</p>
            </div>
          </div>
          <div className="settings-status-grid">
            <div className="settings-status-card">
              <i className="ri-cloud-line"></i>
              <div>
                <span>CRM</span>
                <strong>{crmSettings.url ? 'URL задано' : 'URL не задано'}</strong>
                <p>{crmSettings.sync_interval ? `Синхронізація кожні ${crmSettings.sync_interval} хв` : 'Інтервал не задано'}</p>
              </div>
            </div>
            <div className="settings-status-card">
              <i className="ri-telegram-line"></i>
              <div>
                <span>Telegram</span>
                <strong>{tgSettings.enabled ? 'Увімкнено' : 'Вимкнено'}</strong>
                <p>{tgSettings.chat_id ? 'Chat ID задано' : 'Chat ID не задано'}</p>
              </div>
            </div>
            <div className="settings-status-card">
              <i className="ri-chat-settings-line"></i>
              <div>
                <span>Шаблони</span>
                <strong>{activeTemplatesCount} активних</strong>
                <p>{templates.length} всього</p>
              </div>
            </div>
            <div className="settings-status-card">
              <i className="ri-history-line"></i>
              <div>
                <span>Історія</span>
                <strong>{logs.length} записів</strong>
                <p>{lastLog?.time || 'Останніх подій немає'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'crm' && (
        <div className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3>CRM</h3>
              <p>Параметри Realtsoft API та інтервал автоматичної синхронізації.</p>
            </div>
            <div className="settings-section__actions">
              <button onClick={testConnection} disabled={testingConnection}
                className="admin-button admin-button--secondary">
                <i className={`ri-signal-tower-line ${testingConnection ? 'animate-pulse' : ''}`}></i>
                {testingConnection ? 'Перевірка...' : 'Тест'}
              </button>
            </div>
          </div>
          <div className="settings-section__body">
            {connectionResult && <div className={`p-2.5 rounded-lg text-sm flex items-center gap-2 ${connectionResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              <i className={connectionResult.ok ? 'ri-check-line' : 'ri-error-warning-line'}></i>
              <span>{connectionResult.msg}</span><span className="text-xs text-gray-400 ml-auto">{connectionResult.dur}</span>
            </div>}
            <div className="admin-form-grid">
              <label className="admin-field admin-form-grid__full">
                <span>API URL</span>
                <input type="url" value={crmSettings.url} onChange={e => setCrmSettings({ ...crmSettings, url: e.target.value })}
                  placeholder="https://crm-dominium.realtsoft.net" className="admin-input" />
              </label>
              <label className="admin-field">
                <span>API Key</span>
                <input type="text" value={crmSettings.api_key} onChange={e => setCrmSettings({ ...crmSettings, api_key: e.target.value })} className="admin-input" />
              </label>
              <label className="admin-field">
                <span>Secret Key</span>
                <input type="password" value={crmSettings.secret_key} onChange={e => setCrmSettings({ ...crmSettings, secret_key: e.target.value })} className="admin-input" />
              </label>
              <label className="admin-field admin-form-grid__full">
                <span>Автосинхронізація</span>
                <select value={crmSettings.sync_interval} onChange={e => setCrmSettings({ ...crmSettings, sync_interval: Number(e.target.value) })} className="admin-select">
                  {[{ v: 15, l: '15 хв' }, { v: 30, l: '30 хв' }, { v: 60, l: '1 год' }, { v: 360, l: '6 год' }, { v: 1440, l: '1 день' }].map(i => <option key={i.v} value={i.v}>{i.l}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="settings-section__footer">
            <button onClick={() => save('crm', crmSettings)} disabled={saving}
              className="admin-button admin-button--primary">
              <i className={saving ? 'ri-loader-4-line admin-spin' : 'ri-save-line'}></i>
              {saving ? 'Збереження...' : 'Зберегти CRM'}
            </button>
          </div>
        </div>
      )}

      {activeSection === 'telegram' && (
        <div className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3>Telegram connection</h3>
              <p>Підключення бота і каналу для автоматичних повідомлень.</p>
            </div>
            <span className={`settings-pill ${tgSettings.enabled ? 'settings-pill--success' : ''}`}>
              {tgSettings.enabled ? 'Увімкнено' : 'Вимкнено'}
            </span>
          </div>
          <div className="settings-section__body">
            <div className="admin-form-grid">
              <label className="admin-field admin-form-grid__full">
                <span>Токен</span>
                <input type="password" value={tgSettings.bot_token} onChange={e => setTgSettings({ ...tgSettings, bot_token: e.target.value })}
                  placeholder="123456789:ABC..." className="admin-input" />
              </label>
              <label className="admin-field">
                <span>Chat ID</span>
                <input type="text" value={tgSettings.chat_id} onChange={e => setTgSettings({ ...tgSettings, chat_id: e.target.value })}
                  placeholder="-100..." className="admin-input" />
              </label>
              <label className="settings-toggle">
                <input type="checkbox" checked={tgSettings.enabled} onChange={e => setTgSettings({ ...tgSettings, enabled: e.target.checked })} />
                <span>Увімкнути відправку</span>
              </label>
            </div>
          </div>
          <div className="settings-section__footer">
            <button onClick={() => save('telegram', tgSettings)} disabled={saving}
              className="admin-button admin-button--primary">
              <i className={saving ? 'ri-loader-4-line admin-spin' : 'ri-save-line'}></i>
              {saving ? 'Збереження...' : 'Зберегти Telegram'}
            </button>
          </div>
        </div>
      )}

      {activeSection === 'templates' && (
        <div className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3>Telegram templates</h3>
              <p>Окремі шаблони для подій CRM, що зберігаються через Telegram templates API.</p>
            </div>
            <button onClick={addTemplate} className="admin-button admin-button--secondary"><i className="ri-add-line"></i>Додати</button>
          </div>
          <div className="settings-section__body">
            <div className="settings-template-list">
              {templates.map((t, i) => <TemplateCard key={i} template={t} index={i} onChange={(d) => updateTemplate(i, d)} onRemove={() => removeTemplate(i)} />)}
              {templates.length === 0 && (
                <div className="admin-empty-state">
                  <i className="ri-chat-settings-line" aria-hidden="true"></i>
                  <p>Шаблонів ще немає</p>
                  <span>Додайте перший шаблон, щоб налаштувати повідомлення для Telegram.</span>
                  <button onClick={addTemplate} className="admin-button admin-button--secondary mt-4">Додати перший</button>
                </div>
              )}
            </div>
          </div>
          <div className="settings-section__footer settings-section__footer--split">
            <span className="settings-muted">{templates.length} шаблонів, {activeTemplatesCount} активних</span>
            <button onClick={() => save('templates', templates)} disabled={saving}
              className="admin-button admin-button--primary">
              <i className={saving ? 'ri-loader-4-line admin-spin' : 'ri-save-line'}></i>
              {saving ? 'Збереження...' : 'Зберегти шаблони'}
            </button>
          </div>
        </div>
      )}

      {activeSection === 'logs' && (
        <div className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3>Logs & history</h3>
              <p>Історія синхронізації зберігається у ключі sync_logs.</p>
            </div>
            <div className="settings-section__actions">
              <button onClick={loadLogs} disabled={logsLoading} className="admin-button admin-button--secondary">
                <i className={`ri-refresh-line ${logsLoading ? 'admin-spin' : ''}`}></i>
                Оновити логи
              </button>
              <button onClick={() => setShowLogs(true)} className="admin-button admin-button--primary">
                <i className="ri-history-line"></i>
                Відкрити журнал
              </button>
            </div>
          </div>
          <div className="settings-section__body">
            {logsLoading ? (
              <div className="admin-empty-state">
                <i className="ri-loader-4-line admin-spin" aria-hidden="true"></i>
                <p>Завантаження логів...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="admin-empty-state">
                <i className="ri-history-line" aria-hidden="true"></i>
                <p>Логів поки немає</p>
                <span>Після синхронізацій тут зʼявляться останні записи історії.</span>
              </div>
            ) : (
              <div className="settings-log-list">
                {logs.slice(-6).reverse().map((log, i) => (
                  <div key={`${log.time || 'log'}-${i}`} className="settings-log-row">
                    <span className={`settings-log-row__status settings-log-row__status--${log.status || 'info'}`}></span>
                    <div>
                      <strong>{log.message}</strong>
                      <p>{log.time || 'Час не вказано'}{log.created !== undefined && ` · +${log.created} ств.`}{log.updated !== undefined && ` · +${log.updated} онов.`}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { CityAutocomplete }
export default SettingsTab
