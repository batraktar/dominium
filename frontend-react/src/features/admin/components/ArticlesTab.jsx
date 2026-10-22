import { useCallback, useEffect, useState } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

const EMPTY_FORM = { id: null, title: '', slug: '', summary: '', body: '', seo_title: '', seo_description: '', is_published: false }

function ArticlesTab() {
  const [articles, setArticles] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [coverImage, setCoverImage] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get(apiEndpoints.adminArticles)
      setArticles(data?.results || [])
      setError('')
    } catch (loadError) {
      setError(loadError?.message || 'Не вдалося завантажити статті.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }))

  const submit = async (event) => {
    event.preventDefault()
    const payload = new FormData()
    ;['title', 'slug', 'summary', 'body', 'seo_title', 'seo_description'].forEach((field) => payload.set(field, form[field]))
    payload.set('is_published', form.is_published ? 'true' : 'false')
    if (coverImage) payload.set('cover_image', coverImage)
    setSaving(true)
    setError('')
    try {
      const endpoint = form.id ? apiEndpoints.adminArticleItem(form.id) : apiEndpoints.adminArticles
      await apiClient.postForm(endpoint, payload)
      setForm(EMPTY_FORM)
      setCoverImage(null)
      await load()
    } catch (saveError) {
      setError(saveError?.message || 'Не вдалося зберегти статтю.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <div><h2 className="admin-panel__title">Статті</h2><p className="admin-panel__subtitle">Чернетки та опубліковані матеріали.</p></div>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => { setForm(EMPTY_FORM); setCoverImage(null) }}>Нова стаття</button>
      </div>
      {error ? <div className="admin-alert admin-alert--error mx-5 mt-4" role="alert">{error}</div> : null}
      <form onSubmit={submit} className="grid gap-4 p-5 lg:grid-cols-2">
        <label className="admin-field"><span>Назва</span><input className="admin-input" required value={form.title} onChange={(e) => update('title', e.target.value)} /></label>
        <label className="admin-field"><span>Унікальний slug</span><input className="admin-input" required pattern="[a-z0-9-]+" value={form.slug} onChange={(e) => update('slug', e.target.value)} /></label>
        <label className="admin-field lg:col-span-2"><span>Короткий опис</span><textarea className="admin-input" required maxLength="500" value={form.summary} onChange={(e) => update('summary', e.target.value)} /></label>
        <label className="admin-field lg:col-span-2"><span>Текст (звичайний текст, без HTML)</span><textarea className="admin-input min-h-64" required value={form.body} onChange={(e) => update('body', e.target.value)} /></label>
        <label className="admin-field"><span>SEO title</span><input className="admin-input" maxLength="200" value={form.seo_title} onChange={(e) => update('seo_title', e.target.value)} /></label>
        <label className="admin-field"><span>SEO description</span><input className="admin-input" maxLength="320" value={form.seo_description} onChange={(e) => update('seo_description', e.target.value)} /></label>
        <label className="admin-field"><span>Обкладинка</span><input type="file" accept="image/*" onChange={(e) => setCoverImage(e.target.files?.[0] || null)} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_published} onChange={(e) => update('is_published', e.target.checked)} /> Опубліковано</label>
        <div className="lg:col-span-2"><button className="admin-button admin-button--primary" disabled={saving}>{saving ? 'Збереження…' : 'Зберегти статтю'}</button></div>
      </form>
      <div className="admin-table-wrap">
        <table className="admin-table"><thead><tr><th>Назва</th><th>Статус</th><th>Оновлено</th><th></th></tr></thead>
          <tbody>{articles.map((article) => <tr key={article.id}><td>{article.title}<div className="admin-property-meta">/{article.slug}</div></td><td>{article.is_published ? 'Опубліковано' : 'Чернетка'}</td><td>{new Date(article.updated_at).toLocaleDateString('uk-UA')}</td><td className="text-right"><button type="button" className="admin-button admin-button--secondary" onClick={() => { setForm(article); setCoverImage(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Редагувати</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

export default ArticlesTab
