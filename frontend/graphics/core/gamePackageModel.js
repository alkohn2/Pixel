/**
 * PIXEL Sports Graphics System — Game Package Model (Phase G5.7)
 * 
 * Data structures, validation, persistence, and activation management
 * for complete pre-match Game Packages.
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PixelGamePackageModel = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const STORAGE_KEY = 'pixelVolleyballGamePackagesV1';
  const ACTIVE_GAME_KEY = 'pixelVolleyballActiveGameV1';
  const CHANNEL_NAME = 'pixel-volleyball-game-package-state';

  /**
   * Factory to create a Game Package entity
   */
  function createGamePackage(config = {}) {
    const now = new Date().toISOString();
    const gameId = config.gameId || `game_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    return {
      version: '1.0',
      gameId: gameId,
      title: config.title || 'Match Title',
      event: {
        name: config.event?.name || 'Championship Match',
        venue: config.event?.venue || 'Main Gymnasium',
        date: config.event?.date || new Date().toISOString().split('T')[0],
        competition: config.event?.competition || 'NJCAA Women\'s Volleyball'
      },
      home: {
        teamId: config.home?.teamId || 'team_mdc_sharks',
        teamName: config.home?.teamName || 'Miami Dade Sharks',
        rosterId: config.home?.rosterId || 'roster_home',
        lineupId: config.home?.lineupId || 'lineup_home'
      },
      away: {
        teamId: config.away?.teamId || 'team_florida_state',
        teamName: config.away?.teamName || 'Daytona State Falcons',
        rosterId: config.away?.rosterId || 'roster_away',
        lineupId: config.away?.lineupId || 'lineup_away'
      },
      graphics: {
        theme: config.graphics?.theme || 'default',
        accentColor: config.graphics?.accentColor || '#e3c46a',
        sponsor: config.graphics?.sponsor || 'MDC-TV'
      },
      assets: {
        root: config.assets?.root || 'assets/',
        teams: config.assets?.teams || 'assets/teams/',
        players: config.assets?.players || 'assets/players/'
      },
      isReady: Boolean(config.isReady),
      createdAt: config.createdAt || now,
      updatedAt: now
    };
  }

  /**
   * Validates a game package object
   */
  function validateGamePackage(pkg) {
    const errors = [];
    const warnings = [];

    if (!pkg || typeof pkg !== 'object') {
      return { isValid: false, errors: ['Invalid package object'], warnings: [] };
    }
    if (!pkg.gameId) errors.push('Missing game ID');
    if (!pkg.title || !pkg.title.trim()) errors.push('Missing game title');
    if (!pkg.home?.teamId) errors.push('Missing Home Team assignment');
    if (!pkg.away?.teamId) errors.push('Missing Away Team assignment');

    if (!pkg.event?.venue) warnings.push('Event venue is empty');
    if (!pkg.event?.date) warnings.push('Event date is empty');

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Load all saved packages from localStorage
   */
  function getSavedPackages() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map(createGamePackage);
          }
        }
      }
    } catch (e) {
      console.warn('Error loading game packages from localStorage:', e);
    }
    return [];
  }

  /**
   * Save array of packages to localStorage
   */
  function saveAllPackages(packages) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
      }
    } catch (e) {
      console.error('Error saving packages to localStorage:', e);
    }
  }

  /**
   * Save or update a single package
   */
  function savePackage(pkg) {
    const normalized = createGamePackage(pkg);
    const all = getSavedPackages();
    const existingIdx = all.findIndex(p => p.gameId === normalized.gameId);

    if (existingIdx >= 0) {
      all[existingIdx] = normalized;
    } else {
      all.push(normalized);
    }

    saveAllPackages(all);
    broadcastPackageState('PACKAGE_SAVED', normalized);
    return normalized;
  }

  /**
   * Delete a package by gameId
   */
  function deletePackage(gameId) {
    const all = getSavedPackages().filter(p => p.gameId !== gameId);
    saveAllPackages(all);

    // If active game is deleted, clear active
    if (getActiveGameId() === gameId) {
      setActiveGameId(all[0]?.gameId || null);
    } else {
      broadcastPackageState('PACKAGE_DELETED', { gameId });
    }
  }

  /**
   * Get active Game ID
   */
  function getActiveGameId() {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(ACTIVE_GAME_KEY) || null;
      }
    } catch (e) {}
    return null;
  }

  /**
   * Set active Game ID and broadcast to graphics
   */
  function setActiveGameId(gameId) {
    try {
      if (typeof localStorage !== 'undefined') {
        if (gameId) localStorage.setItem(ACTIVE_GAME_KEY, gameId);
        else localStorage.removeItem(ACTIVE_GAME_KEY);
      }
    } catch (e) {}

    const activePkg = getActivePackage();
    broadcastPackageState('ACTIVE_GAME_CHANGED', activePkg);
    return activePkg;
  }

  /**
   * Get the active Game Package object (or first saved / fallback)
   */
  function getActivePackage() {
    const all = getSavedPackages();
    const activeId = getActiveGameId();
    let found = all.find(p => p.gameId === activeId);

    if (!found && all.length > 0) {
      found = all[0];
      setActiveGameId(found.gameId);
    }

    if (!found) {
      // Default seed package
      found = createGamePackage({
        gameId: 'game_demo_01',
        title: 'Miami Dade vs Daytona State',
        event: {
          name: 'Conference Championship',
          venue: 'Kendall Campus Gym',
          date: new Date().toISOString().split('T')[0],
          competition: 'NJCAA Women\'s Volleyball'
        },
        home: {
          teamId: 'team_mdc_sharks',
          teamName: 'Miami Dade Sharks',
          rosterId: 'roster_home',
          lineupId: 'lineup_home'
        },
        away: {
          teamId: 'team_florida_state',
          teamName: 'Daytona State Falcons',
          rosterId: 'roster_away',
          lineupId: 'lineup_away'
        },
        isReady: true
      });
    }

    return found;
  }

  /**
   * Broadcast package state over BroadcastChannel
   */
  function broadcastPackageState(action, packageData) {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({
          type: 'GAME_PACKAGE_UPDATE',
          action: action,
          package: packageData,
          activeGameId: getActiveGameId(),
          timestamp: Date.now()
        });
        channel.close();
      }
    } catch (e) {
      console.warn('Error broadcasting game package update:', e);
    }
  }

  /**
   * Export package to portable JSON
   */
  function exportPackageJSON(pkg) {
    const normalized = createGamePackage(pkg);
    return JSON.stringify({
      pixelGamePackage: '1.0',
      exportedAt: new Date().toISOString(),
      package: normalized
    }, null, 2);
  }

  /**
   * Import package from JSON
   */
  function importPackageJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON format');
      }
      const data = parsed.package || parsed;
      const normalized = createGamePackage(data);
      const val = validateGamePackage(normalized);

      if (!val.isValid) {
        throw new Error('Game package validation failed: ' + val.errors.join('; '));
      }

      return { success: true, package: normalized };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  return {
    STORAGE_KEY,
    ACTIVE_GAME_KEY,
    CHANNEL_NAME,
    createGamePackage,
    validateGamePackage,
    getSavedPackages,
    saveAllPackages,
    savePackage,
    deletePackage,
    getActiveGameId,
    setActiveGameId,
    getActivePackage,
    exportPackageJSON,
    importPackageJSON
  };
}));
