/**
 * =============================================================================
 *   POJAC E-LIBRARY — GENERATOR SAMPUL ELEGAN (PROCEDURAL COVER)
 * =============================================================================
 * Membuat sampul buku digital secara otomatis untuk koleksi yang tidak
 * memiliki preview/thumbnail (audio, video, arsip, dokumen tertentu, atau
 * thumbnail Google Drive yang gagal dimuat).
 *
 * Desain: gradien warna per kategori + ornamen geometris emas + judul
 * ter-render (mendukung teks Arab dengan font Amiri) + chip format + jilid.
 * Deterministik per buku (variasi pola dari hash ID), hasil di-cache.
 *
 * Pemakaian:
 *   POJAC_COVER.noPreview(fmt)                  -> true bila format tak punya thumbnail
 *   POJAC_COVER.generate(book, categories)      -> Promise<dataURL>
 *      book = [judul, catIdx, jilid, langIdx, fmt, sizeMb, gid, ...]
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
    'SHA256', 'ZIP-SHA-256', 'BOK'
  ]);

  // Paleta warna per indeks kategori: [warnaAtas, warnaBawah, aksen]
  var PALETTES = [
    ['#1f2937', '#0b1220', '#d9b45b'], // 0 internal/logo
    ['#065f46', '#022c22', '#e7c46b'], // 01 Al-Qur'an & Tafsir
    ['#1e3a5f', '#0a1628', '#d9b45b'], // 02 Hadits & Sunnah
    ['#115e59', '#032e2b', '#e7c46b'], // 03 Fikih & Ushul
    ['#3730a3', '#1e1b4b', '#e3c476'], // 04 Akidah & Tauhid
    ['#166534', '#04240f', '#d9b45b'], // 05 Tasawuf & Akhlak
    ['#92400e', '#3b1a04', '#f0d089'], // 06 Bahasa Arab
    ['#a16207', '#422006', '#f5deb3'], // 07 Makna Pethuk & Pegon
    ['#991b1b', '#450a0a', '#e8c27a'], // 08 Sejarah & Sirah
    ['#0c4a6e', '#081724', '#7dd3fc'], // 09 Teknologi Informasi & AI
    ['#334155', '#0b1220', '#b8c7dc'], // 10 Bisnis & Finansial
    ['#6d28d9', '#2e1065', '#d8b4fe'], // 11 Pengembangan Diri
    ['#1d4ed8', '#12275e', '#a5c4f5'], // 12 Pendidikan & Akademik
    ['#9d174d', '#4a0719', '#f2b8cf'], // 13 Sastra, Novel & Seni
    ['#57534e', '#1c1917', '#e7d8bf'], // 14 Ensiklopedi & Tokoh
    ['#374151', '#0b0f19', '#d9b45b'], // 15 Khazanah Ebook Umum
    ['#065f46', '#022c22', '#8fd6b6'], // 16 Fatwa & Syariah
    ['#155e75', '#083344', '#a5f3fc'], // 17 Doa, Dzikir & Ruqyah
    ['#9d174d', '#4a0719', '#efb9cf'], // 18 Keluarga & Muslimah
    ['#4c1d95', '#1e1038', '#c4b5fd'], // 19 Audio Kajian & Murottal
    ['#0e7490', '#083344', '#7dd3fc'], // 20 Video Kajian & Visual
    ['#334155', '#0f172a', '#93c5fd'], // 21 Aplikasi & Software
    ['#1e40af', '#16255c', '#a9c4f0'], // 22 CPNS & Kepegawaian
    ['#854d0e', '#3f2405', '#f3d08e'], // 23 Koleksi Kitab Arab
    ['#0f766e', '#042f2e', '#5eead4']  // 24 Logo & Identitas
  ];
  var DEFAULT_PALETTE = ['#064e3b', '#022c22', '#d9b45b'];

  function paletteFor(catIdx) {
    if (typeof catIdx === 'number' && catIdx >= 0 && catIdx < PALETTES.length) return PALETTES[catIdx];
    return DEFAULT_PALETTE;
  }

  function hashStr(s) {
    var h = 0, i;
    for (i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function isArabic(t) {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(t || '');
  }

  function setLetterSpacing(ctx, val) {
    try { ctx.letterSpacing = val; } catch (e) { /* browser lama: abaikan */ }
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

  // Bintang segi delapan (dua persegi dirotasi 45°) — motif geometris klasik
  function drawStarMedallion(ctx, cx, cy, r, rot) {
    var k;
    for (k = 0; k < 2; k++) {
      ctx.beginPath();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot + k * Math.PI / 4);
      ctx.rect(-r, -r, r * 2, r * 2);
      ctx.restore();
      ctx.stroke();
    }
  }

  function diamond(ctx, cx, cy, r, fill) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    fill ? ctx.fill() : ctx.stroke();
  }

  function renderCover(opts) {
    var W = 400, H = 560;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var pal = paletteFor(opts.catIdx);
    var c1 = pal[0], c2 = pal[1], accent = pal[2];
    var h = hashStr(opts.gid || opts.title || 'pojac');
    var variant = h % 3;
    var x, y, i, j, r;

    // Latar gradien + cahaya lembut
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, c1);
    bg.addColorStop(1, c2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    var glow = ctx.createRadialGradient(W / 2, 150, 20, W / 2, 150, 280);
    glow.addColorStop(0, hexA(accent, 0.16));
    glow.addColorStop(1, hexA(accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Pola latar halus (variasi deterministik per buku)
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.strokeStyle = hexA(accent, 0.055);
    ctx.lineWidth = 1;
    if (variant === 0) {
      for (y = 40; y < H; y += 84) {
        for (x = 40; x < W; x += 84) {
          drawStarMedallion(ctx, x + ((y / 84) % 2) * 42, y, 26, Math.PI / 8);
        }
      }
    } else if (variant === 1) {
      for (i = -H; i < W + H; i += 46) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - H, H); ctx.stroke();
      }
    } else {
      for (y = 30; y < H; y += 52) {
        for (x = 30; x < W; x += 52) {
          diamond(ctx, x, y, 4, false);
        }
      }
    }
    ctx.restore();

    // Vignette bawah untuk kedalaman
    var vig = ctx.createLinearGradient(0, 380, 0, H);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 380, W, H - 380);

    // Bingkai ganda
    ctx.strokeStyle = hexA(accent, 0.42);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(14.5, 14.5, W - 29, H - 29);
    ctx.strokeStyle = hexA(accent, 0.16);
    ctx.lineWidth = 1;
    ctx.strokeRect(22.5, 22.5, W - 45, H - 45);
    // sudut aksen
    ctx.strokeStyle = hexA(accent, 0.75);
    ctx.lineWidth = 2;
    var cl = 22, m = 14.5, M = W - 14.5, Mb = H - 14.5;
    [[m, m, 1, 1], [M, m, -1, 1], [m, Mb, 1, -1], [M, Mb, -1, -1]].forEach(function (c) {
      ctx.beginPath();
      ctx.moveTo(c[0] + c[2] * cl, c[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(c[0], c[1] + c[3] * cl);
      ctx.stroke();
    });

    // Ornamen atas: belah ketupat + garis sayap
    ctx.strokeStyle = hexA(accent, 0.55);
    ctx.fillStyle = hexA(accent, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(64, 66); ctx.lineTo(178, 66); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(222, 66); ctx.lineTo(336, 66); ctx.stroke();
    diamond(ctx, 200, 66, 7, true);

    // Medali pusat di belakang judul
    ctx.strokeStyle = hexA(accent, 0.24);
    ctx.lineWidth = 1.2;
    drawStarMedallion(ctx, 200, 240, 78, variant === 2 ? 0 : Math.PI / 8);
    ctx.strokeStyle = hexA(accent, 0.12);
    ctx.beginPath();
    ctx.arc(200, 240, 64, 0, Math.PI * 2);
    ctx.stroke();

    // Judul
    var arabic = isArabic(opts.title);
    var arab = opts.title || 'Tanpa Judul';
    var maxW = 300, maxLines = 5, size, wrapped, lines;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (arabic) { try { ctx.direction = 'rtl'; } catch (e) {} }
    for (size = arabic ? 30 : 27; size >= 15; size -= 1.5) {
      ctx.font = (arabic ? size + 'px Amiri, "Traditional Arabic", serif'
                         : '700 ' + size + 'px "Plus Jakarta Sans", Georgia, serif');
      wrapped = wrapLines(ctx, arab, maxW, maxLines);
      lines = wrapped.lines;
      if (lines.length && !wrapped.truncated) break;
    }
    ctx.fillStyle = '#f6f2e7';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8;
    var lh = size * 1.4;
    var startY = 240 - ((lines.length - 1) * lh) / 2;
    for (i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 200, startY + i * lh);
    }
    ctx.shadowBlur = 0;

    // Pembatas + nama kategori
    ctx.strokeStyle = hexA(accent, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(96, 372); ctx.lineTo(190, 372); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(210, 372); ctx.lineTo(304, 372); ctx.stroke();
    ctx.fillStyle = hexA(accent, 0.85);
    diamond(ctx, 200, 372, 4.5, true);

    var catName = (opts.categories && opts.categories[opts.catIdx]) || 'Koleksi POJAC';
    catName = String(catName).replace(/^\d+\.\s*/, '').toUpperCase();
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    setLetterSpacing(ctx, '2.5px');
    ctx.fillStyle = hexA(accent, 0.95);
    if (ctx.measureText(catName).width > 300) {
      setLetterSpacing(ctx, '0.5px');
    }
    ctx.fillText(catName.length > 38 ? catName.slice(0, 37) + '…' : catName, 200, 398);
    setLetterSpacing(ctx, '0px');

    // Chip format + jilid
    var chipText = opts.fmt || 'FILE';
    if (opts.jilid && opts.jilid !== '-') chipText += '  •  ' + opts.jilid;
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    var tw = ctx.measureText(chipText).width;
    var cw = tw + 30, ch = 25, cxp = 200 - cw / 2, cyp = 428;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cxp, cyp, cw, ch, 12.5);
    else ctx.rect(cxp, cyp, cw, ch);
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fill();
    ctx.strokeStyle = hexA(accent, 0.4);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = hexA(accent, 1);
    ctx.fillText(chipText, 200, cyp + ch / 2 + 0.5);

    // Wordmark POJAC
    ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
    setLetterSpacing(ctx, '4px');
    ctx.fillStyle = 'rgba(246,242,231,0.42)';
    ctx.fillText('POJAC  •  POJOK BACA', 200, 506);
    setLetterSpacing(ctx, '0px');

    return canvas.toDataURL('image/png');
  }

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
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
