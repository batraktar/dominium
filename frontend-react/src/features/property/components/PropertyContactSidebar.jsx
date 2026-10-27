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
  propertyId,
}) {
  return (
    <div className="lg:col-span-1">
      <div className="bg-[#e8efed] border border-deepOcean/15 p-6 rounded-lg shadow-sm sticky top-24">
        <PropertyContactBrand logoSrc={logoSrc} />

        <PropertyContactQuickActions propertyId={propertyId} />

        <div className="mb-4 flex items-center gap-3 text-deepOcean/60"><span className="h-px flex-1 bg-deepOcean/15" /><span className="text-xs font-fixel">або залиште заявку</span><span className="h-px flex-1 bg-deepOcean/15" /></div>

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

      </div>
    </div>
  )
}

export default PropertyContactSidebar
