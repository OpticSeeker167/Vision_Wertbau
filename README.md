# Vision Wertbau

Editor de identidad visual para explorar los colores, las tipografías y las aplicaciones de WERTBAU en tiempo real. La plantilla toma como referencia las cinco láminas de `WERTBAU_01A_MAYUSCULAS.pdf`.

La aplicación es una web estática de HTML, CSS y JavaScript. Incluye sus tipografías y no requiere instalar paquetes de npm ni configurar un servidor de datos.

## Usar la web

**[Abrir Vision Wertbau](https://opticseeker167.github.io/Vision_Wertbau/)**

Podés usar el editor desde este enlace en el navegador. Las instrucciones siguientes son para ejecutar una copia local.

## Ejecutar una copia local

Requisito para el servidor local: **Node.js 20 o posterior**.

En Windows, abrí `INICIAR_VISION_WERTBAU.cmd`. También podés ejecutar, desde la carpeta del proyecto:

```powershell
npm start
```

Después abrí **http://localhost:4173**. Para cerrar el servidor, usá `Ctrl+C` en esa terminal. Si npm no está disponible pero sí Node, el comando equivalente es:

```powershell
node scripts/serve.mjs
```

El servidor escucha únicamente en el equipo local. Para usar otro puerto en PowerShell:

```powershell
$env:PORT = '4174'
npm start
```

Usá el servidor local para abrir la aplicación; abrir `dist/index.html` directamente como archivo puede impedir que el navegador cargue los módulos y las fuentes.

### Ubicación solicitada en Windows

Destino del proyecto:

```text
F:\Principal\Documentos\Proyectos\Programas\Vision Wertbau
```

Carpeta de la entrega gráfica que sirve como referencia:

```text
F:\Principal\Documentos\Proyectos\Portfolio\Wertbau
```

Estas rutas documentan las ubicaciones solicitadas. La aplicación no accede automáticamente al disco F: ni copia archivos entre carpetas.

## Cómo usar el editor

### Colores

El panel de identidad controla los colores **principal, secundario y terciario**. Podés seleccionar un color visualmente, escribir su código hexadecimal o probar una paleta predefinida. Los cambios se aplican a las superficies, los textos y los detalles asociados a cada rol.

La paleta inicial reproduce la referencia: grafito `#1A1D1C`, marfil `#F5F4EE` y óxido `#6F392C`.

### Fondos del frente y del dorso

En **Tarjetas**, los selectores **Fondos → Frente / Dorso** cambian cada cara de forma independiente y en tiempo real. En **Colores → Fondos de tarjetas** también podés escribir el HEX: para blanco y blanco, usá `#FFFFFF` en ambos campos.

Por defecto, el frente sigue el color secundario y el dorso el primario. Al elegir un color propio, esa cara deja de depender de la paleta; **Usar paleta** restaura el vínculo. La opción **Adaptar textos al fondo** conserva el color original cuando resulta legible y lo adapta cuando un fondo personalizado necesita más contraste. Podés desactivarla para conservar exactamente los colores de texto elegidos.

Los fondos y el ajuste de contraste se guardan en el proyecto, las variantes y el JSON; también se aplican a las miniaturas, el PDF y las variables CSS exportadas. No modifican los colores de las otras láminas.

### Tipografías

Cada jerarquía tiene su propia familia, peso y espaciado: principal para la marca, secundaria para lectura y terciaria para datos. El catálogo incluye **100 familias adicionales**, más **Inter y Cascadia Mono**, las dos familias de apoyo identificadas en el PDF: **102 familias y 203 archivos WOFF2** en total.

Las fuentes están incluidas en `dist/assets/fonts/` y se cargan cuando se necesitan. La interfaz muestra únicamente los pesos realmente disponibles para cada familia. El catálogo abarca sans serif, serif, monoespaciadas y display.

La tipografía principal inicial de esta web es **Space Grotesk**. **Test Söhne Breit / Kräftig**, que aparece en el PDF, no está incorporada: falta importar su archivo propio desde la entrega original. La aplicación permite cargar archivos `.woff2`, `.woff`, `.ttf` y `.otf`, hasta **64 fuentes propias por proyecto**. El límite por archivo es de **8 MB**.

La transición tipográfica interpola la forma de las letras mediante campos de distancia de sus siluetas. Podés desactivar la animación; también se respeta la preferencia de movimiento reducido del navegador.

### Textos y posiciones

Hacé clic en un texto para seleccionarlo y abrir sus controles en **Contenido**. Podés cambiar el contenido, la jerarquía tipográfica, el color asociado, la escala y la alineación. Hacé doble clic para escribir directamente sobre la lámina.

**Los datos de marca son compartidos; la posición de cada aparición es independiente.** Editar el nombre, el correo, el teléfono o el eslogan actualiza sus apariciones en las aplicaciones. En cambio, arrastrar el correo del frente de la tarjeta mueve únicamente esa aparición: el correo de la papelería conserva su posición.

Arrastrá el cuadro sobre la lámina para ubicarlo. También podés introducir las coordenadas horizontal y vertical en **Contenido** o usar **Restablecer posición**. Con el cuadro enfocado en la lámina, las flechas lo desplazan **1 px**; `Shift` + flechas lo desplaza **10 px**. Los movimientos respetan la superficie a la que pertenece el texto y se pueden deshacer.

Los títulos, especímenes y textos particulares tienen sus propios campos. El control de caja permite comparar la marca en mayúsculas, minúsculas o conservar lo escrito.

### Agregar cuadros de texto

Podés añadir hasta **100 cuadros nuevos por proyecto**. Cada cuadro tiene su propio contenido y permanece asociado a la superficie elegida.

1. Abrí la lámina en la que querés trabajar.
2. En **Contenido**, elegí la superficie en **Agregar texto en**: por ejemplo, frente o dorso de tarjeta, hoja membretada, sobre, cartel de obra, franja de contacto o rótulo de fachada. También podés elegir el fondo de la lámina cuando está disponible.
3. Pulsá **Agregar cuadro de texto**. El botón **Agregar texto** de la barra superior usa la superficie seleccionada.
4. Escribí el contenido y ajustá su **ancho, posición, tipografía, color, tamaño y alineación**. Podés arrastrarlo o precisar su ubicación con los campos numéricos.

**Eliminar cuadro** quita el cuadro nuevo seleccionado. También podés usar `Supr` o `Retroceso` cuando el cuadro tiene el foco en la lámina. La eliminación, la incorporación y los desplazamientos se pueden deshacer y rehacer. Los textos originales de la plantilla conservan su acción **Restablecer texto**.

### Imágenes

Seleccioná el fondo de una aplicación o el logotipo para reemplazarlo con un archivo PNG, JPG, WebP, GIF o SVG simple. Podés ajustar el encuadre, la posición, el zoom y el texto alternativo. El límite por imagen es de **8 MB** y menos de **12.000 px** por dimensión.

Las fotografías del PDF eran imágenes aplanadas. En esta web, las superficies de marca se reconstruyen como capas editables sobre composiciones y fotografías de referencia. El editor modifica esas capas y permite reemplazar los fondos; no recupera las capas originales de Photoshop ni convierte automáticamente cualquier fotografía nueva en un mockup con perspectiva.

### Cinco láminas

| Lámina | Aplicación |
| --- | --- |
| 01 | Sistema tipográfico: principal, secundaria y terciaria |
| 02 | Tarjetas personales |
| 03 | Papelería |
| 04 | Cartel de obra |
| 05 | Fachada |

Usá las miniaturas para cambiar de lámina. Las flechas izquierda/derecha también cambian de lámina cuando no estás editando un campo ni tenés el foco sobre un cuadro de texto. El modo presentación permite revisar las composiciones con más espacio.

### Vistas de tarjetas

En la lámina **02 / Tarjetas**, la barra contextual ofrece tres vistas:

| Vista | Uso |
| --- | --- |
| **Ambas** | Revisar el frente y el dorso dentro de la composición completa. |
| **Frente** | Editar la cara con los datos de contacto, centrada, ampliada y sin inclinación. |
| **Dorso** | Editar el dorso, cuyo fondo inicial es oscuro y que muestra solo «wertbau» en minúsculas en la esquina inferior derecha. |

El texto «wertbau» del dorso se puede editar y mover; usa un campo propio para conservar las minúsculas elegidas sin cambiar la marca en las otras aplicaciones. Los cuadros que ya habías añadido se conservan en su misma superficie.

Los textos conservan sus posiciones al alternar entre vistas. La presentación mantiene la vista seleccionada; las miniaturas y la exportación de las cinco láminas a PDF muestran siempre **Ambas**.

## Guardado y variantes

El proyecto activo se guarda en el navegador mediante **IndexedDB**, incluidos los cuadros añadidos y la posición independiente de cada aparición de texto. Las variantes conservan copias independientes de la exploración y de su composición para volver a abrirlas. Cuando IndexedDB no está disponible, existe un respaldo reducido con `localStorage`.

**El guardado es local a ese navegador y a esa dirección web.** No sincroniza las variantes entre equipos, no guarda en el disco F: y no realiza commits en GitHub. Cambiar de navegador, perfil, dominio o puerto puede mostrar un espacio de trabajo diferente. Exportá un proyecto JSON para trasladar o respaldar tu trabajo.

En **Exportar** están disponibles:

- **Proyecto editable (JSON):** textos, cuadros añadidos, superficies, anchos, posiciones, paleta, ajustes, imágenes y fuentes propias incorporadas. Se puede importar en otra instalación de Vision Wertbau.
- **Estilos de marca (CSS):** variables con los tres colores y las tres jerarquías. Las familias tipográficas deben cargarse en el sitio que utilice esas variables.
- **Cinco láminas en PDF:** conserva la composición, los cuadros añadidos y sus posiciones. Abre la impresión del navegador en A4 horizontal; elegí guardar como PDF, sin márgenes y con gráficos de fondo. La lámina de tarjetas incluye frente y dorso.

El JSON tiene un límite de **45 MB**. Los 203 archivos tipográficos que ya vienen con la aplicación no se repiten dentro de cada exportación. El respaldo de `localStorage`, cuando se utiliza, admite proyectos de hasta 3 MB.

Los archivos JSON y las variantes de **versión 1** anteriores a los controles de posición siguen siendo compatibles. Si no incluyen cuadros nuevos ni posiciones, se abren con la composición original; no es necesario convertirlos antes de importarlos.

### Atajos

| Atajo | Acción |
| --- | --- |
| Flechas, con un cuadro enfocado | Mover el texto 1 px. |
| `Shift` + flechas, con un cuadro enfocado | Mover el texto 10 px. |
| `Supr` o `Retroceso`, con un cuadro nuevo enfocado | Eliminar ese cuadro. |
| Flechas izquierda/derecha, fuera de campos y cuadros | Cambiar de lámina. |
| `Ctrl+S` | Exportar el proyecto JSON. |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Deshacer / rehacer cuando no estás escribiendo dentro de un campo. |
| `Escape` | Salir del modo presentación. |

## Estructura para desarrollo

| Ruta | Función |
| --- | --- |
| `dist/index.html` | Entrada de la aplicación |
| `dist/styles.css` | Interfaz, láminas, adaptación e impresión |
| `dist/js/app.js` | Controles, selección, renderizado y exportación |
| `dist/js/model.js` | Esquema validado, cuadros, posiciones, guardado y variantes |
| `dist/js/layout.js` | Conversión del movimiento del puntero y límites de posición |
| `dist/js/fonts.js` | Catálogo y carga de fuentes |
| `dist/js/morph.js` | Transición de siluetas tipográficas |
| `dist/assets/` | Imágenes y recursos de la referencia |
| `dist/assets/fonts/` | Fuentes WOFF2, licencias y manifiesto de procedencia |
| `scripts/serve.mjs` | Servidor local sin dependencias |
| `tests/` | Pruebas de esquema, posiciones, límites, fuentes y animación |

No hay paso de compilación. Los archivos que se editan dentro de `dist/` son los mismos que se publican. Para comprobar el proyecto:

```powershell
npm run check
npm test
```

La suite actual contiene **24 pruebas**. Cubre importaciones inválidas y contenidos activos en imágenes, aislamiento entre copias, manejo de una copia local dañada, compatibilidad con proyectos de versión 1 anteriores, cuadros y posiciones, conversión del arrastre y sus límites, correspondencia del catálogo con los 203 archivos reales y propiedades del cálculo de distancia para la animación. La revisión visual y la impresión se comprueban además en navegador.

## Repositorio y publicación

La web pública se sirve con **GitHub Pages** en <https://opticseeker167.github.io/Vision_Wertbau/>. La rama `main` contiene el proyecto completo; `gh-pages` contiene los archivos de `dist/` en su raíz, junto con `.nojekyll`. GitHub Pages publica desde `gh-pages` y `/ (root)`. Al actualizar la aplicación, actualizá también esa rama con el contenido de `dist/` y comprobá que el proceso «pages build and deployment» termine correctamente.

Si venís del enlace anterior, exportá tus proyectos o variantes como JSON e importalos en esta dirección. El guardado del navegador pertenece a cada origen y no se traslada automáticamente.

Repositorio: **[OpticSeeker167/Vision_Wertbau](https://github.com/OpticSeeker167/Vision_Wertbau)**, con visibilidad **pública**.

`scripts/publish-github.ps1` prepara y publica el código en ese destino cuando se ejecuta expresamente. Requiere Git, Node, npm y GitHub CLI (`gh`) instalados y una sesión de `gh` ya autenticada como `OpticSeeker167`. No instala software ni guarda tokens en el proyecto.

```powershell
.\scripts\publish-github.ps1
```

El script ejecuta las verificaciones, crea el repositorio público si no existe y publica la rama `main` sin forzar el historial. Usa un remoto llamado `github`; conserva los demás remotos. Se detiene si ese remoto apunta a otro repositorio, si el repositorio existente es privado o si su historial no es antecesor de la versión local. No cambia la visibilidad ni combina historiales automáticamente.

Para alojar la web en un servicio estático, publicá **todo el contenido de `dist/`**, conservando las rutas relativas. Un repositorio de código y una web desplegada son destinos distintos; subir el código a GitHub no habilita por sí solo un alojamiento web.

## Archivos de terceros

La procedencia de las fuentes y de las imágenes está documentada en `THIRD_PARTY.md`. Cada familia incluida conserva su archivo de licencia completo. El manifiesto `dist/assets/fonts/catalog-manifest.json` registra familias, pesos, fuentes de descarga y tamaños.
