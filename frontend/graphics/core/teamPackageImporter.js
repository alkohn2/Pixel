/**
 * PIXEL Sports Graphics System — Team Package Importer (Phase D1.2)
 * 
 * MDC-TV Fillable Team Submission PDF + XLSX + ZIP Team Package Engine:
 * - PDF Form Generator (AcroForm 4-page Letter: Team Info, Roster, Starting 6, Stats)
 * - PDF Form Parser & Validator (Direct import from filled PDF forms)
 * - XLSX Workbook Generator & Parser (Multi-sheet Coach-Friendly Form)
 * - ZIP Package Parser & Asset Resolver (Loose or folder portraits + logo)
 * - Roster Model Converter (Strict pixelVolleyballRosterV1 schema)
 * - Protected Miami Dade College HOME Team Safeguard
 */

(function(root, factory) {
  const rootObj = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this || {});
  const resolvedXLSX = (typeof rootObj.XLSX !== 'undefined') ? rootObj.XLSX : null;
  const resolvedJSZip = (typeof rootObj.JSZip !== 'undefined') ? rootObj.JSZip : null;
  const resolvedRoster = (typeof rootObj.PixelRosterModel !== 'undefined') ? rootObj.PixelRosterModel : null;
  const resolvedPDFLib = (typeof rootObj.PDFLib !== 'undefined') ? rootObj.PDFLib : null;

  const result = factory(resolvedXLSX, resolvedJSZip, resolvedRoster, resolvedPDFLib);
  if (typeof module === 'object' && module && module.exports) {
    module.exports = result;
  }
  rootObj.PixelTeamPackageImporter = result;
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function(injectedXLSX, injectedJSZip, injectedRosterModel, injectedPDFLib) {
  'use strict';

  function getXLSX() {
    if (injectedXLSX) return injectedXLSX;
    if (typeof globalThis !== 'undefined' && globalThis.XLSX) return globalThis.XLSX;
    if (typeof window !== 'undefined' && window.XLSX) return window.XLSX;
    if (typeof require === 'function') {
      try { return require('xlsx'); } catch (e) {}
      try { return require('/Volumes/VGC-01/OBS Sports/PIXEL/frontend/node_modules/xlsx'); } catch (e) {}
    }
    return null;
  }

  function getJSZip() {
    if (injectedJSZip) return injectedJSZip;
    if (typeof globalThis !== 'undefined' && globalThis.JSZip) return globalThis.JSZip;
    if (typeof window !== 'undefined' && window.JSZip) return window.JSZip;
    if (typeof require === 'function') {
      try { return require('jszip'); } catch (e) {}
      try { return require('/Volumes/VGC-01/OBS Sports/PIXEL/frontend/node_modules/jszip'); } catch (e) {}
    }
    return null;
  }

  function getPDFLib() {
    if (injectedPDFLib) return injectedPDFLib;
    if (typeof globalThis !== 'undefined' && globalThis.PDFLib) return globalThis.PDFLib;
    if (typeof window !== 'undefined' && window.PDFLib) return window.PDFLib;
    if (typeof require === 'function') {
      try { return require('pdf-lib'); } catch (e) {}
      try { return require('/Volumes/VGC-01/OBS Sports/PIXEL/frontend/node_modules/pdf-lib'); } catch (e) {}
    }
    return null;
  }

  function getRosterModel() {
    if (injectedRosterModel) return injectedRosterModel;
    if (typeof globalThis !== 'undefined' && globalThis.PixelRosterModel) return globalThis.PixelRosterModel;
    if (typeof window !== 'undefined' && window.PixelRosterModel) return window.PixelRosterModel;
    return null;
  }

  // Security Limits
  const SECURITY_LIMITS = Object.freeze({
    MAX_ZIP_SIZE: 50 * 1024 * 1024,      // 50 MB
    MAX_FILE_COUNT: 100,                 // 100 entries max
    MAX_IMAGE_SIZE: 15 * 1024 * 1024,    // 15 MB per image
    ALLOWED_EXTENSIONS: ['.xlsx', '.xls', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.svg']
  });

  // Standard Volleyball Position Mapping & Human Aliases
  const POSITION_ALIASES = Object.freeze({
    // Outside Hitter
    'OH': 'OH',
    'OH — OUTSIDE HITTER': 'OH',
    'OH - OUTSIDE HITTER': 'OH',
    'OH (OUTSIDE HITTER)': 'OH',
    'OUTSIDE': 'OH',
    'OUTSIDE HITTER': 'OH',
    'OUTSIDE_HITTER': 'OH',
    'OH1': 'OH',
    'OH2': 'OH',
    'HITTER': 'OH',
    'PUNTA': 'OH',
    'ATACANTE': 'OH',

    // Middle Blocker
    'MB': 'MB',
    'MB — MIDDLE BLOCKER': 'MB',
    'MB - MIDDLE BLOCKER': 'MB',
    'MB (MIDDLE BLOCKER)': 'MB',
    'MIDDLE': 'MB',
    'MIDDLE BLOCKER': 'MB',
    'MIDDLE_BLOCKER': 'MB',
    'MB1': 'MB',
    'MB2': 'MB',
    'BLOCKER': 'MB',
    'CENTRAL': 'MB',
    'CENTER': 'MB',

    // Setter
    'S': 'S',
    'S — SETTER': 'S',
    'S - SETTER': 'S',
    'S (SETTER)': 'S',
    'SETTER': 'S',
    'SET': 'S',
    'S1': 'S',
    'S2': 'S',
    'ARMADORA': 'S',
    'COLOCADORA': 'S',
    'PASADORA': 'S',

    // Opposite / Right Side
    'OPP': 'OPP',
    'OPP — OPPOSITE': 'OPP',
    'OPP - OPPOSITE': 'OPP',
    'OPP (OPPOSITE)': 'OPP',
    'OPPOSITE': 'OPP',
    'OPPOSITE HITTER': 'OPP',
    'OPPOSITE_HITTER': 'OPP',
    'RIGHT SIDE': 'OPP',
    'RIGHT_SIDE': 'OPP',
    'RS': 'OPP',
    'OPP1': 'OPP',
    'OPP2': 'OPP',
    'OPUESTA': 'OPP',

    // Libero
    'L': 'L',
    'L — LIBERO': 'L',
    'L - LIBERO': 'L',
    'L (LIBERO)': 'L',
    'LIBERO': 'L',
    'LIB': 'L',
    'LÍBERO': 'L',

    // Defensive Specialist
    'DS': 'DS',
    'DS — DEFENSIVE SPECIALIST': 'DS',
    'DS - DEFENSIVE SPECIALIST': 'DS',
    'DS (DEFENSIVE SPECIALIST)': 'DS',
    'DEFENSIVE SPECIALIST': 'DS',
    'DEFENSIVE_SPECIALIST': 'DS',
    'DEFENSIVE': 'DS',
    'DEFENSE': 'DS',
    'BACK ROW': 'DS',
    'DS1': 'DS',
    'DS2': 'DS'
  });

  /**
   * Helper: Normalize text for case-insensitive key comparison
   */
  function normalizeKey(key) {
    if (!key) return '';
    return String(key)
      .trim()
      .toUpperCase()
      .replace(/[\*—\-:\(\)\/\\\.#%]/g, ' ')
      .replace(/[\s\-_]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Helper: Validate and normalize hex color
   */
  function normalizeHexColor(val, defaultColor, fieldName, warnings) {
    if (!val) return defaultColor;
    let str = String(val).trim();
    if (!str.startsWith('#')) {
      str = '#' + str;
      if (warnings) warnings.push(`${fieldName}: Added missing '#' to color hex code (${str})`);
    }
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(str)) {
      if (warnings) warnings.push(`${fieldName}: Invalid hex color "${val}". Defaulted to ${defaultColor}`);
      return defaultColor;
    }
    return str.toUpperCase();
  }

  /**
   * Helper: Normalize boolean values from forms
   */
  function parseBoolean(val) {
    if (val === true || val === 1) return true;
    if (!val) return false;
    const s = String(val).trim().toUpperCase();
    return ['TRUE', '1', 'YES', 'Y', 'SI', 'S', '★', 'CAPTAIN', 'STARTER', 'TITULAR', 'X'].includes(s);
  }

  /**
   * Helper: Sanitize zip entry path to prevent directory traversal
   */
  function sanitizeZipPath(entryPath) {
    if (!entryPath) return null;
    const clean = entryPath.replace(/\\/g, '/').trim();
    if (clean.includes('..') || clean.startsWith('/') || clean.includes(':')) {
      return null; // Malicious path traversal
    }
    return clean;
  }

  /**
   * Helper: Check if filename extension is permitted
   */
  function isAllowedExtension(filename) {
    if (!filename) return false;
    const lower = filename.toLowerCase();
    return SECURITY_LIMITS.ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
  }

  /**
   * Parse Team sheet from Excel workbook
   */
  function parseTeamSheet(sheet, warnings, errors) {
    const XLSX = getXLSX();
    if (!XLSX) {
      errors.push('XLSX parser library is not loaded');
      return null;
    }
    if (!sheet) {
      errors.push('Missing required team info sheet ("TEAM INFO" or "TEAM")');
      return null;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows || !rows.length) {
      errors.push('The team info sheet is empty');
      return null;
    }

    const teamData = {
      name: '',
      shortName: '',
      abbreviation: '',
      coach: '',
      assistantCoach: '',
      nickname: '',
      conference: '',
      cityState: '',
      website: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      colorPrimary: '#0032A0',
      colorSecondary: '#001956',
      accentColor: '#E3C46A',
      colorsSupplied: false,
      logoFile: '',
      logoWhiteFile: ''
    };

    rows.forEach(r => {
      if (!Array.isArray(r)) return;
      for (let c = 0; c < r.length; c++) {
        const cellVal = String(r[c] || '').trim();
        const k = normalizeKey(cellVal);
        if (!k) continue;

        let v = '';
        for (let nextC = c + 1; nextC < r.length; nextC++) {
          if (r[nextC] !== undefined && r[nextC] !== '') {
            v = String(r[nextC]).trim();
            break;
          }
        }

        if (['SCHOOL_TEAM_NAME', 'SCHOOL_TEAM', 'SCHOOL_NAME', 'TEAM_NAME', 'NAME', 'TEAM', 'EQUIPO'].includes(k)) {
          if (v && !teamData.name) teamData.name = v;
        } else if (['TEAM_NICKNAME', 'NICKNAME', 'MASCOT'].includes(k)) {
          if (v && !teamData.nickname) teamData.nickname = v;
        } else if (['SHORT_NAME', 'SHORT', 'NOMBRE_CORTO'].includes(k)) {
          if (v && !teamData.shortName) teamData.shortName = v;
        } else if (['ABBREVIATION', 'ABBR', 'CODE', 'SIGLAS', 'CODIGO'].includes(k)) {
          if (v && !teamData.abbreviation) teamData.abbreviation = v;
        } else if (['HEAD_COACH', 'COACH', 'ENTRENADOR', 'ENTRENADOR_PRINCIPAL'].includes(k)) {
          if (v && !teamData.coach) teamData.coach = v;
        } else if (['ASSISTANT_COACH', 'ASST_COACH', 'ASISTENTE'].includes(k)) {
          if (v && !teamData.assistantCoach) teamData.assistantCoach = v;
        } else if (['CONFERENCE', 'CONFERENCIA', 'LEAGUE'].includes(k)) {
          if (v && !teamData.conference) teamData.conference = v;
        } else if (['CITY_STATE', 'CITY_STATE_LOCATION', 'LOCATION', 'CIUDAD'].includes(k)) {
          if (v && !teamData.cityState) teamData.cityState = v;
        } else if (['TEAM_WEBSITE', 'WEBSITE', 'WEB'].includes(k)) {
          if (v && !teamData.website) teamData.website = v;
        } else if (['CONTACT_NAME', 'CONTACT'].includes(k)) {
          if (v && !teamData.contactName) teamData.contactName = v;
        } else if (['CONTACT_EMAIL', 'EMAIL'].includes(k)) {
          if (v && !teamData.contactEmail) teamData.contactEmail = v;
        } else if (['CONTACT_PHONE', 'PHONE', 'TEL'].includes(k)) {
          if (v && !teamData.contactPhone) teamData.contactPhone = v;
        } else if (['PRIMARY_COLOR', 'COLOR_PRIMARY', 'COLOR_1', 'MAIN_COLOR'].includes(k)) {
          if (v) {
            teamData.colorPrimary = normalizeHexColor(v, '#0032A0', 'PRIMARY_COLOR', warnings);
            teamData.colorsSupplied = true;
          }
        } else if (['SECONDARY_COLOR', 'COLOR_SECONDARY', 'COLOR_2'].includes(k)) {
          if (v) {
            teamData.colorSecondary = normalizeHexColor(v, '#001956', 'SECONDARY_COLOR', warnings);
            teamData.colorsSupplied = true;
          }
        } else if (['ACCENT_COLOR', 'COLOR_ACCENT', 'COLOR_3', 'GOLD'].includes(k)) {
          if (v) {
            teamData.accentColor = normalizeHexColor(v, '#E3C46A', 'ACCENT_COLOR', warnings);
            teamData.colorsSupplied = true;
          }
        } else if (['LOGO_FILE', 'LOGO', 'LOGO_IMAGE', 'TEAM_LOGO'].includes(k)) {
          if (v && !v.includes('Please send') && !v.includes('PNG') && !teamData.logoFile) {
            teamData.logoFile = v;
          }
        } else if (['LOGO_WHITE_FILE', 'LOGO_WHITE', 'WHITE_LOGO'].includes(k)) {
          if (v && !teamData.logoWhiteFile) teamData.logoWhiteFile = v;
        }
      }
    });

    if (!teamData.name) {
      errors.push('SCHOOL / TEAM NAME is required in the team submission form');
    }
    if (!teamData.abbreviation) {
      if (teamData.shortName) {
        teamData.abbreviation = teamData.shortName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
        warnings.push(`ABBREVIATION was missing; derived "${teamData.abbreviation}" from Short Name`);
      } else if (teamData.name) {
        teamData.abbreviation = teamData.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
        warnings.push(`ABBREVIATION was missing; derived "${teamData.abbreviation}" from Team Name`);
      } else {
        errors.push('ABBREVIATION is required in the team submission form');
      }
    }
    if (!teamData.shortName) {
      teamData.shortName = teamData.name ? teamData.name.split(' ').slice(0, 2).join(' ') : 'TEAM';
    }

    return teamData;
  }

  /**
   * Parse Players sheet from Excel workbook
   */
  function parsePlayersSheet(sheet, warnings, errors) {
    const XLSX = getXLSX();
    if (!XLSX) {
      errors.push('XLSX parser library is not loaded');
      return [];
    }
    if (!sheet) {
      errors.push('Missing required roster sheet ("ROSTER" or "PLAYERS")');
      return [];
    }

    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!aoa || !aoa.length) {
      errors.push('The roster sheet contains no records');
      return [];
    }

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, aoa.length); r++) {
      const rowKeys = (aoa[r] || []).map(cell => normalizeKey(cell));
      if (rowKeys.some(k => ['JERSEY', 'JERSEY_NUMBER', 'NUMBER', 'NO', 'NUM'].includes(k)) &&
          rowKeys.some(k => ['PLAYER_NAME', 'PLAYER', 'DISPLAY_NAME', 'NAME', 'FULL_NAME'].includes(k))) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) headerRowIdx = 0;

    const headerKeys = (aoa[headerRowIdx] || []).map(cell => normalizeKey(cell));
    const players = [];
    const jerseySet = new Set();

    for (let r = headerRowIdx + 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const getVal = (...matchKeys) => {
        for (const mk of matchKeys) {
          const idx = headerKeys.findIndex(k => k === mk || k.startsWith(mk) || k.endsWith(mk));
          if (idx !== -1 && row[idx] !== undefined && row[idx] !== '') {
            return String(row[idx]).trim();
          }
        }
        return '';
      };

      const rawJersey = getVal('JERSEY_NUMBER', 'JERSEY', 'NUMBER', 'NO', 'NUM');
      const rawName = getVal('PLAYER_NAME', 'DISPLAY_NAME', 'NAME', 'PLAYER', 'FULL_NAME');
      const rawPos = getVal('POSITION', 'POS', 'POSICION');
      const rawCaptain = getVal('CAPTAIN', 'IS_CAPTAIN', 'CAPITAN');
      const rawStarter = getVal('STARTER', 'IS_STARTER', 'TITULAR');
      const rawPhoto = getVal('PHOTO', 'PHOTO_FILE', 'IMAGE', 'PICTURE', 'FOTO');

      // Stats
      const rawKills = getVal('KILLS', 'K');
      const rawAces = getVal('ACES', 'A', 'SAQUES');
      const rawDigs = getVal('DIGS', 'D', 'DEFENSAS');
      const rawBlocks = getVal('BLOCKS', 'BLK', 'B', 'BLOQUEOS');
      const rawAssists = getVal('ASSISTS', 'AST', 'ASISTENCIAS');
      const rawAttPct = getVal('ATTACK_PCT', 'ATTACK', 'ATT_PCT', 'HIT_PCT', 'PCT');

      if (!rawJersey && !rawName && !rawPos) continue;

      const jerseyNum = Number(rawJersey);
      if (rawJersey === '' || isNaN(jerseyNum) || jerseyNum < 0 || jerseyNum > 99) {
        errors.push(`Row ${r + 1}: Invalid or missing jersey number "${rawJersey}" for player "${rawName || 'Unknown'}"`);
        continue;
      }

      if (jerseySet.has(jerseyNum)) {
        errors.push(`Duplicate jersey number #${jerseyNum} found in players list`);
      }
      jerseySet.add(jerseyNum);

      const displayName = String(rawName).trim();
      if (!displayName) {
        errors.push(`Player #${jerseyNum} is missing a player name`);
      }

      // Position Normalization
      const cleanPosRaw = String(rawPos).trim();
      const cleanPosKey = normalizeKey(cleanPosRaw);
      let position = POSITION_ALIASES[cleanPosKey] || POSITION_ALIASES[cleanPosRaw.toUpperCase()];

      if (!position) {
        const prefixMatch = cleanPosRaw.match(/^([A-Za-z]{1,4})\s*[\—\-\:\(]/);
        if (prefixMatch && POSITION_ALIASES[prefixMatch[1].toUpperCase()]) {
          position = POSITION_ALIASES[prefixMatch[1].toUpperCase()];
        }
      }

      if (!position) {
        warnings.push(`Player #${jerseyNum} (${displayName}): Unrecognized position "${rawPos}". Defaulted to "OH"`);
        position = 'OH';
      } else if (cleanPosKey !== position && !cleanPosRaw.startsWith(position)) {
        warnings.push(`Player #${jerseyNum} (${displayName}): Position normalized from "${rawPos}" to "${position}"`);
      }

      // Parse Stats (do not invent zeros if cell is blank)
      const stats = {};
      if (rawKills !== '') {
        const val = Number(rawKills);
        if (!isNaN(val)) stats.kills = Math.max(0, Math.round(val));
      }
      if (rawAces !== '') {
        const val = Number(rawAces);
        if (!isNaN(val)) stats.aces = Math.max(0, Math.round(val));
      }
      if (rawDigs !== '') {
        const val = Number(rawDigs);
        if (!isNaN(val)) stats.digs = Math.max(0, Math.round(val));
      }
      if (rawBlocks !== '') {
        const val = Number(rawBlocks);
        if (!isNaN(val)) stats.blocks = Math.max(0, Math.round(val));
      }
      if (rawAssists !== '') {
        const val = Number(rawAssists);
        if (!isNaN(val)) stats.assists = Math.max(0, Math.round(val));
      }
      if (rawAttPct !== '') {
        let valStr = String(rawAttPct).trim();
        let val = NaN;
        if (valStr.endsWith('%')) {
          val = parseFloat(valStr) / 100;
        } else {
          val = parseFloat(valStr);
        }
        if (!isNaN(val)) {
          stats.attackPct = val.toFixed(3).replace(/^0\./, '.');
        }
      }

      players.push({
        id: `p_pkg_${jerseyNum}_${Math.random().toString(36).substr(2, 5)}`,
        jerseyNumber: jerseyNum,
        displayName: displayName,
        position: position,
        captain: parseBoolean(rawCaptain),
        starter: parseBoolean(rawStarter),
        photoFile: String(rawPhoto).trim(),
        photo: null,
        stats: stats
      });
    }

    if (players.length < 6) {
      warnings.push(`Team has only ${players.length} players (${players.length === 0 ? 'no players' : 'minimum 6 recommended'})`);
    }

    return players;
  }

  /**
   * Parse Starting Lineup sheet from Excel workbook
   */
  function parseStartingLineupSheet(sheet, players, warnings, errors) {
    if (!sheet) return null;

    const XLSX = getXLSX();
    if (!XLSX) {
      errors.push('XLSX parser library is not loaded');
      return null;
    }

    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!aoa || !aoa.length) return null;

    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(10, aoa.length); r++) {
      const rowKeys = (aoa[r] || []).map(cell => normalizeKey(cell));
      if (rowKeys.some(k => ['SLOT', 'ROTATION', 'ORDER', 'POSITION'].includes(k)) &&
          rowKeys.some(k => ['JERSEY', 'JERSEY_NUMBER', 'NUMBER', 'NO'].includes(k))) {
        headerRowIdx = r;
        break;
      }
    }

    const headerKeys = (aoa[headerRowIdx] || []).map(cell => normalizeKey(cell));
    const slotJerseys = [];
    const usedJerseys = new Set();

    for (let r = headerRowIdx + 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const getVal = (...matchKeys) => {
        for (const mk of matchKeys) {
          const idx = headerKeys.findIndex(k => k === mk || k.startsWith(mk));
          if (idx !== -1 && row[idx] !== undefined && row[idx] !== '') {
            return String(row[idx]).trim();
          }
        }
        return '';
      };

      let jersey = getVal('JERSEY_NUMBER', 'JERSEY', 'NUMBER', 'NO');
      if (!jersey && row[1] !== undefined && row[1] !== '' && !isNaN(Number(row[1]))) {
        jersey = String(row[1]).trim();
      }

      if (jersey !== '') {
        const jNum = Number(jersey);
        if (isNaN(jNum)) {
          errors.push(`STARTING_LINEUP slot ${slotJerseys.length + 1}: Invalid jersey number "${jersey}"`);
          continue;
        }

        const playerExists = players.find(p => p.jerseyNumber === jNum);
        if (!playerExists) {
          errors.push(`STARTING_LINEUP slot ${slotJerseys.length + 1}: Jersey #${jNum} not found in PLAYERS / ROSTER`);
          continue;
        }

        if (usedJerseys.has(jNum)) {
          errors.push(`STARTING_LINEUP slot ${slotJerseys.length + 1}: Duplicate player #${jNum} in starting 6`);
          continue;
        }

        usedJerseys.add(jNum);
        slotJerseys.push(jNum);
        if (slotJerseys.length === 6) break;
      }
    }

    if (slotJerseys.length > 0 && slotJerseys.length < 6) {
      warnings.push(`STARTING_LINEUP has only ${slotJerseys.length}/6 players assigned`);
    }

    return slotJerseys;
  }

  /**
   * Main Excel Workbook Parser
   */
  function parseWorkbook(dataBuffer) {
    const warnings = [];
    const errors = [];

    const XLSX = getXLSX();
    if (!XLSX) {
      errors.push('XLSX library is not loaded');
      return { isValid: false, errors, warnings, team: null, players: [], startingLineupJerseys: [] };
    }

    let workbook;
    try {
      workbook = XLSX.read(dataBuffer, { type: 'array' });
    } catch (e) {
      errors.push('Failed to read Excel workbook: ' + e.message);
      return { isValid: false, errors, warnings, team: null, players: [], startingLineupJerseys: [] };
    }

    const sheetNames = workbook.SheetNames || [];
    const findSheet = (...names) => {
      for (const n of names) {
        const found = sheetNames.find(sn => {
          const norm = normalizeKey(sn);
          return norm === n || norm.includes(n) || n.includes(norm);
        });
        if (found) return workbook.Sheets[found];
      }
      return null;
    };

    const teamSheet = findSheet('TEAM_INFO', 'TEAM', 'TEAM_INFORMATION', 'SCHOOL_INFO', 'INFO', 'EQUIPO', 'BRANDING');
    const playersSheet = findSheet('ROSTER', 'PLAYERS', 'TEAM_ROSTER', 'JUGADORES', 'PLANTILLA');
    const lineupSheet = findSheet('STARTING_6', 'STARTING_LINEUP', 'LINEUP', 'STARTING6', 'ROTATION', 'ALINEACION');

    const team = parseTeamSheet(teamSheet, warnings, errors);
    const players = parsePlayersSheet(playersSheet, warnings, errors);
    const startingLineupJerseys = parseStartingLineupSheet(lineupSheet, players, warnings, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      team,
      players,
      startingLineupJerseys: startingLineupJerseys || []
    };
  }

  /**
   * Parse Official PIXEL Fillable PDF Form (Phase D1.2)
   */
  async function parsePdfPackage(pdfBuffer) {
    const warnings = [];
    const errors = [];

    const PDFLib = getPDFLib();
    if (!PDFLib) {
      errors.push('PDFLib library is not loaded');
      return { isValid: false, errors, warnings, team: null, players: [], startingLineupJerseys: [] };
    }

    let pdfDoc;
    try {
      pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    } catch (e) {
      errors.push('This PDF is not a supported PIXEL Volleyball Team Submission Form.');
      return { isValid: false, errors, warnings, team: null, players: [], startingLineupJerseys: [] };
    }

    let form;
    try {
      form = pdfDoc.getForm();
    } catch (e) {
      errors.push('This PDF is not a supported PIXEL Volleyball Team Submission Form.');
      return { isValid: false, errors, warnings, team: null, players: [], startingLineupJerseys: [] };
    }

    // Helper: Safely get field text or dropdown selected value
    const getVal = (fieldName) => {
      try {
        const f = form.getField(fieldName);
        if (!f) return '';
        if (typeof f.getText === 'function') {
          return (f.getText() || '').trim();
        }
        if (typeof f.getSelected === 'function') {
          const sel = f.getSelected();
          return Array.isArray(sel) ? (sel[0] || '').trim() : String(sel || '').trim();
        }
        return '';
      } catch (e) {
        return '';
      }
    };

    // PDF Identification Check
    const metaType = getVal('pixel_meta_form_type');
    const docTitle = pdfDoc.getTitle() || '';
    const docSubject = pdfDoc.getSubject() || '';
    const isOfficialPixelPdf = (metaType === 'VOLLEYBALL_TEAM_SUBMISSION') ||
                               docTitle.startsWith('PIXEL / MDC-TV') ||
                               docTitle.includes('Volleyball Team Submission') ||
                               Boolean(getVal('pixel_meta_form_type'));

    if (!isOfficialPixelPdf) {
      errors.push('This PDF is not a supported PIXEL Volleyball Team Submission Form.');
      return { isValid: false, errors, warnings, team: null, players: [], startingLineupJerseys: [] };
    }

    // 1. Extract Team Information
    const schoolName = getVal('team_school_name');
    const nickname = getVal('team_nickname');
    const shortName = getVal('team_short_name');
    const abbreviation = getVal('team_abbreviation');
    const headCoach = getVal('team_head_coach');
    const assistantCoach = getVal('team_assistant_coach');
    const conference = getVal('team_conference');
    const cityState = getVal('team_city_state');
    const website = getVal('team_website');
    const contactName = getVal('contact_name');
    const contactEmail = getVal('contact_email');
    const contactPhone = getVal('contact_phone');

    if (!schoolName) {
      errors.push('SCHOOL / TEAM NAME is required in the PDF form');
    }

    let finalAbbr = abbreviation;
    if (!finalAbbr) {
      if (shortName) {
        finalAbbr = shortName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
        warnings.push(`ABBREVIATION was missing; derived "${finalAbbr}" from Short Name`);
      } else if (schoolName) {
        finalAbbr = schoolName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
        warnings.push(`ABBREVIATION was missing; derived "${finalAbbr}" from School Name`);
      } else {
        errors.push('ABBREVIATION is required in the PDF form');
      }
    }

    const team = {
      name: schoolName,
      shortName: shortName || (schoolName ? schoolName.split(' ').slice(0, 2).join(' ') : 'TEAM'),
      abbreviation: finalAbbr,
      coach: headCoach,
      assistantCoach,
      nickname,
      conference,
      cityState,
      website,
      contactName,
      contactEmail,
      contactPhone,
      colorPrimary: '#0032A0',
      colorSecondary: '#001956',
      accentColor: '#E3C46A',
      colorsSupplied: false,
      logoFile: '',
      logoWhiteFile: ''
    };

    // 2. Extract Players (Page 2 + Stats on Page 4)
    const players = [];
    const jerseySet = new Set();

    for (let i = 1; i <= 25; i++) {
      const idxStr = String(i).padStart(2, '0');
      const rawJersey = getVal(`player_${idxStr}_jersey`);
      const rawName = getVal(`player_${idxStr}_name`);
      const rawPos = getVal(`player_${idxStr}_position`);
      const rawCap = getVal(`player_${idxStr}_captain`);
      const rawSt = getVal(`player_${idxStr}_starter`);
      const rawPhoto = getVal(`player_${idxStr}_photo`);

      if (!rawJersey && !rawName) continue;

      const jerseyNum = Number(rawJersey);
      if (rawJersey === '' || isNaN(jerseyNum) || jerseyNum < 0 || jerseyNum > 99) {
        errors.push(`Player row ${i}: Invalid or missing jersey number "${rawJersey}" for "${rawName || 'Unknown'}"`);
        continue;
      }

      if (jerseySet.has(jerseyNum)) {
        errors.push(`Duplicate jersey number #${jerseyNum} found in PDF roster`);
      }
      jerseySet.add(jerseyNum);

      const displayName = rawName.trim();
      if (!displayName) {
        errors.push(`Player #${jerseyNum} is missing a player name`);
      }

      // Position Normalization
      const cleanPosRaw = rawPos.trim();
      const cleanPosKey = normalizeKey(cleanPosRaw);
      let position = POSITION_ALIASES[cleanPosKey] || POSITION_ALIASES[cleanPosRaw.toUpperCase()];

      if (!position) {
        const prefixMatch = cleanPosRaw.match(/^([A-Za-z]{1,4})\s*[\—\-\:\(]/);
        if (prefixMatch && POSITION_ALIASES[prefixMatch[1].toUpperCase()]) {
          position = POSITION_ALIASES[prefixMatch[1].toUpperCase()];
        }
      }

      if (!position) {
        if (cleanPosRaw === '— SELECT POSITION —' || cleanPosRaw === 'SELECT POSITION' || cleanPosRaw === '') {
          warnings.push(`Player #${jerseyNum} (${displayName}): Position not selected. Defaulted to "OH"`);
        } else {
          warnings.push(`Player #${jerseyNum} (${displayName}): Unrecognized position "${rawPos}". Defaulted to "OH"`);
        }
        position = 'OH';
      } else if (cleanPosKey !== position && !cleanPosRaw.startsWith(position)) {
        warnings.push(`Player #${jerseyNum} (${displayName}): Position normalized from "${rawPos}" to "${position}"`);
      }

      // Read Stats (from Page 4 by index or jersey)
      const stats = {};
      const rawKills = getVal(`player_${idxStr}_kills`);
      const rawAces = getVal(`player_${idxStr}_aces`);
      const rawDigs = getVal(`player_${idxStr}_digs`);
      const rawBlocks = getVal(`player_${idxStr}_blocks`);
      const rawAssists = getVal(`player_${idxStr}_assists`);
      const rawAttPct = getVal(`player_${idxStr}_attack_pct`);

      if (rawKills !== '') {
        const val = Number(rawKills);
        if (!isNaN(val)) stats.kills = Math.max(0, Math.round(val));
      }
      if (rawAces !== '') {
        const val = Number(rawAces);
        if (!isNaN(val)) stats.aces = Math.max(0, Math.round(val));
      }
      if (rawDigs !== '') {
        const val = Number(rawDigs);
        if (!isNaN(val)) stats.digs = Math.max(0, Math.round(val));
      }
      if (rawBlocks !== '') {
        const val = Number(rawBlocks);
        if (!isNaN(val)) stats.blocks = Math.max(0, Math.round(val));
      }
      if (rawAssists !== '') {
        const val = Number(rawAssists);
        if (!isNaN(val)) stats.assists = Math.max(0, Math.round(val));
      }
      if (rawAttPct !== '') {
        let valStr = String(rawAttPct).trim();
        let val = NaN;
        if (valStr.endsWith('%')) {
          val = parseFloat(valStr) / 100;
        } else {
          val = parseFloat(valStr);
        }
        if (!isNaN(val)) {
          stats.attackPct = val.toFixed(3).replace(/^0\./, '.');
        }
      }

      players.push({
        id: `p_pdf_${jerseyNum}_${Math.random().toString(36).substr(2, 5)}`,
        jerseyNumber: jerseyNum,
        displayName: displayName,
        position: position,
        captain: parseBoolean(rawCap),
        starter: parseBoolean(rawSt),
        photoFile: rawPhoto.trim(),
        photo: null,
        stats: stats
      });
    }

    // 3. Automatic Starting 6 Derivation (from STARTER === YES flags)
    const flaggedStarters = players.filter(p => p.starter).map(p => p.jerseyNumber);
    let startingLineupJerseys = [];

    if (flaggedStarters.length > 0) {
      startingLineupJerseys = [...flaggedStarters];
      if (flaggedStarters.length !== 6) {
        warnings.push(`Starting 6 needs review (${flaggedStarters.length}/6 starters selected)`);
      }
    } else {
      // Backward compatibility with legacy D1.2 starting slots
      const usedStarters = new Set();
      for (let slot = 1; slot <= 6; slot++) {
        const idxStr = String(slot).padStart(2, '0');
        const rawJ = getVal(`starting_${idxStr}_jersey`);
        if (rawJ !== '') {
          const jNum = Number(rawJ);
          if (!isNaN(jNum)) {
            const exists = players.find(p => p.jerseyNumber === jNum);
            if (exists && !usedStarters.has(jNum)) {
              usedStarters.add(jNum);
              startingLineupJerseys.push(jNum);
            }
          }
        }
      }
      if (startingLineupJerseys.length > 0 && startingLineupJerseys.length < 6) {
        warnings.push(`Starting 6 needs review (${startingLineupJerseys.length}/6 starters selected)`);
      } else if (startingLineupJerseys.length === 0) {
        warnings.push('Starting 6 needs review (0/6 starters selected)');
      }
    }

    // 4. Extract Broadcast Information (Coaches & Storyline Notes)
    const broadcastCoaches = getVal('broadcast_coaches');
    const broadcastNotes = getVal('broadcast_notes');
    team.broadcastCoaches = broadcastCoaches;
    team.broadcastNotes = broadcastNotes;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      team,
      players,
      startingLineupJerseys
    };
  }

  /**
   * Audit and Extract ZIP package assets (supports loose files in root and subdirectories)
   */
  async function parseZipPackage(zipBuffer) {
    const warnings = [];
    const errors = [];

    const JSZip = getJSZip();
    if (!JSZip) {
      errors.push('JSZip library is not loaded');
      return { isValid: false, errors, warnings, workbookData: null, pdfData: null, assets: {} };
    }

    if (zipBuffer.byteLength > SECURITY_LIMITS.MAX_ZIP_SIZE) {
      errors.push(`ZIP package exceeds maximum allowable size (${(SECURITY_LIMITS.MAX_ZIP_SIZE / 1024 / 1024).toFixed(0)} MB)`);
      return { isValid: false, errors, warnings, workbookData: null, pdfData: null, assets: {} };
    }

    let zip;
    try {
      zip = await JSZip.loadAsync(zipBuffer);
    } catch (e) {
      errors.push('Failed to decompress ZIP package: ' + e.message);
      return { isValid: false, errors, warnings, workbookData: null, pdfData: null, assets: {} };
    }

    const entries = Object.keys(zip.files);
    if (entries.length > SECURITY_LIMITS.MAX_FILE_COUNT) {
      errors.push(`ZIP package contains too many files (${entries.length} > ${SECURITY_LIMITS.MAX_FILE_COUNT} max)`);
      return { isValid: false, errors, warnings, workbookData: null, pdfData: null, assets: {} };
    }

    // Security Check: path traversal & extension whitelist
    for (const entry of entries) {
      const file = zip.files[entry];
      if (file.dir) continue;

      const safePath = sanitizeZipPath(entry);
      if (!safePath) {
        errors.push(`Security violation: Malicious path traversal detected in ZIP entry "${entry}"`);
        return { isValid: false, errors, warnings, workbookData: null, pdfData: null, assets: {} };
      }

      if (!isAllowedExtension(safePath)) {
        errors.push(`Security violation: Disallowed file extension in ZIP entry "${entry}". Only images, PDF, and XLSX allowed.`);
        return { isValid: false, errors, warnings, workbookData: null, pdfData: null, assets: {} };
      }
    }

    // Find PDF or XLSX workbook in ZIP
    let pdfEntryName = null;
    let xlsxEntryName = null;
    for (const entry of entries) {
      const lower = entry.toLowerCase();
      if (!zip.files[entry].dir) {
        if (lower.endsWith('.pdf')) pdfEntryName = entry;
        else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) xlsxEntryName = entry;
      }
    }

    if (!pdfEntryName && !xlsxEntryName) {
      errors.push('No .pdf or .xlsx team submission file found inside ZIP package');
      return { isValid: false, errors, warnings, workbookData: null, pdfData: null, assets: {} };
    }

    let pdfData = null;
    let workbookData = null;
    if (pdfEntryName) {
      pdfData = await zip.files[pdfEntryName].async('arraybuffer');
    }
    if (xlsxEntryName) {
      workbookData = await zip.files[xlsxEntryName].async('arraybuffer');
    }

    // Extract images into memory as Data URLs
    const assets = {};
    for (const entry of entries) {
      const file = zip.files[entry];
      if (file.dir) continue;
      const lower = entry.toLowerCase();
      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.svg')) {
        try {
          const mime = lower.endsWith('.png') ? 'image/png' :
                       lower.endsWith('.svg') ? 'image/svg+xml' :
                       lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
          const base64 = await file.async('base64');
          const dataUrl = `data:${mime};base64,${base64}`;

          assets[entry] = dataUrl;
          const cleanPath = sanitizeZipPath(entry);
          if (cleanPath) assets[cleanPath] = dataUrl;
          const basename = entry.split('/').pop();
          if (basename && !assets[basename]) assets[basename] = dataUrl;

          const nameWithoutExt = basename.substring(0, basename.lastIndexOf('.'));
          if (nameWithoutExt && !assets[nameWithoutExt]) assets[nameWithoutExt] = dataUrl;

          const strippedZero = nameWithoutExt.replace(/^0+/, '');
          if (strippedZero && !assets[strippedZero]) assets[strippedZero] = dataUrl;
        } catch (err) {
          warnings.push(`Could not decode asset "${entry}": ${err.message}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      workbookData,
      pdfData,
      assets
    };
  }

  /**
   * High-Level Package Parser & Intelligent Asset Resolver (handles .pdf, .xlsx, and .zip)
   */
  async function parsePackage(fileOrBuffer, filename = 'package.pdf') {
    let arrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      arrayBuffer = fileOrBuffer;
    } else if (fileOrBuffer instanceof Uint8Array) {
      arrayBuffer = fileOrBuffer.buffer;
    } else if (typeof Blob !== 'undefined' && fileOrBuffer instanceof Blob) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileOrBuffer)) {
      arrayBuffer = fileOrBuffer.buffer.slice(fileOrBuffer.byteOffset, fileOrBuffer.byteOffset + fileOrBuffer.byteLength);
    } else {
      throw new Error('Unsupported input format for team package');
    }

    const lowerFilename = (filename || '').toLowerCase();
    const isZip = lowerFilename.endsWith('.zip');
    const isPdf = lowerFilename.endsWith('.pdf');

    let assets = {};
    const zipWarnings = [];
    const zipErrors = [];
    let parsed;

    if (isZip) {
      const zipRes = await parseZipPackage(arrayBuffer);
      if (!zipRes.isValid) {
        return {
          isValid: false,
          isZip: true,
          formatType: 'ZIP',
          errors: zipRes.errors,
          warnings: zipRes.warnings,
          summary: null,
          team: null,
          players: [],
          startingLineupJerseys: []
        };
      }
      assets = zipRes.assets;
      zipWarnings.push(...zipRes.warnings);

      if (zipRes.pdfData) {
        parsed = await parsePdfPackage(zipRes.pdfData);
      } else {
        parsed = parseWorkbook(zipRes.workbookData);
      }
    } else if (isPdf) {
      parsed = await parsePdfPackage(arrayBuffer);
    } else {
      parsed = parseWorkbook(arrayBuffer);
    }

    const allErrors = [...zipErrors, ...parsed.errors];
    const allWarnings = [...zipWarnings, ...parsed.warnings];

    if (!parsed.isValid) {
      return {
        isValid: false,
        isZip,
        formatType: isZip ? 'ZIP PACKAGE' : (isPdf ? 'PIXEL Fillable PDF' : 'EXCEL WORKBOOK'),
        errors: allErrors,
        warnings: allWarnings,
        summary: null,
        team: parsed.team,
        players: parsed.players,
        startingLineupJerseys: parsed.startingLineupJerseys
      };
    }

    // Match assets to team and players
    const team = parsed.team;
    const players = parsed.players;

    // 1. Resolve Team Logo
    let logoFound = false;
    let logoWhiteFound = false;

    if (team.logoFile && assets[team.logoFile]) {
      team.logo = assets[team.logoFile];
      logoFound = true;
    } else if (team.logoFile && assets[team.logoFile.split('/').pop()]) {
      team.logo = assets[team.logoFile.split('/').pop()];
      logoFound = true;
    } else {
      const logoCandidates = ['logo.png', 'logo.svg', 'logo.jpg', 'logo.webp', 'team_logo.png', 'team-logo.png', 'logo_color.png'];
      for (const cand of logoCandidates) {
        if (assets[cand]) {
          team.logo = assets[cand];
          logoFound = true;
          break;
        }
      }
    }

    if (team.logoWhiteFile && assets[team.logoWhiteFile]) {
      team.logoWhite = assets[team.logoWhiteFile];
      logoWhiteFound = true;
    } else if (team.logoWhiteFile && assets[team.logoWhiteFile.split('/').pop()]) {
      team.logoWhite = assets[team.logoWhiteFile.split('/').pop()];
      logoWhiteFound = true;
    } else {
      const whiteCandidates = ['logo-white.png', 'logo_white.png', 'white-logo.png', 'white_logo.png', 'logo-white.svg', 'logo_white.svg'];
      for (const cand of whiteCandidates) {
        if (assets[cand]) {
          team.logoWhite = assets[cand];
          logoWhiteFound = true;
          break;
        }
      }
    }

    if (!logoFound) {
      allWarnings.push('Team logo not found in package (default placeholder will be used)');
    }

    // 2. Resolve Player Photos
    let photosFoundCount = 0;
    players.forEach(p => {
      let matched = null;
      if (p.photoFile) {
        matched = assets[p.photoFile] || assets[p.photoFile.split('/').pop()];
      }
      if (!matched) {
        const jStr = String(p.jerseyNumber);
        const jPadded = jStr.padStart(2, '0');
        const candidateKeys = [
          `players/${jStr}.jpg`, `players/${jStr}.png`, `players/${jStr}.jpeg`, `players/${jStr}.webp`,
          `photos/${jStr}.jpg`, `photos/${jStr}.png`, `images/${jStr}.jpg`,
          `${jStr}.jpg`, `${jStr}.png`, `${jStr}.jpeg`, `${jStr}.webp`,
          `${jPadded}.jpg`, `${jPadded}.png`,
          `p_${jStr}.jpg`, `p_${jStr}.png`, `player_${jStr}.jpg`, `player_${jStr}.png`,
          jStr, jPadded
        ];

        for (const ck of candidateKeys) {
          if (assets[ck]) {
            matched = assets[ck];
            break;
          }
        }
      }

      if (matched) {
        p.photo = matched;
        photosFoundCount++;
      } else if (p.photoFile) {
        allWarnings.push(`Player #${p.jerseyNumber} photo "${p.photoFile}" not found in ZIP`);
      }
    });

    if (photosFoundCount < players.length && players.length > 0) {
      allWarnings.push(`${players.length - photosFoundCount} player photo(s) missing from package`);
    }

    // Production Readiness Assessment (Phase D1.2A)
    const statsCount = players.filter(p => p.stats && Object.keys(p.stats).length > 0).length;
    const startersSelectedCount = parsed.startingLineupJerseys ? parsed.startingLineupJerseys.length : players.filter(p => p.starter).length;
    const starting6Ready = startersSelectedCount === 6;

    const productionReadiness = {
      rosterUsable: players.length >= 6,
      starting6Ready: starting6Ready,
      starting6SelectedCount: startersSelectedCount,
      starting6Status: starting6Ready ? 'READY' : 'NEEDS_REVIEW',
      logoStatus: logoFound ? 'FOUND' : 'MISSING',
      photosStatus: photosFoundCount === players.length && players.length > 0 ? 'COMPLETE' : (photosFoundCount > 0 ? 'PARTIAL' : 'OPTIONAL'),
      photosFoundCount,
      photosMissingCount: Math.max(0, players.length - photosFoundCount),
      photosTotalCount: players.length,
      colorsConfigured: Boolean(team.colorsSupplied),
      colorsStatus: team.colorsSupplied ? 'CONFIGURED' : 'PRODUCTION_SETUP_REQUIRED',
      statsSuppliedCount: statsCount,
      hasAdditionalNotes: Boolean(team.broadcastNotes || team.broadcastCoaches)
    };

    if (!team.colorsSupplied) {
      allWarnings.push('Team brand colors not supplied (production setup required)');
    }

    const formatType = isZip ? 'ZIP PACKAGE' : (isPdf ? 'PIXEL Fillable PDF' : 'EXCEL WORKBOOK');

    const summary = {
      isZip,
      formatType,
      sourceDescription: isPdf ? 'PIXEL Fillable PDF' : (isZip ? 'ZIP Asset Package' : 'Excel Workbook'),
      teamName: team.name,
      shortName: team.shortName,
      abbreviation: team.abbreviation,
      coach: team.coach,
      assistantCoach: team.assistantCoach,
      broadcastCoaches: team.broadcastCoaches,
      broadcastNotes: team.broadcastNotes,
      colorPrimary: team.colorPrimary,
      colorSecondary: team.colorSecondary,
      accentColor: team.accentColor,
      playerCount: players.length,
      startersCount: startersSelectedCount,
      captainCount: players.filter(p => p.captain).length,
      statsCount: statsCount,
      logoFound,
      logoWhiteFound,
      photosFoundCount,
      photosTotalCount: players.length,
      productionReadiness,
      warnings: allWarnings,
      errors: allErrors
    };

    return {
      isValid: allErrors.length === 0,
      isZip,
      formatType,
      errors: allErrors,
      warnings: allWarnings,
      summary,
      team,
      players,
      startingLineupJerseys: parsed.startingLineupJerseys,
      assets
    };
  }

  /**
   * Convert Parsed Package into Authoritative pixelVolleyballRosterV1 Schema
   */
  function convertToRosterModel(parsedResult, targetSlot = 'away', existingRosterState = null) {
    const RosterModel = getRosterModel();
    if (!RosterModel) {
      throw new Error('PixelRosterModel library is not loaded');
    }
    if (!parsedResult || !parsedResult.isValid || !parsedResult.team) {
      throw new Error('Cannot convert invalid package result to roster model');
    }

    let baseRoster = null;
    if (existingRosterState && typeof existingRosterState === 'object') {
      try {
        baseRoster = RosterModel.normalizeRosterState(existingRosterState);
      } catch (_) {}
    }
    if (!baseRoster || typeof baseRoster !== 'object') {
      const loaded = (RosterModel.loadRoster && typeof RosterModel.loadRoster === 'function') ? RosterModel.loadRoster() : null;
      if (loaded && typeof loaded === 'object' && loaded.home && loaded.away) {
        baseRoster = RosterModel.normalizeRosterState(loaded);
      } else {
        baseRoster = RosterModel.createDefaultRosterState();
      }
    }
    if (!baseRoster.home) {
      baseRoster.home = RosterModel.createDefaultRosterState().home;
    }
    if (!baseRoster.away) {
      baseRoster.away = RosterModel.createDefaultRosterState().away;
    }

    const teamAbbr = (parsedResult.team.abbreviation || 'TM').toLowerCase().replace(/[^a-z0-9]/g, '');
    const teamId = `team_${teamAbbr || 'imported'}_${Date.now()}`;

    // Create Players
    const players = parsedResult.players.map(p => {
      return RosterModel.createPlayer({
        id: p.id || `p_${p.jerseyNumber}_${Date.now()}`,
        teamId: teamId,
        jerseyNumber: p.jerseyNumber,
        displayName: p.displayName,
        position: p.position,
        captain: Boolean(p.captain),
        starter: Boolean(p.starter),
        photo: p.photo || null,
        stats: p.stats || {}
      });
    });

    // Resolve Starting Lineup IDs
    let startingLineupIds = [];
    if (parsedResult.startingLineupJerseys && parsedResult.startingLineupJerseys.length) {
      parsedResult.startingLineupJerseys.forEach(jNum => {
        const found = players.find(p => p.jerseyNumber === jNum);
        if (found) startingLineupIds.push(found.id);
      });
    }

    // Fallback if no explicit starting lineup
    if (startingLineupIds.length < 6) {
      const flaggedStarters = players.filter(p => p.starter).map(p => p.id);
      if (flaggedStarters.length >= 6) {
        startingLineupIds = flaggedStarters.slice(0, 6);
      } else if (players.length >= 6) {
        startingLineupIds = players.slice(0, 6).map(p => p.id);
      }
    }

    // Create Team
    const newTeam = RosterModel.createTeam({
      id: teamId,
      name: parsedResult.team.name,
      shortName: parsedResult.team.shortName,
      abbreviation: parsedResult.team.abbreviation,
      coach: parsedResult.team.coach,
      colorPrimary: parsedResult.team.colorPrimary,
      colorSecondary: parsedResult.team.colorSecondary,
      accentColor: parsedResult.team.accentColor,
      logo: parsedResult.team.logo || (targetSlot === 'home' ? 'assets/teams/home-team/logo.svg' : 'assets/teams/away-team/logo.svg'),
      logoWhite: parsedResult.team.logoWhite || null,
      players: players,
      startingLineupIds: startingLineupIds
    });

    if (targetSlot === 'home') {
      baseRoster.home = newTeam;
    } else {
      baseRoster.away = newTeam;
    }

    baseRoster.stateRevision = (Number(baseRoster.stateRevision) || 1) + 1;
    baseRoster.timestamp = Date.now();

    return RosterModel.normalizeRosterState(baseRoster);
  }

  /**
   * Check if target slot has protected MDC Home team
   */
  function isMdcHomeProtected(currentRosterState) {
    if (!currentRosterState || !currentRosterState.home) return false;
    const h = currentRosterState.home;
    const name = (h.name || '').toUpperCase();
    const short = (h.shortName || '').toUpperCase();
    const abbr = (h.abbreviation || '').toUpperCase();

    return name.includes('MIAMI DADE') || name.includes('SHARKS') || short.includes('MDC') || abbr === 'MDC';
  }

  /**
   * Generate Coach-Friendly Team Excel Template (Phase D1.1)
   */
  function generateTeamTemplate() {
    const XLSX = getXLSX();
    if (!XLSX) {
      throw new Error('XLSX library is not loaded');
    }
    const wb = XLSX.utils.book_new();

    const startHereRows = [
      ['PIXEL / MDC-TV • VOLLEYBALL TEAM SUBMISSION FORM'],
      ['Official Team Information & Roster Template for Coaches, SIDs and Athletics Staff'],
      [''],
      ['WELCOME! Complete the following 3 steps to submit your team for broadcast on MDC-TV.'],
      [''],
      ['STEP 1 — TEAM INFO', 'Fill your school name, nickname, abbreviation, and head coach.'],
      ['STEP 2 — ROSTER', 'Enter your student-athletes with jersey numbers and positions.'],
      ['STEP 3 — STARTING 6', 'Select the 6 players who will start on the court.'],
      [''],
      ['──────────────────────────────────────────────────────────────────────────'],
      ['IMPORTANT BROADCAST NOTES:'],
      ['• Photos and logos are OPTIONAL. Missing media will not prevent your team from being broadcast.'],
      ['• If you are unsure about any field or stat, simply leave it blank.'],
      ['• MDC-TV Production handles technical color codes, branding graphics, and setup details.'],
      ['• Recommended package name: SchoolName_Volleyball.zip (Example: DaytonaState_Volleyball.zip)'],
      [''],
      ['SUPPORTED VOLLEYBALL POSITIONS:'],
      ['  OH  = Outside Hitter'],
      ['  MB  = Middle Blocker'],
      ['  S   = Setter'],
      ['  OPP = Opposite / Right Side'],
      ['  L   = Libero'],
      ['  DS  = Defensive Specialist']
    ];
    const wsStartHere = XLSX.utils.aoa_to_sheet(startHereRows);
    wsStartHere['!cols'] = [{ wch: 28 }, { wch: 75 }];
    XLSX.utils.book_append_sheet(wb, wsStartHere, 'START HERE');

    const teamInfoRows = [
      ['TEAM INFORMATION & IDENTITY', ''],
      ['Please complete the required fields marked with (*). Production will handle all colors & graphics.', ''],
      [''],
      ['FIELD NAME', 'TEAM DETAILS'],
      ['SCHOOL / TEAM NAME *', 'Daytona State Falcons'],
      ['TEAM NICKNAME', 'Falcons'],
      ['SHORT NAME', 'Daytona State'],
      ['ABBREVIATION *', 'DSC'],
      ['HEAD COACH *', 'Jane Smith'],
      ['ASSISTANT COACH', 'Laura Diaz'],
      ['CONFERENCE', 'Suncoast Conference'],
      ['CITY / STATE', 'Daytona Beach, FL'],
      ['TEAM WEBSITE', 'daytonastate.edu/athletics'],
      ['CONTACT NAME', 'Jane Smith'],
      ['CONTACT EMAIL', 'jsmith@daytonastate.edu'],
      ['CONTACT PHONE', '(386) 506-3000'],
      [''],
      ['TEAM LOGO — OPTIONAL', 'Please attach official logo (PNG, JPG or SVG) with this workbook or in ZIP package.']
    ];
    const wsTeamInfo = XLSX.utils.aoa_to_sheet(teamInfoRows);
    wsTeamInfo['!cols'] = [{ wch: 28 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsTeamInfo, 'TEAM INFO');

    const rosterRows = [
      ['PIXEL VOLLEYBALL TEAM ROSTER', '', '', '', '', '', 'OPTIONAL — GAME / SEASON STATS', '', '', '', '', ''],
      [
        'JERSEY #',
        'PLAYER NAME',
        'POSITION',
        'CAPTAIN',
        'STARTER',
        'PHOTO',
        'KILLS',
        'ACES',
        'DIGS',
        'BLOCKS',
        'ASSISTS',
        'ATTACK %'
      ],
      [7, 'Maria Santos', 'OH — Outside Hitter', 'YES', 'YES', '7.jpg', 14, 3, 8, 2, 1, 0.385],
      [12, 'Camila Valenzuela', 'MB — Middle Blocker', 'NO', 'YES', '12.jpg', 9, 1, 4, 5, 0, 0.420],
      [4, 'Sofia Navarro', 'S — Setter', 'NO', 'YES', '4.jpg', 2, 2, 11, 1, 38, 0.250],
      [10, 'Elena Reyes', 'OPP — Opposite', 'NO', 'YES', '10.jpg', 12, 0, 6, 3, 0, 0.310],
      [2, 'Isabella Gomez', 'L — Libero', 'NO', 'YES', '2.jpg', 0, 1, 18, 0, 4, 0.000],
      [9, 'Valentina Cruz', 'DS — Defensive Specialist', 'NO', 'YES', '9.jpg', 1, 2, 7, 0, 1, 0.100],
      [15, 'Ana Morales', 'OH — Outside Hitter', 'NO', 'NO', '15.jpg', 6, 0, 3, 1, 0, 0.220],
      [18, 'Gabriela Diaz', 'MB — Middle Blocker', 'NO', 'NO', '18.jpg', 4, 0, 1, 3, 0, 0.300],
      ['', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '']
    ];
    const wsRoster = XLSX.utils.aoa_to_sheet(rosterRows);
    wsRoster['!cols'] = [
      { wch: 12 }, { wch: 24 }, { wch: 28 }, { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRoster, 'ROSTER');

    const starting6Rows = [
      ['STARTING 6 / COURT ROTATION', '', '', ''],
      ['Select the 6 players who will start on the court for the match.', '', '', ''],
      [''],
      ['SLOT', 'JERSEY #', 'PLAYER NAME', 'POSITION / ROTATION ROLE'],
      [1, 7, 'Maria Santos', 'Outside Hitter 1 (Starting Server / Zone 1)'],
      [2, 12, 'Camila Valenzuela', 'Middle Blocker 1 (Zone 2)'],
      [3, 4, 'Sofia Navarro', 'Setter (Zone 3)'],
      [4, 10, 'Elena Reyes', 'Opposite Hitter (Zone 4)'],
      [5, 2, 'Isabella Gomez', 'Libero / Defense (Zone 5)'],
      [6, 9, 'Valentina Cruz', 'Defensive Specialist / Outside 2 (Zone 6)'],
      [''],
      ['NOTE: PIXEL requires 6 unique players for a ready starting rotation.', '', '', '']
    ];
    const wsStarting6 = XLSX.utils.aoa_to_sheet(starting6Rows);
    wsStarting6['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 24 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsStarting6, 'STARTING 6');

    const metaRows = [
      ['METADATA_KEY', 'METADATA_VALUE'],
      ['GENERATOR', 'PIXEL Sports Graphics System'],
      ['VERSION', 'D1.2'],
      ['SCHEMA', 'pixelVolleyballSubmissionV1'],
      ['SPORT', 'Volleyball'],
      ['TEMPLATE_TYPE', 'Coach-Friendly Form'],
      ['GENERATED_AT', new Date().toISOString()]
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
    wsMeta['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsMeta, 'PIXEL_META');

    wb.Workbook = {
      Sheets: [
        { name: 'START HERE', Hidden: 0 },
        { name: 'TEAM INFO', Hidden: 0 },
        { name: 'ROSTER', Hidden: 0 },
        { name: 'STARTING 6', Hidden: 0 },
        { name: 'PIXEL_META', Hidden: 1 }
      ]
    };

    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  }

  /**
   * Generate MDC-TV Fillable Team Submission PDF (Phase D1.2B — 15 Players + Auto-Linked Stats)
   */
  async function generateTeamPdfTemplate() {
    const PDFLib = getPDFLib();
    if (!PDFLib) {
      throw new Error('PDFLib library is not loaded');
    }

    const { PDFDocument, PDFName, PDFString, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const form = pdfDoc.getForm();

    const C = {
      navy: rgb(0/255, 25/255, 86/255),       // #001956
      mdcBlue: rgb(0/255, 50/255, 160/255),   // #0032A0
      electric: rgb(0/255, 71/255, 255/255),  // #0047FF
      lightBlue: rgb(197/255, 216/255, 255/255), // #C5D8FF
      dark: rgb(30/255, 28/255, 28/255),      // #1E1C1C
      offWhite: rgb(248/255, 248/255, 248/255), // #F8F8F8
      white: rgb(1, 1, 1),
      gold: rgb(227/255, 196/255, 106/255),   // #E3C46A
      muted: rgb(100/255, 116/255, 139/255),  // #64748B
      border: rgb(203/255, 213/255, 225/255), // #CBD5E1
      rowAlt: rgb(241/255, 245/255, 249/255), // #F1F5F9
      noticeBg: rgb(238/255, 242/255, 255/255) // #EEF2FF
    };

    // Embed Metadata
    const fType = form.createTextField('pixel_meta_form_type');
    fType.setText('VOLLEYBALL_TEAM_SUBMISSION');
    const fVer = form.createTextField('pixel_meta_version');
    fVer.setText('D1.2D');
    const fSport = form.createTextField('pixel_meta_sport');
    fSport.setText('VOLLEYBALL');

    pdfDoc.setTitle('PIXEL / MDC-TV Volleyball Team Submission Form');
    pdfDoc.setAuthor('Miami Dade College Broadcast Operations & PIXEL');
    pdfDoc.setSubject('Volleyball Team Information, Roster and Match Information');
    pdfDoc.setCreator('PIXEL Sports Graphics System D1.2D');

    // Attempt to load and embed the official MDC Sharks Athletics Logo
    let sharksLogoImage = null;
    try {
      let pngBytes = null;
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const candidateUrls = [
          '../assets/teams/home-team/mdc_sharks_athletics.png',
          '/graphics/assets/teams/home-team/mdc_sharks_athletics.png',
          '../../graphics/assets/teams/home-team/mdc_sharks_athletics.png'
        ];
        for (const u of candidateUrls) {
          try {
            const resp = await fetch(u);
            if (resp.ok) {
              pngBytes = new Uint8Array(await resp.arrayBuffer());
              break;
            }
          } catch (_) {}
        }
      } else if (typeof require === 'function') {
        try {
          const fs = require('fs');
          const path = require('path');
          const candidatePaths = [
            '/Volumes/VGC-01/OBS Sports/PIXEL/frontend/graphics/assets/teams/home-team/mdc_sharks_athletics.png',
            '/Volumes/VGC-01/OBS Sports/PIXEL/frontend/dist/graphics/assets/teams/home-team/mdc_sharks_athletics.png',
            path.resolve(__dirname, '../assets/teams/home-team/mdc_sharks_athletics.png')
          ];
          for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
              pngBytes = fs.readFileSync(p);
              break;
            }
          }
        } catch (_) {}
      }

      if (pngBytes) {
        sharksLogoImage = await pdfDoc.embedPng(pngBytes);
      }
    } catch (e) {
      console.warn('Could not embed MDC Sharks Athletics logo:', e);
    }

    function drawHeader(page, pageNum, pageTitle, pageSubtitle) {
      page.drawRectangle({ x: 0, y: 728, width: 612, height: 64, color: C.navy });
      page.drawRectangle({ x: 0, y: 724, width: 612, height: 4, color: C.electric });
      page.drawRectangle({ x: 0, y: 721, width: 612, height: 3, color: C.gold });

      // Official MDC Sharks Athletics Logo (Aspect Ratio 1.53)
      const logoW = 75;
      const logoH = 49;
      if (sharksLogoImage) {
        page.drawImage(sharksLogoImage, {
          x: 36, y: 735, width: logoW, height: logoH
        });
      }

      const textX = sharksLogoImage ? 122 : 36;
      page.drawText('PIXEL SPORTS GRAPHICS • MDC-TV BROADCAST OPERATIONS', {
        x: textX, y: 766, size: 9.5, font: helvBold, color: C.white
      });
      page.drawText(pageTitle.toUpperCase(), {
        x: textX, y: 750, size: 9.5, font: helvBold, color: C.lightBlue
      });
      page.drawText(pageSubtitle, {
        x: textX, y: 736, size: 7.5, font: helv, color: rgb(220/255, 230/255, 255/255)
      });

      page.drawRectangle({ x: 500, y: 742, width: 76, height: 20, color: C.mdcBlue });
      page.drawText(`PAGE ${pageNum} OF 3`, {
        x: 512, y: 748, size: 8, font: helvBold, color: C.white
      });

      page.drawRectangle({ x: 0, y: 0, width: 612, height: 24, color: C.navy });
      page.drawRectangle({ x: 0, y: 24, width: 612, height: 2, color: C.electric });
      page.drawText('PIXEL SPORTS GRAPHICS SYSTEM • MIAMI DADE COLLEGE BROADCAST OPERATIONS • PHASE D1.2D', {
        x: 36, y: 9, size: 7, font: helvBold, color: C.lightBlue
      });
      page.drawText('OFFICIAL TEAM SUBMISSION FORM', {
        x: 440, y: 9, size: 7, font: helv, color: C.white
      });
    }

    function addField(page, name, x, y, w, h, label, isRequired = false, defaultVal = '') {
      const labelText = isRequired ? `${label} *` : label;
      page.drawText(labelText, {
        x: x, y: y + h + 3, size: 7.5, font: helvBold, color: isRequired ? C.navy : C.muted
      });

      const tf = form.createTextField(name);
      if (defaultVal) tf.setText(defaultVal);
      tf.addToPage(page, {
        x, y, width: w, height: h,
        textColor: C.dark,
        backgroundColor: C.white,
        borderColor: C.border,
        borderWidth: 1
      });
      return tf;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PAGE 1: TEAM INFORMATION & IDENTITY
    // ──────────────────────────────────────────────────────────────────────────
    {
      const page1 = pdfDoc.addPage([612, 792]);
      drawHeader(page1, 1, 'Team Information & Identity', 'Complete required fields marked with (*). Production will handle all colors & graphics.');

      page1.drawRectangle({ x: 36, y: 648, width: 540, height: 58, color: C.noticeBg, borderColor: C.electric, borderWidth: 1 });
      page1.drawRectangle({ x: 36, y: 648, width: 4, height: 58, color: C.electric });
      page1.drawText('HOW TO SUBMIT YOUR TEAM (QUICK 5-MINUTE ENTRY):', { x: 48, y: 692, size: 8.5, font: helvBold, color: C.navy });
      page1.drawText('1. Fill your Team Info (Page 1) and Roster with 6 Starter = YES flags (Page 2).', { x: 48, y: 678, size: 7.5, font: helv, color: C.dark });
      page1.drawText('2. Photos & logo are optional. MDC-TV Production will match media files to your roster.', { x: 48, y: 666, size: 7.5, font: helv, color: C.dark });
      page1.drawText('3. Save this PDF and email to MDC-TV Production. Automatic PIXEL import ready.', { x: 48, y: 654, size: 7.5, font: helv, color: C.dark });

      page1.drawRectangle({ x: 36, y: 618, width: 540, height: 18, color: C.navy });
      page1.drawText('SECTION 1: TEAM IDENTITY', { x: 44, y: 623, size: 8, font: helvBold, color: C.white });

      addField(page1, 'team_school_name', 36, 568, 260, 22, 'SCHOOL / TEAM NAME', true, '');
      addField(page1, 'team_nickname', 316, 568, 260, 22, 'TEAM NICKNAME / MASCOT', false, '');

      addField(page1, 'team_short_name', 36, 514, 160, 22, 'SHORT NAME (ON-AIR)', false, '');
      addField(page1, 'team_abbreviation', 216, 514, 120, 22, 'ABBREVIATION (3-4 CH)', true, '');
      addField(page1, 'team_conference', 356, 514, 220, 22, 'CONFERENCE / LEAGUE', false, '');

      addField(page1, 'team_head_coach', 36, 460, 260, 22, 'HEAD COACH', true, '');
      addField(page1, 'team_assistant_coach', 316, 460, 260, 22, 'ASSISTANT COACH', false, '');

      addField(page1, 'team_city_state', 36, 406, 260, 22, 'CITY / STATE', false, '');
      addField(page1, 'team_website', 316, 406, 260, 22, 'TEAM WEBSITE', false, '');

      page1.drawRectangle({ x: 36, y: 366, width: 540, height: 18, color: C.navy });
      page1.drawText('SECTION 2: PRIMARY ATHLETICS CONTACT (SID / COACH / MANAGER)', { x: 44, y: 371, size: 8, font: helvBold, color: C.white });

      addField(page1, 'contact_name', 36, 316, 160, 22, 'CONTACT NAME', false, '');
      addField(page1, 'contact_email', 216, 316, 210, 22, 'CONTACT EMAIL', false, '');
      addField(page1, 'contact_phone', 446, 316, 130, 22, 'CONTACT PHONE', false, '');

      page1.drawRectangle({ x: 36, y: 276, width: 540, height: 18, color: C.navy });
      page1.drawText('SECTION 3: TEAM LOGO & MEDIA GUIDELINES', { x: 44, y: 281, size: 8, font: helvBold, color: C.white });

      page1.drawRectangle({ x: 36, y: 160, width: 540, height: 104, color: C.offWhite, borderColor: C.border, borderWidth: 1 });
      page1.drawText('TEAM LOGO & PLAYER PHOTOS (OPTIONAL):', { x: 48, y: 246, size: 8.5, font: helvBold, color: C.navy });
      page1.drawText('• Player photos and team logo are optional. Send them with this form when available.', { x: 48, y: 232, size: 7.5, font: helv, color: C.dark });
      page1.drawText('• MDC-TV Production will automatically match media files to the roster by jersey number or name.', { x: 48, y: 220, size: 7.5, font: helv, color: C.dark });
      page1.drawText('• Send high-resolution transparent PNG or vector logo (min 1000px wide) if available.', { x: 48, y: 208, size: 7.5, font: helv, color: C.dark });
      page1.drawText('• Production handles technical color codes (Hex/RGB). No color configuration required from coach.', { x: 48, y: 196, size: 7.5, font: helv, color: C.dark });
      page1.drawText('• Recommended ZIP package name: SchoolName_Volleyball.zip', { x: 48, y: 184, size: 7.5, font: helvBold, color: C.mdcBlue });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PAGE 2: TEAM ROSTER (15 Rows, Default Position = "— SELECT POSITION —")
    // ──────────────────────────────────────────────────────────────────────────
    {
      const page2 = pdfDoc.addPage([612, 792]);
      drawHeader(page2, 2, 'Team Roster & Starting Lineup', 'Enter student-athletes. Set STARTER = YES for the 6 players starting on court.');

      page2.drawRectangle({ x: 36, y: 672, width: 540, height: 36, color: C.noticeBg, borderColor: C.electric, borderWidth: 1 });
      page2.drawRectangle({ x: 36, y: 672, width: 4, height: 36, color: C.electric });
      page2.drawText('AUTOMATIC STARTING 6:', { x: 48, y: 696, size: 8, font: helvBold, color: C.navy });
      page2.drawText('Select STARTER = YES for exactly 6 players. PIXEL automatically generates the Starting Lineup.', { x: 48, y: 683, size: 7.5, font: helv, color: C.dark });

      const thY = 642;
      page2.drawRectangle({ x: 36, y: thY, width: 540, height: 22, color: C.navy });
      page2.drawText('JERSEY #', { x: 44, y: thY + 7, size: 8, font: helvBold, color: C.white });
      page2.drawText('PLAYER NAME', { x: 120, y: thY + 7, size: 8, font: helvBold, color: C.white });
      page2.drawText('POSITION (SELECT)', { x: 320, y: thY + 7, size: 8, font: helvBold, color: C.white });
      page2.drawText('CAPTAIN', { x: 450, y: thY + 7, size: 8, font: helvBold, color: C.white });
      page2.drawText('STARTER', { x: 515, y: thY + 7, size: 8, font: helvBold, color: C.white });

      const posOptions = [
        '— SELECT POSITION —',
        'OH — Outside Hitter',
        'MB — Middle Blocker',
        'S — Setter',
        'OPP — Opposite',
        'L — Libero',
        'DS — Defensive Specialist'
      ];
      const yesNoOptions = ['NO', 'YES'];

      // 15 Player Rows with generous height & spacing (38pt each)
      const rowH = 38;
      for (let i = 1; i <= 15; i++) {
        const rowY = thY - (i * rowH);
        const isAlt = i % 2 === 0;
        page2.drawRectangle({
          x: 36, y: rowY, width: 540, height: rowH,
          color: isAlt ? C.rowAlt : C.white,
          borderColor: C.border, borderWidth: 0.5
        });

        const idxStr = String(i).padStart(2, '0');

        const tfJ = form.createTextField(`player_${idxStr}_jersey`);
        tfJ.addToPage(page2, { x: 42, y: rowY + 7, width: 55, height: 24, backgroundColor: C.white, borderColor: C.border, borderWidth: 0.5 });

        const tfN = form.createTextField(`player_${idxStr}_name`);
        tfN.addToPage(page2, { x: 110, y: rowY + 7, width: 195, height: 24, backgroundColor: C.white, borderColor: C.border, borderWidth: 0.5 });

        const ddP = form.createDropdown(`player_${idxStr}_position`);
        ddP.setOptions(posOptions);
        ddP.select(posOptions[0]); // Default to '— SELECT POSITION —'
        ddP.addToPage(page2, { x: 315, y: rowY + 7, width: 120, height: 24, backgroundColor: C.white, borderColor: C.border, borderWidth: 0.5 });

        const ddC = form.createDropdown(`player_${idxStr}_captain`);
        ddC.setOptions(yesNoOptions);
        ddC.select('NO');
        ddC.addToPage(page2, { x: 445, y: rowY + 7, width: 52, height: 24, backgroundColor: C.white, borderColor: C.border, borderWidth: 0.5 });

        const ddS = form.createDropdown(`player_${idxStr}_starter`);
        ddS.setOptions(yesNoOptions);
        ddS.select('NO');
        ddS.addToPage(page2, { x: 510, y: rowY + 7, width: 56, height: 24, backgroundColor: C.white, borderColor: C.border, borderWidth: 0.5 });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PAGE 3: OPTIONAL BROADCAST INFORMATION (Live-Linked Player Identity Displays)
    // ──────────────────────────────────────────────────────────────────────────
    const calcOrderRefs = [];
    {
      const page3 = pdfDoc.addPage([612, 792]);
      drawHeader(page3, 3, 'Optional Broadcast Information', 'All sections on this page are optional. Blank fields will not affect broadcast graphics.');

      page3.drawRectangle({ x: 36, y: 700, width: 540, height: 18, color: C.navy });
      page3.drawText('SECTION A: OPTIONAL KEY PLAYER STATS (AUTO-LINKED TO ROSTER PLAYERS 1–15)', { x: 44, y: 705, size: 7.5, font: helvBold, color: C.white });

      const stH_Y = 680;
      page3.drawRectangle({ x: 36, y: stH_Y, width: 540, height: 18, color: C.mdcBlue });
      page3.drawText('ROSTER PLAYER (AUTO-LINKED FROM PAGE 2)', { x: 44, y: stH_Y + 5, size: 7.5, font: helvBold, color: C.white });
      page3.drawText('KILLS', { x: 250, y: stH_Y + 5, size: 7, font: helvBold, color: C.white });
      page3.drawText('ACES', { x: 305, y: stH_Y + 5, size: 7, font: helvBold, color: C.white });
      page3.drawText('DIGS', { x: 360, y: stH_Y + 5, size: 7, font: helvBold, color: C.white });
      page3.drawText('BLOCKS', { x: 415, y: stH_Y + 5, size: 7, font: helvBold, color: C.white });
      page3.drawText('ASSISTS', { x: 470, y: stH_Y + 5, size: 7, font: helvBold, color: C.white });
      page3.drawText('ATTACK %', { x: 520, y: stH_Y + 5, size: 7, font: helvBold, color: C.white });

      // 15 Linked Stat Rows (17.5pt each)
      const sRowH = 17.5;
      for (let i = 1; i <= 15; i++) {
        const sRowY = stH_Y - (i * sRowH);
        const isAlt = i % 2 === 0;
        page3.drawRectangle({
          x: 36, y: sRowY, width: 540, height: sRowH,
          color: isAlt ? C.rowAlt : C.white,
          borderColor: C.border, borderWidth: 0.5
        });

        const idxStr = String(i).padStart(2, '0');

        // Live-Linked Read-Only Display Field on Page 3
        const tfDisp = form.createTextField(`stats_player_${idxStr}_display`);
        tfDisp.enableReadOnly();
        tfDisp.addToPage(page3, {
          x: 40, y: sRowY + 1.5, width: 202, height: 14.5,
          textColor: C.navy,
          backgroundColor: isAlt ? C.rowAlt : C.white,
          borderColor: C.border,
          borderWidth: 0.5
        });

        // Attach Calculation Action: mirrors player_##_jersey + player_##_name (uppercase)
        const js = `var j = this.getField('player_${idxStr}_jersey').value; var n = this.getField('player_${idxStr}_name').value; if (j || n) { event.value = (j ? '#' + j + ' ' : '') + (n ? n.toUpperCase() : ''); } else { event.value = ''; }`;
        const jsAction = pdfDoc.context.obj({
          Type: 'Action',
          S: 'JavaScript',
          JS: PDFString.of(js)
        });
        const aaDict = pdfDoc.context.obj({
          C: jsAction
        });
        tfDisp.acroField.dict.set(PDFName.of('AA'), aaDict);
        calcOrderRefs.push(tfDisp.acroField.ref);

        // Editable Stat Fields (bound to player_##)
        const tfK = form.createTextField(`player_${idxStr}_kills`);
        tfK.addToPage(page3, { x: 248, y: sRowY + 2, width: 48, height: 14, backgroundColor: C.white, borderColor: C.border, borderWidth: 0.5 });

        const tfA = form.createTextField(`player_${idxStr}_aces`);
        tfA.addToPage(page3, { x: 303, y: sRowY + 2, width: 48, height: 14, backgroundColor: C.white, borderColor: C.border, borderWidth: 0.5 });

        const tfD = form.createTextField(`player_${idxStr}_digs`);
        tfD.addToPage(page3, { x: 358, y: sRowY + 2, width: 48, height: 14, backgroundColor: C.white, borderColor: C.border, borderWidth: 0.5 });

        const tfB = form.createTextField(`player_${idxStr}_blocks`);
        tfB.addToPage(page3, { x: 413, y: sRowY + 2, width: 48, height: 14, backgroundColor: C.white, borderColor: C.border, borderWidth: 0.5 });

        const tfAst = form.createTextField(`player_${idxStr}_assists`);
        tfAst.addToPage(page3, { x: 468, y: sRowY + 2, width: 48, height: 14, backgroundColor: C.white, borderColor: C.border, borderWidth: 0.5 });

        const tfPct = form.createTextField(`player_${idxStr}_attack_pct`);
        tfPct.addToPage(page3, { x: 520, y: sRowY + 2, width: 50, height: 14, backgroundColor: C.white, borderColor: C.border, borderWidth: 0.5 });
      }

      const staffY = 395;
      page3.drawRectangle({ x: 36, y: staffY, width: 540, height: 18, color: C.navy });
      page3.drawText('SECTION B: ADDITIONAL COACHES & SUPPORT STAFF (OPTIONAL)', { x: 44, y: staffY + 5, size: 8, font: helvBold, color: C.white });

      const tfStaff = form.createTextField('broadcast_coaches');
      tfStaff.enableMultiline();
      tfStaff.addToPage(page3, {
        x: 36, y: staffY - 55, width: 540, height: 50,
        backgroundColor: C.white, borderColor: C.border, borderWidth: 1
      });

      const notesY = 310;
      page3.drawRectangle({ x: 36, y: notesY, width: 540, height: 18, color: C.navy });
      page3.drawText('SECTION C: TEAM STORYLINES / BROADCAST TALKING POINTS (OPTIONAL)', { x: 44, y: notesY + 5, size: 8, font: helvBold, color: C.white });

      const tfNotes = form.createTextField('broadcast_notes');
      tfNotes.enableMultiline();
      tfNotes.addToPage(page3, {
        x: 36, y: notesY - 170, width: 540, height: 165,
        backgroundColor: C.white, borderColor: C.border, borderWidth: 1
      });

      page3.drawRectangle({ x: 36, y: 40, width: 540, height: 48, color: C.noticeBg, borderColor: C.electric, borderWidth: 0.5 });
      page3.drawText('FORM SUBMISSION CONFIRMATION:', { x: 48, y: 72, size: 8, font: helvBold, color: C.navy });
      page3.drawText('Save this filled PDF and email to MDC-TV Production with any available player photos & team logo.', { x: 48, y: 58, size: 7.5, font: helv, color: C.dark });
      page3.drawText('MDC-TV Broadcast Operations will automatically import all roster, lineup and match information.', { x: 48, y: 46, size: 7.5, font: helv, color: C.muted });
    }

    // Set Calculation Order (/CO) in AcroForm
    if (form.acroForm && form.acroForm.dict && calcOrderRefs.length > 0) {
      const coArray = pdfDoc.context.obj(calcOrderRefs);
      form.acroForm.dict.set(PDFName.of('CO'), coArray);
    }

    return await pdfDoc.save();
  }

  return {
    SECURITY_LIMITS,
    POSITION_ALIASES,
    parseWorkbook,
    parsePdfPackage,
    parseZipPackage,
    parsePackage,
    convertToRosterModel,
    isMdcHomeProtected,
    generateTeamTemplate,
    generateTeamPdfTemplate
  };
}));
