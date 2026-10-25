/**
 * Sr.L — Gerador Procedural de Capas Neon (SVG)
 * Gera capas exclusivas de alta resolução vetorial para cada SET
 * baseado no gênero, número e semente visual.
 */
(function(window) {
  'use strict';

  // Paletas de cores neon por gênero
  const GENRE_THEMES = {
    'Uplifting Trance': {
      c1: '#00f0ff', c2: '#7000ff', c3: '#ffffff',
      glow: 'rgba(0, 240, 255, 0.6)', pattern: 'lasers'
    },
    'Trance': {
      c1: '#00d4ff', c2: '#9b5cff', c3: '#ff3fb4',
      glow: 'rgba(155, 92, 255, 0.6)', pattern: 'waves'
    },
    'Psytrance': {
      c1: '#ff007b', c2: '#7928ca', c3: '#00f0ff',
      glow: 'rgba(255, 0, 123, 0.65)', pattern: 'fractal'
    },
    'Full On': {
      c1: '#00ff88', c2: '#7928ca', c3: '#ff00aa',
      glow: 'rgba(0, 255, 136, 0.65)', pattern: 'vortex'
    },
    'Progressive': {
      c1: '#00e5ff', c2: '#1a365d', c3: '#7928ca',
      glow: 'rgba(0, 229, 255, 0.55)', pattern: 'rings'
    },
    'Electro House': {
      c1: '#ffb23f', c2: '#ff3366', c3: '#ffe600',
      glow: 'rgba(255, 178, 63, 0.65)', pattern: 'grid'
    },
    'Tech Trance': {
      c1: '#ff2a5f', c2: '#6d28d9', c3: '#22d3ee',
      glow: 'rgba(255, 42, 95, 0.65)', pattern: 'spectrum'
    },
    'House & Deep': {
      c1: '#ff8a00', c2: '#e52e71', c3: '#fca311',
      glow: 'rgba(255, 138, 0, 0.55)', pattern: 'rings'
    },
    'Hard': {
      c1: '#ff003c', c2: '#7f00ff', c3: '#fcee0a',
      glow: 'rgba(255, 0, 60, 0.7)', pattern: 'lasers'
    },
    'Minimal': {
      c1: '#94a3b8', c2: '#38bdf8', c3: '#0f172a',
      glow: 'rgba(56, 189, 248, 0.45)', pattern: 'waves'
    },
    'Underground': {
      c1: '#a855f7', c2: '#3b82f6', c3: '#06b6d4',
      glow: 'rgba(168, 85, 247, 0.5)', pattern: 'grid'
    },
    'Default': {
      c1: '#22e4ff', c2: '#9b5cff', c3: '#ff3fb4',
      glow: 'rgba(34, 228, 255, 0.5)', pattern: 'spectrum'
    }
  };

  function getTheme(genres) {
    if (Array.isArray(genres)) {
      for (let g of genres) {
        if (GENRE_THEMES[g]) return { ...GENRE_THEMES[g], genreName: g };
      }
    }
    return { ...GENRE_THEMES['Default'], genreName: (genres && genres[0]) || 'Electronic' };
  }

  // Gerador de padrões geométricos procedurais (pseudo-random por seed)
  function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function() {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function generatePatternSVG(pattern, seed, c1, c2, c3) {
    const rng = seededRandom(seed * 7919 + 101);
    let elements = '';

    switch (pattern) {
      case 'lasers': {
        // Raios laser cruzando o espaço
        const count = 14;
        const originX = 150 + rng() * 300;
        const originY = 80 + rng() * 120;
        for (let i = 0; i < count; i++) {
          const destX = (i / (count - 1)) * 640 - 20;
          const destY = 600 + rng() * 40;
          const stroke = i % 2 === 0 ? c1 : c2;
          const opacity = 0.25 + rng() * 0.55;
          const width = 1 + rng() * 3.5;
          elements += `<line x1="${originX}" y1="${originY}" x2="${destX}" y2="${destY}" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}" filter="url(#glow)"/>`;
        }
        elements += `<circle cx="${originX}" cy="${originY}" r="45" fill="${c1}" opacity="0.35" filter="url(#glow-heavy)"/>`;
        break;
      }
      case 'vortex': {
        // Espiral e anéis de energia hipnóticos (Full On / Psy)
        for (let r = 35; r < 340; r += 26) {
          const rot = (r * 1.8 + seed * 23) % 360;
          const stroke = r % 52 === 0 ? c1 : (r % 78 === 0 ? c3 : c2);
          const dash = `${12 + rng() * 40} ${8 + rng() * 30}`;
          elements += `<circle cx="300" cy="300" r="${r}" fill="none" stroke="${stroke}" stroke-width="2" stroke-dasharray="${dash}" transform="rotate(${rot} 300 300)" opacity="0.5" filter="url(#glow)"/>`;
        }
        // Feixes diagonais
        elements += `<path d="M 0,0 L 600,600 M 600,0 L 0,600" stroke="${c1}" stroke-width="1.5" stroke-dasharray="8 12" opacity="0.3"/>`;
        break;
      }
      case 'waves': {
        // Ondas sonoras sinusoidais em camadas
        for (let i = 0; i < 7; i++) {
          const yOffset = 180 + i * 36;
          const amp = 30 + rng() * 50;
          const freq = 0.015 + rng() * 0.01;
          const stroke = i % 2 === 0 ? c1 : c2;
          let path = `M 0,${yOffset}`;
          for (let x = 0; x <= 600; x += 30) {
            const y = yOffset + Math.sin(x * freq + seed + i) * amp;
            path += ` L ${x},${y.toFixed(1)}`;
          }
          elements += `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${1.5 + (i % 3)}" opacity="${0.35 + i * 0.08}" filter="url(#glow)"/>`;
        }
        break;
      }
      case 'rings': {
        // Anéis concêntricos futuristas (Progressive / Deep)
        const cx = 300 + (rng() - 0.5) * 80;
        const cy = 290 + (rng() - 0.5) * 80;
        for (let r = 40; r < 280; r += 22) {
          const color = r % 44 === 0 ? c1 : c2;
          const op = 0.2 + (r / 280) * 0.5;
          elements += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1.8" opacity="${op}"/>`;
        }
        // Arco luminoso
        elements += `<path d="M ${cx - 160},${cy} A 160 160 0 0 1 ${cx + 160},${cy}" fill="none" stroke="${c1}" stroke-width="4" opacity="0.85" filter="url(#glow-heavy)"/>`;
        elements += `<circle cx="${cx}" cy="${cy}" r="18" fill="${c1}" filter="url(#glow)"/>`;
        break;
      }
      case 'grid': {
        // Cyberpunk synthwave perspective grid
        const horizon = 260;
        for (let y = horizon; y <= 600; y += 22 + Math.pow((y - horizon) / 24, 1.4)) {
          elements += `<line x1="0" y1="${y}" x2="600" y2="${y}" stroke="${c2}" stroke-width="1.2" opacity="0.45"/>`;
        }
        for (let x = -100; x <= 700; x += 55) {
          elements += `<line x1="300" y1="${horizon}" x2="${x}" y2="600" stroke="${c1}" stroke-width="1.5" opacity="0.4" filter="url(#glow)"/>`;
        }
        // Sol / Lua neon no horizonte
        elements += `<circle cx="300" cy="${horizon - 10}" r="90" fill="url(#sun-grad)" opacity="0.8" filter="url(#glow-heavy)"/>`;
        break;
      }
      case 'spectrum':
      default: {
        // Equalizador estéreo espelhado central
        const bars = 32;
        const barW = 10;
        const gap = 6;
        const totalW = bars * (barW + gap) - gap;
        const startX = (600 - totalW) / 2;
        for (let i = 0; i < bars; i++) {
          const h = 20 + Math.sin((i / bars) * Math.PI) * (180 + rng() * 80);
          const x = startX + i * (barW + gap);
          const y = 300 - h / 2;
          const stroke = i % 2 === 0 ? c1 : c2;
          elements += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="5" fill="${stroke}" opacity="${0.45 + (h / 300) * 0.45}" filter="url(#glow)"/>`;
        }
        break;
      }
    }

    return elements;
  }

  /**
   * Gera o SVG da capa em formato string
   */
  function generateCoverSVG(set) {
    const num = set.number || 1;
    const code = set.code || `SET ${String(num).padStart(2, '0')}`;
    const title = (set.title || 'Selected Mix').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const theme = getTheme(set.genres);
    const { c1, c2, c3, glow, pattern, genreName } = theme;
    const dur = set.duration || 'Electronic Set';
    const bitrate = set.bitrate || '320 kbps';

    const patternElements = generatePatternSVG(pattern, num, c1, c2, c3);

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-grad-${num}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050608"/>
      <stop offset="50%" stop-color="#0c0d15"/>
      <stop offset="100%" stop-color="#07080d"/>
    </linearGradient>

    <radialGradient id="vignette-${num}" cx="50%" cy="50%" r="65%">
      <stop offset="40%" stop-color="transparent"/>
      <stop offset="100%" stop-color="#050608" stop-opacity="0.95"/>
    </radialGradient>

    <linearGradient id="glow-grad-${num}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="50%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>

    <linearGradient id="sun-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="glow-heavy" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="16" result="blur1"/>
      <feGaussianBlur stdDeviation="6" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur1"/>
        <feMergeNode in="blur2"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Fundo escuro texturizado -->
  <rect width="600" height="600" fill="url(#bg-grad-${num})"/>

  <!-- Glow ambiental do gênero -->
  <circle cx="300" cy="280" r="240" fill="${c1}" opacity="0.12" filter="url(#glow-heavy)"/>
  <circle cx="450" cy="420" r="180" fill="${c2}" opacity="0.10" filter="url(#glow-heavy)"/>

  <!-- Padrão procedural específico -->
  <g id="pattern">${patternElements}</g>

  <!-- Vinheta escura nos cantos -->
  <rect width="600" height="600" fill="url(#vignette-${num})"/>

  <!-- Borda sutil neon -->
  <rect x="18" y="18" width="564" height="564" rx="20" fill="none" stroke="${c1}" stroke-width="1.2" opacity="0.35"/>
  <rect x="24" y="24" width="552" height="552" rx="16" fill="none" stroke="${c2}" stroke-width="0.8" opacity="0.2"/>

  <!-- Marcadores angulares cyberpunk -->
  <path d="M 32,54 L 32,32 L 54,32" fill="none" stroke="${c1}" stroke-width="2.5" opacity="0.8"/>
  <path d="M 568,54 L 568,32 L 546,32" fill="none" stroke="${c1}" stroke-width="2.5" opacity="0.8"/>
  <path d="M 32,546 L 32,568 L 54,568" fill="none" stroke="${c1}" stroke-width="2.5" opacity="0.8"/>
  <path d="M 568,546 L 568,568 L 546,568" fill="none" stroke="${c1}" stroke-width="2.5" opacity="0.8"/>

  <!-- HEADER DA CAPA: Logo Sr.L & Gênero -->
  <g transform="translate(42, 60)">
    <text x="0" y="0" font-family="'Syne', 'Arial Black', sans-serif" font-weight="800" font-size="28" fill="#ffffff" letter-spacing="-0.5">
      Sr<tspan fill="${c1}">.</tspan>L
    </text>
    <text x="0" y="20" font-family="'Inter', sans-serif" font-weight="600" font-size="10" fill="${c1}" letter-spacing="3" text-transform="uppercase">
      ${genreName}
    </text>

    <!-- Badge de Bitrate à direita -->
    <rect x="424" y="-18" width="88" height="26" rx="6" fill="#07080c" stroke="${c1}" stroke-width="1" opacity="0.85"/>
    <text x="468" y="-1" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="700" font-size="11" fill="${c1}" letter-spacing="1">
      ${bitrate}
    </text>
  </g>

  <!-- CENTRO DA CAPA: Número do Set em destaque monumental -->
  <g transform="translate(300, 320)">
    <!-- Glow do número -->
    <text x="0" y="0" text-anchor="middle" font-family="'Syne', sans-serif" font-weight="900" font-size="110" fill="${c1}" opacity="0.2" filter="url(#glow-heavy)" letter-spacing="-4">
      ${String(num).padStart(2, '0')}
    </text>
    <!-- Número principal com degradê -->
    <text x="0" y="0" text-anchor="middle" font-family="'Syne', sans-serif" font-weight="900" font-size="108" fill="url(#glow-grad-${num})" letter-spacing="-4">
      ${String(num).padStart(2, '0')}
    </text>
    <text x="0" y="32" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="700" font-size="14" fill="#ffffff" letter-spacing="10" opacity="0.9">
      SET ARCHIVE
    </text>
  </g>

  <!-- RODAPÉ DA CAPA: Título e Duração -->
  <g transform="translate(42, 510)">
    <!-- Barra decorativa com degradê -->
    <rect x="0" y="-32" width="516" height="2" fill="url(#glow-grad-${num})" opacity="0.6"/>

    <text x="0" y="-8" font-family="'Syne', sans-serif" font-weight="700" font-size="22" fill="#ffffff">
      ${title.length > 28 ? title.substring(0, 26) + '…' : title}
    </text>
    <text x="0" y="16" font-family="'Inter', sans-serif" font-weight="500" font-size="13" fill="#9aa3b8">
      Felipe Signorelli <tspan fill="${c1}">·</tspan> ${dur}
    </text>
  </g>
</svg>`.trim();

    return svg;
  }

  /**
   * Converte a string SVG em um data-URI para uso em <img src="...">
   */
  function getCoverDataUri(set) {
    const svg = generateCoverSVG(set);
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  window.SrLCover = {
    generateSVG: generateCoverSVG,
    getDataUri: getCoverDataUri,
    getTheme: getTheme
  };

})(window);
