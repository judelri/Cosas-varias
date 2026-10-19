# CLAUDE.md — Crisol de Éter

Juego de vóxeles estilo Minecraft con alquimia inspirada en Thaumcraft. Todo es web estático: HTML + CSS + JS clásico, three.js r128 por CDN. Interfaz y textos del juego en **español**.

## Reglas del proyecto

- **Sin build ni módulos ES.** Los archivos de `js/` son scripts clásicos que comparten el ámbito global y se cargan en el orden de `index.html` (data → state → textures → world → render → player → ui → main). Si agregas un archivo, añádelo a `index.html` en el lugar correcto. Así funciona también abriendo `index.html` con `file://`.
- **Nada de assets externos.** Texturas, iconos de objetos, pico y grietas se dibujan en canvas por código (`js/textures.js`, `js/state.js`, `js/render.js`). Mantén ese enfoque: píxeles 16×16, `NearestFilter`.
- **No usar nombres ni arte de Thaumcraft** (Thaumonomicon, Aqua/Ignis, etc.). Esencias, objetos y recetas son originales.
- three.js está fijado en **r128** (UMD, `THREE` global). No subir de versión sin revisar `BufferGeometry`, `Sprite` y materiales.
- Debe funcionar en **celular** (joystick y botones táctiles) y en **PC** (pointer lock).

## Mapa del código

- `js/data.js`: `ESS` (11 esencias: 6 primales, 5 compuestas con `from`), `ITEMS` (`e` = esencias que libera), `CRU` (recetas del crisol: catalizador + esencias), `INF` (infusiones: centro, pedestales, costo).
- `js/state.js`: `S` es el estado guardado en `localStorage` con la clave `crisol-eter-3d-v1` (inventario, escaneados, crisol, flux, cambios del mundo `S.world`, reapariciones `S.resp`, posición). Iconos pixelados en `ICONC` (canvas) e `ICON` (dataURL). `scanItems()` muestra la tarjeta de escaneo. `addFlux()` y `rift()` controlan el flux.
- `js/textures.js`: atlas de una fila (`TILES`, `TI`) y tabla `B` de bloques por id. Flags de bloque: `drop`, `hard` (segundos para picar), `resp` (reaparece en 60 s), `flux`, `unbreak`, `use` (abre panel), `custom` (se dibuja aparte), `water`, `leaves`, `plant` (cruz, sin colisión).
- `js/world.js`: mundo `W×H×D = 48×28×48` en `Uint8Array`, `getB()` devuelve `-1` fuera del mundo y `3` bajo y=0. Zonas: taller (centro), río (oeste), bosque (sur), montaña con menas (noreste), grieta (sureste). Generación determinista (semilla fija `wr()`); los cambios del jugador se reaplican desde `S.world`.
- `js/render.js`: chunks de 16×16 con tres mallas (sólido con alphaTest, agua transparente, plantas a doble cara). Luz por cara al estilo Minecraft (arriba 1, Z 0.8, X 0.6, abajo 0.5) × oclusión ambiental por vértice (`vao`). Cielo en degradado que se tiñe con el flux (`paintSky`), sol, nubes, crisol y altar como mallas propias, partículas (`spawn`, `burst`), grietas de 10 etapas, brazo con pico (`armG`) y drops (`spawnDrop`).
- `js/player.js`: física AABB con salto automático, `raycast()` DDA, `breakBlock`, `doUse`, `doScan` e `infuse` (6 pulsos con eventos según inestabilidad).
- `js/ui.js`: `hud()`, `openPanel(name)` / `renderPanel()` (mochila, crisol, altar, grimorio, help, win) y controles (teclado, ratón con pointer lock, joystick y botones táctiles).
- `js/main.js`: `frame()`: movimiento, cámara, minado, reapariciones, corrupción por bruma, cielo, brazo y partículas.

## Cómo probar

- `python3 -m http.server 8000` y abrir `http://localhost:8000`. Revisa la consola: debe quedar sin errores.
- Para pruebas automáticas, Playwright con Chromium y `--use-gl=swiftshader` renderiza WebGL sin GPU. Las funciones globales (`give`, `scanItems`, `openPanel`, `P`) permiten preparar escenarios desde `page.evaluate`.
- Para reiniciar la partida: Grimorio → «Empezar de nuevo», o borra `localStorage`.

## Ideas pendientes

- Minijuego de investigación (combinar esencias para desbloquear recetas).
- Golems que automaticen recolección.
- Colocar bloques, ciclo día/noche, sonido.
