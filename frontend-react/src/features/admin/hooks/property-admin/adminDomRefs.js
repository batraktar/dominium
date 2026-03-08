export default function getAdminDomRefs(root) {
  const byId = (id) => root.querySelector(`#${id}`)

  return {
    root,
    byId,
    field: byId,
    tableBody: byId('properties-body'),
    refreshBtn: byId('refresh-properties'),
    startCreateBtn: byId('start-create'),
    formNode: byId('property-form'),
    formTitle: byId('form-title'),
    formStatusNode: byId('form-status'),
    deleteBtn: byId('delete-property'),
    submitBtn: byId('submit-button'),
    modal: byId('property-modal'),
    closeModalBtn: byId('close-modal'),
    cancelModalBtn: byId('cancel-modal'),

    importBtn: byId('open-import'),
    importModal: byId('import-modal'),
    importForm: byId('import-form'),
    importStatusNode: byId('import-status'),
    importProgressNode: byId('import-progress'),
    importFilesInput: byId('import-files'),
    importUrlsTextarea: byId('import-urls'),
    importGeocodeCheckbox: byId('import-geocode'),
    closeImportModalBtn: byId('close-import-modal'),
    cancelImportModalBtn: byId('cancel-import-modal'),

    imageGallery: byId('image-gallery'),
    imageUploadInput: byId('image-upload'),
    imageUploadStatus: byId('image-upload-status'),

    filterSearchInput: byId('filter-search'),
    filterPropertyTypeSelect: byId('filter-property-type'),
    filterDealTypeSelect: byId('filter-deal-type'),
    filterFeaturedSelect: byId('filter-featured'),
    filterStatusSelect: byId('filter-status'),
    pageSizeSelect: byId('page-size'),
    resetFiltersBtn: byId('reset-filters'),

    paginationInfo: byId('pagination-info'),
    prevPageBtn: byId('prev-page'),
    nextPageBtn: byId('next-page'),
    tableStatusNode: byId('table-status'),

    bulkToolbar: byId('bulk-toolbar'),
    bulkCountNode: byId('bulk-count'),
    bulkArchiveBtn: byId('bulk-archive'),
    bulkRestoreBtn: byId('bulk-restore'),
    bulkDeleteBtn: byId('bulk-delete'),
    selectAllCheckbox: byId('select-all'),

    highlightForm: byId('highlight-settings-form'),
    highlightStatusNode: byId('highlight-status'),
    highlightPropertyTypesContainer: byId('highlight-property-types'),
    highlightResetBtn: byId('highlight-reset'),
    openHighlightBtn: byId('open-highlight'),
    highlightModal: byId('highlight-modal'),
    closeHighlightModalBtn: byId('close-highlight-modal'),
    cancelHighlightModalBtn: byId('cancel-highlight-modal'),
  }
}
