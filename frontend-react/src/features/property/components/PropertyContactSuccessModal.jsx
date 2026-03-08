function PropertyContactSuccessModal({
  isOpen = false,
  onClose,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <div className="text-center">
          <i className="ri-checkbox-circle-line text-primary text-4xl mb-4"></i>
          <h3 className="text-xl font-semibold mb-2">Message Sent Successfully!</h3>
          <p className="text-gray-600 mb-6">We'll get back to you as soon as possible.</p>
          <button
            type="button"
            className="bg-primary text-white px-6 py-2 !rounded-button hover:bg-primary/90"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PropertyContactSuccessModal
