import { useState, useEffect, useRef } from 'react';
import type { LogicalSource, PhysicalInput, PhysicalSignalMapping } from '../types/sources';
import { getDefaultPhysicalSignalMap } from '../types/sources';
import type { ActiveTab } from '../types/switcher';
import type { DirectionEvent } from '../types/events';
import type { ProductionProfile } from '../types/profiles';
import type { ReplayMarker, ReplayPriority } from '../types/replay';
import type { VolleyballObservabilityStatus } from '../types/volleyball';
import { INITIAL_LOGICAL_SOURCES, INITIAL_PHYSICAL_INPUTS } from '../mock/initialData';
import { INITIAL_PRODUCTION_PROFILES } from '../mock/initialProfiles';
import { fetchBridgeStatus, type BridgeStatusResponse } from '../services/bridgeClient';
import { loadOBSConfig, saveOBSConfig, type OBSConfig, type OBSStatusData } from '../services/obsClient';
import { loadResolumeConfig, saveResolumeConfig, type ResolumeConfig, type ResolumeStatusData } from '../services/resolumeClient';
import { subscribeVolleyballObservability } from '../services/volleyballReader';
import { evaluateProductionHealth } from '../services/healthEngine';
import type { ProductionHealthState } from '../types/health';
import { evaluateProductionReadiness, DEFAULT_MANUAL_CHECKS } from '../services/preflightEngine';
import type { ProductionReadinessState, ManualCheckItem, ManualCheckStatus } from '../types/preflight';

const LOCAL_STORAGE_KEY_SOURCES = 'vento_v1_logical_sources_v5';
const LOCAL_STORAGE_KEY_INPUTS = 'vento_v1_physical_inputs_v5';
const LOCAL_STORAGE_KEY_EVENTS = 'vento_v1_direction_events_v1';
const LOCAL_STORAGE_KEY_PROFILES = 'vento_v1_production_profiles_v1';
const LOCAL_STORAGE_KEY_ACTIVE_PROFILE = 'vento_v1_active_profile_id_v1';
const LOCAL_STORAGE_KEY_REPLAY_MARKERS = 'vento_v1_replay_markers_v1';
const LOCAL_STORAGE_KEY_MANUAL_CHECKS = 'pixel_v1_preflight_manual_checks_v1';

export type BridgeConnectionState = 'connected' | 'stale' | 'disconnected';

export function useSwitcherStore() {
  // Production Profiles State
  const [profiles, setProfiles] = useState<ProductionProfile[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PROFILES);
    if (saved) {
      try {
        const parsed: ProductionProfile[] = JSON.parse(saved);
        return parsed.map(p => {
          if (p.id === 'LAB_CURRENT') {
            const needsUpdate = !p.physicalSignalMap || p.physicalSignalMap.length === 0 || p.physicalSignalMap.find(m => m.decklinkChannelId === 6)?.logicalSourceName !== 'OBS' || p.physicalSignalMap.find(m => m.decklinkChannelId === 1)?.logicalSourceName !== 'RESOLUME';
            if (needsUpdate) {
              return { ...p, physicalSignalMap: getDefaultPhysicalSignalMap() };
            }
          }
          return p;
        });
      } catch (e) {
        console.error('Failed to parse saved production profiles:', e);
      }
    }
    return INITIAL_PRODUCTION_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PROFILE);
    if (saved && profiles.some(p => p.id === saved)) {
      return saved;
    }
    return 'LAB_CURRENT';
  });

  const [logicalSources, setLogicalSources] = useState<LogicalSource[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SOURCES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved logical sources:', e);
      }
    }
    return INITIAL_LOGICAL_SOURCES;
  });

  const [physicalInputs, setPhysicalInputs] = useState<PhysicalInput[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_INPUTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved physical inputs:', e);
      }
    }
    return INITIAL_PHYSICAL_INPUTS;
  });

  const [eventsLog, setEventsLog] = useState<DirectionEvent[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_EVENTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved direction events:', e);
      }
    }
    return [];
  });

  const [replayMarkers, setReplayMarkers] = useState<ReplayMarker[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_REPLAY_MARKERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved replay markers:', e);
      }
    }
    return [];
  });

  // UI Active Navigation Tab State
  const [activeTab, setActiveTab] = useState<ActiveTab>('multiviewer');

  // Program & Preview selection state
  const [programSourceId, setProgramSourceId] = useState<string>('pos-2');
  const [previewSourceId, setPreviewSourceId] = useState<string>('pos-4');

  // Production Bridge Read-Only State
  const [bridgeState, setBridgeState] = useState<BridgeConnectionState>('disconnected');
  const [bridgeProfile, setBridgeProfile] = useState<string | null>(null);
  const [lastBridgeData, setLastBridgeData] = useState<BridgeStatusResponse | null>(null);
  const [lastValidResponseTime, setLastValidResponseTime] = useState<number | null>(null);

  // Health Engine State
  const [healthState, setHealthState] = useState<ProductionHealthState>(() =>
    evaluateProductionHealth(null, null, INITIAL_LOGICAL_SOURCES)
  );

  // Manual Preflight Checks State
  const [manualChecks, setManualChecks] = useState<ManualCheckItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_MANUAL_CHECKS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved manual checks:', e);
      }
    }
    return DEFAULT_MANUAL_CHECKS;
  });

  // Preflight Readiness State (Phase 7.2)
  const [readinessState, setReadinessState] = useState<ProductionReadinessState>(() =>
    evaluateProductionReadiness({
      bridgeData: null,
      healthState: evaluateProductionHealth(null, null, INITIAL_LOGICAL_SOURCES),
      activeProfile: INITIAL_PRODUCTION_PROFILES[0],
      logicalSources: INITIAL_LOGICAL_SOURCES,
      physicalInputs: INITIAL_PHYSICAL_INPUTS,
      manualChecks: DEFAULT_MANUAL_CHECKS,
      programSourceId: 'pos-2',
      previewSourceId: 'pos-4'
    })
  );

  // OBS Studio Config
  const [obsConfig, setObsConfig] = useState<OBSConfig>(() => loadOBSConfig());

  // Resolume Arena Config
  const [resolumeConfig, setResolumeConfig] = useState<ResolumeConfig>(() => loadResolumeConfig());

  // Volleyball Control2 Passive Observability State
  const [volleyballStatus, setVolleyballStatus] = useState<VolleyballObservabilityStatus>({
    isSameOrigin: window.location.origin.includes('localhost:8000') || window.location.origin.includes('127.0.0.1:8000') || window.location.origin.includes('8081'),
    hasData: false,
    matchState: null,
    lastReceivedAt: null
  });

  const lastFetchTimeRef = useRef<number | null>(null);
  const currentSourcesRef = useRef<LogicalSource[]>(logicalSources);
  const manualChecksRef = useRef<ManualCheckItem[]>(manualChecks);
  const prevPgmNameRef = useRef<string | null>(null);
  const prevPvwNameRef = useRef<string | null>(null);
  const processedBridgeEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    currentSourcesRef.current = logicalSources;
  }, [logicalSources]);

  useEffect(() => {
    manualChecksRef.current = manualChecks;
  }, [manualChecks]);

  // Persist Local Storage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_SOURCES, JSON.stringify(logicalSources));
  }, [logicalSources]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_INPUTS, JSON.stringify(physicalInputs));
  }, [physicalInputs]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_EVENTS, JSON.stringify(eventsLog));
  }, [eventsLog]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_REPLAY_MARKERS, JSON.stringify(replayMarkers));
  }, [replayMarkers]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_PROFILE, activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_MANUAL_CHECKS, JSON.stringify(manualChecks));
  }, [manualChecks]);

  useEffect(() => {
    saveOBSConfig(obsConfig);
  }, [obsConfig]);

  useEffect(() => {
    saveResolumeConfig(resolumeConfig);
  }, [resolumeConfig]);

  // Volleyball Reader Subscription
  useEffect(() => {
    const unsubscribe = subscribeVolleyballObservability(status => {
      setVolleyballStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Production Bridge Read-Only Polling Loop (500ms)
  useEffect(() => {
    let isMounted = true;

    const pollBridge = async () => {
      const data = await fetchBridgeStatus();
      if (!isMounted) return;

      const now = Date.now();
      const currentSources = currentSourcesRef.current;
      const currentManualChecks = manualChecksRef.current;
      const activeProf = profiles.find(p => p.id === activeProfileId) || null;

      // Evaluate Health Engine on every bridge poll
      const computedHealth = evaluateProductionHealth(data, activeProf, currentSources);
      setHealthState(computedHealth);

      // Evaluate Preflight Engine on every bridge poll with active manual checks ref
      const computedReadiness = evaluateProductionReadiness({
        bridgeData: data,
        healthState: computedHealth,
        activeProfile: activeProf,
        logicalSources: currentSources,
        physicalInputs,
        manualChecks: currentManualChecks,
        programSourceId,
        previewSourceId
      });
      setReadinessState(computedReadiness);

      if (data && data.connected) {
        setLastBridgeData(data);
        setBridgeProfile(data.profile || null);
        setLastValidResponseTime(data.fetchedAt || now);
        lastFetchTimeRef.current = data.fetchedAt || now;
        setBridgeState('connected');

        const currentSources = currentSourcesRef.current;
        const newPgmName = data.program?.name;
        const newPvwName = data.preview?.name;

        // Ingest PGM change event
        if (newPgmName && prevPgmNameRef.current && newPgmName !== prevPgmNameRef.current) {
          const newEvent: DirectionEvent = {
            id: `evt-pgm-${now}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: new Date().toLocaleTimeString(),
            isoTime: new Date().toISOString(),
            type: 'PROGRAM',
            previousSource: prevPgmNameRef.current,
            newSource: newPgmName
          };
          setEventsLog(prev => [newEvent, ...prev]);
        }

        // Ingest PVW change event
        if (newPvwName && prevPvwNameRef.current && newPvwName !== prevPvwNameRef.current) {
          const newEvent: DirectionEvent = {
            id: `evt-pvw-${now}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: new Date().toLocaleTimeString(),
            isoTime: new Date().toISOString(),
            type: 'PREVIEW',
            previousSource: prevPvwNameRef.current,
            newSource: newPvwName
          };
          setEventsLog(prev => [newEvent, ...prev]);
        }

        if (newPgmName) prevPgmNameRef.current = newPgmName;
        if (newPvwName) prevPvwNameRef.current = newPvwName;

        if (newPgmName) {
          const pgmMatch = currentSources.find(s => s.name.toUpperCase() === newPgmName.toUpperCase());
          if (pgmMatch && pgmMatch.id !== programSourceId) {
            setProgramSourceId(pgmMatch.id);
          }
        }

        if (newPvwName) {
          const pvwMatch = currentSources.find(s => s.name.toUpperCase() === newPvwName.toUpperCase());
          if (pvwMatch && pvwMatch.id !== previewSourceId) {
            setPreviewSourceId(pvwMatch.id);
          }
        }

        // Ingest Bridge Subsystem Events safely without duplicates
        if (Array.isArray(data.events)) {
          const newBridgeEvents: DirectionEvent[] = [];
          for (const bEvt of data.events) {
            const eventKey = `${bEvt.time}_${bEvt.type}_${bEvt.message}`;
            if (!processedBridgeEventsRef.current.has(eventKey)) {
              processedBridgeEventsRef.current.add(eventKey);
              newBridgeEvents.push({
                id: `evt-brg-${eventKey}`,
                timestamp: new Date(bEvt.time).toLocaleTimeString(),
                isoTime: bEvt.time,
                type: 'PROGRAM',
                previousSource: bEvt.type,
                newSource: bEvt.message
              });
            }
          }
          if (newBridgeEvents.length > 0) {
            setEventsLog(prev => [...newBridgeEvents, ...prev]);
          }
        }
      } else {
        const lastValid = lastFetchTimeRef.current;
        if (!lastValid) {
          setBridgeState('disconnected');
        } else {
          const elapsed = now - lastValid;
          if (elapsed >= 10000) {
            setBridgeState('disconnected');
          } else if (elapsed >= 3000) {
            setBridgeState('stale');
          }
        }
      }
    };

    pollBridge();
    const intervalId = setInterval(pollBridge, 500);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [programSourceId, previewSourceId]);

  const setProgramSource = (sourceId: string) => setProgramSourceId(sourceId);
  const setPreviewSource = (sourceId: string) => setPreviewSourceId(sourceId);

  const cutSwitch = () => {
    setProgramSourceId(prevPvw => {
      setPreviewSourceId(programSourceId);
      return prevPvw;
    });
  };

  const updateLogicalSource = (updatedSource: LogicalSource) => {
    setLogicalSources(prev => prev.map(s => (s.id === updatedSource.id ? updatedSource : s)));
  };

  const updateSourceMapping = (sourceId: string, physicalInputId: string) => {
    setLogicalSources(prev =>
      prev.map(s => {
        if (s.id === sourceId) {
          const status = physicalInputId === 'unassigned' ? 'unassigned' : 'assigned';
          return { ...s, physicalInputId, status };
        }
        return s;
      })
    );
  };

  const resetToDefaults = () => {
    setLogicalSources(INITIAL_LOGICAL_SOURCES);
    setPhysicalInputs(INITIAL_PHYSICAL_INPUTS);
    setProgramSourceId('pos-2');
    setPreviewSourceId('pos-4');
  };

  const loadProfile = (profileId: string) => {
    const target = profiles.find(p => p.id === profileId);
    if (!target) return;
    setActiveProfileId(profileId);
  };

  const saveCurrentProfile = () => {
    setProfiles(prev =>
      prev.map(p => {
        if (p.id === activeProfileId) {
          return {
            ...p,
            sources: logicalSources,
            inputs: physicalInputs,
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      })
    );
  };

  const duplicateProfile = (profileId: string, newName: string) => {
    const sourceProfile = profiles.find(p => p.id === profileId);
    if (!sourceProfile) return;

    const newId = `PROF_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newProf: ProductionProfile = {
      ...sourceProfile,
      id: newId,
      name: newName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProfiles(prev => [...prev, newProf]);
    setActiveProfileId(newId);
  };

  const resetProfile = (profileId: string) => {
    const defaultProfile = INITIAL_PRODUCTION_PROFILES.find(p => p.id === profileId);
    if (defaultProfile) {
      setProfiles(prev => prev.map(p => (p.id === profileId ? defaultProfile : p)));
    }
  };

  const deleteProfile = (profileId: string) => {
    if (profiles.length <= 1) return;
    setProfiles(prev => prev.filter(p => p.id !== profileId));
    if (activeProfileId === profileId) {
      const remaining = profiles.filter(p => p.id !== profileId);
      setActiveProfileId(remaining[0].id);
    }
  };

  const importProfilesPackageAction = (newProfiles: ProductionProfile[]) => {
    setProfiles(newProfiles);
    if (newProfiles.length > 0) {
      setActiveProfileId(newProfiles[0].id);
    }
  };

  const restoreBackupAction = (backupData: any) => {
    if (backupData.profiles && Array.isArray(backupData.profiles)) {
      setProfiles(backupData.profiles);
    }
    if (backupData.activeProfileId) {
      setActiveProfileId(backupData.activeProfileId);
    }
    if (backupData.logicalSources && Array.isArray(backupData.logicalSources)) {
      setLogicalSources(backupData.logicalSources);
    }
  };

  const updatePhysicalSignalMappingAction = (decklinkChannelId: number, changes: Partial<PhysicalSignalMapping>) => {
    setProfiles(prev =>
      prev.map(p => {
        if (p.id === activeProfileId) {
          const currentMap = p.physicalSignalMap || getDefaultPhysicalSignalMap();
          const updatedMap = currentMap.map(item => {
            if (item.decklinkChannelId === decklinkChannelId) {
              return { ...item, ...changes };
            }
            return item;
          });
          return { ...p, physicalSignalMap: updatedMap };
        }
        return p;
      })
    );
  };

  const updateActiveProfileVolleyballModule = (changes: { controlUrl?: string; overlayUrl?: string; autoSyncScore?: boolean }) => {
    setProfiles(prev =>
      prev.map(p => {
        if (p.id === activeProfileId) {
          const currentV = p.volleyballModule || {
            controlUrl: 'http://localhost:8000/volleyball-control.html',
            overlayUrl: 'http://localhost:8000/volleyball-overlay.html',
            autoSyncScore: true
          };
          return { ...p, volleyballModule: { ...currentV, ...changes } };
        }
        return p;
      })
    );
  };

  const toggleReplayMarker = (event: DirectionEvent) => {
    const existingIndex = replayMarkers.findIndex(m => m.id === event.id || m.timestamp === event.timestamp);
    if (existingIndex >= 0) {
      setReplayMarkers(prev => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      const newMarker: ReplayMarker = {
        id: event.id,
        timestamp: event.timestamp,
        isoTime: event.isoTime,
        onAirSource: event.newSource,
        previousSource: event.previousSource,
        priority: 'normal',
        note: '',
        status: 'pending'
      };
      setReplayMarkers(prev => [newMarker, ...prev]);
    }
  };

  const removeReplayMarker = (markerId: string) => {
    setReplayMarkers(prev => prev.filter(m => m.id !== markerId));
  };

  const updateReplayMarkerNote = (markerId: string, note: string) => {
    setReplayMarkers(prev => prev.map(m => (m.id === markerId ? { ...m, note } : m)));
  };

  const updateReplayMarkerPriority = (markerId: string, priority: ReplayPriority) => {
    setReplayMarkers(prev => prev.map(m => (m.id === markerId ? { ...m, priority } : m)));
  };

  const clearReplayMarkers = () => {
    setReplayMarkers([]);
  };

  const clearEventsLog = () => {
    setEventsLog([]);
  };

  const updateManualCheckAction = (checkId: string, status: ManualCheckStatus) => {
    setManualChecks(prev => {
      const updated = prev.map(c => (c.id === checkId ? { ...c, status, confirmedAt: new Date().toISOString() } : c));
      const activeProf = profiles.find(p => p.id === activeProfileId) || null;
      const computedReadiness = evaluateProductionReadiness({
        bridgeData: lastBridgeData,
        healthState,
        activeProfile: activeProf,
        logicalSources,
        physicalInputs,
        manualChecks: updated,
        programSourceId,
        previewSourceId
      });
      setReadinessState(computedReadiness);
      return updated;
    });
  };

  const resetManualChecksAction = () => {
    setManualChecks(DEFAULT_MANUAL_CHECKS);
    const activeProf = profiles.find(p => p.id === activeProfileId) || null;
    const computedReadiness = evaluateProductionReadiness({
      bridgeData: lastBridgeData,
      healthState,
      activeProfile: activeProf,
      logicalSources,
      physicalInputs,
      manualChecks: DEFAULT_MANUAL_CHECKS,
      programSourceId,
      previewSourceId
    });
    setReadinessState(computedReadiness);
  };

  return {
    logicalSources,
    physicalInputs,
    profiles,
    activeProfileId,
    eventsLog,
    replayMarkers,
    activeTab,
    programSourceId,
    previewSourceId,
    bridgeState,
    bridgeProfile,
    lastBridgeData,
    lastValidResponseTime,
    healthState,
    readinessState,
    manualChecks,
    obsConfig,
    resolumeConfig,
    volleyballStatus,
    setObsConfig,
    setResolumeConfig,
    setActiveTab,
    setProgramSource,
    setPreviewSource,
    cutSwitch,
    updateLogicalSource,
    updateSourceMapping,
    resetToDefaults,
    loadProfile,
    saveCurrentProfile,
    duplicateProfile,
    resetProfile,
    deleteProfile,
    importProfilesPackageAction,
    restoreBackupAction,
    updatePhysicalSignalMappingAction,
    updateActiveProfileVolleyballModule,
    toggleReplayMarker,
    removeReplayMarker,
    updateReplayMarkerNote,
    updateReplayMarkerPriority,
    clearReplayMarkers,
    clearEventsLog,
    updateManualCheckAction,
    resetManualChecksAction
  };
}

export type SwitcherStore = ReturnType<typeof useSwitcherStore>;
