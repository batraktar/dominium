import PropertyContactBrand from './contact-sidebar/PropertyContactBrand.jsx'
import PropertyContactForm from './contact-sidebar/PropertyContactForm.jsx'
import PropertyContactQuickActions from './contact-sidebar/PropertyContactQuickActions.jsx'

function PropertyContactSidebar({
  logoSrc,
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
    <div className="lg:col-span-1">
      <div className="bg-coolSage p-6 rounded-lg shadow-sm sticky top-24">
        <PropertyContactBrand logoSrc={logoSrc} />

        <PropertyContactForm
          contactName={contactName}
          onContactNameChange={onContactNameChange}
          contactPhone={contactPhone}
          onContactPhoneChange={onContactPhoneChange}
          contactEmail={contactEmail}
          onContactEmailChange={onContactEmailChange}
          contactNoEmail={contactNoEmail}
          onContactNoEmailChange={onContactNoEmailChange}
          contactMessage={contactMessage}
          onContactMessageChange={onContactMessageChange}
          propertyUrl={propertyUrl}
          isSendingContact={isSendingContact}
          onSubmit={onSubmit}
        />

        <PropertyContactQuickActions />
      </div>
    </div>
  )
}

export default PropertyContactSidebar
