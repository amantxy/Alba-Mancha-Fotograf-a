# AM96 Photo · Portfolio de fotografía

Web de portfolio de **Alba Mancha Fotografía**: estática, rápida, sin servidor y editable desde el propio navegador.

## Qué incluye

- **Menú superior con botones**: un botón por sección. En el móvil se desliza en horizontal.
- **Secciones editables**: portada, galerías, «Sobre mí», texto y contacto. Se pueden añadir, renombrar, reordenar y borrar.
- **Galerías profesionales**: cuadrícula tipo mosaico y visor a pantalla completa (flechas del teclado, deslizar en el móvil).
- **Calidad en cualquier pantalla**: cada foto que subes se optimiza en el navegador en 3 tamaños (800, 1600 y 2400 px, en WebP). Así cada dispositivo (móvil, tablet, PC o pantalla retina) descarga la resolución justa: se ve nítida y carga rápido.
- **Chat de contacto**: los mensajes llegan a **am96photo@gmail.com** mediante [FormSubmit](https://formsubmit.co), un servicio gratuito.
- **Instagram**: enlace a **@am96photo** en la cabecera, el pie y la sección de contacto.
- **Tema claro, oscuro o del sistema**: se cambia con el botón de la cabecera.
- **Modo administrador**: todo se edita desde la web y se publica con un botón.

## Estructura

```
index.html      Estructura de la página
css/styles.css  Diseño (temas claro/oscuro y adaptación a móvil/tablet/PC)
js/app.js       Web pública: menú, galerías, visor, tema y chat
js/admin.js     Modo administrador
content.json    TODO el contenido (textos, secciones, galerías y fotos)
images/         Fotos subidas desde el modo administrador
```

---

## 1. Publicar gratis con GitHub Pages y tu dominio

### Paso 1. Juntar los cambios en `main`
El código está en la rama `claude/photography-portfolio-site-8gw09l`. En GitHub, abre una *Pull Request* hacia `main` y pulsa **Merge**.

### Paso 2. Activar GitHub Pages
1. Ve al repositorio y entra en **Settings › Pages**.
2. En *Build and deployment*, en **Source**, elige **Deploy from a branch**.
3. Elige la rama **main** y la carpeta **/ (root)**, y pulsa **Save**.
4. En 1 o 2 minutos la web estará en `https://amantxy.github.io/Alba-Mancha-Fotograf-a/`.

### Paso 3. Conectar tu dominio
1. En **Settings › Pages › Custom domain**, escribe tu dominio (por ejemplo `www.tudominio.com`) y pulsa **Save**. GitHub creará solo un archivo `CNAME` en el repositorio.
2. En el panel de la empresa donde compraste el dominio (GoDaddy, IONOS, DonDominio, Namecheap…), entra en la **zona DNS** y crea estos registros:

| Tipo  | Nombre / Host | Valor |
|-------|---------------|-------|
| A     | `@`           | `185.199.108.153` |
| A     | `@`           | `185.199.109.153` |
| A     | `@`           | `185.199.110.153` |
| A     | `@`           | `185.199.111.153` |
| AAAA  | `@`           | `2606:50c0:8000::153` |
| AAAA  | `@`           | `2606:50c0:8001::153` |
| AAAA  | `@`           | `2606:50c0:8002::153` |
| AAAA  | `@`           | `2606:50c0:8003::153` |
| CNAME | `www`         | `amantxy.github.io` |

   Borra cualquier otro registro **A** o **CNAME** de `@` o `www` que apunte a otro sitio (por ejemplo, la página de «aparcamiento» del proveedor).
3. Espera a que los DNS se propaguen. Suele tardar entre unos minutos y unas horas, como mucho 48 h.
4. Vuelve a **Settings › Pages** y marca **Enforce HTTPS** (candado gratis).

> **Alternativas gratuitas**: Netlify y Cloudflare Pages también sirven. Conecta el repositorio sin configurar nada de compilación (es una web estática) y añade tu dominio en su panel. Ten en cuenta que el botón «Publicar» del modo administrador guarda los cambios en GitHub, así que funciona igual con cualquiera de ellos si están conectados al repositorio.

---

## 2. Activar el chat de contacto (solo una vez)

La **primera vez** que alguien envíe un mensaje desde el chat, FormSubmit mandará a **am96photo@gmail.com** un correo titulado *«Action Required: Activate FormSubmit»*. Pulsa **Activate Form** y, a partir de ahí, todos los mensajes llegarán a esa bandeja. Si no lo ves, mira en *Spam* o *Promociones*.

Lo más sencillo es enviarte tú misma un mensaje de prueba nada más publicar la web.

Para cambiar el email de destino: **modo admin › Ajustes › Email**. Si lo cambias, la nueva dirección también tendrá que activarse.

---

## 3. Usar el modo administrador

### Entrar
- Pulsa **«Acceso»** en el pie de la página, añade `#admin` al final de la dirección o usa el atajo `Ctrl/Cmd + Shift + E`.
- Contraseña inicial: **`am96admin`**. **Cámbiala** en *Ajustes › Seguridad* y luego publica.

### Editar
- **Textos**: los textos editables aparecen con un borde punteado. Haz clic y escribe directamente.
- **☰ Secciones**: renombra los botones del menú, cambia su orden, elimina secciones o añade nuevas (de galerías, texto, contacto…).
- **Galerías**: en una sección de galerías, pulsa **＋ Nueva galería**. Dentro de una galería puedes:
  - **＋ Subir fotos**, o arrastrarlas sobre la página. Puedes subir varias a la vez.
  - Ordenarlas con ← →, editar el pie de foto (✎), elegir la portada (★) o borrarlas (🗑).
- **🖼 Cambiar imagen**: cambia la foto de portada o la de «Sobre mí».
- **⚙ Ajustes**: nombre, lema, pie de página, email, Instagram, datos de GitHub y contraseña.
- **⋯ Más**: descargar una copia de seguridad, importarla o descartar cambios.

Los cambios se guardan como **borrador en tu navegador** hasta que pulses **⬆ Publicar**. Si cierras la página, el borrador se recupera.

### Publicar (crear el token una sola vez)
Para que el botón **Publicar** pueda guardar en el repositorio, crea un *token* de GitHub:

1. En GitHub, entra en **Settings** (de tu cuenta) **› Developer settings › Personal access tokens › Fine-grained tokens › Generate new token**.
2. **Repository access**: elige *Only select repositories* y marca `Alba-Mancha-Fotograf-a`.
3. **Permissions › Repository permissions › Contents**: **Read and write**.
4. Elige una caducidad (por ejemplo 1 año), genera el token y cópialo.
5. En la web, pulsa **⬆ Publicar**, pega el token y marca «Recordar» si es tu propio dispositivo.

En 1 o 2 minutos verás los cambios en la web pública. Al publicar, también se borran del repositorio las fotos que ya no se usan.

### Sobre la seguridad
La web es estática, así que la contraseña solo oculta las herramientas de edición. **La protección real es el token**: sin él nadie puede cambiar la web publicada. No compartas el token. Si lo pierdes o crees que alguien lo tiene, revócalo en GitHub y crea otro.

---

## Probar en tu ordenador

Como la web carga `content.json`, ábrela con un pequeño servidor y no haciendo doble clic en el archivo:

```bash
python3 -m http.server 8000
# y abre http://localhost:8000
```

## Notas

- Las fotos de ejemplo vienen de *picsum.photos*. Sustitúyelas por las tuyas desde el modo administrador. Al borrar las galerías de ejemplo desaparecen.
- Fotos recomendadas: JPG o PNG de buena calidad (idealmente de 2400 px o más de lado). La web genera sola las versiones optimizadas.
