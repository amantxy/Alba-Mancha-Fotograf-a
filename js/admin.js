/* =========================================================
   AM96 Photo · Modo administrador
   - Acceso: enlace "Acceso" del pie o añadir #admin a la URL
   - Edición de textos directamente sobre la página
   - Gestión de secciones del menú, galerías y fotos
   - Las fotos se optimizan en el navegador en varios tamaños
     (800/1600/2400 px) para verse nítidas en móvil, tablet y PC
   - "Publicar" guarda todo en el repositorio de GitHub
     (GitHub Pages actualiza la web en 1-2 minutos)
   ========================================================= */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const App = window.App;
  const esc = App.esc;

  const LS_DRAFT = 'am96-draft';
  const LS_TOKEN = 'am96-gh-token';
  const SS_ADMIN = 'am96-admin';
  const WIDTHS = [800, 1600, 2400];
  const QUALITY = 0.88;

  const Admin = {
    pending: new Map(), // ruta -> Blob (imágenes aún no publicadas)
    dirty: false
  };
  window.Admin = Admin;

  /* ---------- Almacenamiento local (borrador) ---------- */
  const IDB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        const r = indexedDB.open('am96-admin', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files');
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      });
    },
    async tx(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction('files', mode); const st = t.objectStore('files');
        const out = fn(st);
        t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
        t.onerror = () => rej(t.error);
      });
    },
    put(k, v) { return this.tx('readwrite', (s) => s.put(v, k)); },
    del(k) { return this.tx('readwrite', (s) => s.delete(k)); },
    clear() { return this.tx('readwrite', (s) => s.clear()); },
    async all() {
      const db = await this.open();
      return new Promise((res, rej) => {
        const out = new Map();
        const req = db.transaction('files').objectStore('files').openCursor();
        req.onsuccess = () => { const c = req.result; if (c) { out.set(c.key, c.value); c.continue(); } else res(out); };
        req.onerror = () => rej(req.error);
      });
    }
  };

  function saveDraft() {
    Admin.dirty = true;
    try { localStorage.setItem(LS_DRAFT, JSON.stringify(App.content)); } catch (e) { App.toast('No se pudo guardar el borrador local'); }
    updateStatus();
  }
  Admin.save = saveDraft;

  async function addPending(path, blob) {
    Admin.pending.set(path, blob);
    App.blobUrls.set(path, URL.createObjectURL(blob));
    try { await IDB.put(path, blob); } catch (e) { /* modo privado: solo en memoria */ }
  }

  async function discardDraft() {
    try { localStorage.removeItem(LS_DRAFT); } catch (e) { /* nada */ }
    try { await IDB.clear(); } catch (e) { /* nada */ }
    Admin.pending.clear();
    Admin.dirty = false;
  }

  /* ---------- Utilidades ---------- */
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const rand = () => Math.random().toString(36).slice(2, 7);

  function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1]);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(blob);
    });
  }

  /* ---------- Diálogos ---------- */
  function form({ title, fields = [], submit = 'Guardar', cancel = 'Cancelar', wide = false, onMount }) {
    return new Promise((resolve) => {
      const dlg = document.createElement('dialog');
      dlg.className = 'dlg';
      if (wide) dlg.style.width = 'min(720px, calc(100vw - 24px))';
      const body = fields.map((f) => {
        const id = 'f_' + f.name + '_' + rand();
        if (f.type === 'heading') return `<h3>${esc(f.label)}</h3>`;
        if (f.type === 'note') return `<div class="note">${f.html || esc(f.label)}</div>`;
        if (f.type === 'html') return f.html;
        if (f.type === 'checkbox') return `<label class="check"><input type="checkbox" name="${f.name}" ${f.value ? 'checked' : ''}> ${esc(f.label)}</label>`;
        let input;
        if (f.type === 'textarea') input = `<textarea id="${id}" name="${f.name}" ${f.required ? 'required' : ''}>${esc(f.value || '')}</textarea>`;
        else if (f.type === 'select') input = `<select id="${id}" name="${f.name}">${f.options.map((o) => `<option value="${esc(o.value)}" ${o.value === f.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
        else if (f.type === 'file') input = `<input id="${id}" name="${f.name}" type="file" ${f.accept ? `accept="${f.accept}"` : ''} ${f.multiple ? 'multiple' : ''}>`;
        else input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(f.value || '')}" ${f.required ? 'required' : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${f.autocomplete ? `autocomplete="${f.autocomplete}"` : ''}>`;
        return `<div class="field"><label for="${id}">${esc(f.label)}</label>${input}${f.help ? `<small>${f.help}</small>` : ''}</div>`;
      }).join('');
      dlg.innerHTML = `
        <form method="dialog" novalidate>
          <div class="dlg-head"><h2>${esc(title)}</h2></div>
          <div class="dlg-body">${body}<p class="error" hidden></p></div>
          <div class="dlg-foot">
            ${cancel ? `<button class="btn btn-ghost" value="cancel" type="button" data-cancel>${esc(cancel)}</button>` : ''}
            ${submit ? `<button class="btn" type="submit">${esc(submit)}</button>` : ''}
          </div>
        </form>`;
      document.body.appendChild(dlg);
      const f = $('form', dlg);
      const done = (val) => { dlg.close(); dlg.remove(); resolve(val); };
      const api = {
        dlg,
        error(msg) { const e = $('.error', dlg); e.textContent = msg; e.hidden = !msg; },
        close: done
      };
      $('[data-cancel]', dlg) && ($('[data-cancel]', dlg).onclick = () => done(null));
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (!api.busy) done(null); });
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const vals = {};
        fields.forEach((fl) => {
          if (!fl.name || ['heading', 'note', 'html'].includes(fl.type)) return;
          const el = f.elements[fl.name];
          if (!el) return;
          vals[fl.name] = fl.type === 'checkbox' ? el.checked : fl.type === 'file' ? Array.from(el.files) : el.value.trim();
        });
        for (const fl of fields) {
          if (fl.required && !vals[fl.name]) { api.error('Rellena el campo "' + fl.label + '"'); return; }
        }
        if (api.onSubmit) {
          api.busy = true;
          try { const r = await api.onSubmit(vals); if (r !== false) done(vals); }
          catch (err) { api.error(err.message || String(err)); }
          finally { api.busy = false; }
        } else done(vals);
      });
      dlg.showModal();
      if (onMount) onMount(api);
    });
  }
  Admin.form = form;

  function confirmDlg(title, text, ok = 'Sí, continuar') {
    return form({ title, fields: [{ type: 'note', label: text }], submit: ok }).then((v) => !!v);
  }

  function pickFiles(multiple = true) {
    return new Promise((res) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = multiple;
      inp.onchange = () => res(Array.from(inp.files || []));
      inp.click();
    });
  }

  /* ---------- Procesado de imágenes ---------- */
  function loadImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => res({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen ' + file.name)); };
      img.src = url;
    });
  }

  // Reducción por pasos (mitades) para conservar la nitidez al escalar
  function resizeTo(img, w, h) {
    let src = img, sw = img.naturalWidth, sh = img.naturalHeight;
    while (sw / 2 >= w) {
      const c = document.createElement('canvas');
      c.width = Math.round(sw / 2); c.height = Math.round(sh / 2);
      const cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high';
      cx.drawImage(src, 0, 0, c.width, c.height);
      src = c; sw = c.width; sh = c.height;
    }
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const ctx = out.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    return out;
  }

  function toBlob(canvas) {
    return new Promise((res) => {
      canvas.toBlob((b) => {
        if (b && b.type === 'image/webp') return res(b);
        canvas.toBlob((j) => res(j), 'image/jpeg', QUALITY); // Safari antiguo: JPEG
      }, 'image/webp', QUALITY);
    });
  }

  async function processImage(file, folder) {
    const { img, url } = await loadImage(file);
    const W = img.naturalWidth, H = img.naturalHeight;
    let widths = WIDTHS.filter((w) => w < W);
    if (W <= WIDTHS[WIDTHS.length - 1] && !widths.includes(W)) widths.push(W);
    if (!widths.length) widths = [W];
    widths = widths.filter((w, i, a) => i === a.length - 1 || a[a.length - 1] - w > 200).slice(-3);
    const base = App.slug(file.name.replace(/\.[^.]+$/, '')).slice(0, 30) + '-' + rand();
    const entries = [];
    for (const w of widths) {
      const h = Math.round(H * w / W);
      const blob = await toBlob(resizeTo(img, w, h));
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `images/${folder}/${base}-${w}.${ext}`;
      await addPending(path, blob);
      entries.push({ path, w, h });
    }
    URL.revokeObjectURL(url);
    const main = entries.filter((e) => e.w <= 1600).pop() || entries[0];
    const largest = entries[entries.length - 1];
    return {
      src: main.path,
      srcset: entries.map((e) => `${e.path} ${e.w}w`).join(', '),
      w: largest.w, h: largest.h,
      alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      caption: ''
    };
  }

  async function processMany(files, folder) {
    const imgs = files.filter((f) => /^image\//.test(f.type));
    const out = [];
    for (let i = 0; i < imgs.length; i++) {
      App.toast(`Optimizando foto ${i + 1} de ${imgs.length}…`, 60000);
      try { out.push(await processImage(imgs[i], folder)); }
      catch (e) { App.toast(e.message); }
    }
    App.toast(out.length ? `${out.length} foto(s) añadida(s). Recuerda pulsar «Publicar».` : 'No se añadió ninguna foto');
    return out;
  }

  async function askImage(title, folder) {
    let mode = null;
    const v = await form({
      title,
      fields: [
        { type: 'file', name: 'files', label: 'Subir desde tu dispositivo', accept: 'image/*' },
        { type: 'text', name: 'url', label: '…o pegar la URL de una imagen', placeholder: 'https://…' },
        { type: 'text', name: 'alt', label: 'Descripción (texto alternativo)', help: 'Ayuda a la accesibilidad y al posicionamiento en Google.' }
      ],
      submit: 'Usar imagen'
    });
    if (!v) return null;
    let photo = null;
    if (v.files && v.files.length) { photo = (await processMany(v.files.slice(0, 1), folder))[0]; mode = 'file'; }
    else if (v.url) { photo = { src: v.url, alt: '', caption: '' }; mode = 'url'; }
    if (photo && v.alt) photo.alt = v.alt;
    return photo && mode ? photo : null;
  }

  /* ---------- Barra de administración ---------- */
  function buildBar() {
    if ($('#adminBar')) return;
    const bar = document.createElement('div');
    bar.className = 'admin-bar'; bar.id = 'adminBar';
    bar.innerHTML = `
      <span class="tag">Modo admin</span>
      <span class="status" id="adminStatus"></span>
      <button type="button" data-bar="sections">☰ Secciones</button>
      <button type="button" data-bar="settings">⚙ Ajustes</button>
      <button type="button" data-bar="more">⋯ Más</button>
      <button type="button" data-bar="exit">Salir</button>
      <button type="button" class="primary" data-bar="publish">⬆ Publicar</button>`;
    document.body.appendChild(bar);
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-bar]'); if (!b) return;
      ({ sections: manageSections, settings: openSettings, more: openMore, exit: exitAdmin, publish: openPublish })[b.dataset.bar]();
    });
    updateStatus();
  }

  function updateStatus() {
    const st = $('#adminStatus'); if (!st) return;
    const n = Admin.pending.size;
    st.classList.toggle('dirty', Admin.dirty);
    st.textContent = Admin.dirty ? `Cambios sin publicar${n ? ` · ${n} archivo(s) de imagen` : ''}` : 'Todo publicado';
  }

  /* ---------- Edición en línea ---------- */
  function decorateEditables() {
    $$('[data-edit]').forEach((el) => {
      el.contentEditable = 'true';
      el.spellcheck = true;
      if (el._adminBound) return;
      el._adminBound = true;
      el.addEventListener('click', (e) => { if (el.closest('a')) e.preventDefault(); e.stopPropagation(); });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !el.hasAttribute('data-multiline')) { e.preventDefault(); el.blur(); }
        if (e.key === 'Escape') el.blur();
      });
      el.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, el.hasAttribute('data-multiline') ? text : text.replace(/\s*\n\s*/g, ' '));
      });
      el.addEventListener('blur', () => {
        let val = el.innerText.replace(/ /g, ' ');
        val = el.hasAttribute('data-multiline') ? val.replace(/\n{3,}/g, '\n\n').trim() : val.replace(/\s+/g, ' ').trim();
        const path = el.dataset.edit;
        if (App.getPath(App.content, path) === val) return;
        App.setPath(App.content, path, val);
        $$(`[data-edit="${CSS.escape(path)}"]`).forEach((o) => { if (o !== el) o.textContent = val; });
        if (!val) el.textContent = '';
        saveDraft();
      });
    });
  }

  function disableEditables() {
    $$('[data-edit]').forEach((el) => { el.removeAttribute('contenteditable'); });
  }

  const tool = (act, label, title, extra = '') => `<button type="button" class="tool${extra}" data-act="${act}" title="${esc(title)}" aria-label="${esc(title)}">${label}</button>`;

  function decorate(section, idx) {
    if (!App.isAdmin) return;
    decorateEditables();
    if (!section) return;
    const main = $('#main');

    if (section.type === 'hero') {
      const hero = $('.hero', main);
      const t = document.createElement('div');
      t.className = 'admin-tools floating'; t.style.top = '16px'; t.style.right = '16px';
      t.innerHTML = tool('hero-image', '🖼 Cambiar imagen', 'Cambiar imagen de portada') + tool('hero-cta', '🔗 Botón', 'Configurar el botón');
      hero.appendChild(t);
    }

    if (section.type === 'about') {
      const slot = $('[data-slot="image"]', main);
      slot.className = 'admin-tools floating';
      slot.innerHTML = tool('about-image', '🖼 Cambiar foto', 'Cambiar foto');
    }

    if (section.type === 'galleries') {
      const albums = section.albums || [];
      if (!App.route.album || !albums.some((a) => a.id === App.route.album)) {
        $$('.album-card', main).forEach((card, i) => {
          const t = document.createElement('div');
          t.className = 'admin-tools floating';
          t.innerHTML = tool(`album-move:${i}:-1`, '←', 'Mover antes') + tool(`album-move:${i}:1`, '→', 'Mover después') + tool(`album-del:${i}`, '🗑', 'Eliminar galería', ' danger');
          card.appendChild(t);
        });
        const slot = $('[data-slot="albums"]', main);
        slot.outerHTML = '<button type="button" class="add-card" data-act="album-add">＋ Nueva galería</button>';
      } else {
        const ai = albums.findIndex((a) => a.id === App.route.album);
        const a = albums[ai];
        const slot = $('[data-slot="album"]', main);
        slot.className = 'admin-tools bar';
        slot.innerHTML = tool('photos-add', '＋ Subir fotos', 'Subir fotos') + tool('photos-url', '＋ Foto por URL', 'Añadir foto desde una URL') +
          tool('album-del-current', '🗑 Eliminar galería', 'Eliminar galería', ' danger') +
          '<span class="hint">También puedes arrastrar fotos aquí. Se optimizan automáticamente en varios tamaños.</span>';
        $$('.photo', main).forEach((fig) => {
          const i = +fig.dataset.photo;
          const t = document.createElement('div');
          t.className = 'admin-tools floating';
          t.innerHTML = tool(`photo-move:${i}:-1`, '←', 'Mover antes') + tool(`photo-move:${i}:1`, '→', 'Mover después') +
            tool(`photo-edit:${i}`, '✎', 'Editar pie y descripción') +
            tool(`photo-cover:${i}`, '★', 'Usar como portada', (a.cover || 0) === i ? ' star-on' : '') +
            tool(`photo-del:${i}`, '🗑', 'Eliminar foto', ' danger');
          fig.appendChild(t);
          if ((a.cover || 0) === i) fig.insertAdjacentHTML('beforeend', '<span class="badge">Portada</span>');
        });
        // Arrastrar y soltar
        const zone = $('.page', main);
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drop-active'); });
        zone.addEventListener('dragleave', (e) => { if (e.target === zone) zone.classList.remove('drop-active'); });
        zone.addEventListener('drop', async (e) => {
          e.preventDefault(); zone.classList.remove('drop-active');
          const files = Array.from(e.dataTransfer.files || []);
          if (files.length) addPhotos(a, files);
        });
      }
    }
  }

  async function addPhotos(album, files) {
    const photos = await processMany(files, App.slug(album.id));
    if (!photos.length) return;
    album.photos = (album.photos || []).concat(photos);
    saveDraft(); App.render();
  }

  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };

  async function onAction(e) {
    const b = e.target.closest('[data-act]');
    if (!b || !App.isAdmin) return;
    e.preventDefault(); e.stopPropagation();
    const [act, a1, a2] = b.dataset.act.split(':');
    const sIdx = App.content.sections.findIndex((s) => s.id === App.route.section);
    const s = App.content.sections[sIdx < 0 ? 0 : sIdx];
    const albums = s.albums || (s.albums = []);
    const album = albums.find((x) => x.id === App.route.album);

    switch (act) {
      case 'hero-image': case 'about-image': {
        const ph = await askImage(act === 'hero-image' ? 'Imagen de portada' : 'Foto de «Sobre mí»', 'site');
        if (ph) { s.image = ph; saveDraft(); App.render(); }
        break;
      }
      case 'hero-cta': {
        const v = await form({
          title: 'Botón de la portada',
          fields: [
            { name: 'cta', label: 'Texto del botón (vacío = sin botón)', value: s.cta || '' },
            { name: 'ctaTarget', label: 'Lleva a la sección', type: 'select', value: s.ctaTarget, options: App.content.sections.map((x) => ({ value: x.id, label: x.label })) }
          ]
        });
        if (v) { s.cta = v.cta; s.ctaTarget = v.ctaTarget; saveDraft(); App.render(); }
        break;
      }
      case 'album-add': {
        const v = await form({ title: 'Nueva galería', fields: [
          { name: 'title', label: 'Nombre de la galería', required: true, placeholder: 'Ej.: Bodas' },
          { name: 'description', label: 'Descripción (opcional)' }
        ], submit: 'Crear' });
        if (!v) return;
        const all = App.content.sections.flatMap((x) => (x.albums || []).map((y) => y.id));
        const id = App.uniqueId(v.title, all);
        albums.push({ id, title: v.title, description: v.description, cover: 0, photos: [] });
        saveDraft(); App.go(s.id, id);
        break;
      }
      case 'album-move': if (move(albums, +a1, +a2)) { saveDraft(); App.render(); } break;
      case 'album-del': case 'album-del-current': {
        const i = act === 'album-del' ? +a1 : albums.indexOf(album);
        const al = albums[i];
        if (!(await confirmDlg('Eliminar galería', `¿Seguro que quieres eliminar «${al.title}» y sus ${al.photos.length} foto(s)? Al publicar, se borrarán también del repositorio.`, 'Eliminar'))) return;
        albums.splice(i, 1); saveDraft();
        if (act === 'album-del-current') App.go(s.id); else App.render();
        break;
      }
      case 'photos-add': { const files = await pickFiles(true); if (files.length) addPhotos(album, files); break; }
      case 'photos-url': {
        const v = await form({ title: 'Añadir foto por URL', fields: [
          { name: 'url', label: 'URL de la imagen', type: 'url', required: true, placeholder: 'https://…' },
          { name: 'alt', label: 'Descripción (texto alternativo)' },
          { name: 'caption', label: 'Pie de foto (opcional)' }
        ], submit: 'Añadir' });
        if (v) { album.photos.push({ src: v.url, alt: v.alt, caption: v.caption }); saveDraft(); App.render(); }
        break;
      }
      case 'photo-move': {
        const i = +a1, j = i + +a2;
        if (move(album.photos, i, +a2)) {
          const c = album.cover || 0;
          if (c === i) album.cover = j; else if (c === j) album.cover = i;
          saveDraft(); App.render();
        }
        break;
      }
      case 'photo-edit': {
        const ph = album.photos[+a1];
        const v = await form({ title: 'Editar foto', fields: [
          { name: 'caption', label: 'Pie de foto (visible)', value: ph.caption },
          { name: 'alt', label: 'Descripción (texto alternativo)', value: ph.alt, help: 'No se ve, pero lo leen los buscadores y lectores de pantalla.' }
        ] });
        if (v) { ph.caption = v.caption; ph.alt = v.alt; saveDraft(); App.render(); }
        break;
      }
      case 'photo-cover': album.cover = +a1; saveDraft(); App.render(); App.toast('Portada actualizada'); break;
      case 'photo-del': {
        if (!(await confirmDlg('Eliminar foto', '¿Eliminar esta foto de la galería?', 'Eliminar'))) return;
        const i = +a1;
        album.photos.splice(i, 1);
        const c = album.cover || 0;
        if (c === i) album.cover = 0; else if (c > i) album.cover = c - 1;
        saveDraft(); App.render();
        break;
      }
    }
  }

  /* ---------- Secciones del menú ---------- */
  const TYPE_NAMES = { hero: 'Portada', galleries: 'Galerías', about: 'Texto con foto', text: 'Texto', contact: 'Contacto' };

  async function manageSections() {
    const draft = JSON.parse(JSON.stringify(App.content.sections));
    const rowsHtml = () => draft.map((s, i) => `
      <div class="sec-row" data-i="${i}">
        <div>
          <input type="text" value="${esc(s.label)}" data-label="${i}" aria-label="Nombre del botón">
          <div class="type">${TYPE_NAMES[s.type] || s.type} · #/${esc(s.id)}</div>
        </div>
        <div class="acts">
          <button type="button" data-sm="up:${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
          <button type="button" data-sm="down:${i}" ${i === draft.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
          <button type="button" data-sm="del:${i}" aria-label="Eliminar">🗑</button>
        </div>
      </div>`).join('');

    const v = await form({
      title: 'Secciones del menú',
      wide: true,
      fields: [
        { type: 'note', label: 'Cada sección es un botón del menú superior. Cambia el nombre, el orden o elimina las que no necesites.' },
        { type: 'html', html: '<div class="sec-list" id="secList"></div>' },
        { type: 'heading', label: 'Añadir sección' },
        { type: 'html', html: `<div class="field" style="grid-template-columns:1fr auto auto;align-items:end;gap:8px">
            <div class="field"><label for="newSecName">Nombre</label><input type="text" id="newSecName" placeholder="Ej.: Bodas"></div>
            <div class="field"><label for="newSecType">Tipo</label><select id="newSecType">
              <option value="galleries">Galerías de fotos</option><option value="about">Texto con foto</option>
              <option value="text">Solo texto</option><option value="contact">Contacto</option><option value="hero">Portada</option></select></div>
            <button type="button" class="btn btn-sm" id="newSecAdd">Añadir</button></div>` }
      ],
      submit: 'Guardar cambios',
      onMount(api) {
        const list = $('#secList', api.dlg);
        const paint = () => { list.innerHTML = rowsHtml(); };
        paint();
        list.addEventListener('input', (e) => { const i = e.target.dataset.label; if (i != null) draft[i].label = e.target.value; });
        list.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-sm]'); if (!b) return;
          const [op, i] = b.dataset.sm.split(':').map((x, k) => (k ? +x : x));
          if (op === 'up') move(draft, i, -1);
          if (op === 'down') move(draft, i, 1);
          if (op === 'del') {
            if (draft.length === 1) return api.error('Debe quedar al menos una sección.');
            const n = (draft[i].albums || []).length;
            if (!window.confirm(`¿Eliminar la sección «${draft[i].label}»${n ? ` y sus ${n} galería(s)` : ''}?`)) return;
            draft.splice(i, 1);
          }
          paint();
        });
        $('#newSecAdd', api.dlg).onclick = () => {
          const name = $('#newSecName', api.dlg).value.trim();
          const type = $('#newSecType', api.dlg).value;
          if (!name) return api.error('Escribe un nombre para la nueva sección.');
          api.error('');
          const id = App.uniqueId(name, draft.map((s) => s.id));
          const s = { id, type, label: name, title: name };
          if (type === 'galleries') Object.assign(s, { intro: '', albums: [] });
          if (type === 'about') Object.assign(s, { text: '', image: null });
          if (type === 'text' || type === 'contact') s.text = '';
          if (type === 'hero') Object.assign(s, { subtitle: '', cta: '', ctaTarget: draft[0].id, image: null });
          draft.push(s);
          $('#newSecName', api.dlg).value = '';
          paint();
        };
      }
    });
    if (!v) return;
    draft.forEach((s) => { s.label = (s.label || '').trim() || TYPE_NAMES[s.type]; });
    App.content.sections = draft;
    saveDraft();
    if (!draft.some((s) => s.id === App.route.section)) App.go(draft[0].id); else App.render();
  }

  /* ---------- Ajustes ---------- */
  async function openSettings() {
    const site = App.content.site; const gh = App.content.admin.github;
    const v = await form({
      title: 'Ajustes del sitio',
      wide: true,
      fields: [
        { type: 'heading', label: 'Identidad' },
        { name: 'brand', label: 'Nombre de marca (logo)', value: site.brand, required: true },
        { name: 'title', label: 'Nombre completo / título del sitio', value: site.title },
        { name: 'tagline', label: 'Lema bajo el logo', value: site.tagline },
        { name: 'footer', label: 'Texto del pie de página', type: 'textarea', value: site.footer },
        { type: 'heading', label: 'Contacto' },
        { name: 'email', label: 'Email donde recibir los mensajes del chat', type: 'email', value: site.email, required: true },
        { name: 'instagram', label: 'Usuario de Instagram (sin @)', value: site.instagram },
        { type: 'heading', label: 'Publicación en GitHub' },
        { name: 'owner', label: 'Usuario/organización de GitHub', value: gh.owner },
        { name: 'repo', label: 'Repositorio', value: gh.repo },
        { name: 'branch', label: 'Rama publicada', value: gh.branch, help: 'La rama que GitHub Pages usa para servir la web (normalmente main).' },
        { type: 'heading', label: 'Seguridad' },
        { name: 'pass1', label: 'Nueva contraseña de administrador (dejar vacío para no cambiar)', type: 'password', autocomplete: 'new-password' },
        { name: 'pass2', label: 'Repite la nueva contraseña', type: 'password', autocomplete: 'new-password' }
      ],
      onMount(api) {
        api.onSubmit = (vals) => {
          if (vals.pass1 !== vals.pass2) throw new Error('Las contraseñas no coinciden.');
          if (vals.pass1 && vals.pass1.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(vals.email)) throw new Error('El email no es válido.');
        };
      }
    });
    if (!v) return;
    Object.assign(site, { brand: v.brand, title: v.title, tagline: v.tagline, footer: v.footer, email: v.email, instagram: v.instagram.replace(/^@/, '') });
    Object.assign(gh, { owner: v.owner, repo: v.repo, branch: v.branch || 'main' });
    if (v.pass1) { App.content.admin.passwordHash = await sha256(v.pass1); App.toast('Contraseña cambiada. Se aplicará al publicar.'); }
    saveDraft(); App.render();
  }

  /* ---------- Más opciones ---------- */
  async function openMore() {
    await form({
      title: 'Más opciones',
      submit: null, cancel: 'Cerrar',
      fields: [
        { type: 'html', html: `
          <div style="display:grid;gap:10px">
            <button type="button" class="btn btn-ghost" data-more="export">⬇ Descargar copia de seguridad (content.json)</button>
            <button type="button" class="btn btn-ghost" data-more="import">⬆ Importar content.json</button>
            <button type="button" class="btn btn-ghost" data-more="discard">↺ Descartar cambios sin publicar</button>
            <button type="button" class="btn btn-ghost" data-more="forget">🔑 Olvidar token de GitHub guardado</button>
          </div>` }
      ],
      onMount(api) {
        api.dlg.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-more]'); if (!b) return;
          const op = b.dataset.more;
          if (op === 'export') {
            const blob = new Blob([JSON.stringify(App.content, null, 2) + '\n'], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'content.json'; a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
          }
          if (op === 'import') {
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
            inp.onchange = async () => {
              try {
                const data = JSON.parse(await inp.files[0].text());
                if (!data.site || !Array.isArray(data.sections)) throw new Error('Formato no válido');
                App.content = data; saveDraft(); api.close(null); App.go(data.sections[0].id); App.render();
                App.toast('Contenido importado. Pulsa «Publicar» para subirlo.');
              } catch (err) { api.error('No se pudo importar: ' + err.message); }
            };
            inp.click();
          }
          if (op === 'discard') {
            if (!window.confirm('¿Descartar todos los cambios sin publicar?')) return;
            await discardDraft();
            const res = await fetch('content.json', { cache: 'no-cache' });
            App.content = await res.json();
            api.close(null); updateStatus(); App.render(); App.toast('Cambios descartados');
          }
          if (op === 'forget') { try { localStorage.removeItem(LS_TOKEN); } catch (err) { /* nada */ } App.toast('Token olvidado'); }
        });
      }
    });
  }

  /* ---------- Publicar en GitHub ---------- */
  async function gh(token, method, path, body) {
    const res = await fetch('https://api.github.com' + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = res.status === 401 ? 'Token no válido o caducado.'
        : res.status === 403 ? 'El token no tiene permiso de escritura (Contents: Read and write) en este repositorio.'
        : res.status === 404 ? 'Repositorio o rama no encontrados. Revisa Ajustes › Publicación en GitHub y los permisos del token.'
        : res.status === 409 || res.status === 422 ? 'Conflicto con el repositorio (' + (json.message || res.status) + '). Inténtalo de nuevo.'
        : (json.message || 'Error ' + res.status);
      throw new Error(msg);
    }
    return json;
  }

  function referencedPaths(content) {
    const set = new Set();
    const addPhoto = (p) => {
      if (!p) return;
      [p.src].concat((p.srcset || '').split(',').map((x) => x.trim().split(/\s+/)[0])).forEach((u) => { if (u && u.startsWith('images/')) set.add(u); });
    };
    content.sections.forEach((s) => {
      addPhoto(s.image);
      (s.albums || []).forEach((a) => (a.photos || []).forEach(addPhoto));
    });
    return set;
  }

  async function publish(token, message, progress) {
    const { owner, repo, branch } = App.content.admin.github;
    const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    progress(5, 'Conectando con GitHub…');
    const ref = await gh(token, 'GET', `${base}/git/ref/heads/${encodeURIComponent(branch)}`);
    const parentSha = ref.object.sha;
    const parent = await gh(token, 'GET', `${base}/git/commits/${parentSha}`);
    const tree = await gh(token, 'GET', `${base}/git/trees/${parent.tree.sha}?recursive=1`);
    const existing = new Set(tree.tree.filter((t) => t.type === 'blob').map((t) => t.path));

    const used = referencedPaths(App.content);
    const uploads = [...Admin.pending.entries()].filter(([p]) => used.has(p) && !existing.has(p));
    const entries = [];
    let done = 0;
    const total = uploads.length + 1;
    for (const [path, blob] of uploads) {
      progress(10 + Math.round(75 * done / total), `Subiendo imágenes (${done + 1}/${uploads.length})…`);
      const b = await gh(token, 'POST', `${base}/git/blobs`, { content: await blobToBase64(blob), encoding: 'base64' });
      entries.push({ path, mode: '100644', type: 'blob', sha: b.sha });
      done++;
    }
    progress(86, 'Guardando contenido…');
    const json = new Blob([JSON.stringify(App.content, null, 2) + '\n'], { type: 'application/json' });
    const cb = await gh(token, 'POST', `${base}/git/blobs`, { content: await blobToBase64(json), encoding: 'base64' });
    entries.push({ path: 'content.json', mode: '100644', type: 'blob', sha: cb.sha });

    // Limpieza: imágenes del repositorio que ya no se usan
    let removed = 0;
    if (!tree.truncated) {
      existing.forEach((p) => {
        if (p.startsWith('images/') && !used.has(p) && /\.(webp|jpe?g|png|gif|avif)$/i.test(p)) {
          entries.push({ path: p, mode: '100644', type: 'blob', sha: null }); removed++;
        }
      });
    }

    progress(92, 'Creando versión…');
    const newTree = await gh(token, 'POST', `${base}/git/trees`, { base_tree: parent.tree.sha, tree: entries });
    const commit = await gh(token, 'POST', `${base}/git/commits`, { message, tree: newTree.sha, parents: [parentSha] });
    await gh(token, 'PATCH', `${base}/git/refs/heads/${encodeURIComponent(branch)}`, { sha: commit.sha });
    progress(100, 'Publicado');
    return { uploaded: uploads.length, removed };
  }

  async function openPublish() {
    let saved = '';
    try { saved = localStorage.getItem(LS_TOKEN) || ''; } catch (e) { /* nada */ }
    const { owner, repo, branch } = App.content.admin.github;
    await form({
      title: 'Publicar cambios',
      submit: 'Publicar ahora',
      fields: [
        { type: 'note', html: `Se guardarán los textos, secciones y fotos en <strong>${esc(owner)}/${esc(repo)}</strong> (rama <strong>${esc(branch)}</strong>). La web se actualiza sola en 1-2 minutos.` },
        { name: 'token', label: 'Token de GitHub', type: 'password', value: saved, required: true, autocomplete: 'off',
          help: 'Créalo en GitHub › Settings › Developer settings › Fine-grained tokens, solo para este repositorio y con permiso «Contents: Read and write». Consulta el README.' },
        { name: 'remember', label: 'Recordar el token en este dispositivo', type: 'checkbox', value: !!saved },
        { name: 'message', label: 'Descripción del cambio', value: 'Actualizar contenido desde el modo administrador' },
        { type: 'html', html: '<div class="progress" hidden><i></i></div><small class="progress-label"></small>' }
      ],
      onMount(api) {
        const bar = $('.progress', api.dlg), lab = $('.progress-label', api.dlg);
        api.onSubmit = async (vals) => {
          api.error('');
          $$('button', api.dlg).forEach((b) => { b.disabled = true; });
          bar.hidden = false;
          try {
            const r = await publish(vals.token, vals.message || 'Actualizar contenido', (pct, txt) => { $('i', bar).style.width = pct + '%'; lab.textContent = txt; });
            try { if (vals.remember) localStorage.setItem(LS_TOKEN, vals.token); else localStorage.removeItem(LS_TOKEN); } catch (e) { /* nada */ }
            await discardDraft(); // los blobs siguen en memoria (App.blobUrls) para la vista previa
            updateStatus();
            App.toast(`¡Publicado! ${r.uploaded ? r.uploaded + ' imagen(es) subidas. ' : ''}La web se actualizará en 1-2 minutos.`, 6000);
          } finally {
            $$('button', api.dlg).forEach((b) => { b.disabled = false; });
          }
        };
      }
    });
  }

  /* ---------- Entrar / salir ---------- */
  async function login() {
    history.replaceState(null, '', location.pathname + location.search + '#/');
    if (App.isAdmin) return;
    await form({
      title: 'Acceso administrador',
      submit: 'Entrar',
      fields: [{ name: 'pass', label: 'Contraseña', type: 'password', required: true, autocomplete: 'current-password' }],
      onMount(api) {
        api.onSubmit = async (v) => {
          if ((await sha256(v.pass)) !== App.content.admin.passwordHash) throw new Error('Contraseña incorrecta.');
          try { sessionStorage.setItem(SS_ADMIN, '1'); } catch (e) { /* nada */ }
          await enter();
        };
      }
    });
  }

  async function enter() {
    App.isAdmin = true;
    document.body.classList.add('admin-mode');
    // Recupera borrador sin publicar
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(LS_DRAFT) || 'null'); } catch (e) { draft = null; }
    if (draft && draft.site && Array.isArray(draft.sections)) {
      App.content = draft; Admin.dirty = true;
      try {
        const files = await IDB.all();
        files.forEach((blob, path) => { Admin.pending.set(path, blob); if (!App.blobUrls.has(path)) App.blobUrls.set(path, URL.createObjectURL(blob)); });
      } catch (e) { /* nada */ }
      App.toast('Se ha recuperado un borrador sin publicar');
    }
    buildBar();
    App.render();
  }

  function exitAdmin() {
    if (Admin.dirty && !window.confirm('Tienes cambios sin publicar. Se quedarán guardados en este navegador como borrador. ¿Salir del modo admin?')) return;
    try { sessionStorage.removeItem(SS_ADMIN); } catch (e) { /* nada */ }
    location.hash = '#/';
    location.reload();
  }

  Admin.boot = async function () {
    App.hooks.afterRender.push(decorate);
    $('#main').addEventListener('click', onAction, true);
    $('#siteHeader').addEventListener('click', (e) => { if (App.isAdmin && e.target.closest('[data-edit]')) e.preventDefault(); });
    $('#adminLink').addEventListener('click', (e) => { e.preventDefault(); login(); });
    window.addEventListener('hashchange', () => { if (location.hash === '#admin') login(); });
    // Atajo de teclado: Ctrl/Cmd + Shift + E
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); login(); } });

    let flag = null;
    try { flag = sessionStorage.getItem(SS_ADMIN); } catch (e) { /* nada */ }
    if (flag === '1') await enter();
    else if (location.hash === '#admin') setTimeout(login, 0);
  };

  Admin.disable = disableEditables;
})();
