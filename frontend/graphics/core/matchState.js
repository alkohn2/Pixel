/**
 * PIXEL Sports Graphics System — Match State Core Module (Phase G1 + Phase V1)
 * 
 * Authoritative source of sporting truth for Volleyball.
 * Supports college volleyball rules for BEST_OF_5 and BEST_OF_3 formats,
 * precise set point and match point calculations, and deuce extension logic.
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PixelMatchState = factory();
  }
  if (typeof window !== 'undefined') {
    window.PixelMatchState = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const STORAGE_KEY = 'mdcVolleyballMatchStateV1';
  const LIVE_CHANNEL_NAME = 'mdc-volleyball-live-state';
  const CMD_CHANNEL_NAME = 'mdc-volleyball-command-v1';
  const ACK_CHANNEL_NAME = 'mdc-volleyball-command-ack-v1';

  /**
   * Factory for default pure match state
   */
  function createDefaultMatchState() {
    return {
      version: '1.0',
      matchStatus: 'IN_PROGRESS', // 'IN_PROGRESS' | 'FINISHED' | 'WARMUP'
      matchFormat: 'BEST_OF_5', // 'BEST_OF_5' | 'BEST_OF_3'
      autoAdvanceSet: false,
      currentSet: 1,
      servingTeam: 'home', // 'home' | 'away' | null
      teamHome: {
        id: 'home',
        name: 'MIAMI DADE SHARKS',
        shortName: 'MDC',
        color: '#0032A0',
        setsWon: 0,
        currentPoints: 0,
        timeouts: 0
      },
      teamAway: {
        id: 'away',
        name: 'DAYTONA STATE FALCONS',
        shortName: 'DSC',
        color: '#b91c1c',
        setsWon: 0,
        currentPoints: 0,
        timeouts: 0
      },
      setsHistory: [], // Array<{ setNumber: number, homePoints: number, awayPoints: number, winner: string }>
      stateRevision: 1,
      timestamp: Date.now()
    };
  }

  /**
   * Normalizes incoming raw state payload (legacy or modern) into standard MatchState
   */
  function normalizeMatchState(raw) {
    if (!raw || typeof raw !== 'object') {
      return createDefaultMatchState();
    }

    const state = createDefaultMatchState();

    state.version = raw.version || '1.0';
    state.matchStatus = raw.matchStatus || 'IN_PROGRESS';
    state.matchFormat = raw.matchFormat === 'BEST_OF_3' ? 'BEST_OF_3' : 'BEST_OF_5';
    state.autoAdvanceSet = Boolean(raw.autoAdvanceSet);
    state.currentSet = Number(raw.currentSet) || 1;
    state.servingTeam = raw.servingTeam === 'home' || raw.servingTeam === 'away' ? raw.servingTeam : null;
    state.stateRevision = Number(raw.stateRevision) || 1;
    state.timestamp = Number(raw.timestamp) || Date.now();

    // Home Team normalization
    if (raw.teamHome) {
      state.teamHome.id = raw.teamHome.id || 'home';
      state.teamHome.name = String(raw.teamHome.name || 'MIAMI DADE SHARKS');
      state.teamHome.shortName = String(raw.teamHome.shortName || raw.teamHome.name || 'MDC');
      state.teamHome.color = String(raw.teamHome.color || '#0032A0');
      state.teamHome.setsWon = Number(raw.teamHome.setsWon) || 0;
      state.teamHome.currentPoints = Number(raw.teamHome.currentPoints) || 0;
      state.teamHome.timeouts = Number(raw.teamHome.timeouts) || 0;
    }

    // Away Team normalization
    if (raw.teamAway) {
      state.teamAway.id = raw.teamAway.id || 'away';
      state.teamAway.name = String(raw.teamAway.name || 'DAYTONA STATE FALCONS');
      state.teamAway.shortName = String(raw.teamAway.shortName || raw.teamAway.name || 'DSC');
      state.teamAway.color = String(raw.teamAway.color || '#b91c1c');
      state.teamAway.setsWon = Number(raw.teamAway.setsWon) || 0;
      state.teamAway.currentPoints = Number(raw.teamAway.currentPoints) || 0;
      state.teamAway.timeouts = Number(raw.teamAway.timeouts) || 0;
    }

    // Sets History normalization
    if (Array.isArray(raw.setsHistory)) {
      state.setsHistory = raw.setsHistory.map(item => ({
        setNumber: Number(item.setNumber) || 1,
        homePoints: Number(item.homePoints) || 0,
        awayPoints: Number(item.awayPoints) || 0,
        winner: item.winner || (Number(item.homePoints) > Number(item.awayPoints) ? 'home' : 'away')
      }));
    }

    return state;
  }

  /**
   * Helper to evaluate Set Point or Match Point condition according to College Volleyball Rules.
   * 
   * Definition of SET POINT:
   * "If this team wins the NEXT point, the set will end."
   * Condition: (currentPoints + 1 >= targetPoints) && ((currentPoints + 1) - opponentPoints >= 2)
   * which simplifies to: (currentPoints >= targetPoints - 1) && (currentPoints - opponentPoints >= 1)
   * 
   * Definition of MATCH POINT:
   * "If this team wins the NEXT point, it wins the match."
   * Condition: Team is on valid SET POINT and setsWon === setsToWin - 1
   * 
   * Formats:
   * BEST_OF_5: Sets 1-4 target 25 (win by 2); Deciding Set 5 target 15 (win by 2); First to 3 sets.
   * BEST_OF_3: Sets 1-2 target 25 (win by 2); Deciding Set 3 target 15 (win by 2); First to 2 sets.
   */
  function evaluateSpecialPoint(state) {
    if (!state || state.matchStatus === 'FINISHED') return null;

    const format = state.matchFormat === 'BEST_OF_3' ? 'BEST_OF_3' : 'BEST_OF_5';
    const decidingSet = format === 'BEST_OF_3' ? 3 : 5;
    const setsToWin = format === 'BEST_OF_3' ? 2 : 3;

    const setNum = Number(state.currentSet) || 1;
    const targetPoints = setNum >= decidingSet ? 15 : 25;

    const hPts = Number(state.teamHome.currentPoints) || 0;
    const aPts = Number(state.teamAway.currentPoints) || 0;

    // Check if the set is already completed / won (if so, no longer on set point)
    const hWonSet = (hPts >= targetPoints && (hPts - aPts >= 2));
    const aWonSet = (aPts >= targetPoints && (aPts - hPts >= 2));
    if (hWonSet || aWonSet) return null;

    // Home Team Set/Match Point Check
    if (hPts >= targetPoints - 1 && (hPts - aPts >= 1)) {
      const isMatchPoint = (state.teamHome.setsWon === setsToWin - 1);
      return {
        type: isMatchPoint ? 'MATCH_POINT' : 'SET_POINT',
        team: 'home',
        teamName: state.teamHome.name,
        targetPoints: Math.max(targetPoints, aPts + 2),
        currentPoints: hPts,
        opponentPoints: aPts
      };
    }

    // Away Team Set/Match Point Check
    if (aPts >= targetPoints - 1 && (aPts - hPts >= 1)) {
      const isMatchPoint = (state.teamAway.setsWon === setsToWin - 1);
      return {
        type: isMatchPoint ? 'MATCH_POINT' : 'SET_POINT',
        team: 'away',
        teamName: state.teamAway.name,
        targetPoints: Math.max(targetPoints, hPts + 2),
        currentPoints: aPts,
        opponentPoints: hPts
      };
    }

    return null;
  }

  /**
   * Helper to determine if the current set has reached a valid winning score
   */
  function isSetWon(state) {
    if (!state || state.matchStatus === 'FINISHED') return false;

    const format = state.matchFormat === 'BEST_OF_3' ? 'BEST_OF_3' : 'BEST_OF_5';
    const decidingSet = format === 'BEST_OF_3' ? 3 : 5;
    const targetPoints = Number(state.currentSet) >= decidingSet ? 15 : 25;

    const hPts = Number(state.teamHome?.currentPoints) || 0;
    const aPts = Number(state.teamAway?.currentPoints) || 0;

    const maxPts = Math.max(hPts, aPts);
    const diff = Math.abs(hPts - aPts);

    return (maxPts >= targetPoints) && (diff >= 2);
  }

  return {
    STORAGE_KEY,
    LIVE_CHANNEL_NAME,
    CMD_CHANNEL_NAME,
    ACK_CHANNEL_NAME,
    createDefaultMatchState,
    normalizeMatchState,
    evaluateSpecialPoint,
    isSetWon
  };
}));
