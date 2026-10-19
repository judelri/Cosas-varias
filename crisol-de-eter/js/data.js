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
const PRIMAL = ESS_ORDER.filter(e=>!ESS[e].from);
const ITEMS = {
  agua:{n:"Agua de manantial",ab:"Ag",e:{marea:4}}, piedra:{n:"Piedra",ab:"Pi",e:{roca:4}},
  semilla:{n:"Semilla",ab:"Se",e:{vida:3,roca:1}}, pluma:{n:"Pluma",ab:"Pl",e:{cefiro:3,vida:1}},
  carbon:{n:"Carbón",ab:"Cb",e:{brasa:3,roca:2}}, hierro:{n:"Mena de hierro",ab:"Fe",e:{metal:4,roca:1}},
  cuarzo:{n:"Cuarzo",ab:"Qz",e:{orden:3,luz:1}}, chispa:{n:"Piedra chispa",ab:"Ch",e:{energia:3,roca:1}},
  obsidiana:{n:"Obsidiana",ab:"Ob",e:{roca:3,brasa:2,caos:1}}, ambar:{n:"Ámbar",ab:"Am",e:{luz:2,vida:1,orden:1}},
  ceniza:{n:"Ceniza de grieta",ab:"Cg",e:{caos:3,vacio:1}},
  corrupta:{n:"Masa corrupta",ab:"Mc",e:{caos:4,vacio:2},d:"Lo que deja el flux. Rica en Caos y Vacío."},
  palo:{n:"Palo",ab:"Pa",e:{vida:1,orden:1},d:"Para mangos de herramientas y antorchas."},
  lingote:{n:"Lingote de hierro",ab:"Li",e:{metal:4},crafted:1,d:"Mena de hierro fundida en el horno."},
  pico_madera:{n:"Pico de madera",ab:"P1",e:{vida:2,orden:1},crafted:1,tool:1,d:"Saca roca y carbón."},
  pico_piedra:{n:"Pico de piedra",ab:"P2",e:{roca:3,orden:1},crafted:1,tool:2,d:"Saca hierro, cuarzo y piedra chispa."},
  pico_hierro:{n:"Pico de hierro",ab:"P3",e:{metal:3,orden:1},crafted:1,tool:3,d:"Saca obsidiana. Más rápido."},
  pan:{n:"Pan",ab:"Pn",e:{vida:2,orden:1},crafted:1,food:5,d:"Tres semillas horneadas en la mesa."},
  pollo_asado:{n:"Pollo asado",ab:"Pa",e:{vida:2,brasa:1},crafted:1,food:6,d:"Lo que más llena."},
  metal:{n:"Metal arcano",ab:"Ma",e:{metal:3,energia:2},crafted:1,d:"Hierro templado en esencia. Para el mejor pico."},
  pico_arcano:{n:"Pico de metal arcano",ab:"P4",e:{metal:3,energia:2,orden:1},crafted:1,tool:4,d:"El más rápido: corta la roca como si fuera tierra."},
  varita:{n:"Varita de éter",ab:"Va",e:{orden:2,energia:2,metal:1},crafted:1,d:"Lanza el foco elegido con la vis del aura (R; V cambia de foco)."},
  foco_chispa:{n:"Foco de chispa",ab:"Fc",e:{brasa:3,energia:2},crafted:1,focus:{cost:4,n:"Chispa"},d:"Un rayo que daña a las criaturas a distancia. 4 de vis."},
  foco_excava:{n:"Foco de excavación",ab:"Fe",e:{roca:3,orden:2},crafted:1,focus:{cost:3,n:"Excavación"},d:"Rompe bloques lejanos como un pico de hierro. 3 de vis."},
  foco_luz:{n:"Foco de luz",ab:"Fl",e:{luz:3,cefiro:2},crafted:1,focus:{cost:5,n:"Luz"},d:"Deja un orbe de luz donde apuntas. 5 de vis."},
  gafas:{n:"Gafas de revelación",ab:"Ga",e:{orden:2,luz:2,metal:1},crafted:1,d:"Muestran las esencias de lo que miras."},
  nucleo:{n:"Núcleo naranja",ab:"Nn",e:{energia:5,luz:4,orden:4},crafted:1,d:"Lo suelta la Mascota de Claude. Disuelto en el crisol rinde mucha esencia."},
  pollo:{n:"Pollo crudo",ab:"Po",e:{vida:2},food:2,d:"Lo sueltan las gallinas. Mejor asado en el horno."},
  manzana:{n:"Manzana",ab:"Mz",e:{vida:2,marea:1},food:4,d:"A veces cae de las hojas."},
  polvo:{n:"Polvo de luz",ab:"Pz",e:{luz:3,cefiro:1},d:"Lo sueltan las polillas de luz que salen de noche."},
  ...Object.fromEntries(["marea","brasa","roca","cefiro","orden","caos"].map(e=>["cr_"+e,{n:"Cristal de "+ESS[e].n,ab:"C"+e[0],e:{[e]:2},crystal:1,d:"Vis cristalizada. Crece en las cuevas y lo sueltan los fuegos fatuos; se usa en la mesa arcana."}])),
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
// Mesa de trabajo y horno. "#id" es un bloque (de S.bl, los que se ponen); lo demás, objetos de la mochila.
const MESA = [
  {out:"#24",n:4,in:{"#6":1}}, {out:"palo",n:4,in:{"#24":2}}, {out:"#25",n:4,in:{carbon:1,palo:1}},
  {out:"pico_madera",in:{"#24":3,palo:2}}, {out:"pico_piedra",in:{piedra:3,palo:2}}, {out:"pico_hierro",in:{lingote:3,palo:2}},
  {out:"pan",in:{semilla:3}}
];
const HORNO = [{in:"hierro",out:"lingote"},{in:"pollo",out:"pollo_asado"},{in:"#6",out:"carbon"}];
const FUEL = [["#24",1.5],["palo",.5],["#6",1.5],["carbon",8]]; // fundiciones que da cada combustible, en el orden en que se gastan
const TOOLS = ["","pico_madera","pico_piedra","pico_hierro","pico_arcano"];
const CRU = [
  {id:"sal",cat:"cuarzo",cost:{orden:4,marea:4}}, {id:"tiza",cat:"piedra",cost:{orden:3,roca:3}},
  {id:"laton",cat:"hierro",cost:{orden:4,energia:2}}, {id:"vela",cat:"ambar",cost:{orden:3,luz:3}},
  {id:"vial",cat:"agua",cost:{cefiro:5,vacio:2}}, {id:"fenix",cat:"carbon",cost:{brasa:5,vida:4}},
  {id:"metal",cat:"lingote",cost:{metal:3,energia:3}}
];
// Mesa arcana (sección de la mesa de trabajo): objetos + cristales + vis del aura; hay que investigarlas (ess: con qué resuenan)
const ARC = [
  {id:"varita",in:{laton:2,palo:1,cr_orden:1,cr_brasa:1},vis:20,ess:["orden","brasa","metal"]},
  {id:"foco_chispa",in:{cuarzo:1,cr_brasa:2,cr_cefiro:1},vis:15,ess:["brasa","cefiro","energia"]},
  {id:"foco_excava",in:{cuarzo:1,cr_roca:2,cr_orden:1},vis:15,ess:["roca","orden","metal"]},
  {id:"foco_luz",in:{cuarzo:1,cr_cefiro:1,polvo:2},vis:10,ess:["cefiro","luz","orden"]},
  {id:"gafas",in:{laton:2,cuarzo:2,cr_orden:1},vis:10,ess:["orden","luz","metal"]},
  {id:"pico_arcano",in:{metal:3,palo:2,cr_roca:1,cr_orden:1},vis:25,ess:["metal","energia","orden","roca"],big:1}
];
const INF = [
  {id:"lente",center:"cuarzo",peds:["laton","ambar"],cost:{luz:5,orden:4}},
  {id:"amuleto",center:"laton",peds:["sal","tiza"],cost:{orden:6,vida:4}},
  {id:"corazon",center:"vial",peds:["laton","fenix","tiza","vela"],cost:{energia:6,vacio:4,luz:5,vida:5},final:1}
];
