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

## 1. Publicar gratis con GitHub Pages en albamancha.com

### Paso 1. Juntar los cambios en `main`
El código está en la rama `claude/photography-portfolio-site-8gw09l`. En GitHub, abre una *Pull Request* hacia `main` y pulsa **Merge**.

### Paso 2. Activar GitHub Pages
1. Abre **Settings › Pages** del repositorio (mejor desde un ordenador; en el móvil, activa el «Sitio de escritorio»).
2. En **Source**, elige **Deploy from a branch**, luego la rama **main** y la carpeta **/ (root)**, y pulsa **Save**.
3. En 1 o 2 minutos la web estará en `https://amantxy.github.io/AlbaManchaFotografia/`.

A partir de ahí, cada cambio en `main` se publica solo, tanto los míos como los del botón «Publicar» del modo administrador.

Cuando los DNS de IONOS (paso 3) apunten a GitHub, escribe `albamancha.com` en **Custom domain** y pulsa **Save**.

### Paso 3. Apuntar albamancha.com a GitHub en IONOS
1. Entra en [ionos.es](https://www.ionos.es) y ve a **Menú › Dominios y SSL**.
2. Pulsa en **albamancha.com** y abre la pestaña **DNS**.
3. **Borra** los registros que IONOS trae por defecto y que apuntan a sus servidores. Son los de tipo **A** y **AAAA** con host `@`, y el registro `www`. Pulsa los tres puntos ⋮ de cada uno y elige **Eliminar**. No toques los registros **MX**, **TXT** ni **NS**: son los del correo y del propio dominio.
4. Pulsa **Añadir registro** y crea estos registros, uno a uno. Si IONOS pregunta por el TTL, deja el valor por defecto.

| Tipo  | Nombre de host | Apunta a |
|-------|----------------|----------|
| A     | `@`            | `185.199.108.153` |
| A     | `@`            | `185.199.109.153` |
| A     | `@`            | `185.199.110.153` |
| A     | `@`            | `185.199.111.153` |
| AAAA  | `@`            | `2606:50c0:8000::153` |
| AAAA  | `@`            | `2606:50c0:8001::153` |
| AAAA  | `@`            | `2606:50c0:8002::153` |
| AAAA  | `@`            | `2606:50c0:8003::153` |
| CNAME | `www`          | `amantxy.github.io` |

5. Si IONOS avisa de que el registro entra en conflicto con otro existente, acepta **sustituir** el antiguo.
6. Espera a que los cambios se propaguen. Suele tardar entre 15 minutos y unas horas, como mucho 48 h. En **Settings › Pages**, GitHub mostrará *«DNS check successful»* cuando estén listos.
7. Marca **Enforce HTTPS** para tener el candado gratis. Si la casilla aparece gris, espera un rato: GitHub tarda hasta 24 h en emitir el certificado.

La web quedará en **https://albamancha.com**. Quien escriba `www.albamancha.com` llegará también a ella.

> **Recomendado:** verifica el dominio en GitHub para que nadie más pueda usarlo. Ve a la configuración de tu cuenta (tu foto › **Settings › Pages › Add a domain**), escribe `albamancha.com` y GitHub te dará un registro **TXT**. Créalo en IONOS desde **DNS › Añadir registro › TXT** y vuelve a GitHub para pulsar **Verify**.

> **Alternativas gratuitas**: Netlify y Cloudflare Pages también sirven. Conecta el repositorio sin configurar nada de compilación (es una web estática) y añade tu dominio en su panel. Ten en cuenta que el botón «Publicar» del modo administrador guarda los cambios en GitHub, así que funciona igual con cualquiera de ellos si están conectados al repositorio.

---

## 2. Activar el chat de contacto (solo una vez)

La **primera vez** que alguien envíe un mensaje desde el chat, FormSubmit mandará a **am96photo@gmail.com** un correo titulado *«Action Required: Activate FormSubmit»*. Pulsa **Activate Form** y, a partir de ahí, todos los mensajes llegarán a esa bandeja. Si no lo ves, mira en *Spam* o *Promociones*.

Lo más sencillo es enviarte tú misma un mensaje de prueba nada más publicar la web.

Para cambiar el email de destino: **modo admin › Ajustes › Email**. Si lo cambias, la nueva dirección también tendrá que activarse.

---

## 3. Usar el modo administrador

### Página en construcción
Mientras esté activada, el público solo ve una portada que dice **«Página en construcción · ¡Nos vemos pronto!»**, con tu Instagram y tu email.
- Para ver la web completa, pulsa **«Acceso privado»** en esa portada y entra con tu usuario y contraseña. Ese dispositivo queda desbloqueado: aunque salgas del modo admin, seguirás viendo la web, con un aviso naranja arriba. Si pulsas **«Cerrar vista privada»** en ese aviso, vuelves a ver la portada de construcción.
- Para abrir la web al público, en el modo admin pulsa **🚧 En construcción**, desmarca la casilla y pulsa **Publicar**.
- Ten en cuenta que es una web estática: la portada oculta la web a los visitantes, pero no es un bloqueo de seguridad. No subas nada que deba ser realmente privado.

### Entrar
- Pulsa **«Acceso»** en el pie de la página, añade `#admin` al final de la dirección o usa el atajo `Ctrl/Cmd + Shift + E`.
- Entra con tu usuario y contraseña de administrador. Puedes cambiarlos cuando quieras en *Ajustes › Seguridad* y luego publicar. Se guardan cifrados, nunca en claro.

### Editar
- **Textos**: los textos editables aparecen con un borde punteado. Haz clic y escribe directamente.
- **☰ Secciones**: renombra los botones del menú, cambia su orden, elimina secciones o añade nuevas (de galerías, texto, contacto…).
- **Galerías**: en una sección de galerías, pulsa **＋ Nueva galería**. Dentro de una galería puedes:
  - **＋ Subir fotos**, o arrastrarlas sobre la página. Puedes subir varias a la vez.
  - Ordenarlas con ← →, editar el pie de foto (✎), elegir la portada (★) o borrarlas (🗑).
- **Google Drive**: dentro de una galería tienes dos opciones:
  - **🔗 Enlazar carpeta de Drive**: pega el enlace de una carpeta y se mostrará dentro de la galería, con un botón para abrirla en Drive. Es ideal para entregar sesiones completas.
  - **＋ Fotos de Drive**: pega enlaces de fotos sueltas, uno por línea. Aparecen en el mosaico y en el visor a pantalla completa, en 3 tamaños.
  - En Drive, comparte la carpeta o las fotos como **«Cualquier persona con el enlace»**. Si no, los visitantes no las verán.
- **Instagram** (sección «Instagram» del menú):
  - **⚙ Configurar feed automático**: tus publicaciones aparecen solas en la web, con su diseño y su visor a pantalla completa. Tú eliges qué sale:
    - **Todas, menos las que ocultes**: cada publicación tiene un botón 🚫 Ocultar / 👁 Mostrar.
    - **Solo las que lleven un hashtag**, por ejemplo `#albamanchaweb`. Lo escribes en Instagram y la publicación sale en la web sin tocar nada más.
  - Para conectarlo (una sola vez): crea una cuenta gratuita en [behold.so](https://behold.so), conecta tu Instagram (tiene que ser **cuenta profesional o de creador**, que se cambia gratis en la app), crea un feed **JSON** y pega su enlace (`https://feeds.behold.so/…`) en *Configurar feed automático*. El plan gratuito de Behold muestra las **6 últimas publicaciones**.
  - **＋ Subir fotos** / **＋ Fotos de Drive**: tus fotos en máxima calidad, que Instagram comprime. Se ven en mosaico y en el visor a pantalla completa.
  - **＋ Publicación concreta**: pega el enlace de una publicación o reel y se inserta tal cual se ve en Instagram.
- **🖼 Cambiar imagen**: cambia la foto de portada o la de «Sobre mí».
- **⚙ Ajustes**: nombre, lema, pie de página, email, Instagram, datos de GitHub y contraseña.
- **⋯ Más**: descargar una copia de seguridad, importarla o descartar cambios.

Los cambios se guardan como **borrador en tu navegador** hasta que pulses **⬆ Publicar**. Si cierras la página, el borrador se recupera.

### Publicar (crear el token una sola vez)
Para que el botón **Publicar** pueda guardar en el repositorio, crea un *token* de GitHub:

1. En GitHub, entra en **Settings** (de tu cuenta) **› Developer settings › Personal access tokens › Fine-grained tokens › Generate new token**.
2. **Repository access**: elige *Only select repositories* y marca `AlbaManchaFotografia`.
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
