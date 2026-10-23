import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ARTICLE_CHATGPT_PROMPT,
  getArticleChatGptUrl,
  parseArticleImport,
} from '../src/features/admin/model/articleImportModel.js'
import { shouldShowArticlesFooterLink } from '../src/features/layout/model/footerModel.js'

test('article prompt requests the strict safe JSON schema', () => {
  for (const field of ['title', 'slug', 'summary', 'body', 'seo_title', 'seo_description']) {
    assert.match(ARTICLE_CHATGPT_PROMPT, new RegExp(`"${field}"`))
  }
  assert.match(ARTICLE_CHATGPT_PROMPT, /без HTML/i)
  assert.match(ARTICLE_CHATGPT_PROMPT, /без markdown/i)
  assert.match(ARTICLE_CHATGPT_PROMPT, /"cover_image_url"/)
  assert.match(ARTICLE_CHATGPT_PROMPT, /"images"/)
  assert.match(ARTICLE_CHATGPT_PROMPT, /прямі HTTPS-посилання/i)
  assert.match(ARTICLE_CHATGPT_PROMPT, /Не вигадуй URL/i)
  assert.match(ARTICLE_CHATGPT_PROMPT, /перевір, що JSON парситься/i)
})

test('builds a ChatGPT URL with the current article prompt', () => {
  const url = getArticleChatGptUrl()
  assert.match(url, /^https:\/\/chatgpt\.com\/\?q=/)
  assert.match(decodeURIComponent(url), /cover_image_url/)
})

test('parses a JSON article and rejects invalid roots', () => {
  const parsed = parseArticleImport('{"title":"Назва","slug":"nazva","summary":"Опис","body":"Текст"}')
  assert.equal(parsed.slug, 'nazva')
  assert.throws(() => parseArticleImport('[]'), /JSON-об’єкт/i)
})

test('normalizes common ChatGPT wrappers without weakening JSON validation', () => {
  assert.deepEqual(parseArticleImport('```json\n{"title":"Назва"}\n```'), { title: 'Назва' })
  assert.deepEqual(parseArticleImport('{"title":"Назва"}"'), { title: 'Назва' })
  assert.deepEqual(parseArticleImport('{"url":"https\\://example.com/photo.jpg"}'), { url: 'https://example.com/photo.jpg' })
  assert.deepEqual(
    parseArticleImport('{"url":"https:\\/\\/www\\.loc\\.gov\\/pictures\\/item\\/ca095"}'),
    { url: 'https://www.loc.gov/pictures/item/ca095' },
  )
  assert.deepEqual(parseArticleImport('Ось JSON:\n{"title":"Назва\nДругий рядок",}\nГотово.'), { title: 'Назва\nДругий рядок' })
  assert.deepEqual(parseArticleImport('{"title":"Назва",}'), { title: 'Назва' })
  assert.throws(() => parseArticleImport('{"title": "Незакритий текст}'), /лапки та коми/i)
})

test('footer article discovery is visible only to staff', () => {
  assert.equal(shouldShowArticlesFooterLink(true), true)
  assert.equal(shouldShowArticlesFooterLink(false), false)
  assert.equal(shouldShowArticlesFooterLink(undefined), false)
})
