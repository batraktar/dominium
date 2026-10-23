export const ARTICLE_CHATGPT_PROMPT = String.raw`Створи SEO-статтю українською мовою для сайту агентства нерухомості DOMINIUM.
Поверни лише чистий JSON без markdown-блоку, коментарів і HTML. Текст має бути звичайним без HTML-тегів.
Перед відповіддю перевір, що JSON парситься: усі переноси всередині рядків кодуй як \n, подвійні лапки всередині тексту екрануй зворотною скісною рискою, не залишай коми перед } або ].
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
Для cover_image_url та images використовуй лише перевірені прямі HTTPS-посилання з upload.wikimedia.org на JPG, PNG, WebP або GIF. Посилання має відкривати сам файл зображення, а не сторінку опису на wikipedia.org, commons.wikimedia.org, loc.gov чи іншому сайті. Не екрануй крапки або слеші в URL і не вигадуй адрес. У caption обовʼязково вкажи автора, Wikimedia Commons і ліцензію. Якщо не можеш гарантувати пряме посилання та ліцензію — залиш cover_image_url порожнім, а images порожнім списком: стаття важливіша за фото.
Не додавай is_published: імпорт завжди створює чернетку.`

export function getArticleChatGptUrl() {
  return `https://chatgpt.com/?q=${encodeURIComponent(ARTICLE_CHATGPT_PROMPT)}`
}

export function parseArticleImport(value) {
  let text = String(value || '').replace(/^\uFEFF/, '').trim()
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) text = fenced[1].trim()
  text = text.replaceAll('https\\://', 'https://')

  // Keep only the JSON object when a chat response contains a short intro or
  // closing sentence around it.
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) text = text.slice(firstBrace, lastBrace + 1)

  // Pasted AI responses sometimes contain literal line breaks/tabs inside a
  // quoted JSON value. They are valid article text, but invalid JSON until
  // escaped. Do this only while inside a string so the object structure stays
  // strict and server-side validation remains authoritative.
  let normalized = ''
  let inString = false
  let escaped = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (inString && character === '\n') { normalized += '\\n'; escaped = false; continue }
    if (inString && character === '\r') { normalized += '\\r'; escaped = false; continue }
    if (inString && character === '\t') { normalized += '\\t'; escaped = false; continue }
    if (inString && character === '\\') {
      const next = text[index + 1]
      // AI responses sometimes use regex/Markdown-style escaping in URLs
      // (for example `www\.loc.gov`). JSON accepts only a small fixed set of
      // escapes; remove a backslash that cannot be valid JSON syntax.
      if (next && !'["\\/bfnrtu]'.includes(next)) continue
    }
    normalized += character
    if (character === '"' && !escaped) inString = !inString
    if (character === '\\' && !escaped) escaped = true
    else escaped = false
  }
  text = normalized.replace(/,\s*([}\]])/g, '$1')

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
    const context = position
      ? text.slice(Math.max(0, Number(position) - 28), Number(position) + 28).replace(/\s+/g, ' ')
      : ''
    throw new Error(`JSON має некоректний формат${hint}.${context ? ` Фрагмент: «${context}».` : ''} Перевірте лапки та коми.`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Очікується один JSON-об’єкт статті.')
  }
  return parsed
}
