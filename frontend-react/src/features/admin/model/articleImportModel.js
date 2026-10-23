export const ARTICLE_CHATGPT_PROMPT = `Створи SEO-статтю українською мовою для сайту агентства нерухомості DOMINIUM.
Поверни лише чистий JSON без markdown-блоку, коментарів і HTML. Текст має бути звичайним без HTML-тегів.
Використай точно цю структуру й не додавай інших полів:
{
  "title": "Назва до 200 символів",
  "slug": "unique-latin-slug",
  "summary": "Короткий опис до 500 символів",
  "body": "Повний корисний текст статті з абзацами, розділеними символом нового рядка",
  "seo_title": "SEO title до 200 символів",
  "seo_description": "SEO description до 320 символів"
}
Slug — унікальний, латиницею, малими літерами, лише a-z, 0-9 і дефіси. Не додавай is_published: імпорт завжди створює чернетку.`

export function parseArticleImport(value) {
  const text = String(value || '').trim()
  if (text.startsWith('```') || text.endsWith('```')) {
    throw new Error('Вставте чистий JSON без markdown-блоку.')
  }
  let parsed
  try { parsed = JSON.parse(text) } catch { throw new Error('JSON має некоректний формат.') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Очікується один JSON-об’єкт статті.')
  }
  return parsed
}
