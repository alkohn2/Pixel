/**
 * PIXEL Sports Graphics System — Dev Roster Test Data (Phase G3 + G5.6)
 * 
 * Isolated test rosters for Miami Dade College (HOME) and Visiting Opponent (AWAY).
 * Includes valid teamIds, branding logos, and player portrait assets.
 * Used strictly as seed/demo data; does NOT overwrite saved user rosters.
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PixelDevRosterData = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const DEV_ROSTERS = {
    home: {
      id: 'team_mdc_sharks',
      name: 'MIAMI DADE SHARKS',
      shortName: 'MDC',
      abbreviation: 'MDC',
      colorPrimary: '#0032A0',
      colorSecondary: '#001f66',
      accentColor: '#e3c46a',
      logo: 'assets/teams/home-team/logo.svg',
      logoWhite: 'assets/teams/home-team/logo-white.svg',
      coach: 'Origenes "Kiko" Benoit',
      startingLineupIds: ['h7', 'h12', 'h4', 'h10', 'h2', 'h9'],
      branding: {
        logo: 'assets/teams/home-team/logo.svg',
        logoWhite: 'assets/teams/home-team/logo-white.svg',
        theme: 'default'
      },
      players: [
        {
          id: 'h7',
          teamId: 'team_mdc_sharks',
          jerseyNumber: 7,
          firstName: 'Maria',
          lastName: 'Santos',
          displayName: 'Maria Santos',
          position: 'OH',
          starter: true,
          captain: true,
          photo: 'assets/players/h7/portrait.svg',
          stats: { kills: 14, aces: 3, digs: 8, attackPct: '.385' }
        },
        {
          id: 'h12',
          teamId: 'team_mdc_sharks',
          jerseyNumber: 12,
          firstName: 'Camila',
          lastName: 'Valenzuela',
          displayName: 'Camila Valenzuela',
          position: 'MB',
          starter: true,
          captain: false,
          photo: null,
          stats: { blocks: 6, kills: 9, attackPct: '.450' }
        },
        {
          id: 'h4',
          teamId: 'team_mdc_sharks',
          jerseyNumber: 4,
          firstName: 'Sofia',
          lastName: 'Navarro',
          displayName: 'Sofia Navarro',
          position: 'S',
          starter: true,
          captain: false,
          photo: null,
          stats: { assists: 38, aces: 2, digs: 6 }
        },
        {
          id: 'h10',
          teamId: 'team_mdc_sharks',
          jerseyNumber: 10,
          firstName: 'Elena',
          lastName: 'Reyes',
          displayName: 'Elena Reyes',
          position: 'OPP',
          starter: true,
          captain: false,
          photo: null,
          stats: { kills: 11, blocks: 3, digs: 4 }
        },
        {
          id: 'h2',
          teamId: 'team_mdc_sharks',
          jerseyNumber: 2,
          firstName: 'Isabella',
          lastName: 'Gomez',
          displayName: 'Isabella Gomez',
          position: 'L',
          starter: true,
          captain: false,
          photo: null,
          stats: { digs: 18, receptions: 24, passRating: '2.6' }
        },
        {
          id: 'h9',
          teamId: 'team_mdc_sharks',
          jerseyNumber: 9,
          firstName: 'Valentina',
          lastName: 'Cruz',
          displayName: 'Valentina Cruz',
          position: 'OH',
          starter: true,
          captain: false,
          photo: null,
          stats: { kills: 8, digs: 7, aces: 1 }
        },
        {
          id: 'h15',
          teamId: 'team_mdc_sharks',
          jerseyNumber: 15,
          firstName: 'Gabriela',
          lastName: 'Perez',
          displayName: 'Gabriela Perez',
          position: 'DS',
          starter: false,
          captain: false,
          photo: null,
          stats: { digs: 5, aces: 1 }
        }
      ]
    },
    away: {
      id: 'team_florida_state',
      name: 'DAYTONA STATE FALCONS',
      shortName: 'DSC',
      abbreviation: 'DSC',
      colorPrimary: '#15803d',
      colorSecondary: '#052e16',
      accentColor: '#facc15',
      logo: 'assets/teams/away-team/logo.svg',
      logoWhite: 'assets/teams/away-team/logo-white.svg',
      coach: 'Laura Falcon',
      startingLineupIds: ['a5', 'a8', 'a11', 'a1', 'a6', 'a14'],
      branding: {
        logo: 'assets/teams/away-team/logo.svg',
        logoWhite: 'assets/teams/away-team/logo-white.svg',
        theme: 'default'
      },
      players: [
        {
          id: 'a5',
          teamId: 'team_florida_state',
          jerseyNumber: 5,
          firstName: 'Taylor',
          lastName: 'Brooks',
          displayName: 'Taylor Brooks',
          position: 'OH',
          starter: true,
          captain: true,
          photo: 'assets/players/a5/portrait.svg',
          stats: { kills: 16, aces: 2, digs: 9 }
        },
        {
          id: 'a8',
          teamId: 'team_florida_state',
          jerseyNumber: 8,
          firstName: 'Morgan',
          lastName: 'Jenkins',
          displayName: 'Morgan Jenkins',
          position: 'MB',
          starter: true,
          captain: false,
          photo: null,
          stats: { blocks: 5, kills: 7 }
        },
        {
          id: 'a11',
          teamId: 'team_florida_state',
          jerseyNumber: 11,
          firstName: 'Chloe',
          lastName: 'Vance',
          displayName: 'Chloe Vance',
          position: 'S',
          starter: true,
          captain: false,
          photo: null,
          stats: { assists: 34, digs: 7 }
        },
        {
          id: 'a1',
          teamId: 'team_florida_state',
          jerseyNumber: 1,
          firstName: 'Jordan',
          lastName: 'Hayes',
          displayName: 'Jordan Hayes',
          position: 'OPP',
          starter: true,
          captain: false,
          photo: null,
          stats: { kills: 10, blocks: 2 }
        },
        {
          id: 'a6',
          teamId: 'team_florida_state',
          jerseyNumber: 6,
          firstName: 'Riley',
          lastName: 'O\'Connor',
          displayName: 'Riley O\'Connor',
          position: 'L',
          starter: true,
          captain: false,
          photo: null,
          stats: { digs: 15, receptions: 21 }
        },
        {
          id: 'a14',
          teamId: 'team_florida_state',
          jerseyNumber: 14,
          firstName: 'Brooke',
          lastName: 'Matthews',
          displayName: 'Brooke Matthews',
          position: 'OH',
          starter: true,
          captain: false,
          photo: null,
          stats: { kills: 9, digs: 6 }
        }
      ]
    }
  };

  function getTeamRoster(teamKey = 'home') {
    return DEV_ROSTERS[teamKey] || DEV_ROSTERS.home;
  }

  function getStartingLineup(teamKey = 'home') {
    const team = getTeamRoster(teamKey);
    return team.startingLineupIds.map(id => team.players.find(p => p.id === id)).filter(Boolean);
  }

  return {
    DEV_ROSTERS,
    getTeamRoster,
    getStartingLineup
  };
}));
