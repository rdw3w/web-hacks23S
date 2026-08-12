// index.js — Cloudflare Worker: API proxy + Telegram logger + Frontend
const { sendTelegramMessage } = require('./telegram.js');

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
  });
}

function html(content) {
  return new Response(content, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// ────────────── Telegram Logger ──────────────
async function logToTG(message) {
  await sendTelegramMessage(message);
}

// ────────────── API: Vehicle ──────────────
async function handleVehicle(url) {
  const rc = (url.searchParams.get('rc') || '').trim().toUpperCase();
  if (!rc) return json({ success: false, message: 'RC number daalo' }, 400);

  try {
    const res = await fetch(`https://vvvin-ng.vercel.app/lookup?rc=${encodeURIComponent(rc)}`);
    const data = await res.json();

    // Telegram pe bhejo
    const tgMsg = `<b>🚗 Vehicle Lookup</b>\n<b>RC:</b> ${rc}\n<b>Time:</b> ${new Date().toISOString()}\n\n<b>Result:</b>\n<code>${JSON.stringify(data, null, 2).substring(0, 3500)}</code>`;
    logToTG(tgMsg).catch(() => {});

    return json({ success: true, source: 'vvvin-ng API', data });
  } catch (e) {
    return json({ success: false, message: 'API fail: ' + e.message }, 500);
  }
}

// ────────────── API: Mobile Number ──────────────
async function handleMobile(url) {
  const num = (url.searchParams.get('num') || '').trim();
  if (!num) return json({ success: false, message: 'Number daalo' }, 400);

  try {
    const res = await fetch(`https://spring-bonus-b26f.rudrasingh221204.workers.dev/lookup?num=${encodeURIComponent(num)}`);
    const data = await res.json();

    const tgMsg = `<b>📱 Mobile Lookup</b>\n<b>Number:</b> ${num}\n<b>Time:</b> ${new Date().toISOString()}\n\n<b>Result:</b>\n<code>${JSON.stringify(data, null, 2).substring(0, 3500)}</code>`;
    logToTG(tgMsg).catch(() => {});

    return json({ success: true, source: 'rudrasingh221204 API', data });
  } catch (e) {
    return json({ success: false, message: 'API fail: ' + e.message }, 500);
  }
}

// ────────────── API: Pincode ──────────────
async function handlePincode(url) {
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return json({ success: false, message: 'Pincode daalo' }, 400);

  try {
    const res = await fetch(`https://spring-bonus-b26f.rudrasingh221204.workers.dev/pincode?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    const tgMsg = `<b>📍 Pincode Lookup</b>\n<b>Pincode:</b> ${q}\n<b>Time:</b> ${new Date().toISOString()}\n\n<b>Result:</b>\n<code>${JSON.stringify(data, null, 2).substring(0, 3500)}</code>`;
    logToTG(tgMsg).catch(() => {});

    return json({ success: true, source: 'rudrasingh221204 API', data });
  } catch (e) {
    return json({ success: false, message: 'API fail: ' + e.message }, 500);
  }
}

// ────────────── API: IP Lookup (ip-api.com free) ──────────────
async function handleIP(url) {
  const ip = (url.searchParams.get('ip') || '').trim();

  try {
    const target = ip || 'https://ip-api.com/json/';
    const res = await fetch(`http://ip-api.com/json/${ip ? encodeURIComponent(ip) : ''}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
    const data = await res.json();

    const tgMsg = `<b>🌐 IP Lookup</b>\n<b>IP:</b> ${ip || 'Auto' }\n<b>Time:</b> ${new Date().toISOString()}\n\n<b>Result:</b>\n<code>${JSON.stringify(data, null, 2).substring(0, 3500)}</code>`;
    logToTG(tgMsg).catch(() => {});

    return json({ success: true, source: 'ip-api.com', data });
  } catch (e) {
    return json({ success: false, message: 'API fail: ' + e.message }, 500);
  }
}

// ────────────── Router ──────────────
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const p = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // API Routes
    if (p === '/api/vehicle') return handleVehicle(url);
    if (p === '/api/mobile') return handleMobile(url);
    if (p === '/api/pincode') return handlePincode(url);
    if (p === '/api/ip') return handleIP(url);

    // EXIF upload handler (POST)
    if (p === '/api/exif' && request.method === 'POST') {
      return handleExifUpload(request);
    }

    // Frontend
    return html(FRONTEND_HTML);
  }
};

// ────────────── EXIF Upload Handler ──────────────
async function handleExifUpload(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');
    if (!file) return json({ success: false, message: 'Image nahi mili' }, 400);

    const arrayBuffer = await file.arrayBuffer();
    const exifData = extractExif(arrayBuffer);

    const result = {
      success: true,
      filename: file.name,
      size: file.size,
      type: file.type,
      exif: exifData
    };

    // TG pe bhejo
    const tgMsg = `<b>📷 EXIF Lookup</b>\n<b>File:</b> ${file.name}\n<b>Size:</b> ${(file.size / 1024).toFixed(1)} KB\n<b>Time:</b> ${new Date().toISOString()}\n\n<b>EXIF Data:</b>\n<code>${JSON.stringify(exifData, null, 2).substring(0, 3500)}</code>`;
    logToTG(tgMsg).catch(() => {});

    return json(result);
  } catch (e) {
    return json({ success: false, message: 'EXIF error: ' + e.message }, 500);
  }
}

// ────────────── EXIF Parser (manual binary) ──────────────
function extractExif(buffer) {
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);
  const result = {};

  // Check JPEG SOI marker
  if (uint8[0] !== 0xFF || uint8[1] !== 0xD8) {
    return { error: 'JPEG file expected (SOI marker not found)' };
  }

  let offset = 2;

  while (offset < uint8.length - 1) {
    if (uint8[offset] !== 0xFF) break;
    const marker = uint8[offset + 1];

    // APP1 (0xE1) = EXIF
    if (marker === 0xE1) {
      const segLen = view.getUint16(offset + 2);
      const segData = uint8.slice(offset + 4, offset + 2 + segLen);

      // Check "Exif\0\0"
      if (segData[0] === 0x45 && segData[1] === 0x78 && segData[2] === 0x69 && segData[3] === 0x66) {
        parseTIFF(segData.slice(6), result);
      }
      break;
    }

    if (marker === 0xD9 || marker === 0xDA) break; // EOI or SOS

    const segLen = view.getUint16(offset + 2);
    offset += 2 + segLen;
  }

  if (Object.keys(result).length === 0) {
    return { info: 'Koi EXIF data nahi mili is image me' };
  }
  return result;
}

function parseTIFF(data, result) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const le = view.getUint16(0) === 0x4949; // II = little endian
  const getU16 = (o) => view.getUint16(o, le);
  const getU32 = (o) => view.getUint32(o, le);

  const ifdOffset = getU32(4);

  const tagMap = {
    0x010F: 'Camera Make',
    0x0110: 'Camera Model',
    0x0112: 'Orientation',
    0x011A: 'X Resolution',
    0x011B: 'Y Resolution',
    0x0131: 'Software',
    0x0132: 'Date/Time',
    0x013B: 'Artist',
    0x8298: 'Copyright',
    0x8769: 'EXIF IFD Pointer',
    0x8825: 'GPS IFD Pointer',
    0x9000: 'EXIF Version',
    0x9003: 'Date/Time Original',
    0x9004: 'Date/Time Digitized',
    0x920A: 'Focal Length',
    0xA002: 'Image Width',
    0xA003: 'Image Height',
    0xA405: 'Focal Length (35mm)',
    0xA433: 'Lens Make',
    0xA434: 'Lens Model',
    0x829D: 'F-Number',
    0x8827: 'ISO Speed',
    0x9201: 'Shutter Speed',
    0x9209: 'Flash'
  };

  const gpsTagMap = {
    0x0001: 'GPS Latitude Ref',
    0x0002: 'GPS Latitude',
    0x0003: 'GPS Longitude Ref',
    0x0004: 'GPS Longitude',
    0x0005: 'GPS Altitude Ref',
    0x0006: 'GPS Altitude',
    0x0007: 'GPS Time',
    0x001D: 'GPS Date'
  };

  function readIFD(ifdOff, tags, prefix) {
    if (ifdOff + 2 > data.length) return;
    const count = getU16(ifdOff);
    for (let i = 0; i < count; i++) {
      const entryOff = ifdOff + 2 + i * 12;
      if (entryOff + 12 > data.length) break;
      const tag = getU16(entryOff);
      const type = getU16(entryOff + 2);
      const cnt = getU32(entryOff + 4);
      const valOff = entryOff + 8;
      const name = tags[tag] || `Tag 0x${tag.toString(16).toUpperCase()}`;

      if (tag === 0x8769) {
        // EXIF sub-IFD
        readIFD(getU32(valOff), tagMap, '');
        continue;
      }
      if (tag === 0x8825) {
        // GPS sub-IFD
        readIFD(getU32(valOff), gpsTagMap, 'GPS ');
        continue;
      }

      let val = '';

      if (type === 2) {
        // ASCII string
        const strOff = cnt > 4 ? getU32(valOff) : valOff;
        let s = '';
        for (let j = 0; j < cnt - 1 && strOff + j < data.length; j++) {
          s += String.fromCharCode(data[strOff + j]);
        }
        val = s.trim();
      } else if (type === 3) {
        val = cnt === 1 ? getU16(valOff) : `[${cnt} values]`;
      } else if (type === 4) {
        val = getU32(valOff);
      } else if (type === 5) {
        // RATIONAL (unsigned)
        const rOff = getU32(valOff);
        if (rOff + 8 <= data.length) {
          const num = getU32(rOff);
          const den = getU32(rOff + 4);
          val = den !== 0 ? (num / den).toFixed(4) : '0';
        }
      } else if (type === 10) {
        // SRATIONAL (signed)
        const rOff = getU32(valOff);
        if (rOff + 8 <= data.length) {
          const num = view.getInt32(rOff, le);
          const den = view.getInt32(rOff + 4, le);
          val = den !== 0 ? (num / den).toFixed(6) : '0';
        }
      } else {
        val = `[type=${type}, count=${cnt}]`;
      }

      // Special: GPS coordinates
      if (tag === 0x0002 || tag === 0x0004) {
        const rOff = getU32(valOff);
        const deg = getU32(rOff) / getU32(rOff + 4);
        const min = getU32(rOff + 8) / getU32(rOff + 12);
        const sec = getU32(rOff + 16) / getU32(rOff + 20);
        val = `${deg.toFixed(4)}° ${min.toFixed(4)}' ${sec.toFixed(4)}"`;
      }

      // Skip pointer tags from output
      if (tag === 0x8769 || tag === 0x8825) continue;

      result[prefix + name] = val;
    }
  }

  readIFD(ifdOffset, tagMap, '');

  // Try to build Google Maps link from GPS
  const latRef = result['GPS GPS Latitude Ref'];
  const latVal = result['GPS GPS Latitude'];
  const lonRef = result['GPS GPS Longitude Ref'];
  const lonVal = result['GPS GPS Longitude'];

  if (latVal && lonVal) {
    const parseDMS = (s) => {
      const parts = s.match(/([\d.]+)°\s*([\d.]+)'\s*([\d.]+)"/);
      if (!parts) return 0;
      return parseFloat(parts[1]) + parseFloat(parts[2]) / 60 + parseFloat(parts[3]) / 3600;
    };
    let lat = parseDMS(latVal);
    let lon = parseDMS(lonVal);
    if (latRef === 'S') lat = -lat;
    if (lonRef === 'W') lon = -lon;
    result['GPS Google Maps Link'] = `https://www.google.com/maps?q=${lat},${lon}`;
    result['GPS Decimal Latitude'] = lat.toFixed(6);
    result['GPS Decimal Longitude'] = lon.toFixed(6);
  }
}

// ────────────── Frontend HTML ──────────────
const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OSINT HUB // rdw3w</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
:root{--bg:#050508;--card:rgba(8,16,28,0.85);--neon:#00f3ff;--red:#ff0055;--green:#00ff9d;--purple:#bc13fe;--yellow:#ffd000;--text:#c8d6e5;--muted:#4a5568;--glass:rgba(255,255,255,0.03);--border:rgba(0,243,255,0.15)}
*{margin:0;padding:0;box-sizing:border-box}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#000}::-webkit-scrollbar-thumb{background:var(--neon);border-radius:3px}
body{font-family:'Rajdhani',sans-serif;background:var(--bg);color:var(--text);overflow-x:hidden;min-height:100vh}

/* Matrix Canvas */
#matrix{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;opacity:0.06;pointer-events:none}

/* Grid overlay */
.grid-bg{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:60px 60px;pointer-events:none}

/* Scanlines */
.scanlines{position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)}

/* Floating orbs */
.orb{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0;animation:orbFloat 12s ease-in-out infinite}
.orb-1{width:400px;height:400px;background:rgba(0,243,255,0.06);top:-100px;left:-100px;animation-delay:0s}
.orb-2{width:350px;height:350px;background:rgba(188,19,254,0.05);bottom:-80px;right:-80px;animation-delay:-4s}
.orb-3{width:250px;height:250px;background:rgba(255,0,85,0.04);top:50%;left:50%;animation-delay:-8s}
@keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-30px) scale(1.1)}66%{transform:translate(-20px,40px) scale(0.9)}}

/* Main container */
.main{position:relative;z-index:2;max-width:1100px;margin:0 auto;padding:20px 16px 60px}

/* Header */
.header{text-align:center;padding:40px 0 30px;position:relative}
.header h1{font-family:'Orbitron',monospace;font-size:clamp(28px,6vw,52px);font-weight:900;letter-spacing:4px;background:linear-gradient(135deg,var(--neon),var(--purple),var(--red));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-shadow:none;line-height:1.2}
.header .sub{font-size:14px;color:var(--muted);letter-spacing:6px;text-transform:uppercase;margin-top:8px;font-weight:600}
.header .line{width:120px;height:2px;background:linear-gradient(90deg,transparent,var(--neon),transparent);margin:16px auto 0;animation:linePulse 3s ease-in-out infinite}
@keyframes linePulse{0%,100%{opacity:0.4;width:120px}50%{opacity:1;width:200px}}
.header .status{display:inline-flex;align-items:center;gap:8px;margin-top:16px;font-size:13px;color:var(--green);background:rgba(0,255,157,0.06);border:1px solid rgba(0,255,157,0.2);padding:6px 18px;border-radius:20px}
.header .status .dot{width:8px;height:8px;background:var(--green);border-radius:50%;animation:blink 1.5s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}

/* Tabs */
.tabs{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:30px;padding:0 10px}
.tab{padding:10px 20px;border:1px solid var(--border);background:var(--card);color:var(--muted);font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:700;cursor:pointer;border-radius:8px;transition:all 0.3s;text-transform:uppercase;letter-spacing:1px;backdrop-filter:blur(10px);display:flex;align-items:center;gap:8px}
.tab:hover{border-color:var(--neon);color:var(--neon);background:rgba(0,243,255,0.05)}
.tab.active{border-color:var(--neon);color:var(--neon);background:rgba(0,243,255,0.1);box-shadow:0 0 20px rgba(0,243,255,0.15)}
.tab i{font-size:14px}

/* Panels */
.panel{display:none;animation:fadeUp 0.4s ease}
.panel.active{display:block}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* Card */
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;backdrop-filter:blur(20px);margin-bottom:20px}
.card-title{font-family:'Orbitron',monospace;font-size:16px;color:var(--neon);margin-bottom:20px;display:flex;align-items:center;gap:10px;letter-spacing:1px}
.card-title i{font-size:18px}

/* Input group */
.input-group{display:flex;gap:10px;margin-bottom:16px}
.input-group input,.input-group select{flex:1;padding:14px 18px;background:rgba(0,0,0,0.5);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:600;outline:none;transition:all 0.3s}
.input-group input::placeholder{color:var(--muted)}
.input-group input:focus{border-color:var(--neon);box-shadow:0 0 15px rgba(0,243,255,0.1)}

/* Buttons */
.btn{padding:14px 28px;border:none;border-radius:10px;font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.3s;text-transform:uppercase;letter-spacing:1px;display:inline-flex;align-items:center;gap:8px}
.btn-primary{background:linear-gradient(135deg,rgba(0,243,255,0.2),rgba(0,243,255,0.05));color:var(--neon);border:1px solid var(--neon)}
.btn-primary:hover{background:linear-gradient(135deg,rgba(0,243,255,0.35),rgba(0,243,255,0.1));box-shadow:0 0 25px rgba(0,243,255,0.2);transform:translateY(-1px)}
.btn-copy{background:rgba(0,255,157,0.1);color:var(--green);border:1px solid rgba(0,255,157,0.3);padding:8px 16px;font-size:13px}
.btn-copy:hover{background:rgba(0,255,157,0.2)}
.btn-danger{background:rgba(255,0,85,0.1);color:var(--red);border:1px solid rgba(255,0,85,0.3);padding:8px 16px;font-size:13px}
.btn-danger:hover{background:rgba(255,0,85,0.2)}
.btn:disabled{opacity:0.4;cursor:not-allowed;transform:none!important}

/* Result box */
.result-box{margin-top:20px;position:relative}
.result-content{background:rgba(0,0,0,0.6);border:1px solid var(--border);border-radius:10px;padding:20px;font-family:'Courier New',monospace;font-size:13px;line-height:1.8;white-space:pre-wrap;word-break:break-all;max-height:500px;overflow-y:auto;color:var(--text)}
.result-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}

/* Loader */
.loader{display:none;text-align:center;padding:30px}
.loader.active{display:block}
.loader .spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--neon);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px}
@keyframes spin{to{transform:rotate(360deg)}}
.loader span{color:var(--muted);font-size:14px}

/* Error/Success messages */
.msg{padding:12px 18px;border-radius:8px;font-size:14px;font-weight:600;margin-top:12px;display:none}
.msg.error{display:block;background:rgba(255,0,85,0.08);border:1px solid rgba(255,0,85,0.3);color:var(--red)}
.msg.success{display:block;background:rgba(0,255,157,0.08);border:1px solid rgba(0,255,157,0.3);color:var(--green)}

/* Upload area */
.upload-area{border:2px dashed var(--border);border-radius:12px;padding:40px 20px;text-align:center;cursor:pointer;transition:all 0.3s;position:relative}
.upload-area:hover,.upload-area.dragover{border-color:var(--neon);background:rgba(0,243,255,0.03)}
.upload-area i{font-size:40px;color:var(--neon);margin-bottom:12px;display:block;opacity:0.6}
.upload-area p{color:var(--muted);font-size:15px}
.upload-area input{position:absolute;inset:0;opacity:0;cursor:pointer}
.preview-img{max-width:100%;max-height:200px;border-radius:8px;margin-top:12px;display:none;border:1px solid var(--border)}

/* Stats bar */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:30px}
.stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;text-align:center;backdrop-filter:blur(10px)}
.stat .num{font-family:'Orbitron',monospace;font-size:22px;font-weight:900;color:var(--neon)}
.stat .label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px}

/* Footer */
.footer{text-align:center;padding:30px 0;border-top:1px solid var(--border);margin-top:40px}
.footer p{color:var(--muted);font-size:13px;letter-spacing:1px}
.footer a{color:var(--neon);text-decoration:none}

/* Responsive */
@media(max-width:640px){
.input-group{flex-direction:column}
.tabs{gap:4px}
.tab{padding:8px 14px;font-size:13px}
.card{padding:20px}
.header h1{letter-spacing:2px}
}

/* Keyframes for result appearance */
@keyframes resultGlow{from{box-shadow:0 0 0 rgba(0,243,255,0)}to{box-shadow:0 0 30px rgba(0,243,255,0.08)}}
.result-box.show{animation:resultGlow 0.5s ease forwards}
</style>
</head>
<body>

<canvas id="matrix"></canvas>
<div class="grid-bg"></div>
<div class="scanlines"></div>
<div class="orb orb-1"></div>
<div class="orb orb-2"></div>
<div class="orb orb-3"></div>

<div class="main">

  <!-- Header -->
  <header class="header">
    <h1>OSINT HUB</h1>
    <div class="sub">rdw3w // reconnaissance framework</div>
    <div class="line"></div>
    <div class="status"><span class="dot"></span> All Systems Operational</div>
  </header>

  <!-- Stats -->
  <div class="stats">
    <div class="stat"><div class="num" id="statVehicle">--</div><div class="label">Vehicle Scans</div></div>
    <div class="stat"><div class="num" id="statMobile">--</div><div class="label">Mobile Traces</div></div>
    <div class="stat"><div class="num" id="statIP">--</div><div class="label">IP Lookups</div></div>
    <div class="stat"><div class="num" id="statEXIF">--</div><div class="label">EXIF Extracts</div></div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab active" data-tab="vehicle"><i class="fas fa-car"></i> Vehicle</button>
    <button class="tab" data-tab="mobile"><i class="fas fa-mobile-alt"></i> Mobile</button>
    <button class="tab" data-tab="ip"><i class="fas fa-globe"></i> IP Lookup</button>
    <button class="tab" data-tab="exif"><i class="fas fa-camera"></i> EXIF</button>
    <button class="tab" data-tab="pincode"><i class="fas fa-map-pin"></i> Pincode</button>
  </div>

  <!-- Vehicle Panel -->
  <div class="panel active" id="panel-vehicle">
    <div class="card">
      <div class="card-title"><i class="fas fa-car"></i> Vehicle RC Lookup</div>
      <div class="input-group">
        <input type="text" id="rcInput" placeholder="RC number daalo... (e.g. MH12DE1433)" maxlength="20" autocomplete="off">
        <button class="btn btn-primary" id="rcBtn" onclick="lookupVehicle()"><i class="fas fa-search"></i> Scan</button>
      </div>
      <div class="loader" id="rcLoader"><div class="spinner"></div><span>Database me search ho raha hai...</span></div>
      <div id="rcResult" class="result-box"></div>
    </div>
  </div>

  <!-- Mobile Panel -->
  <div class="panel" id="panel-mobile">
    <div class="card">
      <div class="card-title"><i class="fas fa-mobile-alt"></i> Mobile Number Lookup</div>
      <div class="input-group">
        <input type="tel" id="mobInput" placeholder="Mobile number daalo... (e.g. 9876543210)" maxlength="15" autocomplete="off">
        <button class="btn btn-primary" id="mobBtn" onclick="lookupMobile()"><i class="fas fa-search"></i> Trace</button>
      </div>
      <div class="loader" id="mobLoader"><div class="spinner"></div><span>Number trace ho raha hai...</span></div>
      <div id="mobResult" class="result-box"></div>
    </div>
  </div>

  <!-- IP Panel -->
  <div class="panel" id="panel-ip">
    <div class="card">
      <div class="card-title"><i class="fas fa-globe"></i> IP Address Lookup</div>
      <div class="input-group">
        <input type="text" id="ipInput" placeholder="IP daalo ya khali chhod do (auto detect)" autocomplete="off">
        <button class="btn btn-primary" id="ipBtn" onclick="lookupIP()"><i class="fas fa-search"></i> Locate</button>
      </div>
      <div class="loader" id="ipLoader"><div class="spinner"></div><span>IP locate ho raha hai...</span></div>
      <div id="ipResult" class="result-box"></div>
    </div>
  </div>

  <!-- EXIF Panel -->
  <div class="panel" id="panel-exif">
    <div class="card">
      <div class="card-title"><i class="fas fa-camera"></i> Image EXIF Extractor</div>
      <div class="upload-area" id="uploadArea">
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Image yahan drop karo ya click karke select karo</p>
        <p style="font-size:12px;margin-top:6px;color:var(--muted)">JPG / JPEG supported</p>
        <input type="file" id="exifFile" accept="image/jpeg,image/jpg">
      </div>
      <img class="preview-img" id="previewImg" alt="Preview">
      <div style="margin-top:14px;text-align:center;display:none" id="exifBtnWrap">
        <button class="btn btn-primary" onclick="extractEXIF()"><i class="fas fa-microscope"></i> EXIF Extract Karo</button>
      </div>
      <div class="loader" id="exifLoader"><div class="spinner"></div><span>EXIF data parse ho rahi hai...</span></div>
      <div id="exifResult" class="result-box"></div>
    </div>
  </div>

  <!-- Pincode Panel -->
  <div class="panel" id="panel-pincode">
    <div class="card">
      <div class="card-title"><i class="fas fa-map-pin"></i> Pincode Lookup</div>
      <div class="input-group">
        <input type="text" id="pinInput" placeholder="Pincode daalo... (e.g. 110001)" maxlength="6" autocomplete="off">
        <button class="btn btn-primary" id="pinBtn" onclick="lookupPincode()"><i class="fas fa-search"></i> Search</button>
      </div>
      <div class="loader" id="pinLoader"><div class="spinner"></div><span>Pincode search ho raha hai...</span></div>
      <div id="pinResult" class="result-box"></div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="footer">
    <p>OSINT HUB &mdash; Built by <a href="#">rdw3w</a> &mdash; Educational Purpose Only</p>
  </footer>

</div>

<script>
// ═══════════════ Matrix Rain ═══════════════
(function(){
  const c = document.getElementById('matrix');
  const ctx = c.getContext('2d');
  let w, h, cols, drops;
  function resize(){
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
    cols = Math.floor(w / 18);
    drops = Array(cols).fill(1);
  }
  resize();
  window.addEventListener('resize', resize);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';
  function draw(){
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#00f3ff';
    ctx.font = '14px monospace';
    for (let i = 0; i < cols; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(ch, i * 18, drops[i] * 18);
      if (drops[i] * 18 > h && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  setInterval(draw, 55);
})();

// ═══════════════ Tab Switching ═══════════════
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
tabs.forEach(t => {
  t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    panels.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('panel-' + t.dataset.tab).classList.add('active');
  });
});

// ═══════════════ Stats Counter ═══════════════
let stats = { vehicle: 0, mobile: 0, ip: 0, exif: 0 };
function bumpStat(key) {
  stats[key]++;
  const map = { vehicle: 'statVehicle', mobile: 'statMobile', ip: 'statIP', exif: 'statEXIF' };
  const el = document.getElementById(map[key]);
  if (el) el.textContent = stats[key];
}

// ═══════════════ Helper: Show Result ═══════════════
function showResult(containerId, text, rawJson) {
  const box = document.getElementById(containerId);
  box.classList.add('show');
  box.innerHTML = '<pre class="result-content">' + escapeHtml(text) + '</pre>' +
    '<div class="result-actions">' +
    '<button class="btn btn-copy" onclick="copyText(this, ' + JSON.stringify(JSON.stringify(rawJson)) + ')"><i class="fas fa-copy"></i> Copy JSON</button>' +
    '<button class="btn btn-copy" onclick="copyText(this, ' + JSON.stringify(text) + ')"><i class="fas fa-copy"></i> Copy Text</button>' +
    '<button class="btn btn-danger" onclick="clearResult(\\'' + containerId + '\\')"><i class="fas fa-trash"></i> Clear</button>' +
    '</div>';
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function clearResult(id) {
  const box = document.getElementById(id);
  box.classList.remove('show');
  box.innerHTML = '';
}

function copyText(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    btn.style.color = '#00ff9d';
    setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 1500);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
  });
}

function showError(containerId, msg) {
  const box = document.getElementById(containerId);
  box.classList.add('show');
  box.innerHTML = '<div class="msg error">' + escapeHtml(msg) + '</div>';
}

function toggleLoader(id, show) {
  document.getElementById(id).classList.toggle('active', show);
}

// ═══════════════ Format JSON Pretty ═══════════════
function formatResult(data) {
  // Recursively format for clean display
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch(e) { return data; }
  }
  function flatten(obj, prefix) {
    let lines = [];
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? prefix + ' > ' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        lines = lines.concat(flatten(v, key));
      } else if (Array.isArray(v)) {
        lines.push(key + ': ' + JSON.stringify(v));
      } else {
        lines.push(key + ': ' + (v === null || v === undefined ? 'N/A' : v));
      }
    }
    return lines;
  }
  return flatten(data, '').join('\\n');
}

// ═══════════════ Vehicle Lookup ═══════════════
async function lookupVehicle() {
  const rc = document.getElementById('rcInput').value.trim().toUpperCase();
  if (!rc) { showError('rcResult', 'RC number daalo pehle'); return; }
  toggleLoader('rcLoader', true);
  document.getElementById('rcResult').innerHTML = '';
  try {
    const res = await fetch('/api/vehicle?rc=' + encodeURIComponent(rc));
    const json = await res.json();
    if (json.success && json.data) {
      const text = formatResult(json.data);
      showResult('rcResult', text, json.data);
      bumpStat('vehicle');
    } else {
      showError('rcResult', json.message || 'Kuch gadbad ho gayi');
    }
  } catch(e) {
    showError('rcResult', 'Network error: ' + e.message);
  }
  toggleLoader('rcLoader', false);
}
document.getElementById('rcInput').addEventListener('keydown', e => { if(e.key==='Enter') lookupVehicle(); });

// ═══════════════ Mobile Lookup ═══════════════
async function lookupMobile() {
  const num = document.getElementById('mobInput').value.trim();
  if (!num) { showError('mobResult', 'Mobile number daalo pehle'); return; }
  toggleLoader('mobLoader', true);
  document.getElementById('mobResult').innerHTML = '';
  try {
    const res = await fetch('/api/mobile?num=' + encodeURIComponent(num));
    const json = await res.json();
    if (json.success && json.data) {
      const text = formatResult(json.data);
      showResult('mobResult', text, json.data);
      bumpStat('mobile');
    } else {
      showError('mobResult', json.message || 'Kuch gadbad ho gayi');
    }
  } catch(e) {
    showError('mobResult', 'Network error: ' + e.message);
  }
  toggleLoader('mobLoader', false);
}
document.getElementById('mobInput').addEventListener('keydown', e => { if(e.key==='Enter') lookupMobile(); });

// ═══════════════ IP Lookup ═══════════════
async function lookupIP() {
  const ip = document.getElementById('ipInput').value.trim();
  toggleLoader('ipLoader', true);
  document.getElementById('ipResult').innerHTML = '';
  try {
    const url = ip ? '/api/ip?ip=' + encodeURIComponent(ip) : '/api/ip';
    const res = await fetch(url);
    const json = await res.json();
    if (json.success && json.data) {
      const text = formatResult(json.data);
      showResult('ipResult', text, json.data);
      bumpStat('ip');
    } else {
      showError('ipResult', json.message || 'Kuch gadbad ho gayi');
    }
  } catch(e) {
    showError('ipResult', 'Network error: ' + e.message);
  }
  toggleLoader('ipLoader', false);
}
document.getElementById('ipInput').addEventListener('keydown', e => { if(e.key==='Enter') lookupIP(); });

// ═══════════════ Pincode Lookup ═══════════════
async function lookupPincode() {
  const q = document.getElementById('pinInput').value.trim();
  if (!q) { showError('pinResult', 'Pincode daalo pehle'); return; }
  toggleLoader('pinLoader', true);
  document.getElementById('pinResult').innerHTML = '';
  try {
    const res = await fetch('/api/pincode?q=' + encodeURIComponent(q));
    const json = await res.json();
    if (json.success && json.data) {
      const text = formatResult(json.data);
      showResult('pinResult', text, json.data);
      bumpStat('vehicle');
    } else {
      showError('pinResult', json.message || 'Kuch gadbad ho gayi');
    }
  } catch(e) {
    showError('pinResult', 'Network error: ' + e.message);
  }
  toggleLoader('pinLoader', false);
}
document.getElementById('pinInput').addEventListener('keydown', e => { if(e.key==='Enter') lookupPincode(); });

// ═══════════════ EXIF Upload ═══════════════
const uploadArea = document.getElementById('uploadArea');
const exifFileInput = document.getElementById('exifFile');
const previewImg = document.getElementById('previewImg');
const exifBtnWrap = document.getElementById('exifBtnWrap');
let selectedFile = null;

uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
});
exifFileInput.addEventListener('change', e => {
  if (e.target.files.length) handleFileSelect(e.target.files[0]);
});

function handleFileSelect(file) {
  if (!file.type.match(/image\\/jpeg/)) {
    showError('exifResult', 'Sirf JPG/JPEG files supported hain');
    return;
  }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    previewImg.style.display = 'block';
  };
  reader.readAsDataURL(file);
  exifBtnWrap.style.display = 'block';
  document.getElementById('exifResult').innerHTML = '';
}

async function extractEXIF() {
  if (!selectedFile) { showError('exifResult', 'Pehle image select karo'); return; }
  toggleLoader('exifLoader', true);
  document.getElementById('exifResult').innerHTML = '';
  try {
    const fd = new FormData();
    fd.append('image', selectedFile);
    const res = await fetch('/api/exif', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) {
      const text = formatResult(json);
      showResult('exifResult', text, json);
      bumpStat('exif');
    } else {
      showError('exifResult', json.message || 'EXIF extract nahi ho paya');
    }
  } catch(e) {
    showError('exifResult', 'Error: ' + e.message);
  }
  toggleLoader('exifLoader', false);
}
</script>
</body>
</html>`;
