export default function createAdminState() {
  return {
    state: {
      propertyTypes: [],
      dealTypes: [],
      features: [],
      highlightSettings: null,
      editingId: null,
    },
    tableState: {
      page: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 0,
      ordering: '-created_at',
      filters: {
        search: '',
        propertyType: '',
        dealType: '',
        featured: '',
        status: 'active',
      },
    },
    selectionState: {
      ids: new Set(),
    },
    imageState: {
      propertyId: null,
    },
    runtime: {
      searchDebounceId: null,
      bulkInProgress: false,
    },
  }
}
