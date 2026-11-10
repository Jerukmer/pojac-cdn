/**
 * =============================================================================
 *   POJAC E-LIBRARY — GENERATOR SAMPUL MODERN MINIMALIS (KANAL/EDITORIAL STYLE)
 * =============================================================================
 * Membuat sampul buku digital secara otomatis untuk koleksi yang tidak
 * memiliki preview/thumbnail (audio, video, arsip, dokumen tertentu, atau
 * thumbnail Google Drive yang gagal dimuat).
 *
 * Desain identik dengan referensi sampul editorial pilihan pengguna:
 *   - Varian A (Deep Maroon + Gold Vertical Bar):
 *     Latar merah marun pekat (#6E0B14), watermark miring di kanan atas
 *     (di sebelah kiri tombol bintang favorit agar tidak tertutup), garis
 *     vertikal kuning-emas (#EAB308) di kiri bawah, dan judul putih tebal.
 *   - Varian B (Matte Charcoal #1E1E1E + Coral & White Two-Tone Title):
 *     Latar hitam-abu matte (#1E1E1E), judul sans-serif ekstra tebal rata kiri
 *     dengan kombinasi 2 warna (koral #E05A5A & putih bersih #FFFFFF),
 *     subjudul deskriptif rapi di bawahnya, dan watermark di kiri bawah.
 * =============================================================================
 */
(function () {
  'use strict';

  var cache = new Map();

  // Format yang umumnya tidak menghasilkan thumbnail dokumen di Google Drive
  var NO_PREVIEW = new Set([
    'MP3', 'MP4', 'MKV', 'WEBM', 'MOV', 'VOB', '3GP', 'AMR', 'M4A', 'AAC', 'OPUS', 'WAV',
    'ZIP', 'RAR', 'GZ', 'DMG', 'APK', 'EXE', 'TMP', 'SWF',
    'CSV', 'CSV-ORI', 'XLS', 'XLSX', 'ODS', 'XLS#', 'XES', 'PY', 'YML', 'MD',
    'SHA256', 'ZIP-SHA-256', 'BOK', 'CHM', 'DJVU', 'MOBI', 'EPUB', 'TXT'
  ]);

  function hashStr(s) {
    var h = 0, i;
    for (i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function isArabic(t) {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(t || '');
  }

  // Rapikan judul sampul agar bersih dari awalan "(BARU)", emoji, atau ekstensi file
  function cleanTitle(raw) {
    var s = String(raw || 'Koleksi Literasi POJAC').trim();
    s = s.replace(/^\s*(\(BARU\)|\[BARU\]|BARU\s*[-:–])\s*/i, '');
    s = s.replace(/\.(pdf|mp3|mp4|mkv|docx?|xlsx?|pptx?|zip|rar|epub|djvu|chm|txt)$/i, '');
    // Hapus simbol/emoji dekoratif di awal/akhir agar tipografi buku bersih
    s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+/gu, '');
    s = s.replace(/_/g, ' ').replace(/\s{2,}/g, ' ').trim();
    // Jika seluruh judul huruf kecil, ubah huruf awal kata menjadi kapital (Title Case)
    if (s && s === s.toLowerCase() && !isArabic(s)) {
      s = s.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
    }
    return s || 'Koleksi Literasi POJAC';
  }

  function wrapLines(ctx, text, maxW, maxLines) {
    var words = String(text).trim().split(/\s+/);
    var lines = [], line = '', i, w, truncated = false;
    for (i = 0; i < words.length; i++) {
      w = line ? line + ' ' + words[i] : words[i];
      if (!line || ctx.measureText(w).width <= maxW) {
        line = w;
      } else {
        lines.push(line);
        line = words[i];
        if (lines.length === maxLines) { truncated = true; break; }
      }
    }
    if (!truncated && line) {
      if (lines.length < maxLines) lines.push(line);
      else truncated = true;
    }
    if (truncated && lines.length) {
      lines[lines.length - 1] = lines[lines.length - 1].replace(/\s+\S*$/, '') + '…';
    }
    return { lines: lines, truncated: truncated };
  }

  function renderCover(opts) {
    var W = 400, H = 560;
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    var h = hashStr((opts.gid || '') + '|' + (opts.title || 'pojac'));
    var titleText = cleanTitle(opts.title);
    var arabic = isArabic(titleText);

    var catName = (opts.categories && opts.categories[opts.catIdx]) || 'Khazanah Keilmuan';
    catName = String(catName).replace(/^\d+\.\s*/, '').trim();

    // Pilih antara Varian A (Maroon + Gold Bar, 1/3) dan Varian B (Matte Charcoal + Coral/White, 2/3)
    // Persis komposisi 1 kartu Maroon & 2 kartu Charcoal pada tangkapan layar referensi
    var isVariantA = (h % 3 === 0);

    var size, wrapped, lines, lh, i;
    var padX = 40;
    var maxW = W - padX * 2 - 6;

    if (isVariantA) {
      // =========================================================================
      // VARIAN A: DEEP MAROON (#6E0B14) + GARIS VERTIKAL EMAS + JUDUL PUTIH BAWAH
      // =========================================================================
      ctx.fillStyle = '#6E0B14';
      ctx.fillRect(0, 0, W, H);

      // Watermark kanan atas (digeser ke kiri dari tombol bintang agar terbaca utuh seperti SS)
      ctx.save();
      ctx.font = 'italic 800 13px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('POJAC', W - 56, 44);
      ctx.restore();

      // Hitung ukuran font judul (rata kiri di bagian bawah)
      var textX = padX + 18;
      var textMaxW = W - textX - 28;
      var maxLinesA = 4;

      for (size = arabic ? 38 : 38; size >= 24; size -= 2) {
        ctx.font = arabic
          ? '700 ' + size + 'px "Amiri", serif'
          : '800 ' + size + 'px "Plus Jakarta Sans", system-ui, sans-serif';
        wrapped = wrapLines(ctx, titleText, textMaxW, maxLinesA);
        lines = wrapped.lines;
        if (lines.length && !wrapped.truncated) break;
      }

      lh = Math.round(size * 1.13);
      var totalTextH = lines.length * lh;
      var bottomAnchorY = 482;
      var startY = bottomAnchorY - totalTextH;
      if (startY < 220) startY = 220;

      // Garis vertikal kuning-emas (#EAB308) di sebelah kiri judul
      var barX = padX;
      var barTop = startY + 4;
      var barHeight = totalTextH - 8;
      if (barHeight < 38) barHeight = 38;
      ctx.fillStyle = '#EAB308';
      ctx.fillRect(barX, barTop, 5.5, barHeight);

      // Render baris judul putih bersih
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = arabic ? 'right' : 'left';
      ctx.textBaseline = 'top';
      for (i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], arabic ? (W - padX) : textX, startY + i * lh);
      }

    } else {
      // =========================================================================
      // VARIAN B: MATTE CHARCOAL (#1E1E1E) + JUDUL 2 WARNA (KORAL #E05A5A & PUTIH)
      // =========================================================================
      ctx.fillStyle = '#1E1E1E';
      ctx.fillRect(0, 0, W, H);

      var accentCol = '#E05A5A';
      var maxLinesB = 4;
      for (size = arabic ? 38 : 38; size >= 24; size -= 2) {
        ctx.font = arabic
          ? '700 ' + size + 'px "Amiri", serif'
          : '800 ' + size + 'px "Plus Jakarta Sans", system-ui, sans-serif';
        wrapped = wrapLines(ctx, titleText, maxW, maxLinesB);
        lines = wrapped.lines;
        if (lines.length && !wrapped.truncated) break;
      }

      lh = Math.round(size * 1.15);
      var topStartY = 142;

      ctx.textAlign = arabic ? 'right' : 'left';
      ctx.textBaseline = 'top';

      // Pewarnaan 2 warna (Koral #E05A5A & Putih #FFFFFF) persis contoh SS
      for (i = 0; i < lines.length; i++) {
        if (lines.length === 1) {
          ctx.fillStyle = accentCol;
        } else if (lines.length === 2) {
          ctx.fillStyle = (i === 0) ? accentCol : '#FFFFFF';
        } else {
          ctx.fillStyle = (i % 2 === 1) ? '#FFFFFF' : accentCol;
        }
        ctx.fillText(lines[i], arabic ? (W - padX) : padX, topStartY + i * lh);
      }

      // Subjudul deskriptif di bawah judul utama
      var subY = topStartY + lines.length * lh + 26;
      var subText = 'Pembahasan, materi, dan referensi ' + catName.toLowerCase() + '.';
      if (opts.jilid && opts.jilid !== '-') {
        subText = 'Edisi ' + opts.jilid + ', materi dan pembahasan selengkapnya.';
      }
      ctx.font = '400 16.5px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.textAlign = 'left';
      var subWrap = wrapLines(ctx, subText, maxW, 2);
      for (i = 0; i < subWrap.lines.length; i++) {
        ctx.fillText(subWrap.lines[i], padX, subY + i * 22);
      }

      // Watermark di kiri bawah
      ctx.save();
      ctx.font = 'italic 800 12.5px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('POJAC', padX, H - 10);
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  }

  function generate(book, categories) {
    var key = (book && (book[6] || book[0])) || 'x';
    if (!cache.has(key)) {
      var opts = {
        title: book ? book[0] : '',
        catIdx: book ? book[1] : undefined,
        jilid: book ? book[2] : '-',
        fmt: book ? book[4] : '',
        gid: book ? book[6] : '',
        categories: categories || null
      };
      try {
        cache.set(key, Promise.resolve(renderCover(opts)));
      } catch (err) {
        cache.set(key, Promise.reject(err));
      }
    }
    return cache.get(key);
  }

  function noPreview(fmt) {
    return NO_PREVIEW.has(String(fmt || '').toUpperCase());
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { cache.clear(); }).catch(function () {});
  }

  window.POJAC_COVER = { generate: generate, noPreview: noPreview };
})();
