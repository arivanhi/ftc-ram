export function PublicFooter() {
  return (
    <footer className="w-full bg-surface-container-lowest mt-auto border-t border-outline-variant/25 no-print">
      <div className="w-full max-w-[1440px] mx-auto px-gutter py-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm text-center sm:text-left">
          <span className="material-symbols-outlined text-primary text-[28px]">verified</span>
          <div>
            <div className="text-title-sm text-on-surface font-semibold">
              Sistem Inventaris Produk Penelitian FTC UDINUS
            </div>
            <div className="text-body-sm text-on-surface-variant">
              Katalog, Peletakan, Panduan Demo &amp; Layanan Sirkulasi Pameran
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-space-lg text-body-sm text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-outline text-[18px]">mail</span>
            <span>ftc@dinus.ac.id</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-outline text-[18px]">call</span>
            <span>(024) 3517261 ext. 3201</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-outline text-[18px]">location_on</span>
            <span>Gedung H Lt. 2–3, Kampus UDINUS Semarang</span>
          </div>
        </div>
      </div>
      <div className="w-full bg-surface-container-low py-2.5 px-gutter text-center text-label-sm text-on-surface-variant">
        © {new Date().getFullYear()} Fakultas Teknologi Cerdas — Universitas Dian Nuswantoro. SIM-Aset Produk Penelitian.
      </div>
    </footer>
  );
}
