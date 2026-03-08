export default function useSearchDropdownActions({
  setOpenDropdown,
  setSortOption,
  setPerPage,
  setCurrency,
  setPage,
}) {
  const toggleDropdown = (key) => {
    setOpenDropdown((previous) => (previous === key ? null : key))
  }

  const handleSortOptionChange = (value) => {
    setSortOption(value)
    setPage(1)
    setOpenDropdown(null)
  }

  const handlePerPageChange = (value) => {
    setPerPage(value)
    setPage(1)
    setOpenDropdown(null)
  }

  const handleCurrencyChange = (code) => {
    setCurrency(code)
    setOpenDropdown(null)
  }

  return {
    toggleDropdown,
    handleSortOptionChange,
    handlePerPageChange,
    handleCurrencyChange,
  }
}
