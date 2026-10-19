# Crisol de Éter

Juego de alquimia en un mundo de bloques en primera persona, estilo Minecraft, inspirado en las mecánicas de mods de magia como Thaumcraft (con nombres, esencias y arte propios).

Pica recursos, escanéalos para descubrir sus esencias, disuélvelos en el crisol, forja objetos en el altar de infusión y controla el flux. La meta es forjar el **Corazón de Éter**.

Corre en el navegador con [three.js r128](https://threejs.org/) desde CDN. No necesita build ni dependencias.

## Ejecutar

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Generar un único archivo

```bash
python3 tools/build.py   # → dist/crisol-de-eter.html
```

## Controles

| PC | Celular | Acción |
|---|---|---|
| WASD + ratón | Joystick + arrastrar | Moverse y mirar |
| Espacio | Saltar (o salto automático) | Saltar / nadar |
| Clic izquierdo (mantener) | Picar (mantener) | Romper bloque |
| Clic derecho / E | Usar | Crisol, altar, estantería, recoger agua |
| F | Escanear | Ver esencias del bloque |
| I / G | Mochila / Grimorio | Paneles |

## Estructura

```
index.html        Marcado del HUD y paneles; carga css y js en orden
css/style.css     Estilos (tokens de color y tipografía en :root)
js/data.js        Esencias, objetos, recetas del crisol e infusiones
js/state.js       Estado guardado (localStorage), utilidades, iconos pixelados, mecánicas
js/textures.js    Atlas de texturas procedurales 16×16 y tabla de bloques
js/world.js       Generación del mundo 48×28×48
js/render.js      Escena: cielo, nubes, mallado con oclusión ambiental, taller, partículas, brazo, drops
js/player.js      Jugador, física, raycast, picar/usar/escanear, infusión
js/ui.js          HUD, paneles y controles
js/main.js        Bucle principal
tools/build.py    Empaqueta todo en un único HTML
```
