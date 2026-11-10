/**
 * =============================================================================
 *   POJAC E-LIBRARY — GENERATOR SAMPUL MODERN MINIMALIS (KANAL/EDITORIAL STYLE)
 * =============================================================================
 * Membuat sampul buku digital secara otomatis untuk koleksi yang tidak
 * memiliki preview/thumbnail (audio, video, arsip, dokumen tertentu, atau
 * thumbnail Google Drive yang gagal dimuat).
 *
 * Desain mengacu pada gaya sampul editorial modern:
 *   - Varian A (Maroon / Solid Deep Color):
 *     Latar solid pekat (maroon/navy/emerald/teal), watermark miring "POJAC"
 *     di kanan atas, garis aksen vertikal kuning-emas di kiri bawah, dan judul
 *     sans-serif tebal rata kiri di bagian bawah.
 *   - Varian B (Matte Charcoal Two-Tone):
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

  // Palet Varian A: [warnaLatarSolid, warnaGarisVertikal]
  var SOLID_THEMES = [
    ['#6E0B14', '#EAB308'], // Deep Maroon + Gold bar (persis contoh SS kiri)
    ['#5B0812', '#F59E0B'], // Rich Burgundy + Amber bar
    ['#0F2942', '#FACC15'], // Deep Navy + Gold bar
    ['#0B3B2E', '#F59E0B'], // Deep Emerald + Amber bar
    ['#2E1035', '#FBBF24'], // Deep Plum + Gold bar
    ['#16323B', '#F59E0B']  // Deep Petrol + Amber bar
  ];

  // Palet Varian B (Matte Charcoal #1E1E1E): [warnaLatar, warnaAksenJudul]
  var CHARCOAL_THEMES = [
    ['#1E1E1E', '#E05A5A'], // Matte Charcoal + Coral Red (persis contoh SS tengah & kanan)
    ['#1E1E1E', '#E05A5A'], // Bobot lebih tinggi untuk Coral Red sesuai SS
    ['#1C1E22', '#F06464'], // Warm Coral
    ['#1E1E1E', '#E87961'], // Terracotta Coral
    ['#1B2028', '#38BDF8'], // Sky Cyber Accent
    ['#1B221F', '#34D399']  // Emerald Accent
  ];

  function hashStr(s) {
    var h = 0, i;
    for (i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function isArabic(t) {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(t || '');
  }

  // Bersihkan judul dari awalan "(BARU)", ekstensi file, atau underscore agar tampak seperti sampul buku asli
  function cleanTitle(raw) {
    var s = String(raw || 'Koleksi Literasi POJAC').trim();
    s = s.replace(/^\s*(\(BARU\)|\[BARU\]|BARU\s*[-:–])\s*/i, '');
    s = s.replace(/\.(pdf|mp3|mp4|mkv|docx?|xlsx?|pptx?|zip|rar|epub|djvu|chm|txt)$/i, '');
    s = s.replace(/_/g, ' ').replace(/\s{2,}/g, ' ').trim();
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

    // Pilih antara Varian A (Solid Maroon/Deep + Bar Vertikal) dan Varian B (Matte Charcoal Two-Tone)
    // Rasio: ~35% Varian A (seperti kartu kiri), ~65% Varian B (seperti kartu tengah & kanan)
    var isVariantA = (h % 3 === 0);

    var size, wrapped, lines, lh, i;
    var padX = 42;
    var maxW = W - padX * 2 - 10;

    if (isVariantA) {
      // =========================================================================
      // VARIAN A: LATAR SOLID MAROON/PEKAT + GARIS VERTIKAL EMAS + JUDUL BAWAH
      // (Persis seperti kartu kiri "Asas dalam Kewarga-negaraan")
      // =========================================================================
      var st = SOLID_THEMES[h % SOLID_THEMES.length];
      var bgCol = st[0];
      var barCol = st[1];

      ctx.fillStyle = bgCol;
      ctx.fillRect(0, 0, W, H);

      // Watermark kanan atas (gaya miring tebal seperti "KANALCASN")
      ctx.save();
      ctx.font = 'italic 800 13px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('POJAC', W - 28, 34);
      ctx.restore();

      // Hitung ukuran font judul (rata kiri di bagian bawah)
      var textX = padX + 18;
      var textMaxW = W - textX - 32;
      var maxLinesA = 4;

      for (size = arabic ? 38 : 38; size >= 22; size -= 2) {
        ctx.font = arabic
          ? '700 ' + size + 'px "Amiri", serif'
          : '800 ' + size + 'px "Plus Jakarta Sans", system-ui, sans-serif';
        wrapped = wrapLines(ctx, titleText, textMaxW, maxLinesA);
        lines = wrapped.lines;
        if (lines.length && !wrapped.truncated) break;
      }

      lh = Math.round(size * 1.14);
      var totalTextH = lines.length * lh;
      // Posisikan blok judul di sepertiga bawah sampul (sekitar y = 470 ke atas)
      var bottomAnchorY = 478;
      var startY = bottomAnchorY - totalTextH;
      if (startY < 220) startY = 220;

      // Garis vertikal emas di sebelah kiri judul
      var barX = padX;
      var barTop = startY + 4;
      var barHeight = totalTextH - 8;
      if (barHeight < 36) barHeight = 36;
      ctx.fillStyle = barCol;
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
      // VARIAN B: MATTE CHARCOAL (#1E1E1E) + JUDUL 2 WARNA (KORAL & PUTIH) + SUBJUDUL
      // (Persis seperti kartu tengah & kanan "Dewan Perwakilan Daerah (DPD)")
      // =========================================================================
      var ct = CHARCOAL_THEMES[h % CHARCOAL_THEMES.length];
      var charBg = ct[0];
      var accentCol = ct[1];

      ctx.fillStyle = charBg;
      ctx.fillRect(0, 0, W, H);

      var maxLinesB = 4;
      for (size = arabic ? 38 : 38; size >= 22; size -= 2) {
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

      // Pewarnaan 2 warna bergantian seperti contoh ("Dewan" [koral], "Perwakilan" [putih], "Daerah (DPD)" [koral])
      for (i = 0; i < lines.length; i++) {
        if (lines.length === 1) {
          ctx.fillStyle = accentCol;
        } else if (lines.length === 2) {
          ctx.fillStyle = (i === 0) ? accentCol : '#FFFFFF';
        } else {
          // Untuk 3-4 baris: baris tengah putih, baris lainnya koral (atau selang-seling)
          ctx.fillStyle = (i % 2 === 1) ? '#FFFFFF' : accentCol;
        }
        ctx.fillText(lines[i], arabic ? (W - padX) : padX, topStartY + i * lh);
      }

      // Subjudul deskriptif di bawah judul utama
      var subY = topStartY + lines.length * lh + 26;
      var subText = catName + ' — Referensi, materi, dan literatur pilihan.';
      if (opts.jilid && opts.jilid !== '-') {
        subText = catName + ' • ' + opts.jilid + ' dan pembahasan lengkapnya.';
      }
      ctx.font = '400 16px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
      ctx.textAlign = 'left';
      var subWrap = wrapLines(ctx, subText, maxW, 2);
      for (i = 0; i < subWrap.lines.length; i++) {
        ctx.fillText(subWrap.lines[i], padX, subY + i * 22);
      }

      // Watermark di kiri bawah (seperti "KANALCASN" terpotong halus di bagian bawah kartu tengah)
      ctx.save();
      ctx.font = '800 13px "Plus Jakarta Sans", system-ui, sans-serif';
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

  // Pastikan font siap agar render pertama memakai huruf yang benar
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { cache.clear(); }).catch(function () {});
  }

  window.POJAC_COVER = { generate: generate, noPreview: noPreview };
})();
