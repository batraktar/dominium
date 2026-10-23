import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ARTICLE_CHATGPT_PROMPT,
  parseArticleImport,
} from '../src/features/admin/model/articleImportModel.js'
import { shouldShowArticlesFooterLink } from '../src/features/layout/model/footerModel.js'

test('article prompt requests the strict safe JSON schema', () => {
  for (const field of ['title', 'slug', 'summary', 'body', 'seo_title', 'seo_description']) {
    assert.match(ARTICLE_CHATGPT_PROMPT, new RegExp(`"${field}"`))
  }
  assert.match(ARTICLE_CHATGPT_PROMPT, /без HTML/i)
  assert.match(ARTICLE_CHATGPT_PROMPT, /без markdown/i)
})

test('parses a JSON article and rejects invalid roots', () => {
  const parsed = parseArticleImport('{"title":"Назва","slug":"nazva","summary":"Опис","body":"Текст"}')
  assert.equal(parsed.slug, 'nazva')
  assert.throws(() => parseArticleImport('[]'), /JSON-об’єкт/i)
})

test('normalizes common ChatGPT wrappers without weakening JSON validation', () => {
  assert.deepEqual(parseArticleImport('```json\n{"title":"Назва"}\n```'), { title: 'Назва' })
  assert.deepEqual(parseArticleImport('{"title":"Назва"}"'), { title: 'Назва' })
  assert.throws(
    () => parseArticleImport('{"title":"Назва",}'),
    /лапки та коми/i,
  )
})

test('footer article discovery is visible only to staff', () => {
  assert.equal(shouldShowArticlesFooterLink(true), true)
  assert.equal(shouldShowArticlesFooterLink(false), false)
  assert.equal(shouldShowArticlesFooterLink(undefined), false)
})
