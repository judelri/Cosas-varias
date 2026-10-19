# Crisol de Éter

Juego de alquimia en un mundo de bloques en primera persona, estilo Minecraft, inspirado en las mecánicas de mods de magia como Thaumcraft (con nombres, esencias y arte propios).

Pica recursos, escanéalos para descubrir sus esencias, investiga las recetas en la estantería, disuélvelos en el crisol, forja objetos en el altar de infusión y controla el flux. La meta es forjar el **Corazón de Éter**. También puedes construir con los bloques que picas, y el mundo tiene día y noche y sonido.

Corre en el navegador con [three.js r128](https://threejs.org/), incluido en `js/vendor/`. **Funciona sin internet**: las tipografías también van en la carpeta. No necesita build ni dependencias.

## Ejecutar

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Generar un único archivo

```bash
python3 tools/build.py   # → dist/crisol-de-eter.html (con three.js y las tipografías dentro)
```

## Controles

| PC | Celular | Acción |
|---|---|---|
| WASD + ratón | Joystick + arrastrar | Moverse y mirar |
| Espacio | Saltar (o salto automático) | Saltar / nadar |
| Clic izquierdo (mantener) | Picar (mantener) | Romper bloque |
| Clic derecho / E (mantener) | Usar (mantener) | Crisol, altar, estantería, recoger agua o poner el bloque elegido |
| 1–9 / rueda | Tocar la barra | Elegir bloque |
| F | Escanear | Ver esencias del bloque |
| I / G | Mochila / Grimorio | Paneles |
| Esc / E (o la misma I / G) | × del panel | Cerrar el panel |
| M | Botón del altavoz | Sonido sí / no |

## Estructura

```
index.html        Marcado del HUD y paneles; carga css y js en orden
css/style.css     Estilos (tokens de color y tipografía en :root, @font-face locales)
fonts/            Tipografías recortadas a caracteres latinos (woff) y sus licencias OFL
js/data.js        Esencias, objetos, recetas del crisol e infusiones
js/state.js       Estado guardado (localStorage), utilidades, iconos pixelados, mecánicas e investigación
js/audio.js       Sonido sintetizado con Web Audio: efectos y ambiente de día y de noche
js/textures.js    Atlas de texturas procedurales 16×16, tabla de bloques e iconos de bloque
js/world.js       Generación del mundo 48×28×48
js/render.js      Escena: cielo con día y noche, sol, luna, estrellas, nubes, mallado con oclusión ambiental, taller, partículas, brazo, drops
js/player.js      Jugador, física, raycast, picar/poner/usar/escanear, infusión
js/ui.js          HUD, paneles y controles
js/main.js        Bucle principal
js/vendor/        three.js r128 (licencia MIT)
tools/build.py    Empaqueta todo en un único HTML
```
