import { ConfigProvider, Select } from 'antd'

import { findChangedPropertyTypes } from '../../model/propertyTypeSelectModel.js'

function SearchPropertyTypeFilterCard({
  propertyTypes = [],
  selectedPropertyTypes = [],
  onTogglePropertyType,
  onResetPropertyTypes,
}) {
  const options = propertyTypes.map((propertyType) => ({
    label: propertyType.name,
    value: String(propertyType.id),
  }))

  const handleChange = (nextValues) => {
    findChangedPropertyTypes(selectedPropertyTypes, nextValues)
      .forEach((slug) => onTogglePropertyType?.(slug))
  }

  return (
    <div className="search-filter-card min-h-[118px] flex flex-col justify-between">
      <div className="search-filter-label flex items-center justify-between mb-3">
        <span><i className="ri-home-4-line"></i>Що шукаємо?</span>
        <button
          type="button"
          className="filter-reset"
          onClick={onResetPropertyTypes}
        >
          Очистити
        </button>
      </div>

      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#133e44',
            colorText: '#133e44',
            colorBorder: '#d7e1df',
            borderRadius: 9,
            controlHeight: 44,
            fontFamily: 'FixelText, sans-serif',
          },
        }}
      >
        <Select
          id="property-type-filter"
          aria-label="Тип нерухомості"
          className="search-property-type-select"
          mode="multiple"
          value={selectedPropertyTypes}
          options={options}
          placeholder="Оберіть тип нерухомості"
          showSearch
          allowClear
          maxTagCount="responsive"
          optionFilterProp="label"
          filterOption={(input, option) =>
            String(option?.label || '').toLocaleLowerCase('uk-UA').includes(input.toLocaleLowerCase('uk-UA'))
          }
          onChange={handleChange}
          notFoundContent="Тип нерухомості не знайдено"
          popupMatchSelectWidth
          maxTagPlaceholder={(omittedValues) => `+${omittedValues.length}`}
        />
      </ConfigProvider>
    </div>
  )
}

export default SearchPropertyTypeFilterCard
