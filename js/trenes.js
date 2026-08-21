const redFerroviaria = {
  sarmiento_completo: {
    id: "sarmiento",
    nombre: "Línea Sarmiento (Once ⇄ Moreno ⇄ Mercedes)",
    frecuencia: "⚡ Eléctrico: c/10-15 min. 🚂 Diésel: c/40-70 min.",
    ultimoTren: "Último regreso Mercedes ➡️ Moreno: ~21:30 hs.",
    cabeceraCaba: { id: "once", nombre: "Once de Septiembre", lat: -34.6090, lon: -58.4070 },
    estaciones: [
      { id: "once", nombre: "Once", lat: -34.6090, lon: -58.4070 },
      { id: "flores", nombre: "Flores", lat: -34.6280, lon: -58.4680 },
      { id: "liniers", nombre: "Liniers", lat: -34.6400, lon: -58.5270 },
      { id: "ramos", nombre: "Ramos Mejía", lat: -34.6465, lon: -58.5630 },
      { id: "haedo", nombre: "Haedo", lat: -34.6475, lon: -58.5910 },
      { id: "moron", nombre: "Morón", lat: -34.6534, lon: -58.6200 },
      { id: "castelar", nombre: "Castelar", lat: -34.6505, lon: -58.6475 },
      { id: "padua", nombre: "S. A. de Padua", lat: -34.6640, lon: -58.6970 },
      { id: "merlo", nombre: "Merlo", lat: -34.6660, lon: -58.7280 },
      { id: "moreno", nombre: "Moreno (Transbordo)", lat: -34.6508, lon: -58.7909 },
      { id: "gral_rodriguez", nombre: "Gral. Rodríguez", lat: -34.6075, lon: -58.9550 },
      { id: "lujan", nombre: "Luján", lat: -34.5714, lon: -59.1065 },
      { id: "jauregui", nombre: "Jáuregui", lat: -34.5950, lon: -59.1764 },
      { id: "mercedes", nombre: "Mercedes", lat: -34.6530, lon: -59.4300 }
    ]
  },
  san_martin: {
    id: "san_martin",
    nombre: "Línea San Martín (Retiro ⇄ Pilar ⇄ Cabred)",
    frecuencia: "⚡ Retiro - Pilar: c/15-20 min. 🚂 A Cabred: c/60-90 min.",
    ultimoTren: "Último regreso Pilar ➡️ Retiro: ~22:15 hs.",
    cabeceraCaba: { id: "retiro_sm", nombre: "Retiro (San Martín)", lat: -34.5915, lon: -58.3740 },
    estaciones: [
      { id: "retiro_sm", nombre: "Retiro", lat: -34.5915, lon: -58.3740 },
      { id: "palermo", nombre: "Palermo", lat: -34.5800, lon: -58.4280 },
      { id: "caseros", nombre: "Caseros", lat: -34.6050, lon: -58.5640 },
      { id: "palomar", nombre: "El Palomar", lat: -34.5983, lon: -58.5835 },
      { id: "hurlingham", nombre: "Hurlingham", lat: -34.5910, lon: -58.6360 },
      { id: "san_miguel", nombre: "San Miguel", lat: -34.5420, lon: -58.7120 },
      { id: "jose_c_paz", nombre: "José C. Paz", lat: -34.5160, lon: -58.7660 },
      { id: "pilar", nombre: "Pilar", lat: -34.4580, lon: -58.9140 },
      { id: "cabred", nombre: "Open Door (Cabred)", lat: -34.4920, lon: -59.0790 }
    ]
  },
  mitre_zarate: {
    id: "mitre_zarate",
    nombre: "Línea Mitre (Ballester ⇄ Zárate)",
    frecuencia: "🚂 Diésel: Cada 1h 30m - 2h.",
    ultimoTren: "Último regreso Zárate ➡️ Ballester: ~20:45 hs.",
    cabeceraCaba: { id: "ballester_z", nombre: "Villa Ballester", lat: -34.5450, lon: -58.5570 },
    estaciones: [
      { id: "ballester_z", nombre: "Villa Ballester", lat: -34.5450, lon: -58.5570 },
      { id: "benavidez", nombre: "Benavídez", lat: -34.4170, lon: -58.6940 },
      { id: "maschwitz", nombre: "Ing. Maschwitz", lat: -34.3850, lon: -58.7360 },
      { id: "escobar", nombre: "Escobar", lat: -34.3490, lon: -58.7970 },
      { id: "campana", nombre: "Campana", lat: -34.1610, lon: -58.9610 },
      { id: "zarate", nombre: "Zárate", lat: -34.1030, lon: -59.0270 }
    ]
  },
  roca_laplata: {
    id: "roca",
    nombre: "Línea Roca (Constitución ⇄ La Plata)",
    frecuencia: "⚡ Eléctrico: c/15-25 min.",
    ultimoTren: "Último regreso La Plata ➡️ Constitución: ~22:30 hs.",
    cabeceraCaba: { id: "constitucion", nombre: "Pza. Constitución", lat: -34.6280, lon: -58.3810 },
    estaciones: [
      { id: "constitucion", nombre: "Constitución", lat: -34.6280, lon: -58.3810 },
      { id: "avellaneda", nombre: "Avellaneda", lat: -34.6630, lon: -58.3760 },
      { id: "bernal", nombre: "Bernal", lat: -34.7080, lon: -58.2830 },
      { id: "quilmes", nombre: "Quilmes", lat: -34.7240, lon: -58.2590 },
      { id: "berazategui", nombre: "Berazategui", lat: -34.7630, lon: -58.2120 },
      { id: "city_bell", nombre: "City Bell", lat: -34.8720, lon: -58.0480 },
      { id: "la_plata", nombre: "La Plata", lat: -34.9040, lon: -57.9490 }
    ]
  },
  urquiza: {
    id: "urquiza",
    nombre: "Línea Urquiza (Lacroze ⇄ Lemos)",
    frecuencia: "⚡ Eléctrico: c/10-15 min.",
    ultimoTren: "Último regreso Lemos: ~23:20 hs.",
    cabeceraCaba: { id: "lacroze", nombre: "Federico Lacroze", lat: -34.5869, lon: -58.4556 },
    estaciones: [
      { id: "lacroze", nombre: "Federico Lacroze", lat: -34.5869, lon: -58.4556 },
      { id: "tropezon", nombre: "Tropezón", lat: -34.5870, lon: -58.5600 },
      { id: "coronado", nombre: "Martín Coronado", lat: -34.5910, lon: -58.5880 },
      { id: "podesta", nombre: "Pablo Podestá", lat: -34.5886, lon: -58.6015 },
      { id: "j_lemos", nombre: "Gral. Lemos", lat: -34.5380, lon: -58.7060 }
    ]
  },
  mitre_electrico: {
    id: "mitre_elec",
    nombre: "Línea Mitre (Retiro ⇄ Tigre / Suárez)",
    frecuencia: "⚡ Eléctrico: c/12-18 min.",
    ultimoTren: "Último regreso Tigre: ~22:50 hs.",
    cabeceraCaba: { id: "retiro_m", nombre: "Retiro (Mitre)", lat: -34.5910, lon: -58.3750 },
    estaciones: [
      { id: "retiro_m", nombre: "Retiro", lat: -34.5910, lon: -58.3750 },
      { id: "san_isidro", nombre: "San Isidro", lat: -34.4710, lon: -58.5100 },
      { id: "tigre", nombre: "Tigre", lat: -34.4250, lon: -58.5790 },
      { id: "ballester_e", nombre: "Villa Ballester", lat: -34.5450, lon: -58.5570 },
      { id: "suarez", nombre: "J. L. Suárez", lat: -34.5160, lon: -58.5910 }
    ]
  }
};