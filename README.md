# 🅿️ TitikParkir — Sistem Alokasi Lot Parkir Real-Time

Aplikasi web manajemen dan alokasi lot parkir yang berfokus murni pada **1 fungsi utama**: **Melihat ketersediaan titik/lot parkir secara real-time dan langsung melakukan alokasi / parkir dalam 1 klik.**

---

## 🎨 Karakteristik Desain & Warna

Sesuai permintaan:
- **Nama Produk**: **TitikParkir**
- **Warna Utama**: Biru redup / soft muted slate blue (`#526E7F`) yang tenang, tidak menyilaukan mata, dan tidak kontras tinggi.
- **Warna Pendukung**: Hitam / Dark Charcoal (`#1E252B` dan `#273138`) serta Putih Bersih (`#FFFFFF` & `#F5F7FA`).
- **Gaya Visual**: Minimalis, bersih, fokus langsung pada grid titik lot parkir tanpa menu yang berbelit.

---

## 🚀 Fitur Utama (Focused Single-Function)

1. **Denah Titik Parkir Interaktif Real-Time**:
   - Menampilkan status setiap lot parkir (Lantai 1: A-01 s/d A-12, Lantai 2: B-01 s/d B-12).
   - Indikator ketersediaan titik live (e.g. *18 / 24 Lot Tersedia*).
2. **1-Klik Alokasi / Check-in**:
   - Klik pada slot kosong (bertanda *Tersedia*).
   - Masukkan nomor plat kendaraan (contoh: `B 1234 ABC`).
   - Slot langsung terkunci dan status berubah menjadi *Terisi*.
3. **1-Klik Checkout & E-Ticket**:
   - Klik pada slot yang sedang *Terisi*.
   - Lihat ringkasan e-tiket: waktu masuk, durasi parkir berjalan, dan estimasi biaya (Rp 4.000 / jam).
   - Klik **"Selesai Parkir"** untuk mengosongkan lot kembali secara instan.
4. **Penyimpanan Lokal (Offline & Persistent)**:
   - Status lot tersimpan otomatis di `localStorage` browser sehingga data tidak hilang saat halaman di-refresh.

---

## 💻 Cara Menjalankan

Aplikasi ini dibuat murni tanpa dependensi eksternal (*zero-dependency* HTML5, CSS3, & Vanilla JS).

Anda cukup membuka file:
`C:\Users\VICTUS\.gemini\antigravity\scratch\titikparkir\index.html`
langsung di browser favorit Anda (Google Chrome, Microsoft Edge, Firefox, dll).
