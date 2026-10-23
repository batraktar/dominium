import { useEffect, useState } from 'react'
import { articleBodyBlocks } from '../model/articleContentModel.js'
import { getPublishedArticle } from '../services/articleApi.js'

function ArticleDetailPage() {
  const slug = decodeURIComponent(window.location.pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1] || '')
  const [article, setArticle] = useState(null)
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getPublishedArticle(slug, { signal: controller.signal })
      .then(setArticle)
      .catch((loadError) => {
        if (loadError?.name !== 'AbortError') setError(loadError?.message || 'Статтю не знайдено.')
      })
    return () => controller.abort()
  }, [slug])

  if (error) return <section className="container mx-auto px-4 py-12"><p role="alert">{error}</p></section>
  if (!article) return <section className="container mx-auto px-4 py-12"><p>Завантаження…</p></section>

  return (
    <article className="container mx-auto max-w-4xl px-4 py-12 text-deepOcean">
      <a href="/articles/" className="mb-6 inline-block text-accent">← Усі статті</a>
      <h1 className="mb-4 text-4xl font-semibold md:text-5xl">{article.title}</h1>
      <p className="mb-8 text-xl text-slate-600">{article.summary}</p>
      {article.cover_image_url ? <img src={article.cover_image_url} alt={article.title} className="mb-10 max-h-[620px] w-full rounded-xl object-contain bg-slate-50" /> : null}
      <div className="article-reading-content">{articleBodyBlocks(article.body).map((block, index) => {
        if (block.type === 'heading') return <h2 key={index}>{block.value}</h2>
        if (block.type === 'list') return <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
        return <p key={index}>{block.value}</p>
      })}</div>
      {article.images?.length ? <section className="article-public-gallery" aria-label="Фотогалерея статті"><div className="article-public-gallery__heading"><h2>Фотогалерея</h2><span>{article.images.length} фото</span></div><div className="article-public-gallery__grid">{article.images.map((image) => <figure key={image.id}><button type="button" onClick={() => setSelectedImage(image)} aria-label={`Відкрити фото: ${image.alt_text || article.title}`}><img src={image.url} alt={image.alt_text || article.title} loading="lazy" /></button>{image.caption ? <figcaption>{image.caption}</figcaption> : null}</figure>)}</div></section> : null}
      {selectedImage ? <div className="article-lightbox" role="dialog" aria-modal="true" aria-label="Перегляд фото" onClick={() => setSelectedImage(null)}><button type="button" className="article-lightbox__close" onClick={() => setSelectedImage(null)} aria-label="Закрити">×</button><figure onClick={(event) => event.stopPropagation()}><img src={selectedImage.url} alt={selectedImage.alt_text || article.title} />{selectedImage.caption ? <figcaption>{selectedImage.caption}</figcaption> : null}</figure></div> : null}
    </article>
  )
}

export default ArticleDetailPage
