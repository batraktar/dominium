function Preloader() {
  return (
    <div
      id="preloader"
      className="fixed inset-0 z-[9999] bg-deepOcean flex items-center justify-center transition-opacity duration-700"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 116.17 102.13"
        className="w-21 h-21 fill-[#e7e0ce] animate-pulse"
      >
        <rect x="33.45" y="85.49" width="4.67" height="4.74" className="zoom-anim-1" />
        <rect x="33.45" y="78.57" width="4.67" height="4.74" className="zoom-anim-2" />
        <rect x="40.3" y="85.49" width="4.67" height="4.74" className="zoom-anim-3" />
        <rect x="40.29" y="78.58" width="4.67" height="4.74" className="zoom-anim-4" />
        <path d="M88,76.72s0,0,0,0A40.88,40.88,0,0,0,98.59,49.15c0-.22,0-.43,0-.65a41.07,41.07,0,0,0-41-40.43h-.23c-.64,0-1.3,0-1.94,0h0a41.07,41.07,0,0,0-30.2,66.36c2.57-2.62,5.12-5.2,7.62-7.77l1.91-2,4.48-4.61,2,2,2.65,2.63L68.07,88.85l1.38,1.38h32.17ZM73.39,62.29l-4.75-4.7H38.1c-.18-.48-.36-1-.5-1.45,0-.09,0-.17-.05-.25a21.16,21.16,0,1,1,35.84,6.4Z" />
      </svg>
    </div>
  )
}

export default Preloader
