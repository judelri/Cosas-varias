# Crisol de Éter

Juego de alquimia en un mundo de bloques en primera persona, estilo Minecraft, inspirado en las mecánicas de mods de magia como Thaumcraft (con nombres, esencias y arte propios).

Empiezas a mano, como en Minecraft: picas troncos, fabricas herramientas, sobrevives a la noche con antorchas y comida, y bajas a las cuevas por menas y cristales. Como en Thaumcraft: escaneas lo que encuentras para descubrir sus esencias, investigas recetas, disuelves materiales en el crisol, fabricas con la vis del aura en la mesa arcana, lanzas focos con una varita, forjas en el altar de infusión y controlas el flux. La meta es forjar el **Corazón de Éter**.

Corre en el navegador con [three.js r128](https://threejs.org/), incluido en `js/vendor/`. **Funciona sin internet**: las tipografías también van en la carpeta. No necesita build ni dependencias.

## Cómo se juega

**Supervivencia (como Minecraft)**
- 10 corazones y 10 de comida. La comida baja con el tiempo y al saltar, picar y pelear; llena te cura, vacía te quita
  vida. Caer de más de 3 bloques duele. Al caer reapareces en el taller **con todo lo que llevabas**.
- Comida: pollo crudo (gallinas), manzanas (hojas), pan (3 semillas en la mesa) y pollo asado (horno). Come con C,
  desde la mochila o tocando los corazones.
- Luz por bloque: de noche y en las cuevas está oscuro, las antorchas iluminan y las sombras solo nacen en la oscuridad.

**Herramientas y fabricación**
- Mesa de trabajo (en el taller): tronco → 4 tablones → palos → picos de madera, piedra y hierro; antorchas; pan.
- Horno: mena de hierro → lingote, pollo crudo → asado, tronco → carbón. Quema tablones, palos, troncos o carbón.
- Cada bloque pide un pico mínimo: roca y carbón (madera), hierro, cuarzo y piedra chispa (piedra), obsidiana (hierro).
  Sin él se pica lento y no suelta nada. Mejores picos son más rápidos y pegan más fuerte.

**Alquimia y magia (como Thaumcraft, con nombres propios)**
- Escanea (F) para conocer las esencias; investiga recetas en la estantería (cuesta una pluma, es un acertijo de esencias).
- Crisol: disuelve materiales y cataliza objetos (sal, tiza, latón arcano, velas, vial, brasa viva, metal arcano).
- Aura de vis (barra celeste): se recarga sola. Los cristales de las seis esencias primales crecen en las cuevas y los
  sueltan los fuegos fatuos.
- Mesa arcana (en la mesa de trabajo): varita de éter, focos de chispa, excavación y luz, gafas de revelación y pico de
  metal arcano. Piden cristales y vis.
- Varita: R lanza el foco, V lo cambia. Chispa daña a distancia, Excavación rompe bloques lejos, Luz deja orbes de luz.
- Altar de infusión: lente, amuleto y el Corazón de Éter. Las velas lo estabilizan.
- Flux: sube con el desorden (crisol desbordado, Grieta, infusiones fallidas, varita). Con 50 o más, la bruma corrompe
  objetos, el suelo corrupto se extiende desde la Grieta y salen más sombras; a 100 se abre una grieta. La sal purificadora lo baja.

## Criaturas

- **Gallinas** en los prados: sueltan plumas, pollo crudo y a veces semillas. Huyen si las golpeas.
- **Polillas de luz**, solo de noche: revolotean brillando y sueltan **Polvo de luz** (Luz y Céfiro).
- **Fuegos fatuos** de las seis esencias primales, en cuevas, montaña y Grieta: sueltan su cristal.
- **Sombras de bruma**, hostiles: nacen en la oscuridad (cuevas, la noche lejos de las antorchas, o flux alto). Te
  persiguen y golpean; cuatro golpes las deshacen. No entran al taller y el sol las disuelve.
- **Mini jefe: la Mascota de Claude.** Algunas noches ronda cerca de la montaña o la Grieta, con barra de jefe arriba.
  Avanza a saltitos, da grandes saltos con onda de choque y a media vida se enoja y llama a tres mascotitas. Suelta el
  **Núcleo naranja** (mucha esencia de Energía, Luz y Orden), cristales y pollo asado.

Se golpean apuntando y picando (a mano o madera quitas 1, piedra o hierro 2, metal arcano 3); escanear una criatura
muestra lo que suelta.

## Ejecutar

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Jugar en equipo (misma Wi-Fi)

Uno de los equipos de la red corre el servidor (solo necesita Python 3, sin instalar nada):

```bash
python3 tools/servidor.py          # en Windows: python tools\servidor.py
```

Muestra dos direcciones: `http://localhost:8000` para ese mismo equipo y otra como `http://192.168.1.20:8000`
para los demás. Cada uno la abre en su navegador (PC o celular) conectado a la misma Wi-Fi, elige su nombre y listo.
Si el sistema pregunta si permite conexiones entrantes para Python, hay que aceptar.

- Juegan **en equipo**: comparten el mundo, la mochila, los bloques, el crisol, el flux, las recetas investigadas y la hora del día.
  Cada uno ve a los demás como un personaje con su nombre y color, y le llegan avisos de lo que forjan o descubren.
  Las criaturas también son las mismas para todos.
- La partida se guarda en `partida-equipo.json`, en el equipo del servidor. `python3 tools/servidor.py --nueva` empieza de cero;
  `python3 tools/servidor.py 8080` usa otro puerto.
- Si se corta la conexión, el juego reintenta solo. La partida de un jugador (abriendo `index.html` directamente) no se toca.

## Generar un único archivo

```bash
python3 tools/build.py   # → dist/crisol-de-eter.html (con three.js y las tipografías dentro)
```

## Controles

| PC | Celular | Acción |
|---|---|---|
| WASD + ratón | Joystick + arrastrar | Moverse y mirar |
| Espacio | Saltar (o salto automático) | Saltar / nadar |
| Clic izquierdo (mantener) | Picar (mantener) | Romper bloque / golpear criatura |
| Clic derecho / E (mantener) | Usar (mantener) | Crisol, altar, estantería, recoger agua o poner el bloque elegido |
| 1–9 / rueda | Tocar la barra | Elegir bloque |
| F | Escanear | Ver esencias del bloque |
| I / G | Mochila / Grimorio | Paneles |
| Esc / E (o la misma I / G) | × del panel | Cerrar el panel |
| M | Botón del altavoz | Sonido sí / no |
| C | Tocar los corazones | Comer |
| R / V | Lanzar / tocar el foco | Varita: lanzar el foco / cambiar de foco |

## Estructura

```
index.html        Marcado del HUD y paneles; carga css y js en orden
css/style.css     Estilos (tokens de color y tipografía en :root, @font-face locales)
fonts/            Tipografías recortadas a caracteres latinos (woff) y sus licencias OFL
js/data.js        Esencias, objetos, recetas del crisol e infusiones
js/state.js       Estado guardado (localStorage), utilidades, iconos pixelados, mecánicas e investigación
js/audio.js       Sonido sintetizado con Web Audio: efectos y ambiente de día y de noche
js/textures.js    Atlas de texturas procedurales 16×16, tabla de bloques e iconos de bloque
js/light.js       Luz por celda (cielo y bloques) e iluminación suave del terreno
js/world.js       Generación del mundo 48×28×48 (con cuevas, cristales, mesa y horno)
js/render.js      Escena: cielo con día y noche, sol, luna, estrellas, nubes, mallado con oclusión ambiental, taller, partículas, brazo, drops
js/player.js      Jugador, física, raycast, picar/poner/usar/escanear, infusión
js/ui.js          HUD, paneles y controles
js/equipo.js      Interruptor del modo equipo (el servidor lo sirve con EQUIPO=true)
js/net.js         Partida en equipo: sincroniza con el servidor y dibuja a los compañeros
js/mobs.js        Criaturas: modelos, comportamiento, golpes, botín y sincronización en equipo
js/main.js        Bucle principal
js/vendor/        three.js r128 (licencia MIT)
tools/build.py    Empaqueta todo en un único HTML (de un jugador)
tools/servidor.py Servidor para jugar en equipo en la red local
```
