function InteractiveMapAttribution() {
  return (
    <div className="text-xs text-deepOcean/70 font-fixel mt-4">
      Дані карти:{' '}
      <a
        className="underline"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
      >
        © OpenStreetMap contributors
      </a>
      , Tiles: © Esri
    </div>
  )
}

export default InteractiveMapAttribution
