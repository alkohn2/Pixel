/**
 * PIXEL Sports Graphics System — Graphics State Core Module (Phase G1 + G4)
 * 
 * Manages presentation-only broadcast graphics states, overlay layers,
 * visibility queues, active templates, and theme parameters.
 * Does NOT store or mutate sporting match truth.
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PixelGraphicsState = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  // Dedicated Presentation-Only Transport Channels (Phase G4)
  const STORAGE_KEY = 'pixelVolleyballGraphicsStateV1';
  const CHANNEL_NAME = 'pixel-volleyball-graphics-state';
  const CMD_CHANNEL_NAME = 'pixel-volleyball-graphics-command';
  const ACK_CHANNEL_NAME = 'pixel-volleyball-graphics-ack';

  // Supported Broadcast Graphic Identifiers
  const GraphicId = Object.freeze({
    SCOREBUG: 'SCOREBUG',
    PLAYER_LOWER_THIRD: 'PLAYER_LOWER_THIRD',
    PLAYER_STATS: 'PLAYER_STATS',
    TEAM_STATS: 'TEAM_STATS',
    STARTING_LINEUP: 'STARTING_LINEUP',
    GAME_INTRO: 'GAME_INTRO',
    SET_RESULT: 'SET_RESULT',
    MATCH_RESULT: 'MATCH_RESULT',
    BREAK: 'BREAK',
    SPONSOR: 'SPONSOR'
  });

  // Transition Lifecycle States
  const TransitionState = Object.freeze({
    IDLE: 'IDLE',
    ENTERING: 'ENTERING',
    VISIBLE: 'VISIBLE',
    EXITING: 'EXITING',
    HIDDEN: 'HIDDEN'
  });

  /**
   * Factory for default presentation state
   */
  function createDefaultGraphicsState() {
    return {
      version: '1.0',
      activeGraphic: GraphicId.SCOREBUG,
      preparedGraphic: null,
      visibility: {
        scorebug: true,
        playerLowerThird: false,
        startingLineup: false,
        playerStats: false,
        setResult: false,
        matchResult: false
      },
      prepared: {
        playerLowerThird: {
          team: 'home',
          playerId: 'h7',
          playerIndex: 0
        },
        startingLineup: {
          team: 'home'
        },
        playerStats: {
          team: 'home',
          playerId: 'h7',
          playerIndex: 0
        },
        setResult: {
          setNumber: 1
        },
        matchResult: {}
      },
      transitionState: TransitionState.VISIBLE,
      language: 'en', // 'en' | 'es'
      lastGraphicAction: 'INIT',
      stateRevision: 1,
      lastActionTimestamp: Date.now()
    };
  }

  /**
   * Normalizes incoming raw graphics state
   */
  function normalizeGraphicsState(raw) {
    if (!raw || typeof raw !== 'object') {
      return createDefaultGraphicsState();
    }

    const state = createDefaultGraphicsState();

    state.version = raw.version || '1.0';
    state.activeGraphic = raw.activeGraphic || GraphicId.SCOREBUG;
    state.preparedGraphic = raw.preparedGraphic || null;

    if (raw.visibility && typeof raw.visibility === 'object') {
      const vis = raw.visibility;
      state.visibility = {
        scorebug: Boolean(vis.scorebug ?? false),
        playerLowerThird: Boolean(vis.playerLowerThird ?? false),
        startingLineup: Boolean(vis.startingLineup ?? false),
        playerStats: Boolean(vis.playerStats !== undefined ? vis.playerStats : (vis.stats !== undefined ? vis.stats : false)),
        setResult: Boolean(vis.setResult ?? false),
        matchResult: Boolean(vis.matchResult ?? false)
      };
    } else if (raw.graphicVisible !== undefined) {
      state.visibility.scorebug = Boolean(raw.graphicVisible);
    }

    if (raw.prepared && typeof raw.prepared === 'object') {
      const pStats = raw.prepared.playerStats || raw.prepared.stats || {};
      state.prepared = {
        playerLowerThird: {
          team: raw.prepared.playerLowerThird?.team || 'home',
          playerId: raw.prepared.playerLowerThird?.playerId || 'h7',
          playerIndex: Number(raw.prepared.playerLowerThird?.playerIndex) || 0
        },
        startingLineup: {
          team: raw.prepared.startingLineup?.team || 'home'
        },
        playerStats: {
          team: pStats.team || 'home',
          playerId: pStats.playerId || 'h7',
          playerIndex: Number(pStats.playerIndex) || 0
        },
        setResult: {
          setNumber: Number(raw.prepared.setResult?.setNumber) || 1
        },
        matchResult: raw.prepared.matchResult || {}
      };
    }

    state.transitionState = raw.transitionState || TransitionState.VISIBLE;
    state.language = raw.language === 'es' ? 'es' : 'en';
    state.lastGraphicAction = raw.lastGraphicAction || 'UPDATE';
    state.stateRevision = Number(raw.stateRevision) || 1;
    state.lastActionTimestamp = Number(raw.lastActionTimestamp || raw.timestamp) || Date.now();

    return state;
  }

  return {
    STORAGE_KEY,
    CHANNEL_NAME,
    CMD_CHANNEL_NAME,
    ACK_CHANNEL_NAME,
    GraphicId,
    TransitionState,
    createDefaultGraphicsState,
    normalizeGraphicsState
  };
}));
