function PropertyContactForm({
  contactName,
  onContactNameChange,
  contactPhone,
  onContactPhoneChange,
  contactEmail,
  onContactEmailChange,
  contactNoEmail,
  onContactNoEmailChange,
  contactMessage,
  onContactMessageChange,
  propertyUrl,
  isSendingContact = false,
  onSubmit,
}) {
  return (
    <form className="space-y-4" id="contactForm" onSubmit={onSubmit}>
      <div>
        <input
          type="text"
          name="name"
          placeholder="Імʼя"
          value={contactName}
          onChange={onContactNameChange}
          className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-primary placeholder:text-coolSage placeholder:font-fixel"
          required
        />
      </div>
      <div>
        <input
          type="tel"
          name="phone"
          placeholder="Номер телефону"
          value={contactPhone}
          onChange={onContactPhoneChange}
          className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-primary placeholder:text-coolSage placeholder:font-fixel"
          required
        />
      </div>
      <div>
        <input
          type="email"
          name="email"
          placeholder="Пошта/email"
          value={contactEmail}
          onChange={onContactEmailChange}
          disabled={contactNoEmail}
          className={`w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-primary placeholder:text-coolSage placeholder:font-fixel ${
            contactNoEmail ? 'bg-gray-100' : ''
          }`}
        />
        <label className="flex items-center space-x-2 mt-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={contactNoEmail}
            onChange={onContactNoEmailChange}
          />
          <span>Немає пошти</span>
        </label>
      </div>
      <div>
        <textarea
          name="message"
          placeholder="Повідомлення"
          rows="4"
          value={contactMessage}
          onChange={onContactMessageChange}
          className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-primary placeholder:text-coolSage placeholder:font-fixel"
          required
        ></textarea>
      </div>
      <input type="hidden" name="property" value={propertyUrl} />
      <button
        type="submit"
        disabled={isSendingContact}
        className="w-full bg-primary text-white font-ermilov py-3 !rounded-button hover:bg-primary/90 disabled:opacity-70"
      >
        {isSendingContact ? 'Надсилання...' : 'Звернутись за допомогою'}
      </button>
    </form>
  )
}

export default PropertyContactForm
