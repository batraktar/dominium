export const ARTICLE_CHATGPT_PROMPT = `Створи SEO-статтю українською мовою для сайту агентства нерухомості DOMINIUM.
Поверни лише чистий JSON без markdown-блоку, коментарів і HTML. Текст має бути звичайним без HTML-тегів.
Використай точно цю структуру й не додавай інших полів:
{
  "title": "Назва до 200 символів",
  "slug": "unique-latin-slug",
  "summary": "Короткий опис до 500 символів",
  "body": "Повний корисний текст статті з абзацами, розділеними символом нового рядка",
  "seo_title": "SEO title до 200 символів",
  "seo_description": "SEO description до 320 символів",
  "cover_image_url": "https://example.com/direct-cover.jpg",
  "images": [
    {"url": "https://example.com/direct-photo.jpg", "alt_text": "Точний опис фото", "caption": "Короткий підпис"}
  ]
}
Slug — унікальний, латиницею, малими літерами, лише a-z, 0-9 і дефіси.
Для cover_image_url та images використовуй лише реальні прямі HTTPS-посилання на JPG, PNG, WebP або GIF, які відкривають саме файл зображення, а не HTML-сторінку. Не вигадуй URL. Обирай тематичні фото з джерел, де дозволене повторне використання, і додавай змістовний alt_text. Якщо перевірених прямих посилань немає — залиш cover_image_url порожнім, а images порожнім списком.
Не додавай is_published: імпорт завжди створює чернетку.`

export function getArticleChatGptUrl() {
  return `https://chatgpt.com/?q=${encodeURIComponent(ARTICLE_CHATGPT_PROMPT)}`
}

export function parseArticleImport(value) {
  let text = String(value || '').replace(/^\uFEFF/, '').trim()
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) text = fenced[1].trim()
  text = text.replaceAll('https\\://', 'https://')

  // ChatGPT occasionally appends a single quote after an otherwise complete
  // JSON object (`}"`). Ignore only that narrow, unambiguous wrapper typo.
  if (text.startsWith('{')) {
    const closingBrace = text.lastIndexOf('}')
    const suffix = closingBrace >= 0 ? text.slice(closingBrace + 1).trim() : ''
    if (closingBrace >= 0 && /^["'`]?$/.test(suffix)) {
      text = text.slice(0, closingBrace + 1)
    }
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    const position = String(error?.message || '').match(/position\s+(\d+)/i)?.[1]
    const hint = position ? ` біля символу ${Number(position) + 1}` : ''
    throw new Error(`JSON має некоректний формат${hint}. Перевірте лапки та коми.`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Очікується один JSON-об’єкт статті.')
  }
  return parsed
}
