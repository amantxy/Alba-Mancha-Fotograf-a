/* =========================================================
   AM96 Photo · Lógica pública del sitio
   - Carga content.json y pinta las secciones
   - Menú por botones con rutas (#/seccion/galeria)
   - Visor de fotos, tema claro/oscuro/sistema y chat de contacto
   ========================================================= */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const App = {
    content: null,
    isAdmin: false,
    blobUrls: new Map(),   // rutas pendientes de publicar -> URL local (vista previa en admin)
    route: { section: null, album: null },
    hooks: { afterRender: [] }
  };
  window.App = App;

  /* ---------- Utilidades ---------- */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  App.esc = esc;

  App.slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';

  App.uniqueId = (base, existing) => {
    let id = App.slug(base), n = 2;
    const set = new Set(existing);
    while (set.has(id)) id = App.slug(base) + '-' + n++;
    return id;
  };

  App.resolve = (url) => (url && App.blobUrls.has(url)) ? App.blobUrls.get(url) : url;

  App.toast = (msg, ms = 2800) => {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(App._toastT);
    App._toastT = setTimeout(() => { t.hidden = true; }, ms);
  };

  App.getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  App.setPath = (obj, path, val) => {
    const keys = path.split('.'); const last = keys.pop();
    const target = keys.reduce((o, k) => o[k], obj);
    target[last] = val;
  };

  /**
   * Genera una etiqueta <img> responsive.
   * srcset permite que móvil, tablet y pantallas retina descarguen la
   * resolución adecuada sin perder calidad.
   */
  App.img = (photo, { sizes = '100vw', eager = false, cls = '' } = {}) => {
    if (!photo || !photo.src) return '';
    const src = App.resolve(photo.src);
    let srcset = '';
    if (photo.srcset) {
      srcset = photo.srcset.split(',').map((part) => {
        const [u, d] = part.trim().split(/\s+/);
        return App.resolve(u) + (d ? ' ' + d : '');
      }).join(', ');
    }
    const dims = photo.w && photo.h ? ` width="${photo.w}" height="${photo.h}"` : '';
    return `<img src="${esc(src)}"${srcset ? ` srcset="${esc(srcset)}" sizes="${esc(sizes)}"` : ''}${dims}` +
      ` alt="${esc(photo.alt || '')}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"` +
      `${cls ? ` class="${cls}"` : ''}>`;
  };

  const ICONS = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    ig: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" class="fill"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'
  };
  App.ICONS = ICONS;

  /* ---------- Tema claro / oscuro / sistema ---------- */
  const THEMES = ['system', 'light', 'dark'];
  const THEME_LABEL = { system: 'Sistema', light: 'Claro', dark: 'Oscuro' };
  const mq = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(pref) {
    const dark = pref === 'dark' || (pref === 'system' && mq.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themePref = pref;
    $('#themeLabel').textContent = THEME_LABEL[pref];
    $('#themeToggle').setAttribute('aria-label', 'Tema: ' + THEME_LABEL[pref] + '. Pulsa para cambiar');
  }
  function currentThemePref() {
    try { return localStorage.getItem('theme') || 'system'; } catch (e) { return 'system'; }
  }
  function initTheme() {
    applyTheme(currentThemePref());
    $('#themeToggle').addEventListener('click', () => {
      const next = THEMES[(THEMES.indexOf(currentThemePref()) + 1) % THEMES.length];
      try { localStorage.setItem('theme', next); } catch (e) { /* sin almacenamiento */ }
      applyTheme(next);
      App.toast('Tema: ' + THEME_LABEL[next]);
    });
    mq.addEventListener('change', () => applyTheme(currentThemePref()));
  }

  /* ---------- Rutas ---------- */
  function parseRoute() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    if (h === 'admin') return null;
    const [section, album] = h.split('/').filter(Boolean);
    return { section: section || null, album: album || null };
  }
  App.go = (section, album) => { location.hash = '#/' + (section || '') + (album ? '/' + album : ''); };

  /* ---------- Render ---------- */
  App.findSection = (id) => App.content.sections.find((s) => s.id === id);

  function renderChrome() {
    const c = App.content; const site = c.site;
    document.title = site.brand + ' · ' + site.title;
    $$('[data-edit="site.brand"]').forEach((el) => { el.textContent = site.brand; });
    $$('[data-edit="site.title"]').forEach((el) => { el.textContent = site.title; });
    $$('[data-edit="site.tagline"]').forEach((el) => { el.textContent = site.tagline; });
    $$('[data-edit="site.footer"]').forEach((el) => { el.textContent = site.footer; });
    const ig = 'https://instagram.com/' + encodeURIComponent(site.instagram);
    $('#headerInstagram').href = ig;
    $('#footerInstagram').href = ig;
    $('#footerInstagram').textContent = '@' + site.instagram;
    $('#footerEmail').href = 'mailto:' + site.email;
    $('#footerEmail').textContent = site.email;
    $('#year').textContent = new Date().getFullYear();

    const current = App.route.section || (c.sections[0] && c.sections[0].id);
    $('#mainNav').innerHTML = c.sections.map((s) =>
      `<a role="listitem" class="nav-btn" href="#/${esc(s.id)}"${s.id === current ? ' aria-current="page"' : ''}>${esc(s.label)}</a>`
    ).join('');
    const active = $('#mainNav [aria-current]');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
    document.documentElement.style.setProperty('--header-h', $('#siteHeader').offsetHeight + 'px');
  }

  function viewHero(s, idx) {
    const p = `sections.${idx}`;
    // Galerías destacadas: primeras portadas de todas las secciones de galerías
    const featured = [];
    App.content.sections.forEach((sec) => {
      if (sec.type === 'galleries') (sec.albums || []).forEach((a) => featured.push({ sec, a }));
    });
    return `
      <section class="hero" data-section="${idx}">
        <div class="hero-media">${App.img(s.image, { eager: true, sizes: '100vw' })}</div>
        <div class="hero-content">
          <h1 class="hero-title" data-edit="${p}.title" data-placeholder="Título">${esc(s.title)}</h1>
          <p class="hero-subtitle" data-edit="${p}.subtitle" data-placeholder="Subtítulo">${esc(s.subtitle)}</p>
          ${s.cta && s.ctaTarget ? `<a class="btn btn-light" href="#/${esc(s.ctaTarget)}"><span data-edit="${p}.cta">${esc(s.cta)}</span></a>` : ''}
        </div>
      </section>
      ${featured.length ? `
      <section class="featured">
        <div class="container">
          <h2>Galerías</h2>
          <div class="album-grid">${featured.slice(0, 6).map(({ sec, a }) => albumCard(sec, a, null)).join('')}</div>
        </div>
      </section>` : ''}`;
  }

  function albumCard(sec, a, path) {
    const cover = a.photos && a.photos[a.cover || 0] || (a.photos && a.photos[0]);
    const n = (a.photos || []).length;
    return `
      <a class="album-card${cover ? '' : ' empty'}" href="#/${esc(sec.id)}/${esc(a.id)}" data-album="${esc(a.id)}" data-section-id="${esc(sec.id)}">
        <div class="cover">${cover ? App.img(cover, { sizes: '(min-width: 1024px) 33vw, (min-width: 600px) 50vw, 100vw' }) : ICONS.camera}</div>
        <div class="meta">
          <span class="count">${n} ${n === 1 ? 'foto' : 'fotos'}</span>
          <h3${path ? ` data-edit="${path}.title" data-placeholder="Título"` : ''}>${esc(a.title)}</h3>
          ${a.description || path ? `<p${path ? ` data-edit="${path}.description" data-placeholder="Descripción"` : ''}>${esc(a.description)}</p>` : ''}
        </div>
      </a>`;
  }

  function viewGalleries(s, idx) {
    const p = `sections.${idx}`;
    const albums = s.albums || [];
    if (App.route.album) {
      const ai = albums.findIndex((a) => a.id === App.route.album);
      if (ai === -1) return viewGalleriesList(s, idx, p, albums);
      const a = albums[ai]; const ap = `${p}.albums.${ai}`;
      return `
        <section class="page" data-section="${idx}" data-album-index="${ai}">
          <div class="container">
            <a class="back-link" href="#/${esc(s.id)}">${ICONS.back}<span>${esc(s.title || s.label)}</span></a>
            <h1 class="page-title" data-edit="${ap}.title" data-placeholder="Título de la galería">${esc(a.title)}</h1>
            <p class="page-intro" data-edit="${ap}.description" data-placeholder="Descripción de la galería">${esc(a.description)}</p>
            <div class="admin-slot" data-slot="album"></div>
            ${(a.photos || []).length ? `
            <div class="photo-grid" id="photoGrid">
              ${a.photos.map((ph, i) => `
                <figure class="photo" data-photo="${i}">
                  <button class="open" type="button" data-open="${i}" aria-label="Ver foto ${i + 1}${ph.alt ? ': ' + esc(ph.alt) : ''}">
                    ${App.img(ph, { sizes: '(min-width: 1600px) 25vw, (min-width: 1024px) 33vw, (min-width: 600px) 50vw, 100vw' })}
                  </button>
                  <figcaption>${esc(ph.caption)}</figcaption>
                </figure>`).join('')}
            </div>` : '<div class="empty-state">Esta galería todavía no tiene fotos.</div>'}
          </div>
        </section>`;
    }
    return viewGalleriesList(s, idx, p, albums);
  }

  function viewGalleriesList(s, idx, p, albums) {
    return `
      <section class="page" data-section="${idx}">
        <div class="container">
          <h1 class="page-title" data-edit="${p}.title" data-placeholder="Título">${esc(s.title)}</h1>
          <p class="page-intro" data-edit="${p}.intro" data-placeholder="Texto de introducción">${esc(s.intro)}</p>
          <div class="album-grid" id="albumGrid">
            ${albums.map((a, i) => albumCard(s, a, App.isAdmin ? `${p}.albums.${i}` : null)).join('')}
            ${App.isAdmin ? '<div class="admin-slot" data-slot="albums"></div>' : ''}
          </div>
          ${!albums.length && !App.isAdmin ? '<div class="empty-state">Próximamente nuevas galerías.</div>' : ''}
        </div>
      </section>`;
  }

  function viewAbout(s, idx) {
    const p = `sections.${idx}`;
    return `
      <section class="page" data-section="${idx}">
        <div class="container about">
          <div class="about-media">${s.image && s.image.src ? App.img(s.image, { sizes: '(min-width: 860px) 45vw, 100vw' }) : (App.isAdmin ? '<div class="empty-state" style="aspect-ratio:4/5;display:grid;place-items:center">Sin foto</div>' : '')}${App.isAdmin ? '<div class="admin-slot" data-slot="image"></div>' : ''}</div>
          <div>
            <h1 class="page-title" data-edit="${p}.title" data-placeholder="Título">${esc(s.title)}</h1>
            <div class="prose" data-edit="${p}.text" data-multiline data-placeholder="Escribe aquí tu texto">${esc(s.text)}</div>
          </div>
        </div>
      </section>`;
  }

  function viewText(s, idx) {
    const p = `sections.${idx}`;
    return `
      <section class="page" data-section="${idx}">
        <div class="container">
          <h1 class="page-title" data-edit="${p}.title" data-placeholder="Título">${esc(s.title)}</h1>
          <div class="prose" style="max-width:760px" data-edit="${p}.text" data-multiline data-placeholder="Escribe aquí tu texto">${esc(s.text)}</div>
        </div>
      </section>`;
  }

  function viewContact(s, idx) {
    const p = `sections.${idx}`; const site = App.content.site;
    return `
      <section class="page" data-section="${idx}">
        <div class="container contact">
          <div>
            <h1 class="page-title" data-edit="${p}.title" data-placeholder="Título">${esc(s.title)}</h1>
            <p class="prose" data-edit="${p}.text" data-multiline data-placeholder="Texto">${esc(s.text)}</p>
          </div>
          <div class="contact-cards">
            <button class="contact-card" type="button" data-open-chat>
              <span class="ico">${ICONS.chat}</span>
              <span><strong>Chat de contacto</strong><span>Escríbeme y te respondo por email</span></span>
            </button>
            <a class="contact-card" href="mailto:${esc(site.email)}">
              <span class="ico">${ICONS.mail}</span>
              <span><strong>Email</strong><span>${esc(site.email)}</span></span>
            </a>
            <a class="contact-card" href="https://instagram.com/${esc(encodeURIComponent(site.instagram))}" target="_blank" rel="noopener">
              <span class="ico">${ICONS.ig}</span>
              <span><strong>Instagram</strong><span>@${esc(site.instagram)}</span></span>
            </a>
          </div>
        </div>
      </section>`;
  }

  const VIEWS = { hero: viewHero, galleries: viewGalleries, about: viewAbout, text: viewText, contact: viewContact };

  App.render = () => {
    const c = App.content;
    const r = parseRoute() || App.route;
    let idx = c.sections.findIndex((s) => s.id === r.section);
    if (idx === -1) idx = 0;
    App.route = { section: c.sections[idx] ? c.sections[idx].id : null, album: r.album };
    renderChrome();
    const s = c.sections[idx];
    const main = $('#main');
    main.innerHTML = s ? (VIEWS[s.type] || viewText)(s, idx) : '<div class="container page"><div class="empty-state">No hay secciones.</div></div>';

    // Fundido suave al cargar cada imagen
    $$('img[loading="lazy"]', main).forEach((img) => {
      if (img.complete) img.classList.add('loaded');
      else { img.addEventListener('load', () => img.classList.add('loaded'), { once: true }); img.addEventListener('error', () => img.classList.add('loaded'), { once: true }); }
    });

    App.hooks.afterRender.forEach((fn) => fn(s, idx));
  };

  function onRouteChange() {
    const r = parseRoute();
    if (!r) return; // #admin lo gestiona admin.js
    const changed = r.section !== App.route.section || r.album !== App.route.album;
    App.render();
    if (changed) { window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' }); $('#main').focus({ preventScroll: true }); }
  }

  /* ---------- Visor de fotos ---------- */
  const LB = { photos: [], i: 0 };
  const resolveSrcset = (ss) => ss.split(',').map((p) => { const [u, d] = p.trim().split(/\s+/); return App.resolve(u) + (d ? ' ' + d : ''); }).join(', ');
  function lbShow(i) {
    LB.i = (i + LB.photos.length) % LB.photos.length;
    const ph = LB.photos[LB.i];
    const img = $('#lbImg');
    img.removeAttribute('srcset');
    if (ph.srcset) {
      img.srcset = resolveSrcset(ph.srcset);
      img.sizes = '100vw';
    }
    img.src = App.resolve(ph.src);
    img.alt = ph.alt || '';
    $('#lbCaption').textContent = ph.caption || '';
    $('#lbCounter').textContent = (LB.i + 1) + ' / ' + LB.photos.length;
    // Precarga de la siguiente
    const nx = LB.photos[(LB.i + 1) % LB.photos.length];
    if (nx && LB.photos.length > 1) { const pre = new Image(); if (nx.srcset) { pre.sizes = '100vw'; pre.srcset = resolveSrcset(nx.srcset); } pre.src = App.resolve(nx.src); }
  }
  function lbOpen(photos, i) {
    LB.photos = photos; LB.lastFocus = document.activeElement;
    $('#lightbox').hidden = false; document.body.style.overflow = 'hidden';
    lbShow(i); $('#lbClose').focus();
  }
  function lbClose() {
    $('#lightbox').hidden = true; document.body.style.overflow = '';
    if (LB.lastFocus) LB.lastFocus.focus();
  }
  function initLightbox() {
    $('#lbClose').onclick = lbClose;
    $('#lbPrev').onclick = () => lbShow(LB.i - 1);
    $('#lbNext').onclick = () => lbShow(LB.i + 1);
    $('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox' || e.target.classList.contains('lb-figure')) lbClose(); });
    document.addEventListener('keydown', (e) => {
      if ($('#lightbox').hidden) return;
      if (e.key === 'Escape') lbClose();
      else if (e.key === 'ArrowLeft') lbShow(LB.i - 1);
      else if (e.key === 'ArrowRight') lbShow(LB.i + 1);
    });
    let x0 = null, y0 = null;
    $('#lightbox').addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    $('#lightbox').addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) lbShow(LB.i + (dx < 0 ? 1 : -1));
      x0 = null;
    });

    $('#main').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open]');
      if (btn && !(App.isAdmin && e.target.closest('[data-edit]'))) {
        const s = App.findSection(App.route.section);
        const a = s && (s.albums || []).find((x) => x.id === App.route.album);
        if (a) lbOpen(a.photos, +btn.dataset.open);
      }
      if (e.target.closest('[data-open-chat]')) Chat.open();
    });
  }

  /* ---------- Chat de contacto (envío por email) ----------
     Usa FormSubmit (https://formsubmit.co), un servicio gratuito sin
     servidor que reenvía el mensaje al email configurado.
     La primera vez que alguien escriba, FormSubmit enviará un correo de
     activación a la dirección: hay que pulsar "Activate" una sola vez. */
  const Chat = {
    step: 0, data: {}, busy: false,
    steps: [
      { key: 'name', ask: () => '¡Hola! 👋 Soy el asistente de ' + App.content.site.brand + '. ¿Cómo te llamas?', placeholder: 'Tu nombre' },
      { key: 'email', ask: (d) => 'Encantada, ' + d.name + '. ¿A qué email te respondo?', placeholder: 'tu@email.com', type: 'email' },
      { key: 'topic', ask: () => '¿Sobre qué tipo de sesión o servicio quieres hablar?', chips: ['Boda', 'Retrato', 'Evento', 'Producto / marca', 'Otro'], placeholder: 'Elige o escribe…' },
      { key: 'message', ask: () => 'Perfecto. Cuéntame los detalles: fecha, lugar, idea… todo lo que quieras.', placeholder: 'Tu mensaje', multiline: true }
    ],
    el: () => $('#chatMessages'),
    open() {
      const p = $('#chatPanel');
      p.hidden = false; $('#chatFab').setAttribute('aria-expanded', 'true');
      if (!this.started) { this.started = true; this.ask(); }
      setTimeout(() => $('#chatText').focus(), 50);
    },
    close() { $('#chatPanel').hidden = true; $('#chatFab').setAttribute('aria-expanded', 'false'); $('#chatFab').focus(); },
    add(text, who, html) {
      const m = document.createElement('div');
      m.className = 'msg ' + who;
      if (html) m.innerHTML = text; else m.textContent = text;
      this.el().appendChild(m); this.el().scrollTop = this.el().scrollHeight;
      return m;
    },
    botSay(text, html) {
      return new Promise((res) => {
        const t = this.add('<i></i><i></i><i></i>', 'bot typing', true);
        setTimeout(() => { t.remove(); this.add(text, 'bot', html); res(); }, 550);
      });
    },
    chips(list, onPick) {
      const wrap = document.createElement('div'); wrap.className = 'chat-chips';
      list.forEach((label) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
        b.onclick = () => { wrap.remove(); onPick(label); };
        wrap.appendChild(b);
      });
      this.el().appendChild(wrap); this.el().scrollTop = this.el().scrollHeight;
    },
    async ask() {
      const st = this.steps[this.step];
      const input = $('#chatText');
      if (!st) return this.confirm();
      await this.botSay(st.ask(this.data));
      input.placeholder = st.placeholder || '';
      input.setAttribute('inputmode', st.type === 'email' ? 'email' : 'text');
      input.setAttribute('autocomplete', st.key === 'name' ? 'name' : st.key === 'email' ? 'email' : 'off');
      if (st.chips) this.chips(st.chips, (v) => this.answer(v));
      input.focus();
    },
    async answer(raw) {
      const v = String(raw).trim();
      if (!v || this.busy) return;
      if (this.awaitingConfirm) return;
      const st = this.steps[this.step];
      this.add(v, 'user');
      $$('.chat-chips', this.el()).forEach((c) => c.remove());
      if (st.key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        await this.botSay('Mmm, ese email no parece válido. ¿Puedes revisarlo?');
        return;
      }
      this.data[st.key] = v;
      this.step++;
      this.ask();
    },
    async confirm() {
      this.awaitingConfirm = true;
      const d = this.data;
      await this.botSay(`Genial, este es el resumen:\n\n• Nombre: ${d.name}\n• Email: ${d.email}\n• Tema: ${d.topic}\n• Mensaje: ${d.message}\n\n¿Lo envío?`);
      this.chips(['Enviar ✉️', 'Empezar de nuevo'], (v) => {
        this.awaitingConfirm = false;
        if (v.startsWith('Enviar')) this.send(); else this.reset();
      });
    },
    reset() { this.step = 0; this.data = {}; this.el().innerHTML = ''; this.ask(); },
    async send() {
      const d = this.data; const to = App.content.site.email;
      this.busy = true; $('.chat-send').disabled = true;
      const t = this.add('<i></i><i></i><i></i>', 'bot typing', true);
      try {
        const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(to), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            nombre: d.name, email: d.email, tema: d.topic, mensaje: d.message,
            _replyto: d.email,
            _subject: 'Nuevo mensaje web (' + d.topic + ') de ' + d.name,
            _template: 'table', _captcha: 'false'
          })
        });
        const json = await res.json().catch(() => ({}));
        t.remove();
        if (!res.ok || json.success === 'false' || json.success === false) throw new Error(json.message || 'Error');
        await this.botSay('¡Mensaje enviado! 🎉 Te responderé a ' + d.email + ' lo antes posible. Gracias por escribir.');
        this.chips(['Enviar otro mensaje'], () => this.reset());
      } catch (err) {
        t.remove();
        const body = encodeURIComponent(`Nombre: ${d.name}\nEmail: ${d.email}\nTema: ${d.topic}\n\n${d.message}`);
        const subj = encodeURIComponent('Contacto web: ' + d.topic);
        await this.botSay(`No he podido enviarlo automáticamente 😕. Puedes enviarlo con tu app de correo pulsando aquí: <a href="mailto:${esc(to)}?subject=${subj}&body=${body}">${esc(to)}</a>`, true);
        this.chips(['Reintentar', 'Empezar de nuevo'], (v) => (v === 'Reintentar' ? this.send() : this.reset()));
      } finally { this.busy = false; $('.chat-send').disabled = false; }
    }
  };
  App.Chat = Chat;

  function initChat() {
    $('#chatFab').onclick = () => ($('#chatPanel').hidden ? Chat.open() : Chat.close());
    $('#chatClose').onclick = () => Chat.close();
    const input = $('#chatText');
    const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
    input.addEventListener('input', grow);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chatForm').requestSubmit(); }
      if (e.key === 'Escape') Chat.close();
    });
    $('#chatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value; input.value = ''; grow();
      Chat.answer(v);
    });
  }

  /* ---------- Arranque ---------- */
  async function loadContent() {
    const res = await fetch('content.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('No se pudo cargar content.json');
    return res.json();
  }

  async function init() {
    initTheme();
    initLightbox();
    initChat();
    try {
      App.content = await loadContent();
    } catch (e) {
      $('#main').innerHTML = '<div class="container page"><div class="empty-state">No se pudo cargar el contenido. Si estás abriendo el archivo directamente, usa un servidor local o publica la web.</div></div>';
      console.error(e);
      return;
    }
    if (window.Admin) await window.Admin.boot();
    App.render();
    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('resize', () => {
      document.documentElement.style.setProperty('--header-h', $('#siteHeader').offsetHeight + 'px');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
