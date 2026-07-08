import { useMemo } from 'react'

const VARIANTS = [
  {
    title: '404',
    line1: 'Цієї сторінки не існує... ще',
    line2: '',
  },
  {
    title: '404',
    line1: 'Тут порожньо, як у квартирі без ремонту.',
    line2: 'Але головна — жива і працює 😎',
  },
  {
    title: 'Помилка 404',
    line1: 'Ви піднялись не на той поверх. Але ми вже викликаємо ліфт.',
    line2: '',
  },
  {
    title: "Об'єкт не знайдено",
    line1: 'Можливо, його щойно продали. Або ви не туди зайшли :)',
    line2: '',
  },
  {
    title: '404',
    line1: 'Сторінки немає. Як квартири у Львові до $10,000',
    line2: '',
  },
  {
    title: 'Ще будується',
    line1: 'Ця сторінка ще не здана в експлуатацію.',
    line2: '',
  },
  {
    title: 'Ой...',
    line1: 'Ми нічого не знайшли. Може, й не шукали?',
    line2: '',
  },
  {
    title: 'Хмм...',
    line1: 'Цієї сторінки немає, як квартири за $5000',
    line2: '',
  },
  {
    title: '404',
    line1: 'Можливо, ви шукали головну?',
    line2: '',
  },
  {
    title: 'Тут нічого немає',
    line1: 'Спробуйте ще раз. Але на іншій сторінці.',
    line2: '',
  },
  {
    title: 'Помилка 404',
    line1: 'Якщо це житло - то точно не у нашій базі',
    line2: '',
  },
]

function pickRandomVariant() {
  return VARIANTS[Math.floor(Math.random() * VARIANTS.length)]
}

function NotFoundPage() {
  const variant = useMemo(() => pickRandomVariant(), [])

  return (
    <div className="flex min-h-[48vh] items-center justify-center bg-deepOcean text-coolSage text-center px-4 py-16 md:py-24">
      <div className="max-w-3xl">
        <h1 className="text-6xl font-ermilov mb-4">{variant.title}</h1>
        <p className="text-2xl font-fixel mb-2">{variant.line1}</p>
        {variant.line2 ? <p className="text-xl font-fixel mb-6 italic opacity-80">{variant.line2}</p> : null}
        <a
          href="/"
          className="inline-block bg-coolSage hover:bg-accent text-white font-fixel px-6 py-3 rounded-button transition"
        >
          Повернутись на головну
        </a>
      </div>
    </div>
  )
}

export default NotFoundPage
