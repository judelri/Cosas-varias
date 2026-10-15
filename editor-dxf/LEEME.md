# Editor DXF ligero

Una sola página HTML (`editor_dxf.html`) para cambios básicos en planos DXF: mover, copiar y borrar
entidades. No hace falta instalar nada: se abre con doble clic en Chrome, Edge o Firefox y funciona sin internet
(sin conexión solo cambia la tipografía).

## Qué hace

- Abre DXF de texto (R12 a 2018). Dibuja líneas, polilíneas (con arcos), círculos, arcos, elipses,
  splines, textos, bloques con atributos, sombreados, sólidos y cotas.
- **Mover**: arrastrando lo seleccionado (con referencia a extremos/centros/inserciones y Orto),
  con ΔX/ΔY exactos, llevando el punto base a una X, Y, o con las flechas del teclado.
- **Copiar** con desplazamiento y **Borrar**. Deshacer y rehacer (Ctrl+Z / Ctrl+Y).
- Capas: ocultar, bloquear y seleccionar todo lo de una capa.
- **Guardar** crea `<nombre>_editado.dxf`.

## Cómo guarda

El archivo se escribe tal como vino, byte a byte. Solo cambian los valores de coordenadas de
las entidades movidas; las copias se agregan al final de las entidades con identificadores nuevos
(y se actualiza `$HANDSEED`). Capas, estilos, bloques, presentaciones, datos extendidos y todo lo
demás quedan intactos, así que AutoCAD, BricsCAD o el Dashboard LGV lo abren igual que el original.

## Límites

- No dibuja ni crea entidades nuevas, ni gira o escala (por ahora).
- Las cotas, sólidos 3D y regiones se muestran pero no se mueven.
- No lee DWG ni DXF binario: desde el CAD, "Guardar como" → "AutoCAD DXF (*.dxf)".
