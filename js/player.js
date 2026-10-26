/**
 * Sr.L — Persistent Audio Player & SoundCloud-style Waveform
 */
(function(window) {
  'use strict';

  class SrLPlayer {
    constructor() {
      this.currentSet = null;
      this.isPlaying = false;
      this.isLoading = false;
      this.playlist = [];
      this.currentIndex = -1;

      // Elementos do DOM
      this.playerEl = document.getElementById('player');
      this.audio = document.getElementById('audio');
      this.waveCanvas = document.getElementById('player-wave');
      this.waveProgress = document.getElementById('player-progress');
      this.toggleBtn = document.getElementById('player-toggle');
      this.prevBtn = document.getElementById('player-prev');
      this.nextBtn = document.getElementById('player-next');
      this.backBtn = document.getElementById('player-back');
      this.fwdBtn = document.getElementById('player-fwd');
      this.closeBtn = document.getElementById('player-close');
      this.volumeInput = document.getElementById('player-volume');
      this.titleEl = document.getElementById('player-title');
      this.subEl = document.getElementById('player-sub');
      this.coverEl = document.getElementById('player-cover');
      this.currentEl = document.getElementById('player-current');
      this.durationEl = document.getElementById('player-duration');
      this.downloadBtn = document.getElementById('player-download');
      this.embedEl = document.getElementById('player-embed');

      // Onda sonora sintética gerada por set
      this.waveData = [];
      this.waveBars = 180;

      this.initEvents();
      this.initWaveCanvas();
    }

    setPlaylist(list) {
      this.playlist = list || [];
    }

    initEvents() {
      if (!this.playerEl || !this.audio) return;

      // Play/Pause
      this.toggleBtn.addEventListener('click', () => this.togglePlay());

      // Próximo / Anterior
      this.nextBtn.addEventListener('click', () => this.playNext());
      this.prevBtn.addEventListener('click', () => this.playPrev());

      // Pular 30s
      this.backBtn.addEventListener('click', () => this.seekDelta(-30));
      this.fwdBtn.addEventListener('click', () => this.seekDelta(30));

      // Fechar
      this.closeBtn.addEventListener('click', () => this.close());

      // Volume
      this.volumeInput.addEventListener('input', (e) => {
        this.audio.volume = parseFloat(e.target.value);
      });

      // Áudio nativo eventos
      this.audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.isLoading = false;
        this.updatePlayState();
      });

      this.audio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.updatePlayState();
      });

      this.audio.addEventListener('waiting', () => {
        this.isLoading = true;
        this.updatePlayState();
      });

      this.audio.addEventListener('playing', () => {
        this.isLoading = false;
        this.updatePlayState();
      });

      this.audio.addEventListener('timeupdate', () => {
        this.updateProgress();
      });

      this.audio.addEventListener('ended', () => {
        this.playNext();
      });

      this.audio.addEventListener('error', (e) => {
        this.isLoading = false;
        this.updatePlayState();
        if (this.currentSet && this.currentSet.fileId) {
          this.handleAudioError();
        }
      });

      // Scrub na barra de onda sonora
      this.waveProgress.addEventListener('click', (e) => {
        const rect = this.waveProgress.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (this.audio.duration && !isNaN(this.audio.duration)) {
          this.audio.currentTime = pos * this.audio.duration;
        }
      });

      // Atalhos de teclado globais
      window.addEventListener('keydown', (e) => {
        // Ignora se estiver digitando em campo de texto
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
        if (e.code === 'Space' && this.currentSet) {
          e.preventDefault();
          this.togglePlay();
        } else if (e.code === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
          this.playNext();
        } else if (e.code === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
          this.playPrev();
        }
      });

      // Redimensionamento do canvas e ajuste dinâmico de altura do player
      window.addEventListener('resize', () => {
        this.renderWave();
        this.updateDimensions();
      });

      if (window.ResizeObserver && this.playerEl) {
        try {
          const ro = new ResizeObserver(() => this.updateDimensions());
          ro.observe(this.playerEl);
        } catch (e) {}
      }
    }

    initWaveCanvas() {
      if (!this.waveCanvas) return;
      this.renderWave();
    }

    generateWaveformData(seed) {
      // Gera alturas de onda sonora estilizadas e realistas de DJ set
      let s = (seed || 1) * 2654435761;
      const rng = () => {
        s = (s ^ (s << 13)) >>> 0;
        s = (s ^ (s >>> 17)) >>> 0;
        s = (s ^ (s << 5)) >>> 0;
        return (s >>> 0) / 4294967296;
      };

      const data = [];
      let currentAmp = 0.45;
      for (let i = 0; i < this.waveBars; i++) {
        // Variação suave simulando mixagem: intro suave, breakdowns e drops
        const prog = i / this.waveBars;
        const macro = Math.sin(prog * Math.PI * 4) * 0.25 + 0.6;
        const micro = (rng() - 0.5) * 0.35;
        currentAmp = Math.max(0.12, Math.min(1.0, currentAmp * 0.7 + (macro + micro) * 0.3));
        data.push(currentAmp);
      }
      return data;
    }

    loadSet(set, autoPlay = true) {
      if (!set) return;
      this.currentSet = set;
      this.currentIndex = this.playlist.findIndex(s => s.number === set.number);

      // Atualiza metadados visuais no player
      this.titleEl.textContent = `${set.code} — ${set.title}`;
      this.subEl.textContent = `${set.genres ? set.genres.join(' · ') : 'Electronic'} | ${set.duration || ''}`;

      // Capa procedural com fallback automático
      const theme = window.SrLCover ? window.SrLCover.getTheme(set.genres) : { c1: '#22e4ff' };
      this.playerEl.style.setProperty('--c', theme.c1);
      const coverUri = set.coverImage || (window.SrLCover ? window.SrLCover.getDataUri(set) : '');
      this.coverEl.innerHTML = `<img src="${coverUri}" alt="${set.code}" onerror="this.onerror=null; if(window.SrLCover){this.src=window.SrLCover.getDataUri(window.SrLApp ? window.SrLApp.getSetByNumber(${set.number}) : null);}">`;

      // Botão de download no player
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalHost && set.fileName) {
        this.downloadBtn.href = `/audio/${encodeURIComponent(set.fileName)}?dl=1`;
        this.downloadBtn.setAttribute('download', set.fileName);
        this.downloadBtn.removeAttribute('hidden');
      } else if (set.fileId) {
        this.downloadBtn.href = `https://drive.usercontent.google.com/download?id=${set.fileId}&export=download&confirm=t`;
        this.downloadBtn.removeAttribute('hidden');
      } else {
        this.downloadBtn.setAttribute('hidden', '');
      }

      // Gera onda sonora
      this.waveData = this.generateWaveformData(set.number);
      this.renderWave(0);

      // Abre a barra do player
      this.open();

      // Resolve a melhor fonte de áudio
      const apiKey = (window.SRL_CONFIG && window.SRL_CONFIG.googleApiKey) || '';
      let streamUrl = '';

      if (set.streamUrl) {
        streamUrl = set.streamUrl;
      } else if (isLocalHost && set.fileName) {
        // Prioridade 1: Servidor Local (alta velocidade instantânea 0s, streaming nativo com onda sonora)
        streamUrl = `/audio/${encodeURIComponent(set.fileName)}`;
      } else if (apiKey && set.fileId) {
        // Prioridade 2: Google Drive API v3 autorizada (alta velocidade com onda sonora no GitHub Pages)
        streamUrl = `https://www.googleapis.com/drive/v3/files/${set.fileId}?alt=media&key=${apiKey}`;
      }

      // Limpa embed anterior se houver
      this.embedEl.innerHTML = '';
      this.embedEl.hidden = true;
      this.playerEl.classList.remove('is-embed');

      if (streamUrl) {
        this.audio.src = streamUrl;
        this.audio.load();
        if (autoPlay) {
          this.isLoading = true;
          this.updatePlayState();
          this.audio.play().catch(err => {
            console.warn('Auto-play bloqueado pelo navegador ou arquivo indisponível:', err);
            this.isLoading = false;
            this.updatePlayState();
          });
        }
      } else {
        // Sem streamUrl direto: ativa player embutido do Google Drive imediatamente (sem delay de 5s de erro)
        this.handlePendingAudio(set);
      }

      // Atualiza altura do player na página
      this.updateDimensions();

      // Notifica todos os cards da grade
      this.broadcastSetChange(set);
    }

    handlePendingAudio(set) {
      if (set.fileId) {
        // Player embutido do Google Drive
        this.playerEl.classList.add('is-embed');
        this.embedEl.hidden = false;
        this.embedEl.innerHTML = `
          <iframe src="https://drive.google.com/file/d/${set.fileId}/preview" allow="autoplay" loading="eager" title="${set.title}"></iframe>
        `;
        this.updateDimensions();
        if (window.SrLApp) {
          window.SrLApp.showToast(`Tocando via Google Drive · ${set.code}`);
        }
      } else {
        if (window.SrLApp) {
          window.SrLApp.showToast(`🎵 ${set.code}: Pronto para reprodução.`);
        }
        this.durationEl.textContent = set.duration || '54:00';
        this.currentEl.textContent = '0:00';
      }
    }

    handleAudioError() {
      if (this.currentSet && this.currentSet.fileId && !this.playerEl.classList.contains('is-embed')) {
        this.playerEl.classList.add('is-embed');
        this.embedEl.hidden = false;
        this.embedEl.innerHTML = `
          <iframe src="https://drive.google.com/file/d/${this.currentSet.fileId}/preview" allow="autoplay" loading="eager" title="${this.currentSet.title}"></iframe>
        `;
        this.updateDimensions();
        if (window.SrLApp) {
          window.SrLApp.showToast(`Alternando para player embutido do Google Drive...`);
        }
      }
    }

    updateDimensions() {
      if (!this.playerEl || this.playerEl.hasAttribute('hidden') || !this.playerEl.classList.contains('is-open')) {
        document.body.style.setProperty('--player-h', '0px');
        return;
      }
      requestAnimationFrame(() => {
        const h = this.playerEl.offsetHeight || (this.playerEl.classList.contains('is-embed') ? 165 : 96);
        document.body.style.setProperty('--player-h', `${h}px`);
      });
    }

    togglePlay() {
      if (!this.currentSet && this.playlist.length > 0) {
        this.loadSet(this.playlist[0], true);
        return;
      }
      if (this.audio.src) {
        if (this.audio.paused) {
          this.audio.play();
        } else {
          this.audio.pause();
        }
      } else {
        // Toggle simulação
        this.isPlaying = !this.isPlaying;
        this.updatePlayState();
      }
    }

    playNext() {
      if (this.playlist.length === 0) return;
      let nextIdx = this.currentIndex + 1;
      if (nextIdx >= this.playlist.length) nextIdx = 0;
      this.loadSet(this.playlist[nextIdx], true);
    }

    playPrev() {
      if (this.playlist.length === 0) return;
      if (this.audio.currentTime > 5) {
        this.audio.currentTime = 0;
        return;
      }
      let prevIdx = this.currentIndex - 1;
      if (prevIdx < 0) prevIdx = this.playlist.length - 1;
      this.loadSet(this.playlist[prevIdx], true);
    }

    seekDelta(seconds) {
      if (this.audio.duration) {
        this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, this.audio.currentTime + seconds));
      }
    }

    updatePlayState() {
      if (this.isPlaying) {
        this.playerEl.classList.add('is-playing');
      } else {
        this.playerEl.classList.remove('is-playing');
      }

      if (this.isLoading) {
        this.playerEl.classList.add('is-loading');
      } else {
        this.playerEl.classList.remove('is-loading');
      }

      // Notifica os cards da página
      document.querySelectorAll('.card').forEach(card => {
        const num = parseInt(card.dataset.number, 10);
        if (this.currentSet && num === this.currentSet.number) {
          card.classList.add('is-playing');
          if (this.isPlaying) {
            card.classList.add('is-active-playing');
          } else {
            card.classList.remove('is-active-playing');
          }
        } else {
          card.classList.remove('is-playing', 'is-active-playing');
        }
      });
    }

    updateProgress() {
      const cur = this.audio.currentTime || 0;
      const dur = this.audio.duration || 0;
      const frac = dur > 0 ? cur / dur : 0;

      this.currentEl.textContent = this.formatTime(cur);
      if (dur > 0) {
        this.durationEl.textContent = this.formatTime(dur);
      }
      this.waveProgress.setAttribute('aria-valuenow', Math.round(frac * 100));
      this.renderWave(frac);
    }

    formatTime(sec) {
      if (!sec || isNaN(sec)) return '0:00';
      const totalSec = Math.floor(sec);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const ss = String(s).padStart(2, '0');
      if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${ss}`;
      }
      return `${m}:${ss}`;
    }

    renderWave(progressFrac = 0) {
      if (!this.waveCanvas) return;
      const canvas = this.waveCanvas;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      if (w === 0 || h === 0) return;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const count = this.waveData.length || 100;
      const gap = 2;
      const barW = Math.max(1.5, (w - count * gap) / count);
      const theme = this.currentSet ? window.SrLCover.getTheme(this.currentSet.genres) : { c1: '#22e4ff', c2: '#9b5cff' };

      // Gradiente de reprodução (já tocado)
      const gradPlayed = ctx.createLinearGradient(0, 0, w, 0);
      // Otimização: desenha em 2 passes ultra-rápidos sem shadowBlur por barra (30x mais FPS)
      const playedBars = [];
      const unplayedBars = [];

      for (let i = 0; i < count; i++) {
        const frac = i / count;
        const amp = this.waveData[i] || 0.4;
        const barH = Math.max(4, amp * (h - 8));
        const x = i * (barW + gap);
        const y = (h - barH) / 2;

        if (frac <= progressFrac) {
          playedBars.push({ x, y, barH });
        } else {
          unplayedBars.push({ x, y, barH });
        }
      }

      // Passe 1: Barras ainda não tocadas
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      for (const b of unplayedBars) {
        if (ctx.roundRect) {
          ctx.roundRect(b.x, b.y, barW, b.barH, 2);
        } else {
          ctx.rect(b.x, b.y, barW, b.barH);
        }
      }
      ctx.fill();

      // Passe 2: Barras já tocadas com gradiente neon
      ctx.fillStyle = gradPlayed;
      ctx.beginPath();
      for (const b of playedBars) {
        if (ctx.roundRect) {
          ctx.roundRect(b.x, b.y, barW, b.barH, 2);
        } else {
          ctx.rect(b.x, b.y, barW, b.barH);
        }
      }
      ctx.fill();

      // Linha indicadora de agulha (cursor do player) com glow elegante
      const cursorX = progressFrac * w;
      ctx.shadowColor = theme.c1;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cursorX - 1, 2, 2, h - 4);

      ctx.restore();
    }

    open() {
      this.playerEl.removeAttribute('hidden');
      this.playerEl.classList.add('is-open');
      document.body.classList.add('has-player');
      this.updateDimensions();
    }

    close() {
      this.audio.pause();
      this.audio.src = '';
      this.isPlaying = false;
      this.isLoading = false;
      this.updatePlayState();
      this.playerEl.classList.remove('is-open');
      this.playerEl.classList.remove('is-embed');
      this.embedEl.innerHTML = '';
      this.embedEl.hidden = true;
      document.body.classList.remove('has-player');
      document.body.style.setProperty('--player-h', '0px');
    }

    broadcastSetChange(set) {
      window.dispatchEvent(new CustomEvent('srl:setchange', { detail: set }));
    }
  }

  window.SrLPlayer = SrLPlayer;
})(window);
