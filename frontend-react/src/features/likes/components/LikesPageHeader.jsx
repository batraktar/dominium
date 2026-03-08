function LikesPageHeader() {
  return (
    <section className="bg-deepOcean py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-ermilov text-white text-center mb-8">Обране</h1>
        <p className="w-[350px] md:w-[500px] h-[65px] text-lg mx-auto bg-coolSage text-white text-center font-fixel rounded-[12px] flex items-center justify-center leading-tight">
          Ваша колекція улюблених
          <br className="block md:hidden" />
          <span className="hidden md:inline">&nbsp;</span>
          об&apos;єктів нерухомості
        </p>
      </div>
    </section>
  )
}

export default LikesPageHeader
