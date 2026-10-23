import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import { ARTICLE_CHATGPT_PROMPT, getArticleChatGptUrl, parseArticleImport } from '../model/articleImportModel.js'
import ArticleAnalytics from './ArticleAnalytics.jsx'

const EMPTY_FORM = { id: null, title: '', slug: '', summary: '', body: '', seo_title: '', seo_description: '', is_published: false, images: [], cover_image_url: '' }

function ArticlesTab() {
  const [articles, setArticles] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [coverImage, setCoverImage] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importPreview, setImportPreview] = useState(null)
  const bodyRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get(apiEndpoints.adminArticles)
      setArticles(data?.results || [])
      setError('')
    } catch (loadError) { setError(loadError?.message || 'Не вдалося завантажити статті.') }
  }, [])
  useEffect(() => { load() }, [load])

  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }))
  const reset = () => { setForm(EMPTY_FORM); setCoverImage(null); setGalleryFiles([]); setError(''); setNotice('') }
  const openChatGpt = () => {
    window.open(getArticleChatGptUrl(), '_blank', 'noopener,noreferrer')
    navigator.clipboard.writeText(ARTICLE_CHATGPT_PROMPT).then(() => setNotice('Промпт скопійовано та відкрито ChatGPT.')).catch(() => setNotice('ChatGPT відкрито.'))
  }
  const insertBodyTemplate = (template, cursorOffset) => {
    const textarea = bodyRef.current
    const start = textarea?.selectionStart ?? form.body.length
    const end = textarea?.selectionEnd ?? start
    const next = `${form.body.slice(0, start)}${template}${form.body.slice(end)}`
    update('body', next)
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(start + cursorOffset, start + cursorOffset)
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    const payload = new FormData()
    ;['title', 'slug', 'summary', 'body', 'seo_title', 'seo_description'].forEach((field) => payload.set(field, form[field]))
    payload.set('is_published', form.is_published ? 'true' : 'false')
    if (coverImage) payload.set('cover_image', coverImage)
    setSaving(true); setError(''); setNotice('')
    try {
      const endpoint = form.id ? apiEndpoints.adminArticleItem(form.id) : apiEndpoints.adminArticles
      const { data } = await apiClient.postForm(endpoint, payload)
      let saved = data.result
      if (galleryFiles.length) {
        const images = new FormData()
        galleryFiles.forEach((file) => images.append('images', file))
        images.set('alt_texts', JSON.stringify(galleryFiles.map(() => saved.title)))
        images.set('captions', JSON.stringify(galleryFiles.map(() => '')))
        await apiClient.request(apiEndpoints.adminArticleImages(saved.id), { method: 'POST', body: images, csrf: true })
        const refreshed = await apiClient.get(apiEndpoints.adminArticleItem(saved.id))
        saved = refreshed.data.result
      }
      setForm(saved); setCoverImage(null); setGalleryFiles([]); setNotice('Статтю збережено.'); await load()
    } catch (saveError) { setError(saveError?.message || 'Не вдалося зберегти статтю.') }
    finally { setSaving(false) }
  }

  const updateImage = (imageId, field, value) => update('images', form.images.map((item) => item.id === imageId ? { ...item, [field]: value } : item))
  const saveImage = async (image) => {
    try {
      await apiClient.request(apiEndpoints.adminArticleImageItem(image.id), { method: 'PATCH', json: { alt_text: image.alt_text, caption: image.caption }, csrf: true })
      setNotice('Опис фото збережено.')
    } catch (imageError) { setError(imageError?.message || 'Не вдалося оновити фото.') }
  }
  const deleteImage = async (imageId) => {
    try {
      await apiClient.request(apiEndpoints.adminArticleImageItem(imageId), { method: 'DELETE', csrf: true, parseAs: 'raw' })
      update('images', form.images.filter((item) => item.id !== imageId)); setNotice('Фото видалено.')
    } catch (imageError) { setError(imageError?.message || 'Не вдалося видалити фото.') }
  }
  const moveImage = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= form.images.length) return
    const images = [...form.images]; [images[index], images[target]] = [images[target], images[index]]
    setForm((current) => ({ ...current, images }))
    try { await apiClient.postJson(apiEndpoints.adminArticleImagesOrder(form.id), { ids: images.map((item) => item.id) }) }
    catch (imageError) { setError(imageError?.message || 'Не вдалося змінити порядок фото.') }
  }

  const previewImport = async () => {
    try {
      const { data } = await apiClient.postJson(apiEndpoints.adminArticleImportPreview, parseArticleImport(importJson))
      setImportPreview(data.result); setError(''); setNotice('JSON перевірено. Буде створено чернетку.')
    } catch (importError) { setImportPreview(null); setError(importError?.message || 'Не вдалося перевірити JSON.') }
  }
  const saveImport = async () => {
    try {
      const { data } = await apiClient.postJson(apiEndpoints.adminArticleImport, parseArticleImport(importJson))
      setImportPreview(null); setImportJson(''); setForm(data.result); setNotice('Чернетку імпортовано.'); await load()
    } catch (importError) { setError(importError?.message || 'Не вдалося імпортувати статтю.') }
  }
  const readJsonFile = (file) => {
    if (!file) return
    file.text().then(setImportJson).catch(() => setError('Не вдалося прочитати JSON-файл.'))
  }

  return <div className="admin-panel">
    <div className="admin-panel__header"><div><h2 className="admin-panel__title">Статті</h2><p className="admin-panel__subtitle">Створення, фото, імпорт чернеток і публікація.</p></div><button type="button" className="admin-button admin-button--secondary" onClick={reset}>Нова стаття</button></div>
    {error ? <div className="admin-alert admin-alert--error article-alert" role="alert">{error}</div> : null}
    {notice ? <div className="admin-alert admin-alert--success article-alert" role="status">{notice}</div> : null}
    <ArticleAnalytics />
    <details className="article-import-panel"><summary>Імпорт із ChatGPT JSON</summary><div className="article-import-panel__content">
      <p>Скопіюйте промпт у ChatGPT, вставте чистий JSON або виберіть .json-файл. Імпорт завжди створює чернетку.</p>
      <div className="admin-toolbar"><button type="button" className="admin-button admin-button--primary" onClick={openChatGpt}>Створити в ChatGPT ↗</button><button type="button" className="admin-button admin-button--secondary" onClick={() => navigator.clipboard.writeText(ARTICLE_CHATGPT_PROMPT).then(() => setNotice('Промпт скопійовано.')).catch(() => setError('Не вдалося скопіювати промпт.'))}>Лише скопіювати</button><label className="admin-button admin-button--ghost">Вибрати JSON<input className="sr-only" type="file" accept="application/json,.json" onChange={(event) => readJsonFile(event.target.files?.[0])} /></label></div>
      <textarea className="admin-textarea article-import-json" value={importJson} onChange={(event) => { setImportJson(event.target.value); setImportPreview(null); setError('') }} placeholder='{"title":"..."}' />
      <div className="admin-toolbar"><button type="button" className="admin-button admin-button--secondary" onClick={previewImport}>Перевірити</button><button type="button" className="admin-button admin-button--primary" disabled={!importPreview} onClick={saveImport}>Імпортувати чернетку</button></div>
      {importPreview ? <div className="article-import-preview"><strong>{importPreview.title}</strong><span>/{importPreview.slug}</span><p>{importPreview.summary}</p><p>Фото: {importPreview.cover_image_url ? 'обкладинка' : 'без обкладинки'} · галерея: {importPreview.images?.length || 0}</p></div> : null}
    </div></details>
    <form onSubmit={submit} className="article-editor-grid">
      <label className="admin-field"><span>Назва <small>{form.title.length}/200</small></span><input className="admin-input" required maxLength="200" value={form.title} onChange={(e) => update('title', e.target.value)} /></label>
      <label className="admin-field"><span>Унікальний slug <small>латиниця та дефіси</small></span><input className="admin-input" required pattern="[a-z0-9-]+" value={form.slug} onChange={(e) => update('slug', e.target.value)} /></label>
      <label className="admin-field article-wide"><span>Короткий опис <small>{form.summary.length}/500</small></span><textarea className="admin-textarea" required maxLength="500" value={form.summary} onChange={(e) => update('summary', e.target.value)} /></label>
      <div className="admin-field article-wide"><span>Текст статті <small>{form.body.length} символів</small></span><div className="article-editor-toolbar"><button type="button" onClick={() => insertBodyTemplate('\n\nНовий розділ\n\n', 2)}>+ Розділ</button><button type="button" onClick={() => insertBodyTemplate('\n\n• Пункт списку\n• Ще один пункт\n\n', 4)}>+ Список</button><button type="button" onClick={() => insertBodyTemplate('\n\nПитання?\n\nВідповідь.\n\n', 2)}>+ FAQ</button></div><textarea ref={bodyRef} className="admin-textarea article-body" required value={form.body} onChange={(e) => update('body', e.target.value)} /><small>Окремий короткий рядок між порожніми рядками відобразиться як заголовок розділу.</small></div>
      <label className="admin-field"><span>SEO title <small>{form.seo_title.length}/200</small></span><input className="admin-input" maxLength="200" value={form.seo_title} onChange={(e) => update('seo_title', e.target.value)} /></label>
      <label className="admin-field"><span>SEO description <small>{form.seo_description.length}/320</small></span><textarea className="admin-textarea" maxLength="320" value={form.seo_description} onChange={(e) => update('seo_description', e.target.value)} /></label>
      <label className="admin-field"><span>Обкладинка</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setCoverImage(e.target.files?.[0] || null)} />{form.cover_image_url ? <img className="article-cover-preview" src={form.cover_image_url} alt="Поточна обкладинка" /> : null}</label>
      <label className="admin-field"><span>Фото галереї</span><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))} /><small>Нові фото завантажаться під час збереження.</small></label>
      <label className="article-publish"><input type="checkbox" checked={form.is_published} onChange={(e) => update('is_published', e.target.checked)} /> Опубліковано</label>
      <div className="article-wide article-save-bar"><span>{form.is_published ? 'Стаття буде публічною' : 'Зберігається як чернетка'}</span>{form.is_published && form.absolute_url ? <a href={form.absolute_url} target="_blank" rel="noreferrer">Переглянути ↗</a> : null}<button className="admin-button admin-button--primary" disabled={saving}>{saving ? 'Збереження…' : 'Зберегти статтю'}</button></div>
    </form>
    {form.id && form.images?.length ? <section className="article-images"><h3>Галерея статті</h3>{form.images.map((image, index) => <article key={image.id} className="article-image-row"><img src={image.url} alt={image.alt_text || ''} /><div><label className="admin-field"><span>Alt-текст</span><input className="admin-input" value={image.alt_text} onChange={(e) => updateImage(image.id, 'alt_text', e.target.value)} /></label><label className="admin-field"><span>Підпис</span><input className="admin-input" value={image.caption} onChange={(e) => updateImage(image.id, 'caption', e.target.value)} /></label><div className="admin-toolbar"><button type="button" className="admin-button admin-button--secondary" onClick={() => saveImage(image)}>Зберегти опис</button><button type="button" className="admin-button admin-button--ghost" disabled={index === 0} onClick={() => moveImage(index, -1)}>Вище</button><button type="button" className="admin-button admin-button--ghost" disabled={index === form.images.length - 1} onClick={() => moveImage(index, 1)}>Нижче</button><button type="button" className="admin-button admin-button--danger" onClick={() => deleteImage(image.id)}>Видалити</button></div></div></article>)}</section> : null}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Назва</th><th>Статус</th><th>Оновлено</th><th></th></tr></thead><tbody>{articles.map((article) => <tr key={article.id}><td>{article.title}<div className="admin-property-meta">/{article.slug}</div></td><td>{article.is_published ? 'Опубліковано' : 'Чернетка'}</td><td>{new Date(article.updated_at).toLocaleDateString('uk-UA')}</td><td><button type="button" className="admin-button admin-button--secondary" onClick={() => { setForm(article); setCoverImage(null); setGalleryFiles([]); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Редагувати</button></td></tr>)}</tbody></table></div>
  </div>
}

export default ArticlesTab
