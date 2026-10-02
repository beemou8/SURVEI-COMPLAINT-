# SURVEI-COMPLAINT (Sistem Suara & Keluhan Member ke Cabang)

Sistem web keluhan member untuk memantau aspirasi dan kendala pelanggan di cabang secara terintegrasi dengan PostgreSQL dan Docker.

## Fitur Utama
1. **Portal Member (`/`)**: Form ringkas (4 input: Kode Member, Tanggal Kejadian, Kategori Keluhan, Isi Keluhan).
2. **Dashboard Manager (`/manager`)**: Mode *read-only* bagi pimpinan untuk memantau keluhan per cabang, filter tanggal, kategori, dan pencarian kata kunci.

## Cara Menjalankan

### Menggunakan Docker
```bash
docker compose up -d --build
```

### Menggunakan Node.js
```bash
npm install
npm start
```
Buka di browser: `http://localhost:3000`
Dashboard Manager: `http://localhost:3000/manager`
