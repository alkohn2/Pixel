/**
 * PIXEL Sports Graphics System — Roster & Team Branding Model (Phase G1 + G5.5 + G5.6)
 * 
 * Reusable data definitions, validation rules, persistence layer,
 * asset references (logos, portraits, colors), Game Package foundation,
 * and JSON import/export for Teams, Players, and Starting Lineups.
 */

(function(root, factory) {
  const result = factory();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = result;
  }
  root = root || (typeof globalThis !== 'undefined' ? globalThis : self);
  root.PixelRosterModel = result;
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function() {
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
    createGamePackage
  };
}));
