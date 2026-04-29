# Alya RPG Bot - Deployment Guide (Railway)

Bot ini sudah disiapkan untuk dideploy ke **Railway.app**.

## 🚀 Langkah Deployment

1. **Hubungkan ke GitHub:**
   - Push kode ini ke GitHub.
   - Di Railway, pilih **New Project** > **Deploy from GitHub repo**.

2. **Environment Variables:**
   Tambahkan variabel berikut di tab **Variables** Railway:
   - `TOKEN`: Token Bot Discord kamu.
   - `PREFIX`: `.` (atau prefix lain yang kamu inginkan).
   - `PORT`: `3000` (untuk health check).

3. **Persistent Storage (Penting!):**
   Agar data level dan uang pemain tidak hilang saat bot restart:
   - Pergi ke tab **Settings** di Railway.
   - Cari bagian **Volumes** > **Add Volume**.
   - Set **Mount Path** ke: `/app/database`
   - Ini akan memastikan file `state.json` di dalam folder `database` tetap tersimpan selamanya.

## 🛠️ Perintah Utama
- `.register <nama>` - Daftar akun.
- `.gacha` - Pull karakter (5.000 koin).
- `.menu` - Membuka menu bantuan.
- `/clear` - Hapus pesan (Slash Command).

Dibuat dengan ❤️ untuk Alya Bot RPG.
