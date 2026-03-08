import usePropertyApiAdminController from '../hooks/usePropertyApiAdminController.js'
import adminMarkup from './propertyApiAdminMarkup.html?raw'
import './property-api-admin.css'

function PropertyApiAdminPage({ userIsStaff = false }) {
  const { rootRef } = usePropertyApiAdminController({
    enabled: true,
    userIsStaff,
  })

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: adminMarkup }} />
}

export default PropertyApiAdminPage
