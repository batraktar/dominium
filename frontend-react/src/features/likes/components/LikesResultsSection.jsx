import LikedPropertyCard from './LikedPropertyCard.jsx'

function LikesResultsSection({
  properties = [],
  likedIds = [],
  isLoading = false,
  loadError = '',
  userIsStaff = false,
  openShareMenuId = null,
  onToggleLike,
  onToggleFeatured,
  onToggleShareMenu,
  onShare,
}) {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center mb-8">
          <h2 className="text-3xl font-ermilov text-white capitalize text-center">ВАШІ ОБРАНІ ОБʼЄКТИ</h2>
        </div>

        {isLoading ? <p className="text-center font-fixel text-creamBeige">Завантажуємо обране…</p> : null}

        {!isLoading && properties.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((property) => (
              <LikedPropertyCard
                key={property.id}
                property={property}
                isLiked={likedIds.includes(property.id)}
                userIsStaff={userIsStaff}
                isShareMenuOpen={openShareMenuId === property.id}
                onToggleLike={onToggleLike}
                onToggleFeatured={onToggleFeatured}
                onToggleShareMenu={onToggleShareMenu}
                onShare={onShare}
              />
            ))}
          </div>
        ) : null}

        {!isLoading && !properties.length ? (
          <p className="text-center font-fixel text-coolSage">У вас немає обраних об&apos;єктів</p>
        ) : null}

        {loadError ? <p className="text-center font-fixel text-red-200 mt-4">{loadError}</p> : null}
      </div>
    </section>
  )
}

export default LikesResultsSection
