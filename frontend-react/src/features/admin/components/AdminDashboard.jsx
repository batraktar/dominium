function AdminStatCard({ icon, label, value, color = 'bg-deepOcean' }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg ${color} text-white flex items-center justify-center text-xl`}>
        <i className={icon}></i>
      </div>
      <div>
        <p className="text-sm text-gray-500 font-fixel">{label}</p>
        <p className="text-2xl font-bold text-deepOcean">{value}</p>
      </div>
    </div>
  )
}

function AdminDashboard({ stats, onRefresh }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-ermilov text-deepOcean">Дашборд</h1>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-deepOcean text-white rounded-lg hover:bg-deepOcean/90 transition"
        >
          <i className="ri-refresh-line"></i>
          Оновити
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          icon="ri-home-4-line"
          label="Всього об'єктів"
          value={stats.totalProperties}
          color="bg-deepOcean"
        />
        <AdminStatCard
          icon="ri-checkbox-circle-line"
          label="Активних"
          value={stats.activeProperties}
          color="bg-green-600"
        />
        <AdminStatCard
          icon="ri-archive-line"
          label="В архіві"
          value={stats.archivedProperties}
          color="bg-gray-500"
        />
        <AdminStatCard
          icon="ri-image-line"
          label="Зображень"
          value={stats.totalImages}
          color="bg-coolSage"
        />
      </div>
    </div>
  )
}

export default AdminDashboard
