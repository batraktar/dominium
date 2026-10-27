import { ConfigProvider, Select } from 'antd'

import { LOCATION_OPTIONS } from '../../constants/searchConfig.js'

const options = LOCATION_OPTIONS.map((location) => ({
  label: location,
  value: location,
}))

function SearchLocationSelect({ value = '', onChange }) {
  return (
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
        id="location-filter"
        aria-label="Населений пункт"
        className="search-location-select"
        value={value || undefined}
        options={options}
        placeholder="Усі населені пункти"
        showSearch
        allowClear
        optionFilterProp="label"
        filterOption={(input, option) =>
          String(option?.label || '').toLocaleLowerCase('uk-UA').includes(input.toLocaleLowerCase('uk-UA'))
        }
        onChange={(nextValue) => onChange?.(nextValue || '')}
        notFoundContent="Населений пункт не знайдено"
        popupMatchSelectWidth
      />
    </ConfigProvider>
  )
}

export default SearchLocationSelect
