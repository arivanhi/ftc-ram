# Design Document: Sistem Informasi Manajemen Aset Produk Penelitian FTC UDINUS

- **Date:** 2026-11-19
- **Project Folder (Local):** `c:\Users\ariva\Documents\projek\ftc_asset`
- **Target Server Deployment:** `ssh.haweb.my.id` (`/home/serverhaw/web/ftc-asset`)
- **Design Reference:** Stitch Project *Research Asset Management System* (`stitch_research_asset_management_system/`)

---

## 1. Intent & The Why

Fakultas Teknologi Cerdas (FTC) Universitas Dian Nuswantoro menghasilkan berbagai aset produk penelitian (prototipe perangkat keras, sistem IoT, robotika, perangkat AI/edge computing, dsb.), tetapi saat ini pengelolaannya menghadapi enam masalah nyata:

1. Aset produk penelitian belum tercatat secara terpusat.
2. Kondisi aset saat ini tidak diketahui (apakah siap dipamerkan, perlu perawatan, atau rusak).
3. Lokasi peletakan aset tidak diketahui (gedung, lantai, ruangan, hingga lemari/rak spesifik).
4. Cara penggunaan/pengoperasian aset tidak terdokumentasi sehingga menyulitkan orang lain yang hendak mendemokan alat.
5. Tanggal jadi aset (*completion date*) tidak tercatat.
6. Narahubung aset tidak diketahui saat terjadi kendala teknis atau dibutuhkan informasi lanjutan.

**Skenario keberhasilan utama:** Ketika seseorang ditugaskan sebagai **PIC Pameran** (yang sering berganti-ganti di antara dosen, staf, maupun mahasiswa panitia), ia dapat langsung membuka aplikasi web ini tanpa hambatan registrasi akun untuk mengetahui letak setiap aset, kondisi terkininya, cara menggunakannya, tanggal jadi aset, serta narahubungnya—sekaligus mengajukan peminjaman aset untuk pameran. Di sisi lain, **Admin FTC** memiliki **CMS Admin** untuk memperbarui seluruh data aset secara mandiri dan aman.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Menyediakan portal web publik tanpa login bagi PIC Pameran untuk melihat seluruh 6 informasi inti aset produk penelitian FTC, melacak peletakan lewat denah modular interaktif, membaca panduan/tutorial penggunaan, menghubungi narahubung, mengajukan peminjaman, dan melaporkan kendala.
- Menyediakan halaman detail aset (`/aset/[uuid]`) dan **QR Code label** per aset agar PIC Pameran dapat memindai stiker di fisik produk untuk langsung melihat cara pakai, kondisi, lokasi, tanggal jadi, dan narahubung dari ponsel.
- Menyediakan **CMS Admin** (`/admin`) yang terlindungi autentikasi sesi server-side untuk mengelola Aset, Gedung/Lantai/Ruangan (beserta tata letak denah modular), Tutorial & SOP, Narahubung, Persetujuan/Pengembalian Peminjaman, dan Laporan Kendala.
- Mengadaptasi 5 layar desain Stitch (`DESIGN.md` & 5 halaman HTML/PNG) secara konsisten dari identitas LPPM UDINUS menjadi **Fakultas Teknologi Cerdas (FTC) UDINUS**.
- Menerapkan **UUID** sebagai primary key dan identifier publik/API di seluruh entitas utama dan berkas unggahan agar ID tidak mudah ditebak/dienumerasi, dilengkapi proteksi autentikasi & validasi backend.
- Menjalankan seluruh stack (**Next.js**, **PostgreSQL**, **Adminer**) dalam container **Docker Compose** di `ssh.haweb.my.id` tanpa bentrok port dengan layanan lain yang sudah berjalan.

### Non-Goals
- Tidak membangun integrasi SSO kampus / LDAP / OAuth eksternal.
- Tidak menyediakan akun login atau registrasi mandiri untuk pengunjung/PIC Pameran.
- Tidak membangun fitur **Kuis Sertifikasi Operator Level 3** dari mockup LPPM Stitch (dibuang karena tidak relevan dengan kebutuhan pameran FTC).
- Tidak membangun integrasi sensor IoT real-time (suhu HVAC, kelembaban, konsumsi daya, smart-lock RFID) yang tampil sebagai data dummy di mockup denah Stitch.
- Tidak mengintegrasikan notifikasi keluar otomatis (WhatsApp API / WAHA / SMTP) pada fase ini; pelacakan dilakukan lewat kode tiket di web dan tindak lanjut menggunakan tombol cepat WhatsApp manual (`wa.me`) di CMS Admin.
- Tidak membuat manajemen multi-fakultas atau RBAC berlapis kompleks di luar peran Admin FTC.

### Anti-Goals
- Menggunakan ID integer berurutan (`1, 2, 3`) pada URL atau API aset/entitas (melanggar kebutuhan keamanan UUID yang diminta pengguna).
- Mengandalkan UUID semata sebagai keamanan tanpa autentikasi sesi server-side pada seluruh endpoint tulis CMS.
- Mempertahankan URL gambar eksternal sementara (`lh3.googleusercontent.com/aida-public/...`) dari ekspor HTML Stitch; seluruh aset logo & foto harus lokal/di-host dari container atau memiliki fallback bersih.
- Mengekspos port PostgreSQL langsung ke `0.0.0.0` di internet publik atau menggunakan port yang bentrok dengan container lain di `ssh.haweb.my.id`.
- Memasang layanan tambahan berat (mis. Headless CMS terpisah atau MinIO) yang memboroskan RAM di server bersama 7.6 GiB.

---

## 3. Constraints

- **Tech Stack Wajib:** Next.js, PostgreSQL, Docker (+ Docker Compose), Adminer.
- **Identitas Peminjam:** Wajib menggunakan **NIM / NPP / Unit** (secara eksplisit **tidak** menggunakan NIDN).
- **Identifier Unik:** Setiap aset baru (serta seluruh entitas utama lain dan nama berkas unggahan) wajib menggunakan **UUID** (native PostgreSQL `uuid` dengan `gen_random_uuid()`). Kode inventaris pendek yang mudah dibaca manusia (mis. `FTC-IOT-001`) tetap disimpan sebagai kolom terpisah untuk label cetak dan pencarian.
- **Lingkungan Server Target (`ssh.haweb.my.id`):**
  - OS: Ubuntu 24.04 x86_64, RAM 7.6 GiB (~4.9 GiB tersedia, swap aktif), disk tersedia 310 GB.
  - Docker 29.9.3 & Docker Compose v5.7.0 terpasang.
  - Lokasi proyek mengikuti konvensi server: `/home/serverhaw/web/ftc-asset`.
  - Alokasi port mengikuti blok kosong berurutan setelah `elab-sim` (`4021–4023`) dan terverifikasi tidak terpakai:
    - Next.js Web: `4031:3000`
    - PostgreSQL 16: `127.0.0.1:4032:5432` (hanya localhost; web & Adminer terhubung via jaringan internal Docker)
    - Adminer: `4033:8080`
- **Lingkungan Lokal:** Folder `c:\Users\ariva\Documents\projek\ftc_asset` menyimpan kode sumber, desain Stitch, dan dokumentasi. Docker tidak tersedia di PATH lokal Windows sehingga build & verifikasi container dijalankan di `ssh.haweb.my.id`.
- **Pengelolaan Rahasia:** Kredensial SSH, password PostgreSQL, secret sesi, dan kredensial admin awal tidak boleh di-hardcode ke kode sumber; gunakan berkas `.env` pada server dan `.env.example` berisi placeholder di repositori.

---

## 4. Approaches Considered

Tiga pendekatan arsitektur dievaluasi berdasarkan kebutuhan fitur dan profil server `ssh.haweb.my.id` (RAM 7.6 GiB bersama belasan container lain):

| Pendekatan | Ringkasan | Trade-off | Status |
|---|---|---|---|
| **1. Next.js App Router Monolith + Drizzle ORM (`pg`) + Docker Volume Uploads** | 3 container ringan (`node:22-alpine` standalone, `postgres:16-alpine`, `adminer`). Drizzle ORM SQL-first dengan native PostgreSQL `uuid`, API Route Handlers, sesi cookie `HttpOnly`, upload berkas ke Docker volume dengan nama UUID. | Paling hemat RAM & waktu `docker build` tercepat di server 7.6 GiB; tanpa binary query engine tambahan yang rawan isu OpenSSL di Alpine; skema SQL sangat transparan di Adminer. Relasi query ditulis lebih eksplisit dibanding Prisma. | **Dipilih (Rekomendasi & disetujui pengguna)** |
| **2. Next.js App Router Monolith + Prisma ORM + Docker Volume Uploads** | 3 container identik, tetapi lapisan ORM menggunakan Prisma (`schema.prisma` + `prisma migrate`). | Ergonomi query relasi bersarang sangat nyaman, namun ukuran image & konsumsi RAM runtime lebih tinggi karena binary query engine Prisma. | Tidak dipilih |
| **3. Next.js Frontend + Headless CMS (Directus) + PostgreSQL + Adminer** | Menambah container Directus sebagai mesin CMS, sedangkan Next.js hanya merender 5 halaman publik. | Panel CRUD instan, tetapi menambah beban 300–600 MB RAM di server padat, tampilan CMS tidak serasi dengan Stitch, dan alur khusus (approval pinjam otomatis ubah status aset + cetak QR) tetap memerlukan kode kustom. | Tidak dipilih |

---

## 5. System & Functional Design

### 5.1 Identitas Visual & Navigasi
- Mengadopsi penuh token desain dari `stitch_research_asset_management_system/academic_enterprise_research_catalog/DESIGN.md`:
  - Font: **Plus Jakarta Sans** + ikon **Material Symbols Outlined**.
  - Palet warna: Primary `#003369`, Primary Container `#0d4a8e`, Tertiary `#033467`, Secondary `#835500`, Secondary Container `#feae2c`, Surface `#faf8ff`, Surface Container Low `#f2f3ff`, Surface Container `#eaedff`, Error `#ba1a1a`, Emerald status (`#059669` / `#ecfdf5`).
  - Logo resmi UDINUS diambil dari `stitch_research_asset_management_system/logo_dinus_new.png/screen.png` dan disimpan lokal di `public/images/logo-dinus.png`.
- **Rebranding LPPM → FTC:**
  - Judul header: **SIM-Aset Penelitian** dengan badge **FTC**, subjudul *Fakultas Teknologi Cerdas (FTC) — Universitas Dian Nuswantoro*.
  - Footer: identitas Fakultas Teknologi Cerdas UDINUS, email/kontak/lokasi sekretariat FTC.
- **Header & Navigasi 5 Halaman Publik:**
  1. `Katalog & Kondisi Aset` (`/`)
  2. `Penempatan & Denah Lab` (`/denah`)
  3. `Peminjaman Aset` (`/peminjaman`)
  4. `Tutorial & SOP` (`/tutorial`)
  5. `Narahubung & Bantuan` (`/narahubung`)
  - Bilah pencarian global di header mengarahkan ke `/?q=<kata-kunci>`.
  - Kanan atas header mengganti profil statis Stitch menjadi tombol **Login Admin** (`/admin/login`) saat belum masuk, atau menu cepat **Panel CMS Admin** (`/admin`) + **Keluar** saat sesi admin aktif.

### 5.2 Model Data PostgreSQL (Native UUID)

Seluruh primary key memakai tipe PostgreSQL `uuid DEFAULT gen_random_uuid()`.

1. **`admin_users`**
   - `id (uuid PK)`, `email (text unique)`, `name (text)`, `password_hash (text)`, `created_at`, `updated_at`.
2. **`admin_sessions`**
   - `id (uuid PK)`, `user_id (uuid FK -> admin_users ON DELETE CASCADE)`, `token_hash (text unique)`, `expires_at (timestamptz)`, `created_at`.
3. **`buildings`**
   - `id (uuid PK)`, `code (text unique)`, `name (text)`, `subtitle (text)`, `icon (text)`, `sort_order (int)`, `created_at`, `updated_at`.
4. **`floors`**
   - `id (uuid PK)`, `building_id (uuid FK -> buildings ON DELETE CASCADE)`, `floor_number (int)`, `label (text)`, `created_at`, `updated_at`.
   - Unique constraint: `(building_id, floor_number)`.
5. **`rooms`**
   - `id (uuid PK)`, `floor_id (uuid FK -> floors ON DELETE CASCADE)`, `code (text unique)`, `name (text)`, `subtitle (text)`, `pic_name (text)`, `pic_ext (text)`, `capacity (int)`, `operating_hours (text)`, `grid_zone (text: 'top' | 'bottom')`, `grid_col_span (int 1..12)`, `sort_order (int)`, `notes (text)`, `created_at`, `updated_at`.
6. **`contacts`** (Narahubung)
   - `id (uuid PK)`, `code (text unique)`, `name (text)`, `role_title (text)`, `specialization (text)`, `room_label (text)`, `duty_hours (text)`, `availability_status (text: 'available' | 'assisting' | 'offline')`, `whatsapp (text)`, `email (text)`, `photo_url (text nullable)`, `is_emergency (bool default false)`, `created_at`, `updated_at`.
7. **`assets`** (Aset Produk Penelitian)
   - `id (uuid PK)` — digunakan pada URL `/aset/[uuid]` dan seluruh operasi API/CMS.
   - `inventory_code (text unique)` — kode label cetak (mis. `FTC-IOT-001`).
   - `name (text)`, `category (text)`, `description (text)`.
   - `specifications (jsonb)` — array `{ label: string, value: string }`.
   - `condition (text: 'prima' | 'maintenance' | 'rusak')`.
   - `availability (text: 'tersedia' | 'dipinjam' | 'tidak_tersedia')`.
   - `completion_date (date)` — **Tanggal Jadi Aset**.
   - `research_scheme (text nullable)`, `researcher_team (text nullable)`.
   - `photo_url (text nullable)`.
   - `room_id (uuid FK -> rooms ON DELETE SET NULL, nullable)`.
   - `placement_detail (text nullable)` — mis. `"Lemari Display Kaca A, Rak 2"`.
   - `contact_id (uuid FK -> contacts ON DELETE SET NULL, nullable)`.
   - `usage_summary (text nullable)` — ringkasan cepat cara penggunaan di halaman detail/QR.
   - `is_priority (bool default false)`.
   - `archived_at (timestamptz nullable)` — *(Builder Call)* soft-delete/arsip agar aset yang pernah memiliki riwayat peminjaman tetap dapat disembunyikan dari katalog tanpa merusak log audit.
   - `created_at`, `updated_at`.
8. **`tutorials`** (Tutorial & SOP Cara Penggunaan)
   - `id (uuid PK)`, `doc_code (text unique)`, `asset_id (uuid FK -> assets ON DELETE SET NULL, nullable)`.
   - `title (text)`, `category (text: 'pengoperasian' | 'video_demo' | 'persiapan_pameran' | 'perawatan' | 'k3')`, `format (text: 'panduan_teks' | 'pdf' | 'video' | 'checklist')`.
   - `summary (text)`, `steps_markdown (text nullable)`.
   - `file_url (text nullable)` — PDF/gambar yang diunggah ke volume.
   - `video_url (text nullable)` — tautan YouTube/Google Drive.
   - `version (text)`, `instructor_name (text nullable)`, `created_at`, `updated_at`.
9. **`loans`** (Peminjaman Aset)
   - `id (uuid PK)`, `ticket_code (text unique, mis. 'FTC-2026-0001')`.
   - `borrower_name (text)`.
   - `borrower_id_type (text: 'NIM' | 'NPP' | 'UNIT')` — tanpa NIDN.
   - `borrower_id_value (text)`.
   - `borrower_whatsapp (text)`.
   - `borrower_unit_detail (text nullable)`.
   - `purpose_title (text)` — nama acara pameran / keperluan.
   - `usage_location_type (text: 'internal' | 'external')`, `external_location_detail (text nullable)`.
   - `funding_category (text)`.
   - `start_date (date)`, `end_date (date)`, `daily_session (text)`.
   - `attachment_url (text nullable)`.
   - `integrity_agreed (bool)`.
   - `status (text: 'pending' | 'approved' | 'borrowed' | 'returned' | 'rejected' | 'cancelled')`.
   - `admin_notes (text nullable)`.
   - `approved_at`, `borrowed_at`, `returned_at`, `created_at`, `updated_at`.
10. **`loan_items`**
    - `id (uuid PK)`, `loan_id (uuid FK -> loans ON DELETE CASCADE)`, `asset_id (uuid FK -> assets ON DELETE RESTRICT)`.
    - `return_condition (text nullable: 'prima' | 'maintenance' | 'rusak')` — *(Builder Call)* kondisi pengembalian dicatat per aset, bukan satu catatan global per pinjaman.
    - `return_notes (text nullable)` — catatan pengembalian per aset.
    - Unique constraint: `(loan_id, asset_id)`.
11. **`issue_tickets`** (Laporan Kendala / Kerusakan)
    - `id (uuid PK)`, `ticket_code (text unique, mis. 'FTC-INC-2026-0001')`.
    - `asset_id (uuid FK -> assets ON DELETE SET NULL, nullable)`, `asset_code_input (text)`.
    - `reporter_name (text)`, `reporter_contact (text)`.
    - `category (text: 'kerusakan' | 'konsultasi_demo' | 'akses_sistem' | 'perawatan')`.
    - `urgency (text: 'rendah' | 'sedang' | 'darurat')`.
    - `description (text)`, `photo_url (text nullable)`.
    - `assigned_contact_id (uuid FK -> contacts ON DELETE SET NULL, nullable)`.
    - `status (text: 'open' | 'in_progress' | 'resolved')`, `resolution_notes (text nullable)`.
    - `created_at`, `updated_at`.
12. **`faqs`**
    - `id (uuid PK)`, `question (text)`, `answer (text)`, `sort_order (int)`, `created_at`.

### 5.3 Rincian 5 Halaman Publik + Halaman Detail Aset

1. **Katalog & Kondisi Aset (`/`)**
   - 5 KPI Cards live dari DB: Total Aset, Kondisi Prima (+ persentase), Perawatan/Kalibrasi, Rusak/Perlu Perbaikan, Sedang Dipinjam.
   - Filter multi-aspek: kata kunci (nama, kode inventaris, peneliti/spesifikasi), Kategori, Ruangan/Lab, Status Kondisi/Ketersediaan, Urutan (`Terbaru`, `Tanggal Jadi Terbaru`, `Kode A-Z`, `Prioritas`), serta tombol ganti tampilan **Grid** dan **Tabel**.
   - Setiap kartu menampilkan foto produk, badge `inventory_code`, badge kondisi & ketersediaan, lokasi ruangan + detail rak, nama aset, **Tanggal Jadi Aset**, 1–2 spesifikasi utama, tombol `Detail & SOP` (`/aset/[uuid]`) dan `Ajukan Pinjam` (`/peminjaman?asset=[uuid]`, nonaktif bila aset rusak/tidak tersedia).
   - Sidebar kanan: panel **Perlu Tindakan** (aset `rusak`/`maintenance` & tiket kendala aktif), **Donut Chart SVG** distribusi kondisi aktual dari DB, dan kartu panduan ringkas pameran FTC.
   - Tombol aksi atas: **Unduh Rekap (XLSX)** (mengunduh file Excel asli dari data terfilter/semua aset) dan **Cetak Label QR** (membuka dialog cetak stiker QR untuk aset terpilih/semua aset).

2. **Detail Aset & Landing QR (`/aset/[uuid]`)**
   - Dirancang responsif untuk ponsel PIC Pameran yang baru memindai QR Code di fisik produk.
   - Menampilkan 6 data inti secara jelas di bagian atas: Foto produk, Kode Inventaris, Status Kondisi & Ketersediaan, **Tanggal Jadi Aset**, **Peletakan** (Gedung → Lantai → Ruangan + detail rak/lemari + tautan `Lihat di Denah` → `/denah?asset=[uuid]`), dan **Narahubung** (kartu kontak dengan tombol langsung WhatsApp & Email).
   - Bagian **Cara Penggunaan & Panduan**: menampilkan `usage_summary` serta daftar `tutorials` yang tertaut ke aset (bisa baca langkah teks, putar/buka video, atau unduh PDF langsung).
   - Bagian **Spesifikasi Teknis**, **QR Code Stiker** (bisa diunduh PNG atau dicetak), serta tombol aksi `Ajukan Pinjam Aset Ini` dan `Laporkan Kendala`.

3. **Penempatan & Denah Lab (`/denah`)**
   - Tab pemilihan **Gedung** & **Lantai** dinamis dari DB.
   - Fitur **Sorot Aset (`Lacak alat`)**: mencari aset berdasarkan nama/kode inventaris di seluruh gedung; jika ditemukan, otomatis berpindah ke gedung & lantai tempat aset berada, menyorot blok ruangannya, dan membuka detail ruangan tersebut di drawer kanan.
   - **Denah Blok Ruangan Modular (Opsi 1):** merender baris ruangan `top`, jalur koridor tengah, dan baris ruangan `bottom` menggunakan `grid_col_span` masing-masing ruangan dari DB, lengkap dengan chip aset & titik warna kondisi.
   - Strip ringkasan bawah denah menampilkan metrik aktual lantai aktif dari DB: *Total Aset di Lantai*, *Siap Pameran (Prima)*, *Perawatan/Rusak*, dan *Sedang Dipinjam* (menggantikan data sensor fiktif mockup).
   - **Drawer Detail Ruangan (kanan):** kode & nama ruang, penanggung jawab + ekstensi, kapasitas & jam operasional, daftar seluruh aset terpasang beserta `placement_detail` (mis. `Lemari Display A - Rak 2`) yang bisa diklik ke `/aset/[uuid]`, tombol **Cetak Daftar Inventaris Ruang**, **Reservasi Alat**, dan **Lapor**.

4. **Peminjaman Aset (`/peminjaman`)**
   - Dua tab utama: **Pengajuan Baru** dan **Pelacakan Tiket & Jadwal Aktif**.
   - **Form Pengajuan Baru (tanpa login):**
     - Bagian 1: Nama Lengkap Pemohon, Jenis Identitas (**NIM / NPP / Unit**) + Nomor/Nama Identitas, No. WhatsApp, Unit/Program Studi, Nama Acara Pameran / Judul Keperluan.
     - Bagian 2: Pencarian & pemilihan aset (maksimal 3 aset per pengajuan; mendukung pre-fill dari `?asset=[uuid]`), menampilkan status ketersediaan dan peringatan jika tanggal bentrok dengan pinjaman `approved`/`borrowed` lain.
     - Bagian 3: Tanggal Mulai, Tanggal Selesai, Sesi Harian, Lokasi Penggunaan (`Internal Kampus` vs `Dibawa Keluar Kampus / Pameran Luar` dengan input lokasi tujuan), Kategori Keperluan (`Pameran / Expo FTC`, `Riset Dosen`, `Tugas Akhir / Skripsi`, `Kemitraan Industri`).
     - Bagian 4: Unggah Dokumen Pendukung opsional (PDF/gambar maks 10 MB) + checkbox Pakta Integritas.
   - **Sidebar Kanan:** Kalender mingguan/bulanan & timeline jadwal alokasi aktual dari DB untuk aset yang sedang dipilih + Syarat & Ketentuan + Kontak Piket FTC.
   - **Pelacakan Tiket:** Pengunjung dapat mencari dengan `ticket_code` atau `NIM/NPP/Unit`, serta melihat daftar pinjaman aktif/terjadwal. Demi privasi, nomor WhatsApp peminjam tidak ditampilkan di halaman publik (hanya terlihat di CMS Admin).

5. **Tutorial & SOP (`/tutorial`)**
   - Hero pencarian (`Ctrl+K`) + filter klaster kategori panduan.
   - Daftar kartu panduan dari DB: format (`Panduan Teks`, `PDF`, `Video`, `Checklist`), kode dokumen, tautan ke aset terkait, deskripsi, tombol **Buka Baca Cepat** (modal tampilan langkah-langkah terformat / preview video YouTube atau tautan Drive), dan **Unduh PDF** bila berkas tersedia.
   - Sidebar kanan: **Checklist Cepat Persiapan Pameran** (menggantikan Kuis Sertifikasi Level 3), daftar dokumen/form unduhan cepat, dan kartu **Bantuan Teknis Narahubung** dari DB.
   - Bagian bawah: **FAQ Teknis** dari tabel `faqs`.

6. **Narahubung & Bantuan (`/narahubung`)**
   - Strip kontak cepat & darurat FTC (hotline internal & WhatsApp siaga) + ringkasan jumlah personel & status penanganan tiket aktual.
   - Grid kartu **Direktori Narahubung** dari DB: status ketersediaan, foto/inisial, nama, peran, spesialisasi, ruang, jam tugas, jumlah aset yang ditangani, tombol langsung **WhatsApp** (`https://wa.me/...`), **Email**, dan **Pilih PIC Tiket** (mengisi dropdown PIC di form bawah).
   - **Form Lapor Kendala & Kerusakan Aset:** jenis kendala, pilih/ketik kode inventaris aset, pilih PIC (atau auto-assign dari PIC aset), nama & kontak pelapor, deskripsi gejala, tingkat urgensi (`Rendah`, `Sedang`, `Darurat`), unggah foto kendala opsional (JPG/PNG maks 5 MB). Mengembalikan `ticket_code` (`FTC-INC-YYYY-XXXX`).
   - Panel kanan: Jam layanan sekretariat FTC & informasi lokasi kampus FTC UDINUS (peta statis lokal / tautan Google Maps tanpa bergantung URL sementara Stitch).

### 5.4 CMS Admin (`/admin`)
- Seluruh route `/admin/**` (kecuali `/admin/login`) dan API `/api/admin/**` wajib memiliki sesi admin valid dari cookie `HttpOnly`.
- **Halaman di CMS Admin:**
  1. `/admin/login`: Form login email & password.
  2. `/admin`: Ringkasan dashboard (KPI kondisi, antrean peminjaman `pending`, tiket kendala `open`, aset `rusak`/`maintenance`).
  3. `/admin/aset`: Daftar aset + tambah/edit/hapus (ID otomatis UUID, semua field termasuk `completion_date` Tanggal Jadi Aset, editor spesifikasi dinamis, unggah foto aset, pilih ruangan + `placement_detail`, pilih narahubung, dan tombol cetak QR Code).
  4. `/admin/lokasi`: Kelola Gedung, Lantai, dan Ruangan (termasuk `grid_zone` dan `grid_col_span` untuk menyusun denah modular secara langsung).
  5. `/admin/tutorial`: Kelola Panduan & SOP (tautkan ke aset, tulis langkah penggunaan, unggah PDF/gambar, masukkan tautan video YouTube/Drive) + kelola FAQ.
  6. `/admin/narahubung`: Kelola profil Narahubung (unggah foto, WA, email, status ketersediaan, ruang, jam tugas).
  7. `/admin/peminjaman`: Daftar pengajuan & pinjaman aktif dengan kontrol transisi status + tombol cepat **Hubungi via WhatsApp (`wa.me`)** yang terisi draf pesan status:
     - `pending` → `approved` (cek bentrok jadwal dalam transaksi DB), `rejected` (dengan catatan admin), atau `cancelled`.
     - `approved` → `borrowed` (otomatis mengubah `availability` aset terkait menjadi `'dipinjam'`) atau `cancelled`.
     - `borrowed` → `returned` (admin mencatat `return_condition` & `return_notes` **per aset** di `loan_items`; bila kondisi `'prima'`, otomatis memulihkan `availability = 'tersedia'`; bila `'rusak'`/`'maintenance'`, memperbarui `condition` aset dan menyetel `availability = 'tidak_tersedia'`).
  8. `/admin/kendala`: Daftar laporan kendala dari PIC pameran/pengguna, ubah status (`open` → `in_progress` → `resolved`), catatan penyelesaian, tombol cepat ubah kondisi aset terkait, dan tautan **Hubungi Pelapor (`wa.me`)**.

### 5.5 Keamanan, Unggahan Berkas, Aturan Bisnis, dan Sinkronisasi Status
- **Validasi UUID:** Seluruh parameter `[id]` / `[uuid]` di route halaman dan API divalidasi format UUID-nya sebelum query DB (menghindari error cast PostgreSQL dan mencegah enumerasi).
- **Autentikasi & Sesi:** Password di-hash dengan `crypto.scrypt` + salt acak per user; token sesi `crypto.randomBytes(32)` disimpan sebagai hash SHA-256 di tabel `admin_sessions` (masa berlaku 7 hari, rotasi saat login, dihapus saat logout). Flag `Secure` pada cookie diatur via variabel lingkungan `COOKIE_SECURE` (false untuk akses HTTP langsung ke port `4031`, true bila nanti di belakang HTTPS/Cloudflare Tunnel).
- **Unggahan Berkas Publik vs Privat *(Builder Call)*:** Volume persisten `/app/uploads` dipisahkan menjadi dua direktori:
  - `/app/uploads/public` — foto aset, PDF/gambar tutorial, foto narahubung. Disajikan lewat `/api/uploads/public/[filename]` tanpa login.
  - `/app/uploads/private` — lampiran surat/proposal peminjaman (`loans.attachment_url`) dan foto kendala (`issue_tickets.photo_url`). Disajikan **khusus Admin** lewat `/api/admin/uploads/[filename]` (wajib sesi admin valid).
  - Seluruh file dinamai `<uuid>.<ext>` setelah validasi ekstensi, MIME type, magic bytes dasar, dan batas ukuran (`5 MB` untuk `jpg/jpeg/png/webp`; `10 MB` untuk `pdf`), serta dilayani dengan proteksi path-traversal (`basename` + regex `<uuid>.<ext>`) dan header `X-Content-Type-Options: nosniff`.
- **Privasi Data pada Endpoint Publik *(Builder Call)*:**
  - Daftar jadwal peminjaman publik di `/peminjaman` hanya menampilkan `ticket_code`, nama aset, tanggal pinjam–kembali, keperluan/acara, unit/prodi, dan status (menghilangkan `borrower_whatsapp`, `borrower_id_value`, `admin_notes`, dan `attachment_url`). Pencarian berdasarkan `ticket_code` atau `NIM/NPP/Unit` menampilkan status dan `admin_notes` (tetap menyembunyikan nomor WhatsApp dan lampiran).
  - Sidebar *Perlu Tindakan* di `/` menampilkan daftar aset berkondisi `rusak`/`maintenance` beserta jumlah tiket kendala aktif tanpa membeberkan `reporter_name`, `reporter_contact`, maupun foto kendala. Halaman `/narahubung` menyediakan cek status tiket kendala berdasarkan `FTC-INC-YYYY-XXXX` (hanya menampilkan kode tiket, aset, urgensi, status, dan `resolution_notes`).
- **Aturan Konflik Jadwal, Pengembalian Multi-Aset, & Pembatalan *(Builder Call)*:**
  - Deteksi bentrok jadwal memeriksa irisan rentang tanggal `[start_date, end_date]` per aset (inklusif) terhadap pinjaman berstatus `approved` atau `borrowed`; kolom `daily_session` bersifat panduan jam operasional, tidak mengizinkan double-booking fisik di hari yang sama.
  - Pengajuan publik (`POST /api/loans`) ditolak (`409 Conflict`) bila ada aset yang bentrok dengan pinjaman `approved`/`borrowed` pada tanggal tersebut atau berstatus `rusak`/`tidak_tersedia`. Aset yang sedang `dipinjam` saat ini tetap dapat dipesan untuk tanggal mendatang yang tidak bentrok. Dua pengajuan `pending` pada tanggal sama diperbolehkan masuk antrean; saat Admin menyetujui satu di antaranya (`pending → approved`) dalam transaksi PostgreSQL, sistem mengecek ulang bentrok dan mencegah persetujuan ganda.
  - Status `cancelled` hanya dapat dijalankan oleh Admin melalui CMS (dari `pending` atau `approved`), bukan oleh pengunjung tanpa login, untuk mencegah pembatalan sepihak oleh pihak ketiga.
  - Pengembalian pinjaman multi-aset dilakukan **sekaligus per tiket pinjaman** (tanpa status parsial), namun Admin mengisi `return_condition` (`prima`/`maintenance`/`rusak`) dan `return_notes` **untuk setiap aset** di `loan_items`.
- **Invarian Status Kondisi vs Ketersediaan & Penghapusan Aset *(Builder Call)*:**
  - Nilai `availability = 'dipinjam'` sepenuhnya dikelola oleh alur peminjaman (`approved → borrowed` dan `borrowed → returned`) dan terkunci dari edit manual di `/admin/aset` selama ada pinjaman `borrowed` aktif.
  - Mengubah `condition` aset menjadi `rusak` (di `/admin/aset` atau `/admin/kendala`) otomatis menyetel `availability = 'tidak_tersedia'` (kecuali sedang `dipinjam`, akan terkunci ke `tidak_tersedia` saat dikembalikan). Bila terdapat pinjaman mendatang berstatus `approved` pada aset yang ditandai `rusak`/`maintenance`, CMS menampilkan peringatan jelas agar Admin meninjau/membatalkan dan menghubungi peminjam secara sadar (tidak dibatalkan diam-diam).
  - Di `/admin/aset`, tombol hapus melakukan **arsip (`archived_at = NOW()`)** bila aset sudah pernah terlibat di `loan_items` (menyembunyikan dari katalog publik, KPI, denah, pencarian, QR, dan XLSX tanpa merusak riwayat pinjaman; bisa dilihat/dipulihkan lewat filter arsip CMS), dan hanya melakukan *hard delete* bila aset belum pernah memiliki riwayat peminjaman.
- **URL QR Code:** Menggunakan variabel lingkungan `NEXT_PUBLIC_APP_URL` (dengan fallback `window.location.origin` di browser) agar stiker QR otomatis mengikuti domain/port aktif server.
- **Seed Data Awal:** Entrypoint Docker menjalankan migrasi Drizzle + skrip seed idempoten (hanya mengisi data awal bila tabel kosong, dan memastikan akun admin awal dari `ADMIN_EMAIL` / `ADMIN_PASSWORD` tersedia) dengan contoh aset produk penelitian FTC UDINUS yang realistis (IoT, Robotika, AI Vision, Drone, Wearable Kesehatan, dsb.).

### 5.6 Arsitektur Docker & Deployment
- Berkas `docker-compose.yml` di root proyek menjalankan 3 service dalam network `ftc_asset_net`:
  - `ftc_asset_db` (`postgres:16-alpine`): `127.0.0.1:4032:5432`, volume `ftc_asset_pgdata`, healthcheck `pg_isready`, `restart: unless-stopped`.
  - `ftc_asset_web` (build multi-stage `node:22-alpine`, Next.js `output: "standalone"`): `4031:3000`, volume `ftc_asset_uploads:/app/uploads`, `depends_on` DB healthy, `restart: unless-stopped`.
  - `ftc_asset_adminer` (`adminer:latest`): `4033:8080`, `ADMINER_DEFAULT_SERVER=ftc_asset_db`, `restart: unless-stopped`.

---

## 6. What's Left to the Builder

Hal-hal berikut diserahkan kepada perencana/pembangun tanpa perlu kembali bertanya ke pengguna:
- Pemilihan versi minor Next.js (15.x), Tailwind CSS (v3 atau v4 dengan konfigurasi token warna/tipografi sesuai `DESIGN.md`), serta struktur folder internal (`src/app`, `src/db`, `src/components`, `src/lib`).
- Pemilihan pustaka spesifik untuk ekspor XLSX (`exceljs` atau `xlsx`), pembuatan QR Code (`qrcode`), validasi skema input (`zod`), dan rendering langkah panduan teks secara aman (tanpa raw HTML injection).
- Detail format generator nomor tiket (`FTC-YYYY-XXXX` dan `FTC-INC-YYYY-XXXX`) beserta mekanisme keunikan di PostgreSQL.
- Detail isi data seed awal (nama gedung/ruang FTC, contoh produk penelitian FTC, panduan, narahubung, dan FAQ) selama mencerminkan konteks Fakultas Teknologi Cerdas UDINUS.
- Struktur pengujian otomatis (unit/integration test untuk autentikasi, validasi UUID, deteksi bentrok jadwal peminjaman, sinkronisasi status aset saat pinjam/kembali, dan keamanan endpoint upload/admin).
- Mekanisme sinkronisasi kode dari folder lokal ke `/home/serverhaw/web/ftc-asset` dan prosedur verifikasi deployment (`docker compose up -d --build`, healthcheck, smoke test HTTP).
