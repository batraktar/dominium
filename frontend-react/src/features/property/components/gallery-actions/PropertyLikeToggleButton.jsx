function PropertyLikeToggleButton({
  liked = false,
  onToggleLike,
  className = '',
  dataPropertyId,
}) {
  return (
    <button
      type="button"
      className={className}
      data-property-id={dataPropertyId}
      aria-label="Додати до обраного"
      onClick={onToggleLike}
    >
      <i className={liked ? 'ri-heart-fill text-red-500' : 'ri-heart-line text-gray-700'}></i>
    </button>
  )
}

export default PropertyLikeToggleButton
