import assert from 'node:assert/strict'
import test from 'node:test'

import { articleBodyBlocks } from '../src/features/articles/model/articleContentModel.js'

test('turns plain article text into headings, paragraphs and lists', () => {
  assert.deepEqual(articleBodyBlocks('Вступний текст.\n\nНовий розділ\n\n• Один\n• Два\n\nЧому це важливо?'), [
    { type: 'paragraph', value: 'Вступний текст.' },
    { type: 'heading', value: 'Новий розділ' },
    { type: 'list', items: ['Один', 'Два'] },
    { type: 'heading', value: 'Чому це важливо?' },
  ])
})
