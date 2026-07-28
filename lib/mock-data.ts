export const categories = [
  { name: "Dentistas", slug: "dentistas", icon: "🦷" },
  { name: "Psicólogos", slug: "psicologos", icon: "🧠" },
  { name: "Peluquerías", slug: "peluquerias", icon: "✂️" },
  { name: "Fisioterapia", slug: "fisioterapia", icon: "💆" },
  { name: "Estética", slug: "estetica", icon: "✨" },
  { name: "Veterinarios", slug: "veterinarios", icon: "🐾" },
];

export const businesses = [
  { slug:"dental-maresme", name:"Dental Maresme", category:"Dentistas", rating:4.9, address:"Carrer de Barcelona, Mataró", phone:"937 00 00 01", distance:"650 m", next:"Hoy · 17:30" },
  { slug:"centre-salut-ment", name:"Centre Salut Ment", category:"Psicólogos", rating:4.8, address:"Via Europa, Mataró", phone:"937 00 00 02", distance:"1,1 km", next:"Mañana · 09:00" },
  { slug:"studio-nova", name:"Studio Nova", category:"Peluquerías", rating:4.7, address:"Carrer d'Argentona, Mataró", phone:"937 00 00 03", distance:"1,4 km", next:"Hoy · 19:00" },
];

export const slots = [
  { day:"Hoy", times:["16:30","17:00","17:30","18:30"] },
  { day:"Mañana", times:["09:00","09:30","11:00","16:00","18:00"] },
  { day:"Miércoles", times:["10:30","12:00","17:30"] },
];
