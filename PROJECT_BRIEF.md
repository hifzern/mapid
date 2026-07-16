# Transit Accessibility Evaluator — Project Brief

> Dokumen ini adalah panduan besar (big picture) untuk AI coding agent yang akan membantu inisiasi dan pengembangan repo ini. Baca seluruh dokumen sebelum mulai scaffolding, karena ada batasan kompetisi yang WAJIB dipatuhi (lihat bagian "Batasan & Larangan").

## 1. Ringkasan Proyek

**Nama produk:** Transit Accessibility Evaluator (nama sementara, bisa diganti)

**Konteks:** Proyek kompetisi WebGIS berbasis platform MAPID. Tema besar: transportasi massal — aksesibilitas, konektivitas antarmoda.

**Masalah yang diselesaikan:** Perencana kota sulit mengevaluasi apakah rute transportasi massal baru (bus kota, dll) benar-benar menjangkau kawasan padat penduduk, atau justru tumpang tindih dengan rute yang sudah ada. Evaluasi biasanya manual dan tidak berbasis data spasial yang solid.

**Solusi:** WebGIS interaktif di mana user (perencana kota/stakeholder) bisa **menggambar rute simulasi langsung di peta** (drag-and-drop), lalu sistem otomatis menghitung **Transit Accessibility Score** (populasi tercover, overlap dengan rute existing, kelayakan jalan) dan memberi **rekomendasi perbaikan rute** dalam bentuk narasi AI yang dihasilkan dari angka hasil query spasial nyata (bukan angka karangan LLM).

## 2. User Flow (Garis Besar)

```
Landing/Overview
    ↓
Peta Interaktif (basemap MAPID + layer: rute existing, populasi, Property Go, batas admin)
    ↓
Mode "Gambar Rute Simulasi" → user drag garis di peta
    ↓
Backend hitung: buffer 500m → intersect populasi/rute existing/Property Go → grid-search alternatif
    ↓
Tampilkan hasil: skor komposit + breakdown + AI Insight (narasi dari angka asli) + highlight peta
    ↓
Aksi lanjutan: terapkan rekomendasi (iterasi ulang) / bandingkan rute existing
    ↓
Halaman pendukung: Analisis & Insight agregat, Metodologi & Sumber Data, Rekomendasi
```

## 3. Prinsip Desain yang WAJIB Dipegang

1. **AI tidak boleh menghitung angka spasial sendiri.** Semua angka (populasi tercover, % overlap, jarak pergeseran) HARUS dihitung oleh query PostGIS/algoritma eksplisit terlebih dulu. LLM hanya bertugas menyusun angka tersebut jadi kalimat naratif. Ini mencegah hallucination pada data yang krusial untuk kredibilitas insight.
2. **Simplicity over impressiveness.** Tim terdiri dari 3 orang dengan waktu terbatas. Prioritaskan stack yang minim moving parts (managed service > self-hosted microservices) supaya waktu fokus ke logika inti (scoring algorithm, kualitas insight), bukan maintenance infrastruktur.
3. **Satu flow linear, jangan melebar.** Tidak boleh ada auth/login sebagai gerbang akses utama, tidak boleh ada dashboard riwayat/history kompleks, tidak boleh ada background job/queue. Semua proses harus sinkron (user submit rute → tunggu → hasil langsung tampil).
4. **Basemap wajib dari MAPID MAPS**, bukan basemap default provider peta lain.
5. **Transparansi rumus skor.** Rumus scoring harus dijelaskan eksplisit di dokumentasi (bukan black box), karena ini yang membedakan proyek riset serius dari "AI ngasal".

## 4. Batasan & Larangan (dari ketentuan kompetisi — JANGAN DILANGGAR)

- **Dilarang** membangun auth/login sebagai syarat akses utama — WebGIS wajib bisa diakses publik tanpa hambatan.
- **Dilarang** menyimpan/menyebarkan data mentah panitia ke luar konteks kompetisi.
- **Dilarang** WebGIS yang hanya menampilkan data mentah tanpa analisis/insight.
- **Dilarang** pakai tools analisis spasial berbayar tanpa persetujuan panitia — prioritaskan open-source (PostGIS, QGIS, Turf.js, dll).
- **Wajib** basemap MAPID MAPS sebagai basemap utama.
- **Wajib** fitur AI ada di dalam interface (bukan proses backend tersembunyi) — user harus bisa berinteraksi dengan output AI secara langsung.
- **Wajib** deploy publik (Vercel/Netlify/dll) di tahap final.
- Scope MVP: 1 flow input→output, backend sinkron, model/parameter statis (tidak perlu training model ML sendiri untuk versi ini — cukup rule-based scoring + LLM untuk narasi).

## 5. Tech Stack yang Direkomendasikan

| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend | Next.js + Leaflet + Leaflet.draw | Leaflet lebih universal untuk basemap eksternal (raster tile MAPID) dibanding Mapbox GL JS yang butuh vector tile style spec |
| Backend + Database | Supabase (PostgreSQL + PostGIS built-in) | Managed, gratis untuk tier kompetisi, drastis kurangi effort backend custom, sudah auto-generate REST API |
| Spatial logic | Postgres Functions (RPC) di Supabase — `ST_Buffer`, `ST_Intersects`, `ST_Distance`, `ST_Area` | Query kompleks dieksekusi langsung di DB, dipanggil dari frontend, tanpa perlu backend server custom terpisah |
| AI Engine | Python FastAPI kecil (1 service) khusus orkestrasi LLM untuk narasi hasil | Terpisah supaya rapi, tapi minimal — cuma 1 service tambahan |
| LLM Provider | Claude API atau OpenAI API (sesuai preferensi tim & budget) | Untuk generate narasi insight dari angka hasil query |
| External Integration | GEO MAPID API | Basemap tile + layer data (Property Go, Menu Go, dll) |
| Hosting | Vercel (frontend) + Supabase (backend/db) + hosting kecil untuk FastAPI (Railway/Render free tier) | Semua deploy publik, minim maintenance |

**Catatan penting untuk agent:** JANGAN scaffold microservices arsitektur kompleks (NestJS/Golang terpisah + auth service + database server manual). Gunakan Supabase sebagai pengganti backend custom untuk kebutuhan CRUD & spatial query dasar. Backend custom (FastAPI) HANYA untuk orkestrasi LLM, bukan untuk spatial computation (spatial computation di database via RPC).

## 6. Skema Data (Awal)

### Tabel `existing_routes` (rute transportasi massal yang sudah ada)
- `id`, `name`, `geom` (LineString), `type` (bus/angkot/BRT), `source` (sumber data)

### Tabel `population_grid` atau `population_admin` (data kependudukan)
- `id`, `admin_name` (nama kelurahan/desa), `geom` (Polygon), `population` (jumlah penduduk resmi dari BPS/data terbuka)

### Tabel `property_go` (dari MAPID Data Mission)
- `id`, `kategori`, `jenis` (sewa/jual), `geom` (Point), `alamat`

### Tabel `simulated_routes` (rute yang digambar user, untuk histori/agregat insight — bukan personal history per user)
- `id`, `geom` (LineString), `score`, `created_at`, `metadata` (JSON hasil breakdown)

## 7. Algoritma Scoring (Spesifikasi Awal)

Skor komposit 0-100, dari kombinasi berbobot:
- **50%** — populasi tercover dalam radius 500m dari rute (dinormalisasi terhadap populasi maksimum yang bisa dicapai di wilayah studi)
- **30%** — inverse dari overlap % dengan rute existing (makin sedikit overlap, skor makin tinggi)
- **20%** (opsional, tambahkan kalau waktu cukup) — kelayakan jalan: validasi rute yang digambar terhadap data jalan OpenStreetMap, beri penalti kalau rute tidak mengikuti jalan yang bisa dilalui kendaraan bus

**Algoritma "Smart Alignment" (grid-search sederhana):**
1. Ambil rute yang digambar user sebagai baseline.
2. Geser rute secara virtual ke beberapa arah (utara/selatan/timur/barat) dan beberapa jarak (300m/500m/800m/1km) — total kombinasi kecil (~8-16 kandidat).
3. Hitung ulang skor untuk tiap kandidat.
4. Pilih kandidat dengan peningkatan skor (khususnya population coverage) terbaik.
5. Kirim hasil terbaik + delta improvement ke AI Engine untuk dinarasikan.

## 8. Panduan Prompt untuk LLM (AI Insight)

System prompt harus eksplisit menginstruksikan:
- LLM HANYA menyusun kalimat dari angka yang diberikan di prompt (population_covered, overlap_pct, best_shift_direction, best_shift_distance, new_population, delta_pct).
- LLM DILARANG mengarang angka statistik baru yang tidak ada di input.
- Output singkat, actionable, dalam Bahasa Indonesia, ditujukan untuk perencana kota/stakeholder non-teknis.

## 9. Fitur MVP (Wajib Selesai untuk Submission)

- [ ] Peta interaktif dengan basemap MAPID MAPS
- [ ] Layer toggle: rute existing, populasi, Property Go
- [ ] Drawing tool untuk gambar rute simulasi (Leaflet.draw)
- [ ] Backend RPC: hitung buffer, population coverage, overlap %
- [ ] Algoritma smart alignment (grid-search sederhana)
- [ ] AI Insight panel — narasi rekomendasi berbasis angka asli
- [ ] Visualisasi hasil: gauge skor, breakdown angka, highlight buffer di peta
- [ ] Halaman: Beranda/Overview, Peta Interaktif, Analisis & Insight, Metodologi & Sumber Data, Rekomendasi
- [ ] Responsif desktop & mobile
- [ ] Deploy publik (Vercel)

## 10. Roadmap Fitur Masa Depan (Bukan untuk MVP — Jangan Dikerjakan Dulu, Sekadar Referensi Arah)

Fitur-fitur ini SENGAJA tidak masuk MVP karena melanggar batasan scope kompetisi (butuh auth/dashboard/history/background job) atau butuh data yang belum tentu tersedia saat kompetisi. Simpan sebagai bagian "Future Work" di proposal, jangan diimplementasikan sekarang:

- **Multi-skenario comparison** — simpan beberapa rute simulasi per user (login) untuk dibandingkan berdampingan (butuh auth, di luar scope MVP).
- **Historical trend analysis** — tracking perubahan skor aksesibilitas kawasan dari waktu ke waktu (butuh data historis longitudinal, database dengan versioning).
- **Kolaborasi multi-user real-time** — beberapa perencana kota menggambar rute bersamaan di peta yang sama (butuh websocket/realtime infra).
- **Validasi kelayakan jalan penuh** — integrasi routing engine (OSRM/Valhalla) untuk memastikan rute yang digambar benar-benar bisa dilalui bus (lebar jalan, radius putar, dll) — saat ini cukup pakai penalti sederhana berbasis overlap dengan jaringan jalan OSM.
- **Prediksi demand penumpang berbasis machine learning** — model prediktif terlatih dari data historis penumpang (butuh dataset yang saat ini tidak tersedia dari MAPID).
- **Integrasi data real-time kepadatan lalu lintas** — untuk mempertimbangkan kondisi jalan aktual saat evaluasi rute.
- **Export laporan PDF otomatis** untuk keperluan dokumen resmi ke pemerintah kota.
- **API publik** untuk pihak ketiga (dinas perhubungan, peneliti) mengakses scoring engine secara programatik.
- **Modul rekomendasi lokasi halte** — bukan cuma evaluasi rute garis, tapi juga titik pemberhentian optimal di sepanjang rute.

## 11. Instruksi Khusus untuk Coding Agent

1. Mulai dari scaffolding Next.js + Leaflet dulu dengan basemap statis (belum terhubung MAPID API) untuk validasi UI dasar berjalan.
2. Setup Supabase project, aktifkan ekstensi PostGIS, buat skema tabel sesuai bagian 6.
3. Tulis RPC function untuk perhitungan buffer & intersect SEBELUM membangun UI hasil — validasi dulu logika spasialnya benar dengan data dummy.
4. AI Engine (FastAPI) dibangun PALING TERAKHIR, setelah scoring logic dari database terbukti benar — supaya prompt LLM punya angka nyata untuk diuji, bukan angka dummy.
5. Selalu cek ulang terhadap bagian 3 (Prinsip Desain) dan bagian 4 (Batasan) sebelum menambah fitur baru — kalau ada keraguan apakah suatu fitur melanggar scope MVP, tanyakan ke user dulu sebelum implementasi.
