/**
 * Sr.L — Aplicação Principal
 * Renderização dinâmica, filtros instantâneos, efeitos 3D e integração com player.
 */
(function() {
  'use strict';

  const App = {
    allSets: [],
    filteredSets: [],
    activeGenre: 'all',
    searchQuery: '',
    sortMode: 'num-desc',
    player: null,

    init() {
      this.initElements();
      this.initViewMode();
      this.initMobileBar();
      this.initPlayer();
      this.initChipsNavigation();
      this.initScrollEffects();
      this.initMorphObserver();
      this.initMarquee();
      this.initSocials();
      this.initKeyboardShortcuts();
      this.loadData();
    },

    getSetByNumber(num) {
      return this.allSets.find(s => s.number === num);
    },

    handleCoverError(img, num) {
      if (!img) return;
      img.onerror = null;
      const set = this.getSetByNumber(num);
      if (set && window.SrLCover) {
        img.src = window.SrLCover.getDataUri(set);
      }
    },

    initElements() {
      this.gridEl = document.getElementById('sets-grid');
      this.searchInput = document.getElementById('search-input');
      this.sortSelect = document.getElementById('sort-select');
      this.genreChipsEl = document.getElementById('genre-chips');
      this.resultsCountEl = document.getElementById('results-count');
      this.emptyStateEl = document.getElementById('empty-state');
      this.clearFiltersBtn = document.getElementById('clear-filters');
      this.heroRandomBtn = document.getElementById('hero-random');
      this.navShuffleBtn = document.getElementById('nav-shuffle');
      this.toastEl = document.getElementById('toast');
      this.navEl = document.getElementById('nav');
      this.heroEl = document.getElementById('hero');

      // Atualiza ano no footer
      const yearEl = document.getElementById('year');
      if (yearEl) yearEl.textContent = new Date().getFullYear();

      // Eventos de busca e ordenação
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.applyFilters();
      });

      this.sortSelect.addEventListener('change', (e) => {
        this.sortMode = e.target.value;
        this.applyFilters();
      });

      this.clearFiltersBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.activeGenre = 'all';
        this.updateActiveChip();
        this.applyFilters();
      });

      // Botões de set aleatório
      const handleRandom = () => this.playRandomSet();
      if (this.heroRandomBtn) this.heroRandomBtn.addEventListener('click', handleRandom);
      if (this.navShuffleBtn) this.navShuffleBtn.addEventListener('click', handleRandom);
    },

    initViewMode() {
      const viewGridBtn = document.getElementById('view-grid');
      const viewListBtn = document.getElementById('view-list');
      if (!viewGridBtn || !viewListBtn || !this.gridEl) return;

      const setViewMode = (mode) => {
        if (mode === 'list') {
          this.gridEl.classList.add('is-list-view');
          viewListBtn.classList.add('is-active');
          viewGridBtn.classList.remove('is-active');
        } else {
          this.gridEl.classList.remove('is-list-view');
          viewGridBtn.classList.add('is-active');
          viewListBtn.classList.remove('is-active');
        }
        try {
          localStorage.setItem('srl_view_mode', mode);
        } catch (e) {}
      };

      let savedMode = 'grid';
      try {
        savedMode = localStorage.getItem('srl_view_mode') || 'grid';
      } catch (e) {}
      setViewMode(savedMode);

      viewGridBtn.addEventListener('click', () => setViewMode('grid'));
      viewListBtn.addEventListener('click', () => setViewMode('list'));
    },

    initMobileBar() {
      const mobileBar = document.getElementById('mobile-bar');
      if (!mobileBar) return;

      const mHome = document.getElementById('m-btn-home');
      const mAcervo = document.getElementById('m-btn-acervo');
      const mSearch = document.getElementById('m-btn-search');
      const mShuffle = document.getElementById('m-btn-shuffle');
      const mSobre = document.getElementById('m-btn-sobre');

      if (mSearch) {
        mSearch.addEventListener('click', () => {
          const toolbar = document.getElementById('toolbar');
          if (toolbar) toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            if (this.searchInput) {
              this.searchInput.focus();
              this.searchInput.select();
            }
          }, 350);
        });
      }

      if (mShuffle) {
        mShuffle.addEventListener('click', () => {
          this.playRandomSet();
        });
      }

      const updateActiveNav = () => {
        const scrollY = window.scrollY;
        const winH = window.innerHeight;
        const sobreEl = document.getElementById('sobre');
        const acervoEl = document.getElementById('acervo');

        let current = 'home';
        if (sobreEl && scrollY + winH * 0.4 >= sobreEl.offsetTop) {
          current = 'sobre';
        } else if (acervoEl && scrollY + winH * 0.4 >= acervoEl.offsetTop) {
          current = 'acervo';
        }

        if (mHome) mHome.classList.toggle('is-active', current === 'home');
        if (mAcervo) mAcervo.classList.toggle('is-active', current === 'acervo');
        if (mSobre) mSobre.classList.toggle('is-active', current === 'sobre');
      };

      let navTicking = false;
      window.addEventListener('scroll', () => {
        if (!navTicking) {
          requestAnimationFrame(() => {
            updateActiveNav();
            navTicking = false;
          });
          navTicking = true;
        }
      }, { passive: true });
    },

    initPlayer() {
      if (window.SrLPlayer) {
        this.player = new window.SrLPlayer();
      }
    },

    initScrollEffects() {
      let lastY = 0;
      let ticking = false;

      const updateScroll = () => {
        const y = window.scrollY;
        const heroH = this.heroEl ? this.heroEl.offsetHeight : window.innerHeight;
        const p = Math.max(0, Math.min(1.5, y / heroH));

        if (this.heroEl) {
          this.heroEl.style.setProperty('--p', p.toFixed(4));
        }

        // Barra de navegação
        if (y > 60) {
          this.navEl.classList.add('is-scrolled');
        } else {
          this.navEl.classList.remove('is-scrolled');
        }

        // Esconder / mostrar nav ao rolar
        if (y > 300 && y > lastY + 10) {
          this.navEl.classList.add('is-hidden');
          document.body.classList.add('nav-hidden');
        } else if (y < lastY - 8) {
          this.navEl.classList.remove('is-hidden');
          document.body.classList.remove('nav-hidden');
        }
        lastY = y;

        // Sticky toolbar borda (sem layout thrashing / getBoundingClientRect)
        const toolbar = document.getElementById('toolbar');
        if (toolbar) {
          if (y > 450) {
            toolbar.classList.add('is-stuck');
          } else {
            toolbar.classList.remove('is-stuck');
          }
        }

        ticking = false;
      };

      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(updateScroll);
          ticking = true;
        }
      }, { passive: true });
      updateScroll();

      // Intersection Observer para elementos .reveal
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    },

    initMorphObserver() {
      const morphEl = document.getElementById('morph');
      if (!morphEl) return;

      const morphObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setTimeout(() => morphEl.classList.add('is-morphed'), 350);
          }
        });
      }, { threshold: 0.5 });

      morphObserver.observe(morphEl);
    },

    initMarquee() {
      const track = document.getElementById('marquee-track');
      if (!track) return;

      const items = [
        'TRANCE SESSIONS', 'UPLIFTING JOURNEY', 'PSYTRANCE VORTEX',
        'FULL ON ENERGY', 'TECH TRANCE IMPACT', 'PROGRESSIVE WAVES',
        'ELECTRO HOUSE VIBES', '121 SETS GRAVADOS', 'DOWNLOAD DIRETO MP3',
        'SR.L', '100% GRATUITO'
      ];

      // Duplica para loop infinito fluído
      const html = [...items, ...items].map(it => `<span>${it}</span>`).join('');
      track.innerHTML = html;
    },

    initSocials() {
      const container = document.getElementById('footer-socials');
      if (!container) return;

      const socials = (window.SRL_CONFIG && window.SRL_CONFIG.socials) || {};
      const icons = {
        instagram: '<svg viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01"/></svg>',
        soundcloud: '<svg viewBox="0 0 24 24"><path d="M2 14c0 3 2 5 5 5h12a4 4 0 0 0 0-8 6 6 0 0 0-11.4-2A4.5 4.5 0 0 0 2 14z"/></svg>',
        youtube: '<svg viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
        spotify: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 11.5c2.5-1 5.5-1 8 .5M7 14.5c2-.8 4.5-.8 6.5.4M9 8.5c3-1.2 7-1 10 .8"/></svg>',
        email: '<svg viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>'
      };

      let html = '';
      for (const [key, url] of Object.entries(socials)) {
        if (url && icons[key]) {
          const href = key === 'email' ? `mailto:${url}` : url;
          html += `<a href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${key}">${icons[key]}</a>`;
        }
      }
      container.innerHTML = html;
    },

    initKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== this.searchInput) {
          e.preventDefault();
          this.searchInput.focus();
          this.searchInput.select();
        }
      });
    },

    async loadData() {
      try {
        const res = await fetch('data/sets-data.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.allSets = data || [];

        this.updateStats();
        this.buildGenreChips();
        this.applyFilters();

        if (this.player) {
          this.player.setPlaylist(this.allSets);
        }

        // Verifica hash na URL (ex: #set-42) para rolar até o set
        this.handleInitialHash();
      } catch (err) {
        console.error('Erro ao carregar acervo:', err);
        this.gridEl.innerHTML = `
          <div class="empty">
            <p>Não foi possível carregar os dados dos SETs.</p>
            <p><small style="color:var(--dim)">Verifique se o arquivo data/sets-data.json existe.</small></p>
          </div>
        `;
      }
    },

    updateStats() {
      const totalSets = this.allSets.length;

      // Calcula minutos totais a partir de durationRaw (HH:MM:SS)
      let totalMinutes = 0;
      this.allSets.forEach(s => {
        if (s.durationRaw) {
          const parts = s.durationRaw.split(':').map(Number);
          if (parts.length === 3) {
            totalMinutes += parts[0] * 60 + parts[1] + parts[2] / 60;
          }
        }
      });
      const totalHours = Math.round(totalMinutes / 60);

      // Total de gêneros únicos
      const genresSet = new Set();
      this.allSets.forEach(s => (s.genres || []).forEach(g => genresSet.add(g)));

      // Animação dos contadores
      this.animateCounter('stat-sets', totalSets, '');
      this.animateCounter('stat-sets-2', totalSets, '');
      this.animateCounter('stat-hours', totalHours, 'h+');
      this.animateCounter('stat-genres', genresSet.size, '');
    },

    animateCounter(attr, target, suffix = '') {
      const el = document.querySelector(`[data-count="${attr}"]`);
      if (!el) return;
      const duration = 1600;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(ease * target);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },

    initChipsNavigation() {
      const container = document.getElementById('chips-container');
      const track = document.getElementById('chips-track');
      const chips = document.getElementById('genre-chips');
      const prevBtn = document.getElementById('chips-prev');
      const nextBtn = document.getElementById('chips-next');
      const toggleBtn = document.getElementById('chips-toggle');

      if (!chips || !prevBtn || !nextBtn) return;

      const updateArrows = () => {
        if (!chips) return;
        const maxScroll = chips.scrollWidth - chips.clientWidth;
        const sl = chips.scrollLeft;

        if (track) {
          if (sl > 6) {
            track.classList.add('can-scroll-left');
          } else {
            track.classList.remove('can-scroll-left');
          }

          if (sl >= maxScroll - 6 || maxScroll <= 0) {
            track.classList.add('no-scroll-right');
          } else {
            track.classList.remove('no-scroll-right');
          }
        }

        prevBtn.hidden = sl <= 6;
        nextBtn.hidden = sl >= maxScroll - 6 || maxScroll <= 0;
      };

      prevBtn.addEventListener('click', () => {
        chips.scrollBy({ left: -260, behavior: 'smooth' });
      });

      nextBtn.addEventListener('click', () => {
        chips.scrollBy({ left: 260, behavior: 'smooth' });
      });

      if (toggleBtn && container) {
        toggleBtn.addEventListener('click', () => {
          const isExp = container.classList.toggle('is-expanded');
          toggleBtn.setAttribute('aria-expanded', isExp);
          toggleBtn.title = isExp ? 'Recolher estilos' : 'Ver todos os estilos';
          updateArrows();
        });
      }

      // Suporte a rolagem com roda do mouse (wheel)
      chips.addEventListener('wheel', (e) => {
        if (container.classList.contains('is-expanded')) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          chips.scrollLeft += e.deltaY;
          updateArrows();
        }
      }, { passive: false });

      // Suporte a arrastar com o mouse (click & drag swipe)
      let isDown = false;
      let startX = 0;
      let scrollLeftStart = 0;
      let hasDragged = false;

      chips.addEventListener('mousedown', (e) => {
        if (container.classList.contains('is-expanded')) return;
        isDown = true;
        hasDragged = false;
        chips.classList.add('is-dragging');
        startX = e.pageX - chips.offsetLeft;
        scrollLeftStart = chips.scrollLeft;
      });

      window.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        chips.classList.remove('is-dragging');
      });

      chips.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - chips.offsetLeft;
        const walk = (x - startX) * 1.4;
        chips.scrollLeft = scrollLeftStart - walk;
        if (Math.abs(walk) > 4) hasDragged = true;
        updateArrows();
      });

      chips.addEventListener('click', (e) => {
        if (hasDragged) {
          e.stopImmediatePropagation();
          e.preventDefault();
          hasDragged = false;
        }
      }, true);

      chips.addEventListener('scroll', updateArrows, { passive: true });
      window.addEventListener('resize', updateArrows);

      this.updateChipsArrows = updateArrows;
      setTimeout(updateArrows, 150);
    },

    buildGenreChips() {
      const counts = {};
      this.allSets.forEach(s => {
        (s.genres || []).forEach(g => {
          counts[g] = (counts[g] || 0) + 1;
        });
      });

      // Ordena os gêneros mais populares
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

      let html = `
        <button class="chip chip--all is-active" type="button" data-genre="all">
          Todos <small>${this.allSets.length}</small>
        </button>
      `;

      sorted.forEach(([genre, count]) => {
        const theme = window.SrLCover ? window.SrLCover.getTheme([genre]) : { c1: '#22e4ff' };
        html += `
          <button class="chip" type="button" data-genre="${genre}" style="--c:${theme.c1}">
            ${genre} <small>${count}</small>
          </button>
        `;
      });

      this.genreChipsEl.innerHTML = html;

      // Eventos de clique nos chips
      this.genreChipsEl.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
          this.activeGenre = chip.dataset.genre;
          this.updateActiveChip();
          this.applyFilters();
        });
      });

      if (this.updateChipsArrows) {
        setTimeout(this.updateChipsArrows, 100);
      }
    },

    updateActiveChip() {
      this.genreChipsEl.querySelectorAll('.chip').forEach(chip => {
        if (chip.dataset.genre === this.activeGenre) {
          chip.classList.add('is-active');
        } else {
          chip.classList.remove('is-active');
        }
      });
    },

    applyFilters() {
      let list = [...this.allSets];

      // Filtro por gênero
      if (this.activeGenre !== 'all') {
        list = list.filter(s => (s.genres || []).includes(this.activeGenre));
      }

      // Filtro por busca textual
      if (this.searchQuery) {
        const q = this.searchQuery;
        list = list.filter(s => {
          const inNum = String(s.number).includes(q) || (s.code && s.code.toLowerCase().includes(q));
          const inTitle = s.title && s.title.toLowerCase().includes(q);
          const inGenre = (s.genres || []).some(g => g.toLowerCase().includes(q));
          const inTag = (s.tags || []).some(t => t.toLowerCase().includes(q));
          const inTracklist = (s.tracklist || []).some(t => t.toLowerCase().includes(q));
          return inNum || inTitle || inGenre || inTag || inTracklist;
        });
      }

      // Ordenação
      list.sort((a, b) => {
        switch (this.sortMode) {
          case 'num-asc':
            return a.number - b.number;
          case 'dur-desc':
            return (b.sizeMB || 0) - (a.sizeMB || 0);
          case 'dur-asc':
            return (a.sizeMB || 0) - (b.sizeMB || 0);
          case 'shuffle':
            return Math.random() - 0.5;
          case 'num-desc':
          default:
            return b.number - a.number;
        }
      });

      this.filteredSets = list;
      this.renderGrid();
      this.updateResultsCount();
    },

    updateResultsCount() {
      const count = this.filteredSets.length;
      const total = this.allSets.length;
      if (count === total) {
        this.resultsCountEl.innerHTML = `Exibindo todos os <strong>${total}</strong> sets disponíveis`;
      } else {
        this.resultsCountEl.innerHTML = `Mostrando <strong>${count}</strong> de ${total} sets filtrados`;
      }

      if (count === 0) {
        this.emptyStateEl.hidden = false;
        this.gridEl.hidden = true;
      } else {
        this.emptyStateEl.hidden = true;
        this.gridEl.hidden = false;
      }
    },

    renderGrid() {
      const html = this.filteredSets.map((set, idx) => this.renderCard(set, idx)).join('');
      this.gridEl.innerHTML = html;
      this.attachCardEvents();
    },

    renderCard(set, idx) {
      const theme = window.SrLCover ? window.SrLCover.getTheme(set.genres) : { c1: '#22e4ff' };
      const coverUri = set.coverImage || (window.SrLCover ? window.SrLCover.getDataUri(set) : '');
      const emptyText = (window.SRL_CONFIG && window.SRL_CONFIG.emptyTracklistText) || 'Sem SET list informado';

      const isCurrent = this.player && this.player.currentSet && this.player.currentSet.number === set.number;
      const isPlaying = isCurrent && this.player.isPlaying;

      const genresHtml = (set.genres || []).map(g => `<span class="tag">${g}</span>`).join('');
      const tagsHtml = (set.tags || []).map(t => `<span class="tag tag--soft">${t}</span>`).join('');

      let tracklistHtml = '';
      if (Array.isArray(set.tracklist) && set.tracklist.length > 0) {
        const lis = set.tracklist.map(t => `<li>${t}</li>`).join('');
        tracklistHtml = `<ol>${lis}</ol>`;
      } else {
        tracklistHtml = `<div class="tl-empty">✦ ${emptyText}</div>`;
      }

      // Link de download: local ou Google Drive
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let downloadHref = '#';
      if (isLocalHost && set.fileName) {
        downloadHref = `/audio/${encodeURIComponent(set.fileName)}?dl=1`;
      } else if (set.fileId) {
        downloadHref = `https://drive.usercontent.google.com/download?id=${set.fileId}&export=download&confirm=t`;
      }

      return `
        <article class="card ${isCurrent ? 'is-playing' : ''} ${isPlaying ? 'is-active-playing' : ''}"
                 id="set-${set.number}"
                 data-number="${set.number}"
                 style="--c:${theme.c1}; --d:${Math.min(idx, 24)}">
          
          <div class="card__cover">
            <img src="${coverUri}" alt="${set.code}" loading="lazy" width="300" height="300" onerror="window.SrLApp &amp;&amp; window.SrLApp.handleCoverError(this, ${set.number})">
            <span class="card__badge">${set.code}</span>
            <span class="card__dur">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              ${set.duration || 'Mix'}
            </span>

            <button class="card__play" type="button" aria-label="Tocar ${set.code}">
              <svg class="i-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <svg class="i-pause" viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>
            </button>

            <div class="card__playing-eq" aria-hidden="true">
              <i></i><i></i><i></i><i></i>
            </div>
          </div>

          <div class="card__body">
            <h3 class="card__title">
              <small>Sr.L</small>
              ${set.title}
            </h3>

            <div class="card__genres">
              ${genresHtml}
              ${tagsHtml}
            </div>

            <div class="card__meta">
              <span>${set.bitrate || '320 kbps'}</span>
              <span>${set.sizeMB ? set.sizeMB + ' MB' : ''}</span>
            </div>

            <div class="card__actions">
              <button class="card__btn card__btn--tl" type="button" aria-expanded="false">
                <span>Tracklist</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
              </button>

              <a class="card__btn card__btn--dl ${set.fileId ? '' : 'is-pending'}"
                 href="${downloadHref}"
                 target="_blank"
                 rel="noopener"
                 download="${set.fileName || ''}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>
                <span>Baixar</span>
              </a>

              <button class="card__btn card__btn--share" type="button" aria-label="Compartilhar ${set.code}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
            </div>

            <div class="card__tracklist">
              <div>${tracklistHtml}</div>
            </div>
          </div>
        </article>
      `;
    },

    attachCardEvents() {
      // 3D Tilt suave otimizado (apenas em desktop com mouse de alta precisão)
      const canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

      this.gridEl.querySelectorAll('.card').forEach(card => {
        if (canHover) {
          let rect = null;
          card.addEventListener('mouseenter', () => {
            rect = card.getBoundingClientRect();
          });

          card.addEventListener('mousemove', (e) => {
            if (!rect) rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rx = -((y - rect.height / 2) / (rect.height / 2)) * 5;
            const ry = ((x - rect.width / 2) / (rect.width / 2)) * 5;

            card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
            card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
          });

          card.addEventListener('mouseleave', () => {
            rect = null;
            card.style.setProperty('--rx', '0deg');
            card.style.setProperty('--ry', '0deg');
          });
        }

        // Botão Play no card
        const playBtn = card.querySelector('.card__play');
        const num = parseInt(card.dataset.number, 10);
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const set = this.allSets.find(s => s.number === num);
          if (this.player) {
            if (this.player.currentSet && this.player.currentSet.number === num) {
              this.player.togglePlay();
            } else {
              this.player.loadSet(set, true);
            }
          }
        });

        // Acordeão de tracklist
        const tlBtn = card.querySelector('.card__btn--tl');
        const tlDiv = card.querySelector('.card__tracklist');
        tlBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = tlDiv.classList.toggle('is-open');
          tlBtn.setAttribute('aria-expanded', isOpen);
        });

        // Clique no botão Baixar
        const dlBtn = card.querySelector('.card__btn--dl');
        dlBtn.addEventListener('click', (e) => {
          const set = this.allSets.find(s => s.number === num);
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          if (isLocal && set && set.fileName) {
            this.showToast(`📥 Baixando ${set.code} (${set.title})...`);
            return;
          }
          if (!set || !set.fileId) {
            e.preventDefault();
            this.showToast(`O link do Google Drive para o ${set ? set.code : 'SET'} será sincronizado.`);
          }
        });

        // Compartilhar
        const shareBtn = card.querySelector('.card__btn--share');
        shareBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.shareSet(num);
        });
      });
    },

    shareSet(num) {
      const set = this.allSets.find(s => s.number === num);
      const url = `${window.location.origin}${window.location.pathname}#set-${num}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          this.showToast(`Link do ${set ? set.code : 'SET'} copiado!`);
        }).catch(() => {
          this.showToast(`Link: ${url}`);
        });
      } else {
        this.showToast(`Link: ${url}`);
      }
    },

    playRandomSet() {
      if (this.allSets.length === 0) return;
      const idx = Math.floor(Math.random() * this.allSets.length);
      const set = this.allSets[idx];
      if (this.player) {
        this.player.loadSet(set, true);
        this.showToast(`🎲 Sorteado: ${set.code} — ${set.title}`);

        // Rola suavemente até o card
        const cardEl = document.getElementById(`set-${set.number}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },

    handleInitialHash() {
      if (!window.location.hash) return;
      const match = window.location.hash.match(/^#set-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        setTimeout(() => {
          const cardEl = document.getElementById(`set-${num}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cardEl.style.boxShadow = '0 0 0 3px var(--cyan), 0 0 60px var(--cyan)';
            setTimeout(() => cardEl.style.boxShadow = '', 2500);
          }
        }, 600);
      }
    },

    showToast(message, duration = 3500) {
      if (!this.toastEl) return;
      this.toastEl.textContent = message;
      this.toastEl.classList.add('is-visible');
      clearTimeout(this._toastTimeout);
      this._toastTimeout = setTimeout(() => {
        this.toastEl.classList.remove('is-visible');
      }, duration);
    }
  };

  // Expõe no window para comunicação global
  window.SrLApp = App;

  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
})();
