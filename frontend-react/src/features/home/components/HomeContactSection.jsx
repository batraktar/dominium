function HomeContactSection({
  onContactSubmit,
  isSendingConsultation = false,
  consultationMessage = '',
  consultationError = false,
}) {
  return (
    <section className="py-16 overflow-x-hidden">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 items-start">
          <div className="rounded-lg bg-coolSage shadow-lg p-5 sm:p-6 md:p-[54px] w-full min-w-0">
            <h2 className="text-[28px] md:text-3xl font-ermilov text-primary mb-2">
              Зв&apos;язок з нами
            </h2>
            <p className="text-white mb-8 font-fixel">
              Маєте питання? Залиште свої контакти - ми швидко відповімо.
            </p>
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white mr-4">
                  <i className="ri-map-pin-line ri-lg"></i>
                </div>
                <div>
                  <h3 className="font-ermilov text-xl text-deepOcean">Адреса</h3>
                  <p className="text-gray-600 font-fixel">
                    <a
                      href="https://www.google.com/maps?q=м.+Хуст,+вул.+Корятовича,+10"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      м. Хуст, Україна, вул. Корятовича, 10, 2 поверх
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white mr-4">
                  <i className="ri-phone-line ri-lg"></i>
                </div>
                <div>
                  <h3 className="font-ermilov text-xl text-deepOcean">Телефон</h3>
                  <p className="text-gray-600 font-fixel">
                    <a href="tel:+380770032121" className="hover:underline">
                      +380 (77) 003-21-21
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white mr-4">
                  <i className="ri-mail-line ri-lg"></i>
                </div>
                <div>
                  <h3 className="font-ermilov text-xl text-deepOcean">Email</h3>
                  <p className="text-gray-600 font-fixel">
                    <a href="mailto:dominium.realty.agency@gmail.com" className="hover:underline">
                      dominium.realty.agency@gmail.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <form
            method="post"
            action="/consultation/"
            onSubmit={onContactSubmit}
            className="rounded-lg bg-coolSage shadow-lg p-5 sm:p-6 md:p-8 w-full min-w-0"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <input
                  type="text"
                  name="name"
                  placeholder="Імʼя"
                  className="w-full p-3 border rounded-button bg-gray-50 font-fixel placeholder:font-fixel"
                  required
                />
              </div>
              <div>
                <input
                  type="email"
                  name="email"
                  placeholder="Ваш email"
                  className="w-full p-3 border rounded-button bg-gray-50 font-fixel placeholder:font-fixel"
                  required
                />
              </div>
            </div>
            <div className="mt-6">
              <input
                type="text"
                name="phone"
                placeholder="Телефон"
                className="w-full p-3 border rounded-button bg-gray-50 font-fixel placeholder:font-fixel"
                required
              />
            </div>
            <div className="mt-6">
              <textarea
                name="message"
                rows="4"
                placeholder="Повідомлення"
                className="w-full p-3 border rounded-button bg-gray-50 font-fixel placeholder:font-fixel"
                required
              ></textarea>
            </div>
            <input type="hidden" name="property" value="Головна сторінка" />
            <button
              type="submit"
              disabled={isSendingConsultation}
              className="mt-6 w-full bg-deepOcean text-white py-3 rounded-button hover:bg-opacity-90 font-ermilov"
            >
              {isSendingConsultation ? 'Надсилання...' : 'Надіслати повідомлення'}
            </button>
            {consultationMessage ? (
              <p
                className={`mt-4 text-sm font-fixel ${
                  consultationError ? 'text-red-100' : 'text-creamBeige'
                }`}
              >
                {consultationMessage}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  )
}

export default HomeContactSection
