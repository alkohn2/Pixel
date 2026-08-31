/**
 * PIXEL Sports Graphics System — Roster & Team Branding Model (Phase G1 + G5.5 + G5.6)
 * 
 * Reusable data definitions, validation rules, persistence layer,
 * asset references (logos, portraits, colors), Game Package foundation,
 * and JSON import/export for Teams, Players, and Starting Lineups.
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    (root || (typeof globalThis !== 'undefined' ? globalThis : self)).PixelRosterModel = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)), function() {
  'use strict';

  const STORAGE_KEY = 'pixelVolleyballRosterV1';
  const CHANNEL_NAME = 'pixel-volleyball-roster-state';

  // Standard Volleyball Positions
  const VolleyballPosition = Object.freeze({
    OH: 'OH',   // Outside Hitter
    MB: 'MB',   // Middle Blocker
    S: 'S',     // Setter
    OPP: 'OPP', // Opposite Hitter / Right Side
    L: 'L',     // Libero
    DS: 'DS'    // Defensive Specialist
  });

  /**
   * Factory to create a Team entity with full branding properties
   */
  function createTeam(config = {}) {
    const teamId = config.id || `team_${Date.now()}`;
    const primary = config.colorPrimary || config.color || '#0032A0';
    const secondary = config.colorSecondary || '#001f66';
    const accent = config.accentColor || '#e3c46a';

    return {
      id: teamId,
      name: config.name || 'TEAM NAME',
      shortName: config.shortName || config.name?.substring(0, 4)?.toUpperCase() || 'TEAM',
      abbreviation: config.abbreviation || config.shortName || 'TM',
      colorPrimary: primary,
      colorSecondary: secondary,
      accentColor: accent,
      autoPalette: config.autoPalette !== undefined ? Boolean(config.autoPalette) : true,
      logo: config.logo || null,
      logoWhite: config.logoWhite || null,
      coach: config.coach || '',
      branding: {
        logo: config.branding?.logo || config.logo || null,
        logoWhite: config.branding?.logoWhite || config.logoWhite || null,
        theme: config.branding?.theme || 'default',
        ...(config.branding || {})
      },
      players: Array.isArray(config.players) ? config.players.map(p => createPlayer({ ...p, teamId: teamId })) : [],
      startingLineupIds: Array.isArray(config.startingLineupIds) ? [...config.startingLineupIds] : [],
      stats: { ...config.stats }
    };
  }

  /**
   * Factory to create a Player entity with identity assets
   */
  function createPlayer(config = {}) {
    const firstName = config.firstName || '';
    const lastName = config.lastName || config.name || '';
    const displayName = config.displayName || (firstName ? `${firstName} ${lastName}`.trim() : lastName) || 'PLAYER';

    return {
      id: config.id || `p_${config.jerseyNumber || Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      teamId: config.teamId || null,
      jerseyNumber: Number(config.jerseyNumber ?? config.number) || 0,
      firstName: firstName,
      lastName: lastName,
      displayName: displayName,
      position: VolleyballPosition[config.position] || config.position || VolleyballPosition.OH,
      starter: Boolean(config.starter),
      captain: Boolean(config.captain),
      photo: config.photo || null,
      stats: { ...config.stats }
    };
  }

  /**
   * Factory for complete default roster state
   */
  function createDefaultRosterState() {
    return {
      version: '1.0',
      home: createTeam({
        id: 'team_home',
        name: 'HOME TEAM',
        shortName: 'HOME',
        abbreviation: 'HOM',
        colorPrimary: '#0032A0',
        colorSecondary: '#001f66',
        accentColor: '#e3c46a',
        logo: 'assets/teams/home-team/logo.svg',
        logoWhite: 'assets/teams/home-team/logo-white.svg',
        coach: '',
        players: [],
        startingLineupIds: []
      }),
      away: createTeam({
        id: 'team_away',
        name: 'AWAY TEAM',
        shortName: 'AWAY',
        abbreviation: 'AWY',
        colorPrimary: '#b91c1c',
        colorSecondary: '#7f1d1d',
        accentColor: '#facc15',
        logo: 'assets/teams/away-team/logo.svg',
        logoWhite: 'assets/teams/away-team/logo-white.svg',
        coach: '',
        players: [],
        startingLineupIds: []
      }),
      stateRevision: 1,
      timestamp: Date.now()
    };
  }

  /**
   * Normalization & Migration helper for legacy roster data
   */
  function normalizeRosterState(raw) {
    if (!raw || typeof raw !== 'object') {
      return createDefaultRosterState();
    }

    const homeTeam = createTeam(raw.home || {});
    const awayTeam = createTeam(raw.away || {});

    // Ensure all home players carry homeTeam.id
    if (Array.isArray(homeTeam.players)) {
      homeTeam.players.forEach(p => { if (!p.teamId) p.teamId = homeTeam.id; });
    }

    // Ensure all away players carry awayTeam.id
    if (Array.isArray(awayTeam.players)) {
      awayTeam.players.forEach(p => { if (!p.teamId) p.teamId = awayTeam.id; });
    }

    return {
      version: raw.version || '1.0',
      home: homeTeam,
      away: awayTeam,
      stateRevision: Number(raw.stateRevision) || 1,
      timestamp: Number(raw.timestamp) || Date.now()
    };
  }

  /**
   * Validates a team roster object
   */
  function validateTeamRoster(team) {
    const errors = [];
    const warnings = [];

    if (!team.name || !team.name.trim()) {
      errors.push('Team full name is required');
    }

    const numbers = new Set();
    const ids = new Set();

    (team.players || []).forEach((p, idx) => {
      if (numbers.has(p.jerseyNumber)) {
        errors.push(`Duplicate jersey number #${p.jerseyNumber} in ${team.name}`);
      }
      numbers.add(p.jerseyNumber);

      if (ids.has(p.id)) {
        errors.push(`Duplicate player ID ${p.id}`);
      }
      ids.add(p.id);

      if (!p.displayName || !p.displayName.trim()) {
        errors.push(`Player #${p.jerseyNumber || idx + 1} is missing a display name`);
      }
    });

    if (team.players && team.players.length >= 6) {
      if (!team.startingLineupIds || team.startingLineupIds.length !== 6) {
        warnings.push(`${team.name} starting lineup has ${team.startingLineupIds?.length || 0}/6 starters selected`);
      }
    } else if (team.players && team.players.length < 6) {
      warnings.push(`${team.name} has fewer than 6 players (${team.players.length})`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Load saved roster from localStorage (with fallback seed and auto-normalization)
   */
  function getSavedRoster(fallbackSeed = null) {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.home && parsed.away) {
            return normalizeRosterState(parsed);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading saved roster from localStorage:', e);
    }

    if (fallbackSeed && fallbackSeed.home && fallbackSeed.away) {
      return normalizeRosterState(fallbackSeed);
    }

    return createDefaultRosterState();
  }

  /**
   * Save roster to localStorage & publish via BroadcastChannel
   */
  function saveRoster(rosterState) {
    const normalized = normalizeRosterState(rosterState);
    normalized.stateRevision = (Number(rosterState.stateRevision) || 1) + 1;
    normalized.timestamp = Date.now();

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch (e) {
      console.error('Error saving roster to localStorage:', e);
    }

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({
          type: 'ROSTER_STATE_UPDATE',
          roster: normalized,
          timestamp: normalized.timestamp
        });
        channel.close();
      }
    } catch (e) {
      console.warn('Error broadcasting roster state:', e);
    }

    return normalized;
  }

  /**
   * Export roster state to formatted JSON with asset references
   */
  function exportRosterJSON(rosterState) {
    const normalized = normalizeRosterState(rosterState);
    return JSON.stringify({
      pixelGraphicsRoster: '1.0',
      exportedAt: new Date().toISOString(),
      stateRevision: normalized.stateRevision,
      timestamp: normalized.timestamp,
      home: normalized.home,
      away: normalized.away
    }, null, 2);
  }

  /**
   * Import roster state from JSON string with validation
   */
  function importRosterJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON format');
      }
      if (!parsed.home || !parsed.away) {
        throw new Error('JSON missing home or away team definitions');
      }

      const newRoster = normalizeRosterState(parsed);
      const homeVal = validateTeamRoster(newRoster.home);
      const awayVal = validateTeamRoster(newRoster.away);

      if (!homeVal.isValid || !awayVal.isValid) {
        const allErrors = [...homeVal.errors, ...awayVal.errors];
        throw new Error('Roster validation failed: ' + allErrors.join('; '));
      }

      return { success: true, roster: newRoster };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Game Package Factory (Architecture foundation for Phase G6+)
   */
  function createGamePackage(matchId, rosterState, theme = 'default') {
    const normalized = normalizeRosterState(rosterState);
    return {
      matchId: matchId || `game_${Date.now()}`,
      version: '1.0',
      createdAt: new Date().toISOString(),
      homeTeam: normalized.home,
      awayTeam: normalized.away,
      graphicsTheme: theme,
      assets: {
        homeLogo: normalized.home.logo,
        awayLogo: normalized.away.logo,
        homeLogoWhite: normalized.home.logoWhite,
        awayLogoWhite: normalized.away.logoWhite
      }
    };
  }

  /**
   * Automatic Team Color Palette Engine (Phase G7.5A)
   */
  function hexToRgb(hex) {
    let c = (hex || '').replace('#', '').trim();
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length !== 6) return { r: 0, g: 50, b: 160 };
    const num = parseInt(c, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function rgbToHex(r, g, b) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    const toHex = (v) => clamp(v).toString(16).padStart(2, '0').toUpperCase();
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s, l };
  }

  function hslToHex(h, s, l) {
    h = (h % 360 + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }

  function getRelativeLuminance(hex) {
    let c = (hex || '').replace('#', '').trim();
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length !== 6) return 0.5;
    const r = parseInt(c.substr(0, 2), 16) / 255;
    const g = parseInt(c.substr(2, 2), 16) / 255;
    const b = parseInt(c.substr(4, 2), 16) / 255;
    const toLinear = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  function derivePaletteFromPrimary(priHex) {
    const rgb = hexToRgb(priHex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    // 1. SECONDARY: Deep, rich harmonized background depth (preserving hue)
    let secH = hsl.h;
    let secS = Math.min(1.0, Math.max(0.40, hsl.s * 1.15));
    if (hsl.s < 0.15) secS = 0.20; // Monochrome/gray primary
    let secL = Math.max(0.08, Math.min(0.14, hsl.l * 0.34));
    const secHex = hslToHex(secH, secS, secL);

    // 2. ACCENT: High-contrast athletic broadcast highlight
    let accH, accS, accL;
    if (hsl.h >= 70 && hsl.h <= 165) {
      // Green family -> Vivid Athletic Gold/Yellow (#FACC15)
      accH = 47.95; accS = 0.958; accL = 0.5314;
    } else if (hsl.h >= 180 && hsl.h <= 260) {
      // Blue family -> Athletic Warm Gold / MDC Gold (#E3C46A)
      accH = 44.63; accS = 0.684; accL = 0.653;
    } else if ((hsl.h >= 340 && hsl.h <= 360) || (hsl.h >= 0 && hsl.h <= 20)) {
      // Red / Crimson family -> Warm Gold / Amber (#FBBF24)
      accH = 45; accS = 0.95; accL = 0.54;
    } else if (hsl.h > 260 && hsl.h < 340) {
      // Purple / Magenta family -> Vivid Gold (#FACC15)
      accH = 47.6; accS = 0.957; accL = 0.531;
    } else if (hsl.h >= 35 && hsl.h <= 65) {
      // Yellow / Gold primary -> High-contrast Electric Cyan (#38BDF8)
      accH = 198.6; accS = 0.932; accL = 0.598;
    } else if (hsl.h > 20 && hsl.h < 35) {
      // Orange primary -> Deep Sky Blue (#60A5FA)
      accH = 217.2; accS = 0.912; accL = 0.676;
    } else {
      // Neutral / Gray primary -> High-contrast Athletic Gold (#FACC15)
      accH = 47.6; accS = 0.957; accL = 0.531;
    }
    const accHex = hslToHex(accH, accS, accL);

    return {
      primary: (priHex || '#0032A0').toUpperCase(),
      secondary: secHex.toUpperCase(),
      accent: accHex.toUpperCase()
    };
  }

  return {
    STORAGE_KEY,
    CHANNEL_NAME,
    VolleyballPosition,
    createTeam,
    createPlayer,
    createDefaultRosterState,
    normalizeRosterState,
    validateTeamRoster,
    getSavedRoster,
    saveRoster,
    exportRosterJSON,
    importRosterJSON,
    createGamePackage,
    hexToRgb,
    rgbToHex,
    rgbToHsl,
    hslToHex,
    getRelativeLuminance,
    derivePaletteFromPrimary
  };
}));
