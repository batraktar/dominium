import assert from 'node:assert/strict'
import test from 'node:test'

import { articleBodyBlocks, articleContentFlow, articleTextParts } from '../src/features/articles/model/articleContentModel.js'

test('turns plain article text into headings, paragraphs and lists', () => {
  assert.deepEqual(articleBodyBlocks('Вступний текст.\n\nНовий розділ\n\n• Один\n• Два\n\nЧому це важливо?'), [
    { type: 'paragraph', value: 'Вступний текст.' },
    { type: 'heading', value: 'Новий розділ' },
    { type: 'list', items: ['Один', 'Два'] },
    { type: 'heading', value: 'Чому це важливо?' },
  ])
})

test('distributes article images through the text instead of appending a gallery', () => {
  const flow = articleContentFlow('Один.\n\nДва.\n\nТри.\n\nЧотири.', [{ id: 1 }, { id: 2 }])
  assert.deepEqual(flow.map((item) => item.type), ['block', 'image', 'block', 'block', 'image', 'block'])
  assert.equal(flow[1].image.id, 1)
  assert.equal(flow[4].image.id, 2)
})

test('turns safe HTTPS URLs into links without swallowing punctuation', () => {
  assert.deepEqual(articleTextParts('Джерело: https://example.com/page. Далі'), [
    { type: 'text', value: 'Джерело: ' },
    { type: 'link', value: 'https://example.com/page' },
    { type: 'text', value: '.' },
    { type: 'text', value: ' Далі' },
  ])
})
