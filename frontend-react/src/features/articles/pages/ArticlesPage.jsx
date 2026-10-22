import { useEffect, useState } from 'react'
import { getPublishedArticles } from '../services/articleApi.js'

function ArticlesPage() {
  const [articles, setArticles] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getPublishedArticles({ signal: controller.signal })
      .then(setArticles)
      .catch((loadError) => {
        if (loadError?.name !== 'AbortError') setError(loadError?.message || 'Не вдалося завантажити статті.')
      })
    return () => controller.abort()
  }, [])

  return (
    <section className="container mx-auto px-4 py-12 text-deepOcean">
      <header className="mb-10 max-w-3xl">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-accent">DOMINIUM</p>
        <h1 className="text-4xl font-semibold">Статті про нерухомість</h1>
      </header>
      {error ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p> : null}
      {!error && articles.length === 0 ? <p>Опублікованих статей поки немає.</p> : null}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <article key={article.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
            {article.cover_image_url ? <img src={article.cover_image_url} alt="" className="h-52 w-full object-contain bg-slate-50" /> : null}
            <div className="p-6">
              <h2 className="mb-3 text-2xl font-semibold"><a href={article.absolute_url} className="hover:text-accent">{article.title}</a></h2>
              <p className="mb-5 text-slate-600">{article.summary}</p>
              <a href={article.absolute_url} className="font-medium text-accent">Читати статтю →</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default ArticlesPage
