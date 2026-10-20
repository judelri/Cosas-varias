# Comparador de archivos y carpetas

Una sola página HTML (`comparador.html`) que funciona como WinMerge, pero sin límite de dos o tres:
compara **muchos archivos o muchas carpetas a la vez** (5, 10 o más), cada uno en su panel o columna.
Pliega el código como Notepad++ y saca valores `<palabra>valor</palabra>` de todos los archivos
a una tabla tipo Excel. No hace falta instalar nada: se abre con doble clic en Chrome, Edge o Firefox
y funciona sin internet.

## Cómo se usa

1. En **Inicio**, añade archivos o carpetas (botones o arrastrándolos a la ventana). El primero
   es la base (A) contra la que se marcan las diferencias; se puede cambiar después.
2. **Comparar** (Ctrl+Intro). Cada comparación se abre en su pestaña, como en WinMerge.
3. **Ejemplo** carga tres versiones de un archivo de código o tres carpetas para probarlo.

## Comparar archivos (N paneles)

- Paneles lado a lado con desplazamiento sincronizado, números de línea y un mapa de diferencias
  a la derecha (clic para ir). Amarillo = línea cambiada, verde = agregada, rayado = falta.
  Dentro de la línea se resalta lo que cambió, por palabras o por caracteres.
- Ir a la diferencia siguiente o anterior (Alt+↓ / Alt+↑), primera y última (Alt+Inicio / Alt+Fin).
- **Copiar** la diferencia del panel activo al de la izquierda o derecha (Alt+← / Alt+→) o a todos.
- **Editar**: doble clic o F2 en una línea; clic derecho para insertar o borrar líneas.
  Deshacer y rehacer (Ctrl+Z / Ctrl+Y).
- **Solo diferencias**: oculta lo igual y deja unas líneas de contexto.
- **Buscar** (Ctrl+F, F3 siguiente).
- Archivos binarios: se comparan en vista hexadecimal (solo lectura).

## Plegado de código (como Notepad++)

- Los cuadritos ⊟ / ⊞ del margen pliegan y despliegan bloques, con las líneas que los unen.
  Un bloque plegado se oculta en todos los paneles a la vez para que sigan alineados.
- Alt+0 pliega todo, Alt+Mayús+0 despliega todo. Alt+1…8 pliega ese nivel (con Mayús lo despliega).
  Ctrl+Alt+F pliega el bloque donde está el cursor (con Mayús lo despliega).
- Detecta los bloques según la extensión: llaves `{ }` y `[ ]` (C, C#, Java, JS, JSON, CSS, PHP…,
  también `#region`), sangría (Python, YAML), etiquetas (XML, HTML, XAML, config…) y títulos
  (Markdown, INI). Se puede forzar en Opciones.

## Comparar carpetas (N columnas)

- Árbol o lista plana con una columna por carpeta: tamaño, fecha y un número de contenido.
  Los que tienen el mismo número son iguales; así con 5 carpetas se ve qué versiones coinciden.
- Estados: Idénticos, Distintos (o «N versiones»), Falta en B, Solo en C. Filtros por estado y por nombre.
- Doble clic en un archivo lo abre comparado en todas las carpetas que lo tienen. Con varios
  seleccionados (Ctrl/Mayús), Intro abre una pestaña para cada uno.
- **Copiar…** archivos de una carpeta a otras (Chrome o Edge, con carpetas añadidas con «Añadir carpeta»).
- **Exportar** el resultado a CSV para Excel.
- Métodos: por contenido (aplica las opciones de texto), por tamaño y fecha (rápido) o solo tamaño.
  Excluye por defecto `.git`, `node_modules` y similares; se cambia en Opciones.

## Extraer valores (tipo Excel)

Escribe la palabra de la etiqueta (por ejemplo `precio`) y saca lo que haya entre `<precio>` y
`</precio>` (o `<precio>` de cierre) en **todos** los archivos: los de una comparación de carpetas,
los paneles abiertos o directamente los elementos de Inicio, sin comparar.

- Sale en una hoja con filas y columnas como Excel: una fila por valor, hacia abajo. Varias palabras a la vez
  separadas por `;` (`precio;stock;total`), cada una en su columna.
- En amarillo los valores de un mismo archivo que cambian entre carpetas o paneles.
- Abajo, el resumen: cuántos valores, cuántos distintos y, si son números, suma, promedio, mínimo y máximo.
- **Copiar para Excel** (se pega con Ctrl+V) o **Exportar CSV**.

## Opciones de comparación

Ignorar espacios (cambios de cantidad o todos), mayúsculas, el tipo de fin de línea (Windows/Unix)
y líneas en blanco. Se recuerdan en el navegador.

## Guardar

- En Chrome y Edge, los archivos abiertos con los botones o arrastrados se guardan **en el
  archivo original** (el navegador pide permiso la primera vez). Se respeta la codificación (UTF-8,
  con o sin BOM, ANSI/Windows-1252, UTF-16) y el fin de línea de cada archivo.
- En Firefox, o con texto pegado, se descarga una copia con el mismo nombre.

## Límites

- Un navegador lee los archivos uno a uno: comparar por contenido miles de archivos tarda unos
  segundos (para ir rápido, usa «Tamaño y fecha»).
- La vista hexadecimal muestra hasta 8 MB por archivo; «Extraer valores» se salta archivos de más de 64 MB.
- No hay comparación de imágenes ni fusión automática de tres vías.
