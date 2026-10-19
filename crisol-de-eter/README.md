# Crisol de Éter

Juego de alquimia en un mundo de bloques en primera persona, estilo Minecraft, inspirado en las mecánicas de mods de magia como Thaumcraft (con nombres, esencias y arte propios).

Pica recursos, escanéalos para descubrir sus esencias, investiga las recetas en la estantería, disuélvelos en el crisol, forja objetos en el altar de infusión y controla el flux. La meta es forjar el **Corazón de Éter**. También puedes construir con los bloques que picas, y el mundo tiene día y noche y sonido.

Corre en el navegador con [three.js r128](https://threejs.org/), incluido en `js/vendor/`. **Funciona sin internet**: las tipografías también van en la carpeta. No necesita build ni dependencias.

## Criaturas

- **Gallinas** en los prados: sueltan plumas (para investigar) y a veces semillas. Huyen si las golpeas.
- **Polillas de luz**, solo de noche: revolotean brillando y sueltan **Polvo de luz** (Luz y Céfiro).
- **Sombras de bruma**, hostiles: salen de noche cerca de la Grieta y, con el flux en 50 o más, también de día.
  Te persiguen; si te alcanzan se llevan un material de la mochila, suben el flux y se deshacen. Cuatro golpes las
  deshacen antes. No entran al taller (es un refugio) y se disuelven al amanecer.

Se golpean apuntando y picando; escanear una criatura muestra lo que suelta.

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
js/equipo.js      Interruptor del modo equipo (el servidor lo sirve con EQUIPO=true)
js/net.js         Partida en equipo: sincroniza con el servidor y dibuja a los compañeros
js/mobs.js        Criaturas: modelos, comportamiento, golpes, botín y sincronización en equipo
js/main.js        Bucle principal
js/vendor/        three.js r128 (licencia MIT)
tools/build.py    Empaqueta todo en un único HTML (de un jugador)
tools/servidor.py Servidor para jugar en equipo en la red local
```
