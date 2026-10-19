# CLAUDE.md — Crisol de Éter

Juego de vóxeles estilo Minecraft con alquimia inspirada en Thaumcraft. Todo es web estático: HTML + CSS + JS clásico, three.js r128 incluido en `js/vendor/`. Funciona sin internet. Interfaz y textos del juego en **español**.

## Reglas del proyecto

- **Sin build ni módulos ES.** Los archivos de `js/` son scripts clásicos que comparten el ámbito global y se cargan en el orden de `index.html` (vendor/three → data → state → audio → textures → world → render → player → ui → main). Si agregas un archivo, añádelo a `index.html` en el lugar correcto. Así funciona también abriendo `index.html` con `file://`.
- **Nada de assets externos ni peticiones a internet.** Texturas, iconos de objetos y bloques, pico y grietas se dibujan en canvas por código (`js/textures.js`, `js/state.js`, `js/render.js`); los sonidos se sintetizan con Web Audio (`js/audio.js`). Mantén ese enfoque: píxeles 16×16, `NearestFilter`. Lo único binario son three.js (`js/vendor/`) y las tipografías (`fonts/`, OFL, recortadas a caracteres latinos con fonttools: si usas un carácter fuera de latín básico, latín-1 o la puntuación general, agrégalo al recorte).
- **No usar nombres ni arte de Thaumcraft** (Thaumonomicon, Aqua/Ignis, etc.). Esencias, objetos y recetas son originales.
- three.js está fijado en **r128** (UMD, `THREE` global). No subir de versión sin revisar `BufferGeometry`, `Sprite` y materiales.
- Debe funcionar en **celular** (joystick y botones táctiles) y en **PC** (pointer lock).

## Mapa del código

- `js/data.js`: `ESS` (11 esencias: 6 primales, 5 compuestas con `from`), `ITEMS` (`e` = esencias que libera), `CRU` (recetas del crisol: catalizador + esencias), `INF` (infusiones: centro, pedestales, costo).
- `js/state.js`: `S` es el estado guardado en `localStorage` con la clave `crisol-eter-3d-v1` (inventario, escaneados, crisol, flux, cambios del mundo `S.world`, reapariciones `S.resp`, posición, bloques para poner `S.bl` / `S.sel`, bloques puestos `S.placed`, hora `S.time`, sonido `S.mute`, recetas investigadas `S.res` e investigación en curso `S.rsch`). Al cargar se limpian cantidades rotas y lo ya forjado queda investigado. Iconos pixelados en `ICONC` (canvas) e `ICON` (dataURL). `scanItems()` muestra la tarjeta de escaneo. `addFlux()` y `rift()` controlan el flux. Investigación: `resPool()` (esencias con las que resuena una receta), `startResearch()` (gasta una Pluma), `guessResearch()` (respuesta tipo Wordle con `resFeedback()`: 2 en su lugar, 1 en otro lugar, 0 no está). `canCat()` y `canInfuse()` exigen la receta investigada.
- `js/audio.js`: `AC` (AudioContext creado con el primer gesto), `sfx(nombre, ...)` con los efectos de `SFX`, timbre por material (`MAT`, según `B[id].m`), `ambient()` (pájaros, grillos, burbujas del crisol), `setMute()`.
- `js/textures.js`: atlas de una fila (`TILES`, `TI`) y tabla `B` de bloques por id. Flags de bloque: `drop`, `hard` (segundos para picar), `resp` (reaparece en 60 s), `flux`, `unbreak`, `use` (abre panel), `custom` (se dibuja aparte), `water`, `leaves`, `plant` (cruz, sin colisión), `bl` (bloque que te llevas para ponerlo), `m` (material para el sonido). `BICON` / `bicon()`: iconos isométricos de los bloques que se pueden poner.
- `js/world.js`: mundo `W×H×D = 48×28×48` en `Uint8Array`, `getB()` devuelve `-1` fuera del mundo y `3` bajo y=0. Zonas: taller (centro), río (oeste), bosque (sur), montaña con menas (noreste), grieta (sureste). Generación determinista (semilla fija `wr()`); los cambios del jugador se reaplican desde `S.world`.
- `js/render.js`: chunks de 16×16 con tres mallas (sólido con alphaTest, agua transparente, plantas a doble cara). Luz por cara al estilo Minecraft (arriba 1, Z 0.8, X 0.6, abajo 0.5) × oclusión ambiental por vértice (`vao`). Cielo en degradado que se tiñe con la hora y el flux (`updateSky`, `paintSky`), sol y luna que giran con `S.time`, estrellas, `daylight` (0 noche, 1 día) que oscurece los materiales de `worldMats`, `dayPart()`, nubes, crisol y altar como mallas propias, partículas (`spawn`, `burst`), grietas de 10 etapas, brazo con pico (`armG`) y drops (`spawnDrop`).
- `js/player.js`: física AABB con salto automático, `inBody()`, `raycast()` DDA (devuelve también la celda anterior `px,py,pz`, donde se pone un bloque), `breakBlock` (un bloque puesto solo devuelve el bloque; de noche la Grieta da doble), `placeBlock`, `doUse`, `doScan` e `infuse` (6 pulsos con eventos según inestabilidad; al final vuelve a comprobar objetos y esencia).
- `js/ui.js`: `hud()` (barra con bloques elegibles y objetos, hora, botón de sonido), `openPanel(name)` / `renderPanel()` (mochila, crisol, altar, investigar, grimorio, help, win) y controles (teclado, ratón con pointer lock, rueda, joystick y botones táctiles; mantener Usar pone bloques seguidos).
- `js/main.js`: `frame()`: movimiento, cámara, minado, reapariciones, corrupción por bruma, hora del día (`DAY_LEN`, la noche corre al doble), cielo, sonido de pasos y ambiente, brazo y partículas. Guarda al ocultar o cerrar la pestaña (`persist`).

## Cómo probar

- `python3 -m http.server 8000` y abrir `http://localhost:8000`. Revisa la consola: debe quedar sin errores.
- Para pruebas automáticas, Playwright con Chromium y `--use-gl=swiftshader` renderiza WebGL sin GPU. Las funciones globales (`give`, `scanItems`, `openPanel`, `P`, `S.bl`, `S.time` + `updateSky()`, `startResearch`) permiten preparar escenarios desde `page.evaluate`. Conviene bloquear toda petición que no sea a localhost para comprobar que sigue funcionando sin internet.
- Para reiniciar la partida: Grimorio → «Empezar de nuevo», o borra `localStorage`.

## Ideas pendientes

- Golems que automaticen recolección.
- Antorchas o luz alrededor del taller por la noche.
- Música de fondo.
