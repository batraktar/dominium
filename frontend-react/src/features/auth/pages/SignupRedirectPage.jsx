import { useLayoutEffect } from 'react'

function buildSignupRedirectTarget() {
  const currentParams = new URLSearchParams(window.location.search)
  const method = (currentParams.get('method') || 'email').toLowerCase()

  currentParams.delete('method')

  const targetParams = new URLSearchParams()
  targetParams.set('register', method)

  currentParams.forEach((value, key) => {
    targetParams.append(key, value)
  })

  const query = targetParams.toString()
  return query ? `/?${query}` : '/'
}

function SignupRedirectPage() {
  useLayoutEffect(() => {
    const target = buildSignupRedirectTarget()
    window.location.replace(target)
  }, [])

  return (
    <section className="mx-auto w-full max-w-[760px] px-5 py-20 text-center">
      <h1 className="text-[28px] font-semibold text-deepOcean">Переадресація на реєстрацію…</h1>
      <p className="mt-3 text-[16px] text-gray-600">Будь ласка, зачекайте кілька секунд.</p>
    </section>
  )
}

export default SignupRedirectPage
