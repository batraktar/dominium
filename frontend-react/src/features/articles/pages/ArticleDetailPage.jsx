import { useEffect, useState } from 'react'
import { getPublishedArticle } from '../services/articleApi.js'

function ArticleDetailPage() {
  const slug = decodeURIComponent(window.location.pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1] || '')
  const [article, setArticle] = useState(null)
  const [error, setError] = useState('')

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
      <div className="whitespace-pre-wrap text-lg leading-8">{article.body}</div>
      {article.images?.length ? <section className="mt-12 grid gap-6 md:grid-cols-2" aria-label="Фотографії статті">{article.images.map((image) => <figure key={image.id} className="overflow-hidden rounded-xl bg-slate-50"><img src={image.url} alt={image.alt_text || article.title} className="h-auto max-h-[620px] w-full object-contain" loading="lazy" />{image.caption ? <figcaption className="p-3 text-sm text-slate-600">{image.caption}</figcaption> : null}</figure>)}</section> : null}
    </article>
  )
}

export default ArticleDetailPage
