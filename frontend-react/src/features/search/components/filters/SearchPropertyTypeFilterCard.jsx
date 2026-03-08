function SearchPropertyTypeFilterCard({
  openDropdown,
  onToggleDropdown,
  propertyTypeSummary,
  propertyTypes = [],
  selectedPropertyTypes = [],
  onTogglePropertyType,
  onResetPropertyTypes,
}) {
  return (
    <div className="bg-coolSage/90 rounded-[12px] px-5 py-4 text-white shadow-sm min-h-[118px] flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-creamBeige/80 font-semibold mb-3">
        <span>Тип нерухомості</span>
        <button
          type="button"
          className="text-creamBeige/70 hover:text-white transition text-[11px]"
          onClick={onResetPropertyTypes}
        >
          Очистити
        </button>
      </div>

      <div className="relative" data-react-dropdown>
        <button
          id="property-type-btn"
          type="button"
          className="dropdown-trigger w-full justify-between"
          onClick={(event) => {
            event.stopPropagation()
            onToggleDropdown?.('property_type')
          }}
        >
          <span data-property-type-summary>{propertyTypeSummary}</span>
          <i className="ri-arrow-down-s-line"></i>
        </button>
        <div
          id="property-type-options"
          className={`dropdown-menu full-width ${openDropdown === 'property_type' ? '' : 'hidden'}`}
        >
          <div className="p-2">
            {propertyTypes.map((propertyType) => (
              <label
                key={propertyType.id}
                className="flex font-fixel text-deepOcean items-center cursor-pointer p-3 hover:bg-gray-50 rounded"
              >
                <div className="custom-checkbox">
                  <input
                    type="checkbox"
                    name="property_type"
                    value={propertyType.slug}
                    className="property-type-option"
                    checked={selectedPropertyTypes.includes(propertyType.slug)}
                    onChange={() => onTogglePropertyType?.(propertyType.slug)}
                  />
                  <span className="px-1 checkmark"></span>
                </div>
                <span>{propertyType.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchPropertyTypeFilterCard
