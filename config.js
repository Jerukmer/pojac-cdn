/**
 * =============================================================================
 *   POJAC E-LIBRARY — KONFIGURASI SISTEM PORTAL
 *   Berkas ini dapat Anda edit sewaktu-waktu menggunakan teks editor biasa (Notepad/VSCode)
 *   atau melalui dashboard Editor Web di: http://localhost:8080/editor
 * =============================================================================
 */
window.POJAK_CONFIG = {
  // Identitas & Nama Perpustakaan
  appName: "POJAC E-LIBRARY",
  appTagline: "Pusat Khazanah Literasi Turats & Pengetahuan Sains Digital",
  shortName: "POJAC",
  estYear: "2024",
  version: "2.3.0",

  // Tautan Eksternal
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1_ObWupHQoo6bsDfFYGkOYu-vvmCAlIr1XmzSZmcgaA0/edit?gid=0#gid=0",

  // Informasi Kontak & Lembaga
  contact: {
    organization: "Pojok Baca (POJAC)",
    location: "Indonesia",
    email: "pojak.library@gmail.com",
    whatsapp: ""
  },

  // Ringkasan Statistik Utama (dihitung ulang otomatis oleh update_catalog.py)
  stats: {
    totalBooks: 34089,
    cloudCapacityGb: 498.68,
    categoriesCount: 23,
    arabicBooksCount: 5298
  },

  // Fitur Antarmuka
  features: {
    enableFavorites: true,
    enableGoogleImageSearch: true,
    defaultPageSize: 48
  },

  // Kategori internal yang disembunyikan dari katalog publik (aset logo/identitas)
  hiddenCategories: [
    "#Logo Pojak",
    "Logo & Identitas Visual Hari Santri 2026"
  ],

  // Kata sandi gerbang Super Admin (halaman admin.html) — SEGERA GANTI dengan sandi Anda sendiri
  adminPassword: ""
};
