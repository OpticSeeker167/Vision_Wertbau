# Recursos y atribuciones

## Fuentes incluidas

Vision Wertbau incorpora **100 familias del catálogo**, más **Inter** y **Cascadia Mono** como familias de apoyo de la referencia: **102 familias y 203 archivos WOFF2**.

Las fuentes se obtuvieron del catálogo oficial de Google Fonts. Los archivos mantienen los derechos y las licencias de sus autores. Se incluyó la licencia completa de cada familia junto a los archivos:

```text
dist/assets/fonts/LICENSE-<familia>.txt
```

El registro de procedencia está en `dist/assets/fonts/catalog-manifest.json`. Contiene la URL de origen de cada archivo, la familia, el peso, el nombre local, el tamaño y la URL de la licencia. La nota técnica del paquete está en `dist/assets/fonts/README.txt`.

Los archivos originales se convirtieron a WOFF2 sin recortar el conjunto de glifos ni modificar sus contornos. La comprobación de caracteres se centró en español, cifras y puntuación habitual. Esto no implica cobertura de todos los símbolos de Unicode.

Fuentes del registro:

- [Google Fonts](https://fonts.google.com/)
- [Repositorio oficial del catálogo y sus licencias](https://github.com/google/fonts)

### Tipografías importadas por el usuario

La aplicación admite archivos tipográficos propios. Esos archivos conservan su licencia original y se guardan en el proyecto del navegador o en su exportación JSON; no se añaden automáticamente al código de la aplicación ni a GitHub.

**Test Söhne Breit / Kräftig no se distribuye en este paquete.** El PDF identifica esa familia para el logotipo, pero el paquete utiliza Space Grotesk como punto de partida hasta que se importe el archivo propio correspondiente. El SVG de referencia reproduce únicamente las curvas del nombre WERTBAU; no es una fuente utilizable para escribir otros textos.

## Referencia gráfica aportada

El material de partida es el archivo aportado por el usuario `WERTBAU_01A_MAYUSCULAS.pdf`, con cinco láminas de identidad. De ese documento proceden:

- Las vistas de las cinco láminas usadas como referencia.
- Las fotografías de cartel de obra y fachada.
- El trazado vectorial de referencia del nombre WERTBAU.
- La paleta y los textos iniciales de la identidad.

Los derechos sobre la identidad y las fotografías pertenecen a sus titulares respectivos. Las licencias de las fuentes no se aplican a esas imágenes y este documento no les asigna una licencia abierta.

Las superficies editables de las aplicaciones se reconstruyeron con HTML y CSS. Los JPEG del PDF estaban aplanados; no se incluyen ni se atribuyen capas originales de archivos PSD.

## Código

La interfaz, el modelo de proyecto, el servidor local y el motor de transición se implementaron para este proyecto, sin bibliotecas JavaScript de ejecución externas. Las API del navegador se utilizan para texto, canvas, carga tipográfica, impresión y almacenamiento local.

No se ha asignado una licencia de código abierto al conjunto del proyecto. El repositorio es público; su visibilidad no cambia las licencias de los recursos incluidos.
