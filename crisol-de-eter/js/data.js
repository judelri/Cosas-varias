// Crisol de Éter — Datos: esencias, objetos, recetas del crisol e infusiones.
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.

/* ================= Datos del juego ================= */
const CAP = 50;
const PATHS = {
  wave:"M3 9c3-3 6 3 9 0s6-3 9 0M3 15c3-3 6 3 9 0s6-3 9 0", tri:"M12 3 21 20H3Z", square:"M5 5h14v14H5Z",
  circle:"M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0M4 12h16", hex:"M12 3 20 7.5v9L12 21l-8-4.5v-9Z",
  star:"M12 2v20M2 12h20M5 5l14 14M19 5 5 19", leaf:"M5 19C5 9 11 4 20 4c0 9-5 15-15 15ZM5 19l9-9",
  bar:"M3 9h18l-3 7H6Z", sun:"M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
  bolt:"M13 2 5 14h6l-1 8 8-12h-6Z", ring:"M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0"
};
const ESS = {
  marea:{n:"Marea",c:"#5b9bd5",s:"wave",d:"agua, flujo"}, brasa:{n:"Brasa",c:"#e0743c",s:"tri",d:"fuego, calor"},
  roca:{n:"Roca",c:"#a8935c",s:"square",d:"tierra, peso"}, cefiro:{n:"Céfiro",c:"#bcd2c4",s:"circle",d:"aire, movimiento"},
  orden:{n:"Orden",c:"#e8e2cf",s:"hex",d:"forma, estructura"}, caos:{n:"Caos",c:"#9a62b0",s:"star",d:"ruptura, azar"},
  vida:{n:"Vida",c:"#7fbf5a",s:"leaf",from:["marea","roca"]}, metal:{n:"Metal",c:"#a9b4bd",s:"bar",from:["roca","orden"]},
  luz:{n:"Luz",c:"#f2d36b",s:"sun",from:["brasa","cefiro"]}, energia:{n:"Energía",c:"#59d0d6",s:"bolt",from:["orden","brasa"]},
  vacio:{n:"Vacío",c:"#7476a8",s:"ring",from:["cefiro","caos"]}
};
const ESS_ORDER = Object.keys(ESS);
const ITEMS = {
  agua:{n:"Agua de manantial",ab:"Ag",e:{marea:4}}, piedra:{n:"Piedra",ab:"Pi",e:{roca:4}},
  semilla:{n:"Semilla",ab:"Se",e:{vida:3,roca:1}}, pluma:{n:"Pluma",ab:"Pl",e:{cefiro:3,vida:1}},
  carbon:{n:"Carbón",ab:"Cb",e:{brasa:3,roca:2}}, hierro:{n:"Mena de hierro",ab:"Fe",e:{metal:4,roca:1}},
  cuarzo:{n:"Cuarzo",ab:"Qz",e:{orden:3,luz:1}}, chispa:{n:"Piedra chispa",ab:"Ch",e:{energia:3,roca:1}},
  obsidiana:{n:"Obsidiana",ab:"Ob",e:{roca:3,brasa:2,caos:1}}, ambar:{n:"Ámbar",ab:"Am",e:{luz:2,vida:1,orden:1}},
  ceniza:{n:"Ceniza de grieta",ab:"Cg",e:{caos:3,vacio:1}},
  corrupta:{n:"Masa corrupta",ab:"Mc",e:{caos:4,vacio:2},d:"Lo que deja el flux. Rica en Caos y Vacío."},
  polvo:{n:"Polvo de luz",ab:"Pz",e:{luz:3,cefiro:1},d:"Lo sueltan las polillas de luz que salen de noche."},
  sal:{n:"Sal purificadora",ab:"Sa",e:{orden:2,marea:1},crafted:1,d:"Úsala desde la mochila: −25 flux."},
  tiza:{n:"Tiza arcana",ab:"Ti",e:{orden:2,roca:1},crafted:1,d:"Traza los círculos del altar."},
  laton:{n:"Latón arcano",ab:"La",e:{metal:3,orden:2},crafted:1,d:"Metal que conduce esencia."},
  vela:{n:"Vela estabilizadora",ab:"Ve",e:{luz:2,orden:2},crafted:1,d:"Llevada en la mochila estabiliza el altar: −15 de inestabilidad cada una (máx. 2)."},
  vial:{n:"Vial de éter",ab:"Vi",e:{cefiro:3,vacio:2},crafted:1,d:"Aire del vacío, embotellado."},
  fenix:{n:"Brasa viva",ab:"Bv",e:{brasa:4,vida:3},crafted:1,d:"Un fuego que respira."},
  lente:{n:"Lente de visión",ab:"Le",e:{luz:3,orden:2},crafted:1,d:"Picas el doble de rápido."},
  amuleto:{n:"Amuleto de calma",ab:"Ac",e:{orden:3,vida:2},crafted:1,d:"Reduce a la mitad todo el flux que generas."},
  corazon:{n:"Corazón de Éter",ab:"Cé",e:{energia:4,vacio:4,luz:4,vida:4},crafted:1,d:"La obra maestra del taller."}
};
const CRU = [
  {id:"sal",cat:"cuarzo",cost:{orden:4,marea:4}}, {id:"tiza",cat:"piedra",cost:{orden:3,roca:3}},
  {id:"laton",cat:"hierro",cost:{orden:4,energia:2}}, {id:"vela",cat:"ambar",cost:{orden:3,luz:3}},
  {id:"vial",cat:"agua",cost:{cefiro:5,vacio:2}}, {id:"fenix",cat:"carbon",cost:{brasa:5,vida:4}}
];
const INF = [
  {id:"lente",center:"cuarzo",peds:["laton","ambar"],cost:{luz:5,orden:4}},
  {id:"amuleto",center:"laton",peds:["sal","tiza"],cost:{orden:6,vida:4}},
  {id:"corazon",center:"vial",peds:["laton","fenix","tiza","vela"],cost:{energia:6,vacio:4,luz:5,vida:5},final:1}
];
