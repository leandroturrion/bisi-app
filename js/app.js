const WHATSAPP_LEANDRO = "5491138030797";
const ALIAS_MERCADOPAGO = "Leandro.turrion";

const capaClara = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OSM' });
const capaOscura = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '© CARTO' });

const map = L.map('map', { zoomControl: false, layers: [capaClara] }).setView([-34.6037, -58.5500], 11);

let coordsSeleccionadas = { origen: null, destino: null };
let circuloPrecision = null;
let markerGpsVivo = null;
let resumenWhatsApp = "";
let urlCompartirGrupal = "";
let capasRuta = [];
let modoPlanActual = "urbano";
let wakeLock = null;
let watchGpsId = null;

// Caché de alternativas para switcher comparativo
let opcionesCalculadas = { directo: null, intermodal: null, ptoOrigen: null, ptoDestino: null, clima: null };

let perfilUsuario = JSON.parse(localStorage.getItem('bisi_perfil') || JSON.stringify({
  bici: 'mtb',
  ritmo: 'medio'
}));

const velocidades = { paseo: 15, medio: 20, rapido: 25 };
const destinosConTierra = ["carlos keen", "tomás jofré", "tomas jofre", "uribelarrea", "jáuregui", "jauregui"];

function limpiarCapas() {
  capasRuta.forEach(c => map.removeLayer(c));
  capasRuta = [];
}

async function toggleModoNavegacion() {
  const btn = document.getElementById('btn-wake-lock');
  
  if (!wakeLock) {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
          btn.classList.remove('activo');
          btn.innerHTML = '▶️ Navegar';
        });
      }
      
      btn.classList.add('activo');
      btn.innerHTML = '🟢 En Ruta (Pantalla ON)';

      if (navigator.geolocation) {
        watchGpsId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            if (!markerGpsVivo) {
              markerGpsVivo = L.circleMarker([lat, lon], {
                radius: 8,
                color: '#2563eb',
                fillColor: '#60a5fa',
                fillOpacity: 0.9,
                weight: 2
              }).addTo(map);
            } else {
              markerGpsVivo.setLatLng([lat, lon]);
            }
            map.setView([lat, lon], 16);
          },
          (err) => console.warn("Error en watchPosition:", err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      }

    } catch (err) {
      alert("No se pudo mantener la pantalla activa en este navegador.");
    }
  } else {
    if (wakeLock) await wakeLock.release();
    if (watchGpsId) navigator.geolocation.clearWatch(watchGpsId);
    if (markerGpsVivo) {
      map.removeLayer(markerGpsVivo);
      markerGpsVivo = null;
    }
    wakeLock = null;
    btn.classList.remove('activo');
    btn.innerHTML = '▶️ Navegar';
  }
}

function verificarParametrosURL() {
  const params = new URLSearchParams(window.location.search);
  const origen = params.get('origen');
  const destino = params.get('destino');
  const modo = params.get('modo');

  if (origen && destino) {
    document.getElementById('input-origen').value = origen;
    document.getElementById('input-destino').value = destino;
    if (modo) cambiarModoPlan(modo);
    document.getElementById('banner-grupal').style.display = 'flex';
    procesarRuta();
  }
}

function cerrarBannerGrupal() {
  document.getElementById('banner-grupal').style.display = 'none';
}

function abrirModalPerfil() {
  document.getElementById('modal-perfil').style.display = 'flex';
  sincronizarChipsPerfilUI();
}

function cerrarModalPerfil(e) {
  if (e && e.target !== document.getElementById('modal-perfil')) return;
  document.getElementById('modal-perfil').style.display = 'none';
}

function setChip(categoria, valor) {
  perfilUsuario[categoria] = valor;
  sincronizarChipsPerfilUI();
}

function sincronizarChipsPerfilUI() {
  document.querySelectorAll('#chips-bici .chip').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(perfilUsuario.bici));
  });
  document.querySelectorAll('#chips-ritmo .chip').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(perfilUsuario.ritmo));
  });
  const labelTheme = document.getElementById('btn-theme-label');
  if (labelTheme) {
    labelTheme.textContent = document.body.classList.contains('dark-mode') ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
  }
}

function guardarPerfil() {
  localStorage.setItem('bisi_perfil', JSON.stringify(perfilUsuario));
  document.getElementById('modal-perfil').style.display = 'none';
  if (document.getElementById('input-origen').value.trim() && document.getElementById('input-destino').value.trim()) {
    procesarRuta();
  }
}

function calcularTiempoPedaleo(km) {
  const vel = velocidades[perfilUsuario.ritmo] || 20;
  const minutosTotales = Math.round((km / vel) * 60);
  if (minutosTotales < 60) return `${minutosTotales} min`;
  const horas = Math.floor(minutosTotales / 60);
  const mins = minutosTotales % 60;
  return `${horas} h ${mins > 0 ? mins + ' min' : ''}`;
}

function cambiarModoPlan(modo) {
  modoPlanActual = modo;
  const btnUrbano = document.getElementById('btn-plan-urbano');
  const btnEscapada = document.getElementById('btn-plan-escapada');
  const wrapEscapadas = document.getElementById('wrapper-escapadas');
  const teaserTitle = document.getElementById('teaser-title');

  if (modo === 'urbano') {
    btnUrbano.classList.add('active');
    btnEscapada.classList.remove('active');
    wrapEscapadas.style.display = 'none';
    teaserTitle.textContent = "🚲 Modo Urbano: Pedaleo directo";
  } else {
    btnEscapada.classList.add('active');
    btnUrbano.classList.remove('active');
    wrapEscapadas.style.display = 'flex';
    teaserTitle.textContent = "🌲 Modo Escapada: Bici + Tren";
  }

  if (document.getElementById('input-origen').value.trim() && document.getElementById('input-destino').value.trim()) {
    procesarRuta();
  }
}

function abrirModalDonar() { document.getElementById('modal-donar').style.display = 'flex'; }
function cerrarModalDonar() { document.getElementById('modal-donar').style.display = 'none'; }

function copiarAlias() {
  navigator.clipboard.writeText(ALIAS_MERCADOPAGO).then(() => {
    const btn = document.getElementById('btn-copiar');
    btn.textContent = "¡Copiado! ✓";
    btn.style.background = "#16a34a";
    setTimeout(() => {
      btn.textContent = "Copiar";
      btn.style.background = "#0284c7";
    }, 2500);
  });
}

function enviarFeedbackWhatsApp() {
  const msg = encodeURIComponent("¡Hola Leandro! Estuve usando BiSI y quería dejarte este feedback / sugerencia:\n\n");
  window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_LEANDRO}&text=${msg}`, '_blank');
}

function expandirTopBar() {
  const topBar = document.getElementById('top-bar');
  const btn = document.getElementById('btn-toggle-top');
  topBar.classList.remove('colapsado');
  btn.textContent = '▲';
}

function toggleTopBar() {
  const topBar = document.getElementById('top-bar');
  const btn = document.getElementById('btn-toggle-top');
  topBar.classList.toggle('colapsado');
  btn.textContent = topBar.classList.contains('colapsado') ? '▼' : '▲';
}

function actualizarPosicionGps(alturaPx) {
  document.documentElement.style.setProperty('--sheet-height', `${alturaPx}px`);
}

function expandirSheet() {
  const sheet = document.getElementById('bottom-sheet');
  sheet.style.display = 'flex';
  sheet.classList.add('expandido');
  sheet.classList.remove('oculto');
  document.getElementById('btn-restore-sheet').style.display = 'none';
  actualizarPosicionGps(280);
}

function contraerSheet() {
  const sheet = document.getElementById('bottom-sheet');
  sheet.style.display = 'flex';
  sheet.classList.remove('expandido');
  sheet.classList.remove('oculto');
  document.getElementById('btn-restore-sheet').style.display = 'none';
  actualizarPosicionGps(80);
}

function toggleSheet() {
  const sheet = document.getElementById('bottom-sheet');
  if (sheet.classList.contains('expandido')) {
    contraerSheet();
  } else {
    expandirSheet();
  }
}

function ocultarSheetCompleta() {
  const sheet = document.getElementById('bottom-sheet');
  sheet.classList.remove('expandido');
  sheet.classList.add('oculto');
  document.getElementById('btn-restore-sheet').style.display = 'block';
  actualizarPosicionGps(0);
}

function restaurarSheet() {
  contraerSheet();
}

let touchStartY = 0;
let touchEndY = 0;
const dragArea = document.getElementById('sheet-drag-area');

if (dragArea) {
  dragArea.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  dragArea.addEventListener('touchmove', (e) => {
    touchEndY = e.touches[0].clientY;
  }, { passive: true });

  dragArea.addEventListener('touchend', () => {
    if (!touchEndY) return;
    const diffY = touchStartY - touchEndY;

    if (diffY > 40) {
      expandirSheet();
    } else if (diffY < -40) {
      const sheet = document.getElementById('bottom-sheet');
      if (sheet.classList.contains('expandido')) {
        contraerSheet();
      } else {
        ocultarSheetCompleta();
      }
    } else {
      toggleSheet();
    }
    touchStartY = 0;
    touchEndY = 0;
  });
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  if (isDark) {
    map.removeLayer(capaClara);
    map.addLayer(capaOscura);
    localStorage.setItem('bisi_theme', 'dark');
  } else {
    map.removeLayer(capaOscura);
    map.addLayer(capaClara);
    localStorage.setItem('bisi_theme', 'light');
  }
  sincronizarChipsPerfilUI();
}

if (localStorage.getItem('bisi_theme') === 'dark') toggleDarkMode();

function invertirPuntos() {
  const o = document.getElementById('input-origen');
  const d = document.getElementById('input-destino');
  const t = o.value;
  o.value = d.value;
  d.value = t;

  const tc = coordsSeleccionadas.origen;
  coordsSeleccionadas.origen = coordsSeleccionadas.destino;
  coordsSeleccionadas.destino = tc;

  if (o.value && d.value) procesarRuta();
}

function seleccionarEscapada(nombreDestino) {
  if (!nombreDestino) return;
  document.getElementById('input-destino').value = nombreDestino;
  coordsSeleccionadas.destino = null;
  if (document.getElementById('input-origen').value.trim()) {
    procesarRuta();
  }
}

function obtenerUbicacionGPS() {
  if (!navigator.geolocation) {
    alert("Tu teléfono no soporta geolocalización GPS.");
    return;
  }

  const inputOrig = document.getElementById('input-origen');
  const btnGps = document.getElementById('btn-gps');
  
  btnGps.classList.add('buscando');
  inputOrig.value = "📍 Obteniendo GPS...";

  const opcionesGeoloc = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000
  };

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      btnGps.classList.remove('buscando');
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const precision = Math.round(pos.coords.accuracy);

      inputOrig.value = "📍 Mi ubicación actual";
      coordsSeleccionadas.origen = {
        nombre: "Mi ubicación actual",
        lat: lat,
        lon: lon,
        esGps: true
      };

      if (circuloPrecision) map.removeLayer(circuloPrecision);
      circuloPrecision = L.circle([lat, lon], {
        radius: precision,
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.25,
        weight: 2
      }).addTo(map);

      map.setView([lat, lon], 14);
      if (document.getElementById('input-destino').value.trim()) {
        procesarRuta();
      }
    },
    (err) => {
      btnGps.classList.remove('buscando');
      inputOrig.value = "";
      if (err.code === 1) {
        alert("Permiso GPS denegado. Podés habilitarlo en los ajustes del navegador.");
      } else {
        alert("No se pudo obtener señal GPS. Verificá que la ubicación esté encendida.");
      }
    },
    opcionesGeoloc
  );
}

function configurarAutocompletado(inputId, listId, tipo) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) return;
  let timeout = null;

  input.addEventListener('input', () => {
    clearTimeout(timeout);
    coordsSeleccionadas[tipo] = null;
    const query = input.value.trim();
    if (query.length < 2) {
      list.style.display = 'none';
      return;
    }

    timeout = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=-34.6037&lon=-58.4500&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        
        list.innerHTML = '';
        if (!data || !data.features || data.features.length === 0) {
          list.style.display = 'none';
          return;
        }

        data.features.forEach(f => {
          const props = f.properties;
          const labelPrincipal = props.name || props.street || query;
          const detalles = [props.city || props.district, props.state, props.country].filter(Boolean).join(', ');

          const div = document.createElement('div');
          div.className = 'autocomplete-item';
          div.innerHTML = `<strong>${labelPrincipal}</strong> ${detalles ? `<br><small style="color: var(--text-muted); font-size: 0.72rem;">${detalles}</small>` : ''}`;
          
          div.addEventListener('click', () => {
            input.value = labelPrincipal;
            coordsSeleccionadas[tipo] = {
              nombre: labelPrincipal,
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0]
            };
            list.style.display = 'none';
            if (document.getElementById('input-origen').value && document.getElementById('input-destino').value) {
              procesarRuta();
            }
          });
          list.appendChild(div);
        });
        list.style.display = 'block';
      } catch (e) {
        list.style.display = 'none';
      }
    }, 250);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.style.display = 'none';
    }
  });
}

configurarAutocompletado('input-origen', 'sug-origen', 'origen');
configurarAutocompletado('input-destino', 'sug-destino', 'destino');

function renderizarInfoHTML(html) {
  const elMobile = document.getElementById('info-mobile');
  if (elMobile) elMobile.innerHTML = html;
}

function compartirWhatsApp() {
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(resumenWhatsApp + "\n\n🗺️ Abrir recorrido en BiSI: " + urlCompartirGrupal)}`;
  window.open(url, '_blank');
}

// RENDERIZADOR: OPCIÓN 100% PEDALEO DIRECTO
function activarOpcionDirecta() {
  limpiarCapas();
  const { directo, ptoOrigen, ptoDestino, clima } = opcionesCalculadas;
  if (!directo) return;

  const m1 = L.marker([ptoOrigen.lat, ptoOrigen.lon]).addTo(map).bindPopup("<b>Salida:</b> " + ptoOrigen.nombre);
  const m2 = L.marker([ptoDestino.lat, ptoDestino.lon]).addTo(map).bindPopup("<b>Llegada:</b> " + ptoDestino.nombre);
  const poly = L.polyline(directo.coords, { color: '#16a34a', weight: 5, opacity: 0.9 }).addTo(map);
  capasRuta.push(m1, m2, poly);

  window.puntosGpxActuales = directo.coords;
  const tiempoEstimado = calcularTiempoPedaleo(parseFloat(directo.distanciaKm));
  resumenWhatsApp = `🚲 *Ruta Directa BiSI*\n📍 Salida: ${ptoOrigen.nombre}\n🏁 Llegada: ${ptoDestino.nombre}\n🚴 Pedaleo: ~${directo.distanciaKm} km (${tiempoEstimado})`;

  const htmlClima = clima ? `
    <div class="weather-card">
      <span>🌡️ Temp: <strong>${clima.temp}°C</strong></span>
      <span>💨 Viento: <strong>${clima.viento} km/h</strong></span>
    </div>` : '';

  const switcherHTML = opcionesCalculadas.intermodal ? `
    <div class="comparador-tabs">
      <button class="btn-compare-tab active" onclick="activarOpcionDirecta()">
        <span class="tab-title">🟢 100% Bici</span>
        <span class="tab-sub">${directo.distanciaKm} km (~${tiempoEstimado})</span>
      </button>
      <button class="btn-compare-tab" onclick="activarOpcionIntermodal()">
        <span class="tab-title">🚆 Bici + Tren</span>
        <span class="tab-sub">${opcionesCalculadas.intermodal.totKm} km pedaleo</span>
      </button>
    </div>` : '';

  renderizarInfoHTML(`
    ${switcherHTML}
    <div class="route-header">
      <span>🚲 Pedaleo Directo: ~${directo.distanciaKm} km (~${tiempoEstimado})</span>
      <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">(Deslizá para ver más)</span>
    </div>
    <div class="step-list">
      <div class="step-item">🟢 <div><strong>Bici directa:</strong> ${ptoOrigen.nombre} ➡️ ${ptoDestino.nombre} (<strong>${directo.distanciaKm} km</strong>)</div></div>
      <div class="step-item">🚴 <div style="color: var(--text-muted);">Recorrido completo pedaleando por calles y ciclovías.</div></div>
    </div>
    ${htmlClima}
    <div class="community-buttons">
      <button class="btn-action-comm wsp" onclick="compartirWhatsApp()">📲 Pasar Plan a Grupo de WhatsApp</button>
      <button class="btn-action-comm gpx" onclick="descargarGPX()">📥 Descargar Track GPX</button>
    </div>
  `);

  restaurarSheet();
  const grupo = L.featureGroup(capasRuta);
  map.fitBounds(grupo.getBounds(), { padding: [50, 50] });
}

// RENDERIZADOR: OPCIÓN INTERMODAL CON TREN
function activarOpcionIntermodal() {
  limpiarCapas();
  const { intermodal, ptoOrigen, ptoDestino, clima } = opcionesCalculadas;
  if (!intermodal) return;

  const m1 = L.marker([ptoOrigen.lat, ptoOrigen.lon]).addTo(map).bindPopup("<b>Salida:</b> " + ptoOrigen.nombre);
  const m2 = L.marker([ptoDestino.lat, ptoDestino.lon]).addTo(map).bindPopup("<b>Llegada:</b> " + ptoDestino.nombre);
  capasRuta.push(m1, m2);

  const ruta = intermodal.ruta;
  const tiempoPedaleo = calcularTiempoPedaleo(parseFloat(intermodal.totKm));
  window.puntosGpxActuales = intermodal.gpxCoords;

  let stepsHTML = "";
  let horariosHTML = "";

  if (ruta.tipo === 'directa') {
    const mSub = L.circleMarker([ruta.subida.lat, ruta.subida.lon], { radius: 7, color: '#1e3a8a', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }).addTo(map);
    const mBaj = L.circleMarker([ruta.bajada.lat, ruta.bajada.lon], { radius: 7, color: '#1e3a8a', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }).addTo(map);
    const poly1 = L.polyline(intermodal.t1.coords, { color: '#22c55e', weight: 5, opacity: 0.9 }).addTo(map);
    const polyTren = L.polyline([[ruta.subida.lat, ruta.subida.lon], [ruta.bajada.lat, ruta.bajada.lon]], { color: '#2563eb', weight: 6, dashArray: '8, 8' }).addTo(map);
    const poly3 = L.polyline(intermodal.t3.coords, { color: '#16a34a', weight: 5, opacity: 0.9 }).addTo(map);
    capasRuta.push(mSub, mBaj, poly1, polyTren, poly3);

    const tiempoRegresoMin = Math.round((parseFloat(intermodal.t3.distanciaKm) / (velocidades[perfilUsuario.ritmo] || 20)) * 60) + 20;

    stepsHTML = `
      <div class="step-item">🟢 <div><strong>Bici:</strong> ${ptoOrigen.nombre} ➡️ Est. ${ruta.subida.nombre} (<strong>${intermodal.t1.distanciaKm} km</strong>)</div></div>
      <div class="step-item">🚆 <div><strong>Tren:</strong> Est. ${ruta.subida.nombre} ➡️ Est. ${ruta.bajada.nombre} (${ruta.lineaObj.nombre})</div></div>
      <div class="step-item">🟢 <div><strong>Bici:</strong> Est. ${ruta.bajada.nombre} ➡️ ${ptoDestino.nombre} (<strong>${intermodal.t3.distanciaKm} km</strong>)</div></div>
    `;

    horariosHTML = `
      <div class="return-alert-box">
        ⏰ <strong>Cálculo de Regreso:</strong> Salí pedaleando hacia Est. ${ruta.bajada.nombre} al menos <strong>${tiempoRegresoMin} min antes</strong> del último tren.
      </div>
      <div class="horario-box">
        <strong>🕒 ${ruta.lineaObj.nombre}:</strong><br>
        • ${ruta.lineaObj.frecuencia}<br>
        • ⚠️ <em>${ruta.lineaObj.ultimoTren}</em>
      </div>
    `;

    resumenWhatsApp = `🚲 *Ruta BiSI*\n📍 Salida: ${ptoOrigen.nombre}\n🏁 Llegada: ${ptoDestino.nombre}\n🚴 Pedaleo: ~${intermodal.totKm} km (~${tiempoPedaleo})\n🚆 Tren: ${ruta.lineaObj.nombre}`;

  } else {
    // Combinada con transbordo
    const mSub1 = L.circleMarker([ruta.subida1.lat, ruta.subida1.lon], { radius: 7, color: '#1e3a8a', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }).addTo(map);
    const mBaj1 = L.circleMarker([ruta.bajada1.lat, ruta.bajada1.lon], { radius: 7, color: '#1e3a8a', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }).addTo(map);
    const mSub2 = L.circleMarker([ruta.subida2.lat, ruta.subida2.lon], { radius: 7, color: '#6b21a8', fillColor: '#9333ea', fillOpacity: 1, weight: 2 }).addTo(map);
    const mBaj2 = L.circleMarker([ruta.bajada2.lat, ruta.bajada2.lon], { radius: 7, color: '#6b21a8', fillColor: '#9333ea', fillOpacity: 1, weight: 2 }).addTo(map);

    const poly1 = L.polyline(intermodal.t1.coords, { color: '#22c55e', weight: 5, opacity: 0.9 }).addTo(map);
    const polyTren1 = L.polyline([[ruta.subida1.lat, ruta.subida1.lon], [ruta.bajada1.lat, ruta.bajada1.lon]], { color: '#2563eb', weight: 6, dashArray: '8, 8' }).addTo(map);
    const polyTransbordo = L.polyline(intermodal.tTransbordo.coords, { color: '#f59e0b', weight: 5, opacity: 0.95 }).addTo(map);
    const polyTren2 = L.polyline([[ruta.subida2.lat, ruta.subida2.lon], [ruta.bajada2.lat, ruta.bajada2.lon]], { color: '#9333ea', weight: 6, dashArray: '8, 8' }).addTo(map);
    const polyFinal = L.polyline(intermodal.tFinal.coords, { color: '#16a34a', weight: 5, opacity: 0.9 }).addTo(map);

    capasRuta.push(mSub1, mBaj1, mSub2, mBaj2, poly1, polyTren1, polyTransbordo, polyTren2, polyFinal);

    stepsHTML = `
      <div class="step-item">🟢 <div><strong>Bici:</strong> ${ptoOrigen.nombre} ➡️ Est. ${ruta.subida1.nombre} (<strong>${intermodal.t1.distanciaKm} km</strong>)</div></div>
      <div class="step-item">🚆 <div><strong>Tren 1:</strong> Est. ${ruta.subida1.nombre} ➡️ ${ruta.bajada1.nombre} (${ruta.linea1Obj.nombre})</div></div>
      <div class="step-item">🟡 <div><strong>Enlace Bici:</strong> ${ruta.bajada1.nombre} ➡️ ${ruta.subida2.nombre} (<strong>${intermodal.tTransbordo.distanciaKm} km</strong>)</div></div>
      <div class="step-item">🚆 <div><strong>Tren 2:</strong> ${ruta.subida2.nombre} ➡️ Est. ${ruta.bajada2.nombre} (${ruta.linea2Obj.nombre})</div></div>
      <div class="step-item">🟢 <div><strong>Bici final:</strong> Est. ${ruta.bajada2.nombre} ➡️ ${ptoDestino.nombre} (<strong>${intermodal.tFinal.distanciaKm} km</strong>)</div></div>
    `;

    horariosHTML = `
      <div class="horario-box">
        <strong>🕒 Horarios:</strong><br>
        • <strong>${ruta.linea1Obj.nombre}:</strong> ${ruta.linea1Obj.frecuencia}<br>
        • <strong>${ruta.linea2Obj.nombre}:</strong> ${ruta.linea2Obj.frecuencia}
      </div>
    `;

    resumenWhatsApp = `🚲 *Ruta Multimodal BiSI*\n📍 Salida: ${ptoOrigen.nombre}\n🏁 Llegada: ${ptoDestino.nombre}\n🚴 Pedaleo: ~${intermodal.totKm} km (~${tiempoPedaleo})\n🚆 Transbordo: ${ruta.linea1Obj.nombre} ➡️ ${ruta.linea2Obj.nombre}`;
  }

  const htmlClima = clima ? `
    <div class="weather-card">
      <span>🌡️ Temp: <strong>${clima.temp}°C</strong></span>
      <span>💨 Viento: <strong>${clima.viento} km/h</strong></span>
    </div>` : '';

  const switcherHTML = opcionesCalculadas.directo ? `
    <div class="comparador-tabs">
      <button class="btn-compare-tab" onclick="activarOpcionDirecta()">
        <span class="tab-title">🟢 100% Bici</span>
        <span class="tab-sub">${opcionesCalculadas.directo.distanciaKm} km</span>
      </button>
      <button class="btn-compare-tab active" onclick="activarOpcionIntermodal()">
        <span class="tab-title">🚆 Bici + Tren</span>
        <span class="tab-sub">${intermodal.totKm} km (~${tiempoPedaleo})</span>
      </button>
    </div>` : '';

  renderizarInfoHTML(`
    ${switcherHTML}
    <div class="route-header">
      <span>🚲 Pedaleo: ~${intermodal.totKm} km (~${tiempoPedaleo})</span>
      <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">(Deslizá para ver más)</span>
    </div>
    <div class="step-list">
      ${stepsHTML}
    </div>
    ${horariosHTML}
    ${htmlClima}
    <div class="community-buttons">
      <button class="btn-action-comm wsp" onclick="compartirWhatsApp()">📲 Pasar Plan a Grupo de WhatsApp</button>
      <button class="btn-action-comm gpx" onclick="descargarGPX()">📥 Descargar Track GPX</button>
    </div>
  `);

  restaurarSheet();
  const grupo = L.featureGroup(capasRuta);
  map.fitBounds(grupo.getBounds(), { padding: [50, 50] });
}

// PROCESADOR CENTRAL DE RUTAS CON COMPARADOR INTELIGENTE
async function procesarRuta() {
  limpiarCapas();
  window.puntosGpxActuales = [];
  opcionesCalculadas = { directo: null, intermodal: null, ptoOrigen: null, ptoDestino: null, clima: null };

  const txtOrigen = document.getElementById('input-origen').value.trim();
  const txtDestino = document.getElementById('input-destino').value.trim();

  if (!txtOrigen || !txtDestino) {
    alert("Completá punto de salida y llegada.");
    return;
  }

  document.getElementById('top-bar').classList.add('colapsado');
  document.getElementById('btn-toggle-top').textContent = '▼';

  document.getElementById('bottom-sheet').style.display = 'flex';
  renderizarInfoHTML('<div style="text-align: center; color: var(--text-muted); padding: 12px 0;">⏳ Comparando opciones de pedaleo y conexiones...</div>');

  try {
    const ptoOrigen = (coordsSeleccionadas.origen && coordsSeleccionadas.origen.esGps)
      ? coordsSeleccionadas.origen
      : (coordsSeleccionadas.origen && coordsSeleccionadas.origen.nombre.toLowerCase().includes(txtOrigen.toLowerCase())
          ? coordsSeleccionadas.origen
          : await buscarCoordenadasTexto(txtOrigen));

    const ptoDestino = (coordsSeleccionadas.destino && coordsSeleccionadas.destino.nombre.toLowerCase().includes(txtDestino.toLowerCase()))
      ? coordsSeleccionadas.destino
      : await buscarCoordenadasTexto(txtDestino);

    urlCompartirGrupal = `${window.location.origin}${window.location.pathname}?origen=${encodeURIComponent(ptoOrigen.nombre)}&destino=${encodeURIComponent(ptoDestino.nombre)}&modo=${modoPlanActual}`;

    const distDirectaKm = distanciaKm(ptoOrigen.lat, ptoOrigen.lon, ptoDestino.lat, ptoDestino.lon);
    const clima = await obtenerClimaDestino(ptoDestino.lat, ptoDestino.lon);

    opcionesCalculadas.ptoOrigen = ptoOrigen;
    opcionesCalculadas.ptoDestino = ptoDestino;
    opcionesCalculadas.clima = clima;

    // 1. CASO CORTO (< 8 km): Solo directo en bici
    if (distDirectaKm < 8) {
      const tDirecto = await obtenerRutaBici(ptoOrigen, ptoDestino);
      opcionesCalculadas.directo = tDirecto;
      activarOpcionDirecta();
      return;
    }

    // 2. CASO INTERMEDIO (8 a 28 km en modo urbano): Calcula ambas opciones
    const rutaTren = calcularRutaOptimaConTransbordo(ptoOrigen, ptoDestino, 'escapada'); // Forzamos búsqueda de tren

    if (modoPlanActual === 'urbano' && distDirectaKm <= 28 && rutaTren && rutaTren.tipo !== 'pedaleo_directo') {
      const [tDirecto, intermodalData] = await Promise.all([
        obtenerRutaBici(ptoOrigen, ptoDestino),
        (async () => {
          if (rutaTren.tipo === 'directa') {
            const [t1, t3] = await Promise.all([
              obtenerRutaBici(ptoOrigen, rutaTren.subida),
              obtenerRutaBici(rutaTren.bajada, ptoDestino)
            ]);
            const totKm = (parseFloat(t1.distanciaKm) + parseFloat(t3.distanciaKm)).toFixed(1);
            return { ruta: rutaTren, t1, t3, totKm, gpxCoords: [...t1.coords, ...t3.coords] };
          } else {
            const [t1, tTransbordo, tFinal] = await Promise.all([
              obtenerRutaBici(ptoOrigen, rutaTren.subida1),
              obtenerRutaBici(rutaTren.bajada1, rutaTren.subida2),
              obtenerRutaBici(rutaTren.bajada2, ptoDestino)
            ]);
            const totKm = (parseFloat(t1.distanciaKm) + parseFloat(tTransbordo.distanciaKm) + parseFloat(tFinal.distanciaKm)).toFixed(1);
            return { ruta: rutaTren, t1, tTransbordo, tFinal, totKm, gpxCoords: [...t1.coords, ...tTransbordo.coords, ...tFinal.coords] };
          }
        })()
      ]);

      opcionesCalculadas.directo = tDirecto;
      opcionesCalculadas.intermodal = intermodalData;

      // Mostramos por defecto directo si es < 16 km, o tren si es más
      if (distDirectaKm < 16) {
        activarOpcionDirecta();
      } else {
        activarOpcionIntermodal();
      }
      return;
    }

    // 3. CASO ESCAPADA O LARGO (> 28 km): Tren directo/combinado
    if (rutaTren && rutaTren.tipo !== 'pedaleo_directo') {
      if (rutaTren.tipo === 'directa') {
        const [t1, t3] = await Promise.all([
          obtenerRutaBici(ptoOrigen, rutaTren.subida),
          obtenerRutaBici(rutaTren.bajada, ptoDestino)
        ]);
        const totKm = (parseFloat(t1.distanciaKm) + parseFloat(t3.distanciaKm)).toFixed(1);
        opcionesCalculadas.intermodal = { ruta: rutaTren, t1, t3, totKm, gpxCoords: [...t1.coords, ...t3.coords] };
      } else {
        const [t1, tTransbordo, tFinal] = await Promise.all([
          obtenerRutaBici(ptoOrigen, rutaTren.subida1),
          obtenerRutaBici(rutaTren.bajada1, rutaTren.subida2),
          obtenerRutaBici(rutaTren.bajada2, ptoDestino)
        ]);
        const totKm = (parseFloat(t1.distanciaKm) + parseFloat(tTransbordo.distanciaKm) + parseFloat(tFinal.distanciaKm)).toFixed(1);
        opcionesCalculadas.intermodal = { ruta: rutaTren, t1, tTransbordo, tFinal, totKm, gpxCoords: [...t1.coords, ...tTransbordo.coords, ...tFinal.coords] };
      }
      activarOpcionIntermodal();
    } else {
      const tDirecto = await obtenerRutaBici(ptoOrigen, ptoDestino);
      opcionesCalculadas.directo = tDirecto;
      activarOpcionDirecta();
    }

  } catch (err) {
    renderizarInfoHTML(`<div style="color: #dc2626; text-align: center;">❌ ${err.message || 'Error al calcular la ruta.'}</div>`);
  }
}

verificarParametrosURL();