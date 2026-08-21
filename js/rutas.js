const cacheRutas = new Map();
window.puntosGpxActuales = [];

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// Búsqueda de coordenadas robusta con Photon + Fallback
async function buscarCoordenadasTexto(texto) {
  const key = texto.toLowerCase().trim();
  if (cacheRutas.has(key)) return cacheRutas.get(key);

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(texto)}&lat=-34.6037&lon=-58.4500&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.features && data.features.length > 0) {
      const f = data.features[0];
      const obj = {
        nombre: f.properties.name || f.properties.city || f.properties.street || texto,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0]
      };
      cacheRutas.set(key, obj);
      return obj;
    }
  } catch (e) {
    console.warn("Fallo en Photon, intentando fallback...", e);
  }

  // Fallback a Nominatim
  const urlFallback = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texto + ', Buenos Aires, Argentina')}&limit=1`;
  const resFb = await fetch(urlFallback);
  const dataFb = await resFb.json();
  if (dataFb && dataFb.length > 0) {
    const obj = {
      nombre: dataFb[0].display_name.split(',')[0],
      lat: parseFloat(dataFb[0].lat),
      lon: parseFloat(dataFb[0].lon)
    };
    cacheRutas.set(key, obj);
    return obj;
  }

  throw new Error(`No se encontró: "${texto}"`);
}

async function obtenerRutaBici(p1, p2) {
  const cacheKey = `${p1.lat.toFixed(4)},${p1.lon.toFixed(4)}-${p2.lat.toFixed(4)},${p2.lon.toFixed(4)}`;
  if (cacheRutas.has(cacheKey)) return cacheRutas.get(cacheKey);

  try {
    const url = `https://router.project-osrm.org/route/v1/biking/${p1.lon},${p1.lat};${p2.lon},${p2.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const resObj = {
      coords: data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]),
      distanciaKm: (data.routes[0].distance / 1000).toFixed(1)
    };
    cacheRutas.set(cacheKey, resObj);
    return resObj;
  } catch (e) {
    const dist = distanciaKm(p1.lat, p1.lon, p2.lat, p2.lon).toFixed(1);
    return { coords: [[p1.lat, p1.lon], [p2.lat, p2.lon]], distanciaKm: dist };
  }
}

async function obtenerClimaDestino(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m&timezone=America%2FArgentina%2FBuenos_Aires`;
    const res = await fetch(url);
    const data = await res.json();
    return {
      temp: Math.round(data.current.temperature_2m),
      viento: Math.round(data.current.wind_speed_10m)
    };
  } catch (e) {
    return null;
  }
}

function calcularRutaOptimaConTransbordo(ptoOrigen, ptoDestino, modoPlan) {
  const distDirecta = distanciaKm(ptoOrigen.lat, ptoOrigen.lon, ptoDestino.lat, ptoDestino.lon);

  if (modoPlan === 'urbano' && distDirecta <= 12) {
    return { tipo: "pedaleo_directo", distDirecta: distDirecta.toFixed(1) };
  }

  let mejorDirecta = null;
  let menorPedaleoDirecto = Infinity;

  for (const [key, linea] of Object.entries(redFerroviaria)) {
    let sub = null, minDSub = Infinity;
    let baj = null, minDBaj = Infinity;

    linea.estaciones.forEach(est => {
      const d1 = distanciaKm(ptoOrigen.lat, ptoOrigen.lon, est.lat, est.lon);
      if (d1 < minDSub) { minDSub = d1; sub = est; }
      const d2 = distanciaKm(ptoDestino.lat, ptoDestino.lon, est.lat, est.lon);
      if (d2 < minDBaj) { minDBaj = d2; baj = est; }
    });

    if (sub && baj && sub.id !== baj.id) {
      const totalPedaleo = minDSub + minDBaj;
      if (totalPedaleo < menorPedaleoDirecto && minDSub < 15 && minDBaj < 15) {
        menorPedaleoDirecto = totalPedaleo;
        mejorDirecta = { tipo: "directa", lineaObj: linea, subida: sub, bajada: baj };
      }
    }
  }

  if (mejorDirecta) return mejorDirecta;

  let mejorCombinada = null;
  let menorCostoCombinado = Infinity;

  for (const [key1, linea1] of Object.entries(redFerroviaria)) {
    for (const [key2, linea2] of Object.entries(redFerroviaria)) {
      if (key1 === key2) continue;

      let sub1 = null, minD1 = Infinity;
      linea1.estaciones.forEach(est => {
        const d = distanciaKm(ptoOrigen.lat, ptoOrigen.lon, est.lat, est.lon);
        if (d < minD1) { minD1 = d; sub1 = est; }
      });

      let baj2 = null, minD2 = Infinity;
      linea2.estaciones.forEach(est => {
        const d = distanciaKm(ptoDestino.lat, ptoDestino.lon, est.lat, est.lon);
        if (d < minD2) { minD2 = d; baj2 = est; }
      });

      const transbordoSalida = linea1.cabeceraCaba;
      const transbordoEntrada = linea2.cabeceraCaba;
      const distTransbordo = distanciaKm(transbordoSalida.lat, transbordoSalida.lon, transbordoEntrada.lat, transbordoEntrada.lon);
      const costoTotalPedaleo = minD1 + minD2 + distTransbordo;

      if (costoTotalPedaleo < menorCostoCombinado) {
        menorCostoCombinado = costoTotalPedaleo;
        mejorCombinada = {
          tipo: "combinada",
          linea1Obj: linea1,
          linea2Obj: linea2,
          subida1: sub1,
          bajada1: transbordoSalida,
          subida2: transbordoEntrada,
          bajada2: baj2
        };
      }
    }
  }

  return mejorCombinada || { tipo: "pedaleo_directo", distDirecta: distDirecta.toFixed(1) };
}

function descargarGPX() {
  if (!window.puntosGpxActuales || window.puntosGpxActuales.length === 0) {
    alert("Primero calculá una ruta para descargar el archivo GPX.");
    return;
  }

  let gpxData = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="BiSI - Rutas Intermodales" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Ruta BiSI</name>
    <trkseg>\n`;

  window.puntosGpxActuales.forEach(pt => {
    gpxData += `      <trkpt lat="${pt[0]}" lon="${pt[1]}"></trkpt>\n`;
  });

  gpxData += `    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([gpxData], { type: 'application/gpx+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ruta-bisi-${Date.now()}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}