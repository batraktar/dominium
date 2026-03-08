function PropertyPageErrorState({ message = 'Обʼєкт не знайдено.' }) {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <p className="text-center text-red-200 font-fixel">{message}</p>
      </div>
    </section>
  )
}

export default PropertyPageErrorState
