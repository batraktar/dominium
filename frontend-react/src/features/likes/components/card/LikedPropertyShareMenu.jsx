function LikedPropertyShareMenu({
  isShareMenuOpen = false,
  property,
  onShare,
}) {
  return (
    <div
      className={`share-menu absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-lg py-2 z-20 ${
        isShareMenuOpen ? '' : 'hidden'
      }`}
    >
      <button
        type="button"
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        onClick={() => onShare?.('copy', property)}
      >
        <i className="ri-file-copy-line text-base"></i> Скопіювати
      </button>
      <button
        type="button"
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        onClick={() => onShare?.('telegram', property)}
      >
        <i className="ri-send-plane-line text-base"></i> Telegram
      </button>
      <button
        type="button"
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        onClick={() => onShare?.('viber', property)}
      >
        <i className="ri-message-2-line text-base"></i> Viber
      </button>
    </div>
  )
}

export default LikedPropertyShareMenu
