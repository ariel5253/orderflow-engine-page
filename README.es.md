# orderflow-engine-page

[English](README.md)

El portal de entrega de Orderflow Engine: un sitio estático para GitHub Pages que le muestra al evaluador, reto por reto, qué pidió el enunciado, cómo se resolvió y la evidencia que lo demuestra, y enlaza cada documento y cada repositorio. Abre en español, y un botón la cambia a inglés.

## Qué es

Una sola página con un índice fijo a la izquierda. Al elegir una entrada se muestra solo esa sección, desde su inicio, con enlaces a la anterior y a la siguiente al pie; cada sección tiene su propia dirección (`#a1`, `#documents`…), así que el botón Atrás del navegador y los enlaces compartidos funcionan. Las secciones, en orden:

| Sección | Contenido |
|---------|-----------|
| Resumen | Qué es el sistema, cuatro cifras clave (retos resueltos, pruebas automáticas, criterios de aceptación, países) y una tabla con cada reto, su estado y su evidencia principal |
| Cómo evaluar en 10 minutos | Cinco pasos: el README, el ADR, el comando único de pruebas, levantar el stack completo y los documentos |
| A1, A2, A3, Entregables, Cliente web, Multipaís e idiomas | Una sección por reto, cada una con las mismas tres partes: qué se pidió (las palabras del enunciado), cómo se resolvió, y una tabla de evidencia donde cada fila es un criterio de aceptación del SPEC §14 con las pruebas que lo verifican, enlazadas a su código en GitHub |
| Documentos | Los manuales, el informe de arquitectura, el recorrido de la solución, la presentación y el ADR-0001, en español y en inglés |
| Repositorios | Los seis repositorios y lo que contiene cada uno |

Cada enlace se abre en una ventana flotante sobre la página, así que el lector nunca sale de ella: los PDF se ven dentro, las capturas ampliadas, los archivos y pruebas de GitHub como código numerado, los README y el ADR formateados y abiertos en el título enlazado; una presentación, una carpeta o una lista de pull requests muestran una tarjeta con un botón para abrirlos. Ctrl, Cmd o el botón central siguen abriendo un enlace en una pestaña nueva.

Dos piezas de evidencia son respuestas reales grabadas del API: en A1, un panel de cotización donde el visitante cambia las cantidades y lee el desglose del motor para ese carrito; en A2, la misma confirmación enviada dos veces con una clave de idempotencia, con la repetición idéntica byte a byte.

## Cómo verla en local

Desde esta carpeta:

```bash
python -m http.server 8090
```

Luego abre `http://localhost:8090`. Agrega `?lang=en` para abrirla en inglés. Abrir `index.html` directamente desde el disco muestra una página vacía, porque los textos y los datos se cargan con `fetch`, que los navegadores bloquean en páginas `file://`.

## Cómo está construida

| Archivo | Función |
|---------|---------|
| `index.html` | Solo estructura. Cada elemento que muestra texto indica su clave con `data-i18n`, cada lista con `data-i18n-list`, y cada atributo traducido con `data-i18n-attr` |
| `i18n/es.json`, `i18n/en.json` | Todos los textos de la página, con las mismas claves en los dos archivos. El español es el idioma por defecto. Los textos pueden usar marcas de `code` y **negrita** |
| `data/evidence.json` | Las filas de evidencia de cada reto: los criterios de aceptación, las pruebas que los verifican y su ruta en cada repositorio |
| `data/quotes-co-alpha.json` | 120 cotizaciones grabadas de `POST /api/v1/quotes` el 2026-10-17 (Tienda Norte, `co-alpha`, contado): gaseosa de 1 a 60 unidades, con y sin 10 papas. La página nunca llama a una API |
| `app.js` | Carga el diccionario y los datos, aplica los textos, arma las tablas de evidencia, maneja el panel de cotización, muestra la sección elegida en el índice con sus enlaces a la anterior y la siguiente, y arma el menú del celular |
| `viewer.js` | La ventana flotante: intercepta los enlaces que salen de la página y muestra cada uno según su tipo; los archivos de GitHub se leen de `raw.githubusercontent.com`, y si uno no se puede cargar la ventana ofrece abrir el enlace en GitHub |
| `style.css` | Diseño con índice fijo, tablas que se vuelven tarjetas con etiqueta en el celular, estilos de foco, y un fundido breve al cambiar de sección con alternativa para movimiento reducido |
| `.nojekyll` | Le indica a GitHub Pages que sirva los archivos tal como están |

Reglas que cumple la página:

- No hay texto escrito en el HTML ni en el JavaScript, salvo una línea de `<noscript>`. Un texto nuevo es una clave nueva en los dos diccionarios. Los nombres de producto vienen de los datos grabados, en el idioma del tenant, como en el cliente web.
- La elección de idioma se guarda en el `localStorage` del navegador. Cada acceso está protegido, así que un navegador que bloquea el almacenamiento igual muestra la página, en español.
- Sin recursos externos: fuentes del sistema, sin CDN, sin analítica y sin cookies.
- Sin script, todas las secciones se muestran una tras otra. Los efectos al pasar el puntero solo aplican en dispositivos con puntero fino, y con movimiento reducido el cambio de sección no tiene desplazamiento.

## Qué incluye y qué no

En esta carpeta: la página, sus dos diccionarios, sus datos, sus estilos y su script, este README en inglés y en español, y la licencia.

Se copian a esta carpeta al ensamblar la entrega, y no se escriben a mano:

| Carpeta | Archivos | Origen |
|---------|----------|--------|
| `screenshots/es/`, `screenshots/en/` | Las nueve capturas del cliente web; la página muestra `02`, `04`, `05`, `06`, `07` y `09` | `orderflow-engine-docs/delivery/screenshots/` |
| `documents/` | `user-manual`, `technical-manual`, `architecture-report`, `solution-walkthrough` y `0001-order-pricing-and-confirmation` como `.pdf` y `.es.pdf`; `presentation.pptx` y `presentation.es.pptx` | `orderflow-engine-docs/deliverables/` |

Los enlaces a pruebas, README y ADR apuntan a la rama `main` de cada repositorio en GitHub.

No incluye: una API en ejecución (el panel de cotización y la repetición de la confirmación muestran respuestas grabadas; el sistema en sí corre con Docker, ver Cómo evaluar en 10 minutos), un paso de build ni un gestor de paquetes, ni ningún tipo de rastreo.

## Publicación en GitHub Pages

En la configuración del repositorio, en Pages, elige publicar desde una rama: `main`, carpeta `/ (root)`. El sitio se sirve desde la raíz del repositorio, tal como está en esta carpeta.

## Licencia

MIT. Ver [LICENSE](LICENSE).
