import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

async function applyMigrations(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _ftc_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const dir = join(process.cwd(), 'drizzle');
  if (!existsSync(dir)) return;

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const { rows: appliedRows } = await client.query('SELECT filename FROM _ftc_migrations');
  const applied = new Set(appliedRows.map((r) => r.filename));

  for (const file of files) {
    if (applied.has(file)) continue;
    const rawSql = readFileSync(join(dir, file), 'utf8');
    const statements = rawSql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    await client.query('BEGIN');
    try {
      for (const stmt of statements) {
        await client.query(stmt);
      }
      await client.query('INSERT INTO _ftc_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[init-db] applied migration ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
}

async function seedAdmin(client) {
  const email = (process.env.ADMIN_EMAIL || 'admin@ftc.dinus.ac.id').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'FtcAdmin2026!';
  const existing = await client.query('SELECT id FROM admin_users WHERE email = $1', [email]);
  if (existing.rowCount === 0) {
    await client.query(
      'INSERT INTO admin_users (email, name, password_hash) VALUES ($1, $2, $3)',
      [email, 'Admin Pengelola Aset FTC', hashPassword(password)],
    );
    console.log(`[init-db] seeded default admin: ${email}`);
  }
}

async function seedSampleData(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS cnt FROM buildings');
  if (rows[0].cnt > 0) {
    console.log('[init-db] data already present, skipping FTC sample seed');
    return;
  }

  await client.query('BEGIN');
  try {
    // 1. Buildings
    const bH = (
      await client.query(
        `INSERT INTO buildings (code, name, subtitle, icon, sort_order)
         VALUES ('H', 'Gedung H', 'Fakultas Teknologi Cerdas & AI', 'domain', 1) RETURNING id`,
      )
    ).rows[0].id;
    const bE = (
      await client.query(
        `INSERT INTO buildings (code, name, subtitle, icon, sort_order)
         VALUES ('E', 'Gedung E', 'Lab Robotika, IoT & Embedded', 'precision_manufacturing', 2) RETURNING id`,
      )
    ).rows[0].id;

    // 2. Floors
    const fH2 = (await client.query(`INSERT INTO floors (building_id, floor_number, label) VALUES ($1, 2, 'Lt. 2') RETURNING id`, [bH])).rows[0].id;
    const fH3 = (await client.query(`INSERT INTO floors (building_id, floor_number, label) VALUES ($1, 3, 'Lt. 3') RETURNING id`, [bH])).rows[0].id;
    const fE1 = (await client.query(`INSERT INTO floors (building_id, floor_number, label) VALUES ($1, 1, 'Lt. 1') RETURNING id`, [bE])).rows[0].id;

    // 3. Rooms (modular grid_zone top/bottom, grid_col_span sums <= 12)
    const rH301 = (
      await client.query(
        `INSERT INTO rooms (floor_id, code, name, subtitle, pic_name, pic_ext, capacity, operating_hours, grid_zone, grid_col_span, sort_order, notes)
         VALUES ($1, 'H3.01', 'Ruang Showcase Produk Riset FTC', 'Display Prototipe AI, Vision & Smart City', 'Dr. Raditya Pratama, M.Kom.', '3401', 12, '08.00 - 17.00 WIB', 'top', 5, 1, 'Lemari display kaca terkunci untuk prototipe siap pameran.') RETURNING id`,
        [fH3],
      )
    ).rows[0].id;
    const rH302 = (
      await client.query(
        `INSERT INTO rooms (floor_id, code, name, subtitle, pic_name, pic_ext, capacity, operating_hours, grid_zone, grid_col_span, sort_order, notes)
         VALUES ($1, 'H3.02', 'Lab Visi Komputer & Sistem Cerdas', 'Edge AI, Kiosk & Sensor Kamera', 'M. Yusuf Prasetyo, S.T.', '3412', 16, '08.00 - 18.00 WIB', 'top', 4, 2, 'Dilengkapi workbench kalibrasi kamera dan perangkat edge.') RETURNING id`,
        [fH3],
      )
    ).rows[0].id;
    const rH305 = (
      await client.query(
        `INSERT INTO rooms (floor_id, code, name, subtitle, pic_name, pic_ext, capacity, operating_hours, grid_zone, grid_col_span, sort_order, notes)
         VALUES ($1, 'H3.05', 'Ruang Perawatan & Suku Cadang', 'Penyimpanan Baterai, Adaptor & Kalibrasi', 'Ahmad Fauzi, A.Md.', '3419', 4, '08.00 - 16.30 WIB', 'top', 3, 3, 'Area penyimpanan baterai LiPo aman dan meja servis.') RETURNING id`,
        [fH3],
      )
    ).rows[0].id;
    const rH303 = (
      await client.query(
        `INSERT INTO rooms (floor_id, code, name, subtitle, pic_name, pic_ext, capacity, operating_hours, grid_zone, grid_col_span, sort_order, notes)
         VALUES ($1, 'H3.03', 'Lab Teknologi Kesehatan & Wearable', 'Perangkat Biomedis Cerdas & Telemetri', 'Dr. Retno Wulandari, S.Si.', '3415', 10, '08.00 - 16.30 WIB', 'bottom', 8, 4, 'Ruang steril untuk prototipe wearable kesehatan dan pengujian sensor.') RETURNING id`,
        [fH3],
      )
    ).rows[0].id;
    const rH304 = (
      await client.query(
        `INSERT INTO rooms (floor_id, code, name, subtitle, pic_name, pic_ext, capacity, operating_hours, grid_zone, grid_col_span, sort_order, notes)
         VALUES ($1, 'H3.04', 'Ruang Briefing PIC Pameran', 'Simulasi Demo & Serah Terima Aset', 'Siti Rahma, M.Kom.', '3418', 14, '08.00 - 17.00 WIB', 'bottom', 4, 5, 'Tempat uji coba demo sebelum aset dibawa ke lokasi pameran.') RETURNING id`,
        [fH3],
      )
    ).rows[0].id;
    const rH201 = (
      await client.query(
        `INSERT INTO rooms (floor_id, code, name, subtitle, pic_name, pic_ext, capacity, operating_hours, grid_zone, grid_col_span, sort_order, notes)
         VALUES ($1, 'H2.01', 'Sekretariat & Galeri Dekanat FTC', 'Etalase Utama Produk Unggulan Fakultas', 'Siti Rahma, M.Kom.', '3201', 10, '08.00 - 16.00 WIB', 'top', 12, 1, 'Etalase produk penelitian unggulan FTC di lantai 2.') RETURNING id`,
        [fH2],
      )
    ).rows[0].id;
    const rE101 = (
      await client.query(
        `INSERT INTO rooms (floor_id, code, name, subtitle, pic_name, pic_ext, capacity, operating_hours, grid_zone, grid_col_span, sort_order, notes)
         VALUES ($1, 'E1.01', 'Workshop Robotika & Autonomous System', 'Robot Pengantar, Cobot Arm & Arena Uji', 'Ahmad Fauzi, A.Md.', '3501', 15, '08.00 - 17.00 WIB', 'top', 7, 1, 'Arena pengujian robot bergerak dan lengan robot 6-DOF.') RETURNING id`,
        [fE1],
      )
    ).rows[0].id;
    const rE102 = (
      await client.query(
        `INSERT INTO rooms (floor_id, code, name, subtitle, pic_name, pic_ext, capacity, operating_hours, grid_zone, grid_col_span, sort_order, notes)
         VALUES ($1, 'E1.02', 'Lab IoT Lingkungan & Drone', 'Smart Farming, Flood Buoy & UAV Pemetaan', 'Ir. Bambang Sugiarto, M.T.', '3504', 12, '08.00 - 16.30 WIB', 'top', 5, 2, 'Penyimpanan koper drone, node LoRaWAN, dan panel surya uji.') RETURNING id`,
        [fE1],
      )
    ).rows[0].id;

    // 4. Contacts (Narahubung)
    const c1 = (
      await client.query(
        `INSERT INTO contacts (code, name, role_title, specialization, room_label, duty_hours, availability_status, whatsapp, email, is_emergency)
         VALUES ('PIC-FTC-01', 'M. Yusuf Prasetyo, S.T.', 'Koordinator Aset & Lab AI FTC', 'Edge AI, Computer Vision & Kiosk Demo', 'Gedung H Lt. 3 (H3.02)', '08:00 - 17:00 WIB', 'available', '081234567801', 'yusuf.p@ftc.dinus.ac.id', true) RETURNING id`,
      )
    ).rows[0].id;
    const c2 = (
      await client.query(
        `INSERT INTO contacts (code, name, role_title, specialization, room_label, duty_hours, availability_status, whatsapp, email, is_emergency)
         VALUES ('PIC-FTC-02', 'Ahmad Fauzi, A.Md.', 'Teknisi Robotika & Mekatronika', 'Robot Otonom, Cobot 6-DOF & Baterai LiPo', 'Gedung E Lt. 1 (E1.01)', '08:30 - 16:30 WIB', 'available', '081234567802', 'fauzi.a@ftc.dinus.ac.id', true) RETURNING id`,
      )
    ).rows[0].id;
    const c3 = (
      await client.query(
        `INSERT INTO contacts (code, name, role_title, specialization, room_label, duty_hours, availability_status, whatsapp, email, is_emergency)
         VALUES ('PIC-FTC-03', 'Dr. Retno Wulandari, S.Si.', 'PJ Riset Teknologi Kesehatan', 'Wearable Sensor & Telemetri Biomedis', 'Gedung H Lt. 3 (H3.03)', '08:00 - 15:30 WIB', 'assisting', '081234567803', 'retno.w@ftc.dinus.ac.id', false) RETURNING id`,
      )
    ).rows[0].id;
    const c4 = (
      await client.query(
        `INSERT INTO contacts (code, name, role_title, specialization, room_label, duty_hours, availability_status, whatsapp, email, is_emergency)
         VALUES ('PIC-FTC-04', 'Ir. Bambang Sugiarto, M.T.', 'PJ Riset IoT & Drone Pertanian', 'LoRaWAN Smart Farming, Buoy & UAV', 'Gedung E Lt. 1 (E1.02)', '08:00 - 16:30 WIB', 'available', '081234567804', 'bambang.s@ftc.dinus.ac.id', false) RETURNING id`,
      )
    ).rows[0].id;

    // 5. FTC Research Product Assets (with completion_date / Tanggal Jadi Aset)
    const a1 = (
      await client.query(
        `INSERT INTO assets (inventory_code, name, category, description, specifications, condition, availability, completion_date, research_scheme, researcher_team, room_id, placement_detail, contact_id, usage_summary, is_priority)
         VALUES (
          'FTC-IOT-001',
          'Smart Precision Agriculture IoT Node v2',
          'IoT & Sensor Cerdas',
          'Perangkat pemantau kelembaban tanah, pH, NPK, dan mikroklimat berbasis LoRaWAN dengan panel surya terintegrasi untuk demo pertanian presisi.',
          $1::jsonb,
          'prima', 'tersedia', '2025-08-18',
          'Hibah Penelitian Terapan Kemendikbudristek 2025',
          'Ir. Bambang Sugiarto, M.T. & Tim IoT FTC',
          $2, 'Lemari Koper IoT B, Rak 1 (Box Biru #01)', $3,
          '1) Pasang antena LoRa 915MHz terlebih dahulu. 2) Nyalakan saklar daya utama di sisi kanan hingga LED biru berkedip. 3) Hubungkan tablet demo ke Wi-Fi hotspot FTC-AGRI-DEMO untuk melihat grafik sensor secara lokal.',
          true
         ) RETURNING id`,
        [
          JSON.stringify([
            { label: 'Konektivitas', value: 'LoRaWAN 915MHz + Wi-Fi Lokal' },
            { label: 'Catu Daya', value: 'LiFePO4 12V + Panel Surya 20W' },
            { label: 'Sensor', value: 'NPK, Kelembaban Tanah, DHT22' },
          ]),
          rE102,
          c4,
        ],
      )
    ).rows[0].id;

    const a2 = (
      await client.query(
        `INSERT INTO assets (inventory_code, name, category, description, specifications, condition, availability, completion_date, research_scheme, researcher_team, room_id, placement_detail, contact_id, usage_summary, is_priority)
         VALUES (
          'FTC-ROB-002',
          'Autonomous Campus Delivery Robot (DINUS-Bot R3)',
          'Robotika & Otomasi',
          'Prototipe robot pengantar dokumen otonom berbasis ROS 2 dengan navigasi LiDAR 2D dan kompartemen pintar berkunci QR.',
          $1::jsonb,
          'prima', 'tersedia', '2025-11-04',
          'Riset Unggulan Fakultas Teknologi Cerdas 2025',
          'Ahmad Fauzi, A.Md. & Tim Robotika FTC',
          $2, 'Bay Parkir Robot #2 (Dekat Charging Dock)', $3,
          '1) Cabut kabel charger dan pastikan indikator baterai > 50%. 2) Putar tombol E-Stop searah jarum jam, lalu tekan Power 3 detik. 3) Gunakan mode Demo Pameran pada layar sentuh atas untuk rute pendek 3 meter.',
          true
         ) RETURNING id`,
        [
          JSON.stringify([
            { label: 'Komputasi', value: 'Jetson Orin Nano 8GB (ROS 2 Humble)' },
            { label: 'Navigasi', value: 'RPLiDAR A3 + Depth Camera' },
            { label: 'Daya Tahan', value: '4 Jam Operasi Demo' },
          ]),
          rE101,
          c2,
        ],
      )
    ).rows[0].id;

    const a3 = (
      await client.query(
        `INSERT INTO assets (inventory_code, name, category, description, specifications, condition, availability, completion_date, research_scheme, researcher_team, room_id, placement_detail, contact_id, usage_summary, is_priority)
         VALUES (
          'FTC-AI-003',
          'Edge Vision Traffic & Crowd Analytics Box',
          'AI & Visi Komputer',
          'Unit komputasi tepi siap colok untuk deteksi kendaraan, kepadatan pengunjung pameran, dan estimasi antrean secara real-time tanpa internet.',
          $1::jsonb,
          'prima', 'dipinjam', '2025-05-22',
          'Kemitraan Smart City Semarang — FTC',
          'M. Yusuf Prasetyo, S.T. & Tim Vision FTC',
          $2, 'Rak Display Kaca A, Baris 2', $3,
          '1) Sambungkan kabel HDMI ke monitor pameran dan webcam USB ke port biru. 2) Nyalakan adaptor 19V; aplikasi dashboard demo terbuka otomatis dalam 40 detik.',
          true
         ) RETURNING id`,
        [
          JSON.stringify([
            { label: 'Prosesor AI', value: 'NVIDIA Jetson AGX Orin 64GB' },
            { label: 'Model', value: 'YOLOv11 TensorRT FP16 (60 FPS)' },
            { label: 'Output', value: 'HDMI 4K + Dashboard Web Lokal' },
          ]),
          rH301,
          c1,
        ],
      )
    ).rows[0].id;

    const a4 = (
      await client.query(
        `INSERT INTO assets (inventory_code, name, category, description, specifications, condition, availability, completion_date, research_scheme, researcher_team, room_id, placement_detail, contact_id, usage_summary, is_priority)
         VALUES (
          'FTC-MED-004',
          'Wearable Vital-Sign Telemetry Kit (ECG + SpO2)',
          'Teknologi Kesehatan Cerdas',
          'Prototipe gelang dan patch dada pemantau detak jantung, saturasi oksigen, dan suhu tubuh secara nirkabel dengan antarmuka tablet klinis.',
          $1::jsonb,
          'prima', 'tersedia', '2026-01-15',
          'Hibah Riset Kolaborasi Kesehatan Digital 2026',
          'Dr. Retno Wulandari, S.Si. & Tim Biomedis FTC',
          $2, 'Lemari Steril Kaca #1, Laci Bawah', $3,
          '1) Bersihkan sensor optik dengan tisu alkohol sebelum dipakai pengunjung. 2) Tekan tombol samping gelang 2 detik hingga LED hijau menyala. 3) Buka aplikasi VitalMonitor di tablet pendamping.',
          false
         ) RETURNING id`,
        [
          JSON.stringify([
            { label: 'Sensor', value: 'MAX30102 SpO2 + AD8232 ECG' },
            { label: 'Koneksi', value: 'Bluetooth Low Energy (BLE 5.0)' },
            { label: 'Kelengkapan', value: '2 Unit Gelang + 1 Tablet Demo' },
          ]),
          rH303,
          c3,
        ],
      )
    ).rows[0].id;

    const a5 = (
      await client.query(
        `INSERT INTO assets (inventory_code, name, category, description, specifications, condition, availability, completion_date, research_scheme, researcher_team, room_id, placement_detail, contact_id, usage_summary, is_priority)
         VALUES (
          'FTC-DRN-005',
          'Multispectral Crop Mapping UAV (Hexacopter FTC)',
          'Drone & Geospasial',
          'Wahana udara nirawak 6-rotor dengan kamera multispektral NDVI untuk pemetaan kesehatan tanaman dan demonstrasi statis di pameran.',
          $1::jsonb,
          'maintenance', 'tidak_tersedia', '2024-11-29',
          'Penelitian Pengembangan Produk Inovasi 2024',
          'Ir. Bambang Sugiarto, M.T.',
          $2, 'Hardcase Hitam Besar #05, Rak Bawah', $3,
          'Untuk pameran dalam ruangan, JANGAN memasang baling-baling (propeller). Tampilkan mode statis di atas stand akrilik dan putar rekaman hasil peta NDVI pada layar monitor.',
          false
         ) RETURNING id`,
        [
          JSON.stringify([
            { label: 'Payload', value: 'Kamera Multispektral 5-Band NDVI' },
            { label: 'Status Kalibrasi', value: 'Kalibrasi Kompas & Gimbal Berjalan' },
          ]),
          rH305,
          c4,
        ],
      )
    ).rows[0].id;

    const a6 = (
      await client.query(
        `INSERT INTO assets (inventory_code, name, category, description, specifications, condition, availability, completion_date, research_scheme, researcher_team, room_id, placement_detail, contact_id, usage_summary, is_priority)
         VALUES (
          'FTC-AI-006',
          'BISINDO Sign-Language Real-Time Translator Kiosk',
          'AI & Visi Komputer',
          'Kiosk interaktif penerjemah bahasa isyarat BISINDO ke teks dan suara bahasa Indonesia secara real-time untuk demo inklusivitas FTC.',
          $1::jsonb,
          'prima', 'tersedia', '2026-02-10',
          'Produk Unggulan Pengabdian & Riset FTC 2026',
          'Dr. Raditya Pratama, M.Kom. & Tim NLP/Vision',
          $2, 'Etalase Utama Dekanat FTC (Sisi Timur)', $3,
          '1) Colok kabel listrik kiosk ke stopkontak 220V ber-grounding. 2) Tekan tombol power di belakang layar; mode kiosk BISINDO langsung aktif. 3) Berdiri berjarak 1–1.5 meter di depan kamera dengan pencahayaan cukup.',
          true
         ) RETURNING id`,
        [
          JSON.stringify([
            { label: 'Kamera', value: 'Intel RealSense D435i' },
            { label: 'Kosakata', value: '250+ Gestur BISINDO + Text-to-Speech' },
          ]),
          rH201,
          c1,
        ],
      )
    ).rows[0].id;

    const a7 = (
      await client.query(
        `INSERT INTO assets (inventory_code, name, category, description, specifications, condition, availability, completion_date, research_scheme, researcher_team, room_id, placement_detail, contact_id, usage_summary, is_priority)
         VALUES (
          'FTC-IOT-007',
          'Smart Flood Early-Warning River Buoy',
          'IoT & Sensor Cerdas',
          'Pelampung sensor ketinggian muka air ultrasonik dan laju arus dengan transmisi NB-IoT untuk mitigasi banjir rob Semarang.',
          $1::jsonb,
          'rusak', 'tidak_tersedia', '2024-09-14',
          'Hibah Riset Mitigasi Bencana 2024',
          'Ir. Bambang Sugiarto, M.T.',
          $2, 'Meja Servis #2 (Menunggu Modul Sensor)', $3,
          'Saat ini sedang dalam perbaikan modul sensor ultrasonik waterproof; belum dapat digunakan untuk pameran hingga perbaikan selesai.',
          false
         ) RETURNING id`,
        [
          JSON.stringify([
            { label: 'Kendala', value: 'Transduser ultrasonik korosi' },
            { label: 'Casing', value: 'IP67 Polikarbonat Kuning' },
          ]),
          rH305,
          c4,
        ],
      )
    ).rows[0].id;

    await client.query(
      `INSERT INTO assets (inventory_code, name, category, description, specifications, condition, availability, completion_date, research_scheme, researcher_team, room_id, placement_detail, contact_id, usage_summary, is_priority)
       VALUES (
        'FTC-ROB-008',
        '6-DOF Collaborative Robotic Arm Trainer',
        'Robotika & Otomasi',
        'Lengan robot kolaboratif 6 derajat kebebasan untuk demo pick-and-place berbasis kamera warna di booth pameran.',
        $1::jsonb,
        'prima', 'tersedia', '2025-12-03',
        'Riset Otomasi Industri Cerdas FTC 2025',
        'Ahmad Fauzi, A.Md. & Tim Robotika FTC',
        $2, 'Meja Bench Robotika #1 (Pelindung Akrilik)', $3,
        '1) Pasang pembatas akrilik meja sebelum menyalakan daya 24V. 2) Pilih program preset DEMO_SORTING_WARNA pada teach pendant. 3) Tekan tombol merah E-Stop segera bila ada benda menghalangi jalur lengan.',
        false
       )`,
      [
        JSON.stringify([
          { label: 'Jangkauan', value: '620 mm / Payload 2 kg' },
          { label: 'Kontroler', value: 'STM32 + Python SDK' },
        ]),
        rE101,
        c2,
      ],
    );

    // 6. Tutorials & SOPs linked to FTC assets
    await client.query(
      `INSERT INTO tutorials (doc_code, asset_id, title, category, format, summary, steps_markdown, video_url, version, instructor_name)
       VALUES
       ('SOP-FTC-IOT-001', $1, 'Panduan Pengoperasian & Demo Pameran Smart Agriculture IoT Node v2', 'pengoperasian', 'panduan_teks',
        'Langkah lengkap menyalakan node sensor, menghubungkan tablet demo lokal tanpa internet gedung, serta prosedur penyimpanan baterai.',
        E'## Persiapan Sebelum Pameran\n1. Pastikan baterai LiFePO4 terisi penuh (indikator hijau pada charger).\n2. Bawa antena LoRa 915MHz, kabel adaptor cadangan, dan wadah tanah kering/basah untuk simulasi.\n\n## Cara Menyalakan\n1. Pasang antena LoRa terlebih dahulu (jangan nyalakan pemancar tanpa antena).\n2. Geser saklar utama ke posisi ON dan tunggu 15 detik hingga LED status biru berkedip.\n3. Sambungkan tablet demo ke Wi-Fi **FTC-AGRI-DEMO** lalu buka alamat http://192.168.4.1.\n\n## Penutupan\n1. Matikan saklar daya sebelum melepas sensor tanah.\n2. Lap ujung probe sensor dengan kain kering sebelum masuk koper.',
        null, '2.1', 'Ir. Bambang Sugiarto, M.T.'),
       ('VID-FTC-ROB-002', $2, 'Video Demo & Kalibrasi Singkat Autonomous Delivery Robot DINUS-Bot R3', 'video_demo', 'video',
        'Demonstrasi menyalakan ROS 2, memilih mode rute pameran aman, pengisian daya dok, serta penanganan darurat tombol E-Stop.',
        E'## Poin Kunci Video\n- Cek level baterai minimal 50% sebelum dipindahkan ke area pameran.\n- Pastikan tombol E-Stop terlepas (putar searah jarum jam).\n- Gunakan selalu preset **Mode Demo 3 Meter** agar robot tidak keluar area booth.',
        null, '1.3', 'Ahmad Fauzi, A.Md.'),
       ('SOP-FTC-AI-003', $3, 'Setup Cepat Edge Vision Analytics Box & Kiosk BISINDO di Booth Expo', 'persiapan_pameran', 'panduan_teks',
        'Prosedur sambungan HDMI, kamera USB/RealSense, pencahayaan minimum, dan restart aman ketika listrik booth tidak stabil.',
        E'## Kelengkapan Wajib\n1. Unit Jetson/Kiosk + adaptor resmi.\n2. Kabel HDMI 3 meter dan stopkontak terminal berpelindung lonjakan (surge protector).\n\n## Langkah Setup\n1. Sambungkan monitor HDMI dan kamera sebelum menyalakan daya.\n2. Tunggu 40 detik hingga antarmuka demo tampil otomatis layar penuh.\n3. Untuk mematikan, klik ikon Power di pojok kanan atas layar—jangan langsung mencabut kabel listrik.',
        null, '1.4', 'M. Yusuf Prasetyo, S.T.'),
       ('CHK-FTC-EXH-004', null, 'Checklist Standar PIC Pameran: Serah Terima, Packing & Keamanan Aset', 'k3', 'checklist',
        'Daftar periksa wajib bagi PIC Pameran sebelum membawa keluar produk penelitian FTC, saat menjaga booth, dan saat pengembalian.',
        E'## Sebelum Berangkat\n- Periksa kondisi fisik dan foto setiap aset sebelum keluar ruang lab.\n- Pastikan kabel adaptor, dongel, dan panduan cetak/QR menempel pada masing-masing alat.\n- Catat nomor WhatsApp narahubung produk di ponsel PIC.\n\n## Saat Pameran\n- Jauhkan minuman dari perangkat elektronik & baterai LiPo.\n- Pastikan perangkat dimatikan sesuai prosedur shutdown di akhir hari.\n\n## Saat Pengembalian\n- Laporkan segera bila ada komponen longgar atau rusak melalui menu Narahubung & Bantuan.',
        null, '1.0', 'Tim Pengelola Aset FTC'),
       ('SOP-FTC-MED-005', $4, 'Protokol Kebersihan & Demo Wearable Vital-Sign Telemetry Kit', 'perawatan', 'panduan_teks',
        'Tata cara sterilisasi ringan sensor SpO2/ECG antar pengunjung pameran serta cara pairing ulang Bluetooth ke tablet klinis.',
        E'## Kebersihan Sensor\n1. Usap permukaan optik sensor dengan alkohol swab 70% setiap selesai dicoba pengunjung.\n2. Jangan merendam modul elektronik atau menyemprot cairan langsung ke casing.\n\n## Pairing Ulang BLE\n1. Buka menu Pengaturan di aplikasi VitalMonitor.\n2. Pilih perangkat **FTC-VITAL-01** dan tekan Hubungkan.',
        null, '1.2', 'Dr. Retno Wulandari, S.Si.')`,
      [a1, a2, a3, a4],
    );

    // 7. FAQs
    await client.query(
      `INSERT INTO faqs (question, answer, sort_order) VALUES
       ('Bagaimana PIC Pameran mengetahui letak dan cara pakai produk tanpa login?', 'Cukup buka halaman Katalog atau pindai QR Code pada stiker produk. Halaman detail langsung menampilkan kondisi, tanggal jadi, ruangan & rak peletakan, panduan penggunaan, dan tombol WhatsApp narahubung.', 1),
       ('Apa syarat identitas saat mengajukan peminjaman aset FTC?', 'Peminjam mengisi nama lengkap, identitas menggunakan NIM (mahasiswa), NPP (dosen/staf), atau nama Unit kerja, nomor WhatsApp aktif, serta menyetujui Pakta Integritas.', 2),
       ('Apakah produk yang sedang dipinjam hari ini bisa dipesan untuk pameran minggu depan?', 'Bisa, selama rentang tanggal yang diajukan tidak beririsan dengan jadwal peminjaman yang sudah disetujui atau sedang berjalan dan kondisi aset dalam keadaan baik.', 3),
       ('Apa yang harus dilakukan jika produk mengalami kendala saat pameran berlangsung?', 'Hubungi narahubung produk langsung lewat tombol WhatsApp di halaman detail aset, lalu catat kejadiannya pada formulir Lapor Kendala di menu Narahubung & Bantuan agar segera ditindaklanjuti teknisi FTC.', 4)`,
    );

    // 8. Sample Loans (1 borrowed for a3, 1 pending for a2)
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const addDays = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return fmt(d);
    };

    const loan1 = (
      await client.query(
        `INSERT INTO loans (ticket_code, borrower_name, borrower_id_type, borrower_id_value, borrower_whatsapp, borrower_unit_detail, purpose_title, usage_location_type, external_location_detail, funding_category, start_date, end_date, daily_session, integrity_agreed, status, admin_notes, approved_at, borrowed_at)
         VALUES ('FTC-2026-0001', 'Rina Kusuma Wardhani', 'NPP', '0686.11.2019.742', '081234560011', 'Tim Humas & Pameran FTC', 'Pameran Inovasi Kampus Jawa Tengah 2026', 'external', 'Lawang Sewu Exhibition Hall, Semarang', 'Pameran / Expo FTC', $1, $2, 'Sesi Penuh (08.00 - 17.00 WIB)', true, 'borrowed', 'Disetujui dengan koper pengaman & adaptor cadangan.', NOW(), NOW()) RETURNING id`,
        [addDays(-1), addDays(2)],
      )
    ).rows[0].id;
    await client.query(`INSERT INTO loan_items (loan_id, asset_id) VALUES ($1, $2)`, [loan1, a3]);

    const loan2 = (
      await client.query(
        `INSERT INTO loans (ticket_code, borrower_name, borrower_id_type, borrower_id_value, borrower_whatsapp, borrower_unit_detail, purpose_title, usage_location_type, external_location_detail, funding_category, start_date, end_date, daily_session, integrity_agreed, status)
         VALUES ('FTC-2026-0002', 'Dimas Prakoso', 'NIM', 'A11.2023.14890', '081234560022', 'Himpunan Mahasiswa FTC', 'Open House & Expo Mahasiswa Baru UDINUS', 'internal', null, 'Pameran / Expo FTC', $1, $2, 'Sesi Penuh (08.00 - 17.00 WIB)', true, 'pending') RETURNING id`,
        [addDays(5), addDays(7)],
      )
    ).rows[0].id;
    await client.query(`INSERT INTO loan_items (loan_id, asset_id) VALUES ($1, $2), ($1, $3)`, [loan2, a2, a6]);

    // 9. Sample Issue Tickets
    await client.query(
      `INSERT INTO issue_tickets (ticket_code, asset_id, asset_code_input, reporter_name, reporter_contact, category, urgency, description, assigned_contact_id, status, resolution_notes)
       VALUES
       ('FTC-INC-2026-0001', $1, 'FTC-IOT-007', 'Budi Santoso', '081234560099', 'kerusakan', 'sedang', 'Pembacaan sensor jarak ultrasonik tidak stabil setelah pengujian lapangan.', $2, 'in_progress', 'Transduser pengganti IP67 sedang dalam proses pemasangan.'),
       ('FTC-INC-2026-0002', $3, 'FTC-DRN-005', 'Siti Rahma', '081234560088', 'perawatan', 'rendah', 'Perlu kalibrasi kompas dan pengecekan konektor gimbal sebelum pameran bulan depan.', $2, 'open', null)`,
      [a7, c4, a5],
    );

    await client.query('COMMIT');
    console.log('[init-db] seeded FTC UDINUS initial dataset');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await applyMigrations(client);
    await seedAdmin(client);
    await seedSampleData(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[init-db] failed:', err);
  process.exit(1);
});
