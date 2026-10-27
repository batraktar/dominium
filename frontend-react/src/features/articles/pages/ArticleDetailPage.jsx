import { useEffect, useState } from 'react'
import { articleContentFlow, articleTextParts } from '../model/articleContentModel.js'
import { getPublishedArticle } from '../services/articleApi.js'
import { beginArticleAttribution, trackArticleEvent } from '../services/articleAnalytics.js'
import { trackJourneyEvent } from '../../../shared/analytics/journey.js'

function ArticleDetailPage() {
  const slug = decodeURIComponent(window.location.pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1] || '')
  const [article, setArticle] = useState(null)
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [showActions, setShowActions] = useState(true)

  const renderText = (value) => articleTextParts(value).map((part, index) => part.type === 'link'
    ? <a key={`${part.value}-${index}`} href={part.value} target="_blank" rel="noopener noreferrer">{part.value}</a>
    : <span key={index}>{part.value}</span>)

  useEffect(() => {
    const controller = new AbortController()
    getPublishedArticle(slug, { signal: controller.signal })
      .then((result) => {
        setArticle(result)
        beginArticleAttribution(result)
        trackJourneyEvent('article_view', { articleSlug: result.slug })
      })
      .catch((loadError) => {
        if (loadError?.name !== 'AbortError') setError(loadError?.message || 'Статтю не знайдено.')
      })
    return () => controller.abort()
  }, [slug])

  if (error) return <section className="container mx-auto px-4 py-12"><p role="alert">{error}</p></section>
  if (!article) return <section className="container mx-auto px-4 py-12"><p>Завантаження…</p></section>

  return (
    <article className={`article-page container mx-auto max-w-4xl px-4 py-12 ${showActions ? 'article-page--with-actions' : ''}`} onClick={(event) => {
      const link = event.target.closest?.('a[href]')
      if (link && new URL(link.href, window.location.origin).origin === window.location.origin) {
        const targetPath = new URL(link.href, window.location.origin).pathname
        trackArticleEvent('internal_click', { targetPath })
        trackJourneyEvent('internal_click', { articleSlug: article.slug, targetPath })
      }
    }}>
      <a href="/articles/" className="mb-6 inline-block text-accent">← Усі статті</a>
      <h1 className="mb-4 text-4xl font-semibold md:text-5xl">{article.title}</h1>
      <p className="article-summary mb-8 text-xl">{article.summary}</p>
      {article.cover_image_url ? <button type="button" className="article-cover-button" onClick={() => setSelectedImage({ url: article.cover_image_url, alt_text: article.title, caption: '' })} aria-label={`Відкрити обкладинку: ${article.title}`}><img src={article.cover_image_url} alt={article.title} className="max-h-[620px] w-full rounded-xl object-contain bg-slate-50" /></button> : null}
      <div className="article-reading-content">{articleContentFlow(article.body, article.images).map((item, index) => {
        if (item.type === 'image') {
          const image = item.image
          return <figure key={`image-${image.id}`} className="article-inline-image"><button type="button" onClick={() => setSelectedImage(image)} aria-label={`Відкрити фото: ${image.alt_text || article.title}`}><img src={image.url} alt={image.alt_text || article.title} loading="lazy" /></button>{image.caption ? <figcaption>{image.caption}</figcaption> : null}</figure>
        }
        const block = item.block
        if (block.type === 'heading') return <h2 key={index}>{renderText(block.value)}</h2>
        if (block.type === 'list') return <ul key={index}>{block.items.map((item) => <li key={item}>{renderText(item)}</li>)}</ul>
        return <p key={index}>{renderText(block.value)}</p>
      })}</div>
      {showActions ? <nav className="article-next-actions" aria-label="Що зробити далі">
        <button type="button" className="article-next-actions__close" aria-label="Закрити пропозицію" onClick={() => setShowActions(false)}>×</button>
        <h2>Шукаєте нерухомість?</h2>
        <p>Перегляньте актуальні об’єкти або залиште заявку — команда DOMINIUM допоможе з вибором.</p>
        <div><a href="/search/">Переглянути об’єкти</a><a href="/#contact">Отримати консультацію</a></div>
      </nav> : null}
      {selectedImage ? <div className="article-lightbox" role="dialog" aria-modal="true" aria-label="Перегляд фото" onClick={() => setSelectedImage(null)}><button type="button" className="article-lightbox__close" onClick={() => setSelectedImage(null)} aria-label="Закрити">×</button><figure onClick={(event) => event.stopPropagation()}><img src={selectedImage.url} alt={selectedImage.alt_text || article.title} />{selectedImage.caption ? <figcaption>{selectedImage.caption}</figcaption> : null}</figure></div> : null}
    </article>
  )
}

export default ArticleDetailPage
