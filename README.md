<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38bdf8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Leaflet-GIS-199900?logo=leaflet&logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License MIT" />
</p>

# 🍵 Teh Baling — Multi-Outlet Booth Operations ERP

> Sistem ERP operasional end-to-end yang dibangun untuk jaringan franchise minuman guna mengelola sebaran cabang booth, presensi berbasis geofencing GPS, pelacakan stok cup, dan analitik performa penjualan terpusat.

---

## 📸 Screenshots & Antarmuka Sistem

<p align="center">
  <img src="public/screenshots/foto3_dashboard_analitik_recharts.png" alt="Dashboard Analitik Penjualan Multi-Booth" width="95%" />
  <br/>
  <em>Dashboard Analitik Multi-Booth dengan Visualisasi Penjualan & Jam Sibuk (Recharts)</em>
</p>

<details open>
<summary><strong>Lihat Galeri Fitur Utama Lainnya ▾</strong></summary>

| Modul | Tampilan Antarmuka |
|-------|--------------------|
| **Peta Pemetaan Booth (Leaflet GIS)**<br/>Visualisasi lokasi titik koordinat booth, status operasional (buka/tutup), dan ringkasan outlet realtime. | <img src="public/screenshots/foto1_peta_booth_leaflet.png" alt="Peta Pemetaan Booth Leaflet" width="480" /> |
| **Presensi Geofencing GPS (Haversine)**<br/>Verifikasi kehadiran barista/penjaga booth dengan validasi radius lokasi (maksimal 200m dari koordinat booth). | <img src="public/screenshots/foto2_presensi_geofencing_gps.png" alt="Presensi Geofencing GPS" width="480" /> |
| **Audit & Rekonsiliasi Stok Cup**<br/>Pelacakan mutasi stok cup harian per booth, verifikasi selisih fisik vs penjualan, serta pencegahan loss operasional. | <img src="public/screenshots/foto4_audit_stok_cup.png" alt="Audit Stok Cup" width="480" /> |
| **Autentikasi & Login Role Penjaga Booth**<br/>Halaman login terproteksi role penjaga booth (`BOOTH_ATTENDANT`) dengan verifikasi identitas dan pendeteksian sesi aktif. | <img src="public/screenshots/foto5_login_role_penjaga_booth.png" alt="Login Role Penjaga Booth" width="480" /> |
| **Portal Penugasan & Shift Penjaga Booth**<br/>Dashboard operasional penjaga stand booth: penugasan outlet harian, pemilihan sesi shift (Pagi/Sore), dan modal kasir aktif. | <img src="public/screenshots/foto6_portal_penjaga_booth.png" alt="Portal Shift Penjaga Booth" width="480" /> |
| **Autentikasi & Login Role Tim Produksi**<br/>Halaman login terproteksi role tim produksi dapur (`PRODUCTION`) dengan session guard dan pengalihan dashboard otomatis. | <img src="public/screenshots/foto7_login_role_tim_produksi.png" alt="Login Role Tim Produksi" width="480" /> |
| **Portal Dapur & Pencatatan Produksi Teh**<br/>Modul dapur untuk pencatatan batch memasak teh harian (liter), catatan bahan baku, dan monitoring jam operasional input. | <img src="public/screenshots/foto8_portal_tim_produksi.png" alt="Portal Dapur Tim Produksi" width="480" /> |

</details>

---

## ✨ Fitur Unggulan

### 🗺️ Peta Pemetaan Cabang & Status Booth (GIS)
- Pemetaan visual seluruh titik booth outlet menggunakan **Leaflet OpenStreetMap**.
- Menampilkan status langsung (Aktif, Shift Tutup, Maintenance) dengan marker kustom.
- Detail cepat performa penjualan dan shift yang sedang bertugas per booth.

### 📍 Presensi Geofencing GPS (Formula Haversine)
- Mencegah kecurangan presensi (*fake GPS / clock-in dari luar outlet*) dengan perhitungan jarak radius presisi (200m) dari titik koordinat booth.
- Perekaman timestamp kedatangan, keterlambatan, dan jam kepulangan shift kerja.

### 📊 Dashboard Analitik Multi-Booth (Recharts)
- Grafik visual perbandingan omzet harian, mingguan, dan bulanan antar outlet.
- Analisis *peak hours* (jam-jam tersibuk) untuk alokasi staf dan stok yang efisien.
- Metrik Best Selling Series (varian rasa terlaris) dan efisiensi konversi cup.

### 📦 Audit & Pengawasan Mutasi Stok Cup
- Pencatatan stok awal, restock harian dari gudang pusat, dan stok terpakai berbasis transaksi kasir.
- Deteksi otomatis deviasi/selisih (*discrepancy alert*) untuk mencegah kebocoran bahan baku.
- Dukungan ekspor laporan resmi harian/bulanan ke format **Microsoft Excel (.xlsx)** via ExcelJS.

### 🍵 Portal Operasional Penjaga Booth (Barista / Kasir)
- Autentikasi berbasis JWT dengan otorisasi role terproteksi `BOOTH_ATTENDANT`.
- Tampilan penugasan booth harian otomatis, verifikasi sesi shift (Pagi/Sore), serta pencatatan modal awal kasir.
- Modul restock inventaris cup langsung dari outlet dengan validasi stok terintegrasi.

### 🔥 Modul Produksi & Distribusi Dapur (Kitchen Staf)
- Portal terisolasi role `PRODUCTION` dengan pembatasan jam operasional input (05:00 - 23:00 WIB).
- Form pelaporan volume masak teh harian (liter) dan catatan varian batch bahan baku.
- Integrasi riwayat memasak dan modul pengiriman bahan baku ke seluruh titik cabang booth.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router & Server Components)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict type safety)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **GIS Mapping:** [Leaflet](https://leafletjs.com/) & [React Leaflet](https://react-leaflet.js.org/)
- **Data Visualization:** [Recharts](https://recharts.org/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Data Export:** [ExcelJS](https://github.com/exceljs/exceljs)

---

## 🚀 Memulai (Local Development)

### 1. Prasyarat
- Node.js >= 18.x
- Backend API Teh Baling berjalan (port 3001 atau sesuai konfigurasi)

### 2. Instalasi Dependensi
```bash
git clone https://github.com/Salman-artz/teh-baling-frontend.git
cd teh-baling-frontend
npm install
```

### 3. Konfigurasi Environment Variable
Buat file `.env.local` pada direktori root:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 4. Jalankan Development Server
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 📂 Struktur Proyek

```
teh-baling-frontend/
├── public/
│   └── screenshots/          # Tangkapan layar antarmuka sistem
├── src/
│   ├── app/                  # Next.js 14 App Router pages & layouts
│   │   ├── (auth)/login/     # Halaman login otentikasi
│   │   ├── (dashboard)/      # Portal Admin & Operasional
│   │   │   ├── analytics/    # Visualisasi Recharts
│   │   │   ├── audit-stok/   # Modul rekonsiliasi cup
│   │   │   ├── booths/       # Manajemen booth & peta GIS
│   │   │   └── presensi/     # Monitoring geofencing GPS
│   ├── components/           # UI Components (Sidebar, Navbar, Cards)
│   ├── hooks/                # Custom React Hooks
│   ├── lib/                  # Utilitas API client & formatters
│   └── types/                # Definisi TypeScript interface
├── package.json
└── tailwind.config.ts
```

---

## 👤 Author

**Muhammad Salman Alfarizy Yonda Putra**
- GitHub: [@Salman-artz](https://github.com/Salman-artz)
- LinkedIn: [linkedin.com/in/muhammad-salman-alfarizy](https://linkedin.com)
