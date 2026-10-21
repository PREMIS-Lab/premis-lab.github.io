# premis-lab.github.io

Sitio web del laboratorio PREMIS (PREcision Medicine with Intelligent Systems), Martinos Center, MGH.
Publicado con GitHub Pages en https://premis-lab.github.io

Es HTML estático, sin build: GitHub Pages sirve los archivos tal cual (`.nojekyll` desactiva Jekyll).

## Estructura

```
index.html                 portada: hero, about, publicaciones, noticias, equipo, software, contacto
news/index.html            todas las noticias
news/<slug>/index.html     una página por noticia
404.html                   página de error
assets/css/main.css        estilos (Tailwind compilado)
assets/js/site.js          tema claro/oscuro, menú móvil y carrusel de publicaciones
assets/img/                logos y fondos
assets/uploads/            fotos del equipo y figuras de las noticias
tools/wp_to_static.py      script que generó el sitio desde el WordPress de pruebas
```

## Editar contenido

- **Publicaciones**: se cargan solas desde PubMed en el navegador, no hay nada que editar.
- **Equipo y software**: editar las tarjetas en `index.html`, secciones `#team` y `#software`.
- **Noticias**: copiar una carpeta de `news/<slug>/`, cambiar el texto y la figura, y añadir su
  tarjeta en `news/index.html` y en la sección `#news` de `index.html` (la portada muestra las 3 más recientes).

Las clases de Tailwind ya compiladas están en `main.css`. Si se usa una clase nueva que no aparece
en el sitio, hay que recompilar el CSS o usar un estilo en línea.

## Probar en local

```bash
python3 -m http.server 8000   # http://localhost:8000
```

Las rutas son absolutas desde la raíz (`/assets/...`), así que abrir los archivos con doble clic no funciona;
hay que usar un servidor.

## Origen

Convertido desde la instalación de WordPress en `/autofs/space/crater_001/projects/premis-wp`.
Para regenerarlo: arrancar ese WordPress, descargar las páginas renderizadas y ejecutar
`python3 tools/wp_to_static.py <carpeta_html> <este_repo> <carpeta_wordpress>`.
