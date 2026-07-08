import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

const EVENT_TYPES = [
  { value: 'new_property', label: 'Новий об\'єкт' },
  { value: 'price_changed', label: 'Зміна ціни' },
  { value: 'new_inquiry', label: 'Нова заявка' },
  { value: 'status_changed', label: 'Зміна статусу' },
]

const AVAILABLE_VARS = [
  { key: '{title}', label: 'Назва' },
  { key: '{price}', label: 'Ціна' },
  { key: '{address}', label: 'Адреса' },
  { key: '{rooms}', label: 'Кімнат' },
  { key: '{area}', label: 'Площа' },
  { key: '{link}', label: 'Посилання' },
  { key: '{deal_type}', label: 'Тип угоди' },
  { key: '{property_type}', label: 'Тип нерухомості' },
]

function TemplateBlock({ template, index, onChange, onRemove, onDragStart, onDragOver, onDrop, onDragEnd, dragOver }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index) }}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-xl border-2 p-4 transition cursor-grab ${
        dragOver === index ? 'border-deepOcean' : 'border-gray-100'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-gray-400 cursor-grab">
          <i className="ri-draggable text-xl"></i>
        </span>
        <select
          value={template.event_type}
          onChange={e => onChange({ ...template, event_type: e.target.value })}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
        >
          {EVENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={template.name}
          onChange={e => onChange({ ...template, name: e.target.value })}
          placeholder="Назва шаблону"
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={template.is_active}
            onChange={e => onChange({ ...template, is_active: e.target.checked })}
            className="accent-deepOcean"
          />
          Активний
        </label>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 transition">
          <i className="ri-delete-bin-line"></i>
        </button>
      </div>
      <div className="relative">
        <textarea
          value={template.template}
          onChange={e => onChange({ ...template, template: e.target.value })}
          rows={3}
          placeholder="Шаблон повідомлення..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {AVAILABLE_VARS.map(v => (
            <button
              key={v.key}
              onClick={() => {
                const ta = document.querySelector(`#template-${index}`)
                if (ta) {
                  const pos = ta.selectionStart
                  const before = template.template.slice(0, pos)
                  const after = template.template.slice(pos)
                  onChange({ ...template, template: before + v.key + after })
                } else {
                  onChange({ ...template, template: template.template + v.key })
                }
              }}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs hover:bg-deepOcean hover:text-white transition"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingsTab() {
  const [activeSection, setActiveSection] = useState('crm')
  const [crmSettings, setCrmSettings] = useState({ url: '', api_key: '', secret_key: '', sync_enabled: false, sync_interval: 30 })
  const [tgSettings, setTgSettings] = useState({ bot_token: '', chat_id: '', enabled: false })
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [dragOver, setDragOver] = useState(false)

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
        method: 'POST',
        json: { key: 'crm', value: crmSettings },
        csrf: true,
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
        method: 'POST',
        json: { key: 'telegram', value: tgSettings },
        csrf: true,
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
        method: 'POST',
        json: { action: 'save', templates },
        csrf: true,
      })
      setStatus({ type: 'success', message: 'Шаблони збережено' })
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
      template: '🏗 Новий об\\'єкт:\\n{title}\\n💰 {price} $\\n📍 {address}\\n🔗 {link}',
      is_active: true,
    }])
  }

  const updateTemplate = (index, data) => {
    setTemplates(prev => prev.map((t, i) => i === index ? data : t))
  }

  const removeTemplate = (index) => {
    setTemplates(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragStart = (index) => {
    setDragOver(index)
  }

  const handleDragOver = (index) => {
    setDragOver(index)
  }

  const handleDrop = (toIndex) => {
    if (dragOver === null || dragOver === toIndex) { setDragOver(null); return }
    const newTemplates = [...templates]
    const [moved] = newTemplates.splice(dragOver, 1)
    newTemplates.splice(toIndex, 0, moved)
    setTemplates(newTemplates)
    setDragOver(null)
  }

  const handleDragEnd = () => setDragOver(null)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-deepOcean">
        <i className="ri-settings-3-line mr-2"></i>
        Налаштування
      </h2>

      {status && (
        <div className={`p-3 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {status.message}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'crm', label: 'CRM', icon: 'ri-cloud-line' },
          { id: 'telegram', label: 'Telegram', icon: 'ri-telegram-line' },
          { id: 'templates', label: 'Шаблони', icon: 'ri-file-text-line' },
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
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-semibold text-deepOcean">Realtsoft CRM</h3>
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Авто-синхронізація</label>
              <select value={crmSettings.sync_interval} onChange={e => setCrmSettings({ ...crmSettings, sync_interval: Number(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm">
                <option value={15}>Кожні 15 хвилин</option>
                <option value={30}>Кожні 30 хвилин</option>
                <option value={60}>Кожну годину</option>
                <option value={360}>Кожні 6 годин</option>
              </select>
            </div>
          </div>
          <button onClick={saveCrm} disabled={saving}
            className="px-4 py-2 bg-deepOcean text-white rounded-lg text-sm hover:bg-deepOcean/90 transition disabled:opacity-50">
            {saving ? 'Збереження...' : 'Зберегти CRM'}
          </button>
        </div>
      )}

      {activeSection === 'telegram' && (
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
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={tgSettings.enabled}
                  onChange={e => setTgSettings({ ...tgSettings, enabled: e.target.checked })}
                  className="w-5 h-5 accent-deepOcean" />
                <span className="text-sm font-medium text-gray-700">Увімкнути повідомлення</span>
              </label>
            </div>
          </div>
          <button onClick={saveTelegram} disabled={saving}
            className="px-4 py-2 bg-deepOcean text-white rounded-lg text-sm hover:bg-deepOcean/90 transition disabled:opacity-50">
            {saving ? 'Збереження...' : 'Зберегти Telegram'}
          </button>
        </div>
      )}

      {activeSection === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-deepOcean">Шаблони повідомлень</h3>
            <div className="flex gap-2">
              <button onClick={addTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-coolSage text-white rounded-lg text-sm hover:bg-coolSage/90 transition">
                <i className="ri-add-line"></i> Додати
              </button>
              <button onClick={saveTemplates} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-deepOcean text-white rounded-lg text-sm hover:bg-deepOcean/90 transition disabled:opacity-50">
                <i className="ri-save-line"></i> {saving ? 'Збереження...' : 'Зберегти'}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500">Перетягуйте блоки для зміни порядку. Використовуйте змінні {`{title}, {price} тощо`}</p>
          <div className="space-y-3">
            {templates.map((t, i) => (
              <TemplateBlock
                key={i}
                template={t}
                index={i}
                onChange={(data) => updateTemplate(i, data)}
                onRemove={() => removeTemplate(i)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                dragOver={dragOver}
              />
            ))}
            {templates.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">Шаблонів ще немає. Натисніть «Додати».</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsTab
