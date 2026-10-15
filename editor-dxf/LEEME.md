# Editor DXF ligero

Una sola página HTML (`editor_dxf.html`) para cambios básicos en planos DXF: mover, girar, copiar y
borrar entidades y dibujar líneas simples, con el mismo estilo que el Generador de Dashboard.
No hace falta instalar nada: se abre con doble clic en Chrome, Edge o Firefox y funciona sin internet.

## Qué hace

- Abre DXF de texto (R12 a 2018). Dibuja líneas, polilíneas (con arcos), círculos, arcos, elipses,
  splines, textos, bloques con atributos, sombreados, sólidos y cotas.
- **Mover**: arrastrando lo seleccionado (con referencia a extremos/centros/inserciones y Orto),
  con ΔX/ΔY exactos, llevando el punto base a una X, Y, o con las flechas del teclado.
- **Girar**: 90° a izquierda o derecha (R / Mayús+R), un ángulo cualquiera, o escribiendo la rotación
  exacta de un bloque o texto. Cada bloque gira sobre su punto de inserción, o todo el grupo sobre su centro.
- **Línea** (L): clic en cada punto, con referencia y Orto. Para un largo exacto se apunta en la
  dirección, se escribe el número y Enter. Se elige la capa donde se crean.
- **Copiar** con desplazamiento y **Borrar**. Deshacer y rehacer (Ctrl+Z / Ctrl+Y).
- Capas: ocultar, bloquear y seleccionar todo lo de una capa. Fondo del plano claro u oscuro.
- **Guardar** crea `<nombre>_editado.dxf`.

## Cómo guarda

El archivo se escribe tal como vino, byte a byte. Solo cambian los valores de coordenadas de
las entidades movidas o giradas (y, si un bloque o texto no traía su rotación, se le agrega); las
copias y líneas nuevas se agregan al final de las entidades con identificadores nuevos
(y se actualiza `$HANDSEED`). Capas, estilos, bloques, presentaciones, datos extendidos y todo lo
demás quedan intactos, así que AutoCAD, BricsCAD o el Dashboard LGV lo abren igual que el original.

## Límites

- Solo crea líneas; no dibuja otras entidades ni escala.
- Las cotas, sólidos 3D y regiones se muestran pero no se mueven.
- No lee DWG ni DXF binario: desde el CAD, "Guardar como" → "AutoCAD DXF (*.dxf)".
