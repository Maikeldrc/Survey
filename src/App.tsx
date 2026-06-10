import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  PhoneCall, 
  Database, 
  TrendingUp, 
  FolderLock, 
  Compass, 
  HelpCircle, 
  LogOut, 
  CheckCircle2, 
  Lock, 
  UserCheck, 
  RefreshCw, 
  ShieldAlert, 
  Heart,
  Calendar,
  Layers,
  FileCode,
  Info,
  ServerCrash,
  Activity,
  AlertCircle,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ArrowLeft,
  BookOpen
} from 'lucide-react';
import { 
  Patient, 
  SurveyResponse, 
  CallAttempt 
} from './types';
import { processSurveyEvaluation } from './evaluation';
import { INITIAL_PATIENTS, INITIAL_RESPONSES, INITIAL_ATTEMPTS } from './data';
import { 
  getCachedToken, 
  setCachedToken, 
  getStoredSpreadsheetId, 
  getStoredClientId, 
  loadTokenFromSession,
  fetchPatientsFromGoogleSheets,
  fetchResponsesFromGoogleSheets,
  fetchCallAttemptsFromGoogleSheets,
  appendSurveyResponseToGoogleSheets,
  appendCallAttemptToGoogleSheets,
  updatePatientInGoogleSheets,
  addPatientToGoogleSheets,
  updatePatientFullInGoogleSheets,
  setStoredSpreadsheetId,
  initializeExistingSpreadsheet,
  createPatientSurveySpreadsheet,
  initiateGoogleSignIn,
  fetchGoogleUserInfo
} from './googleSheets';

import OAuthSetup from './components/OAuthSetup';
import PatientList from './components/PatientList';
import SurveyForm from './components/SurveyForm';
import Dashboard from './components/Dashboard';
import IteraLogo from './components/IteraLogo';
import EvaluationGuide from './components/EvaluationGuide';
import { TRANSLATIONS } from './translations';

export default function App() {
  const [language, setLanguage] = useState<'es' | 'en'>(() => {
    return (localStorage.getItem('ps_app_language') as 'es' | 'en') || 'es';
  });

  const handleSetLanguage = (lang: 'es' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('ps_app_language', lang);
  };

  const T = TRANSLATIONS[language];

  // Mode configuration state ('unselected', 'local', 'google')
  const [selectedMode, setSelectedMode] = useState<'unselected' | 'local' | 'google'>('unselected');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [tokenExpired, setTokenExpired] = useState(false);

  // Google authenticated user identity (fetched from userinfo API after OAuth)
  const [googleUserEmail, setGoogleUserEmail] = useState('');
  const [googleUserName, setGoogleUserName] = useState('');

  // Administrative survey user configuration
  const [surveyorName, setSurveyorName] = useState(() => {
    return localStorage.getItem('ps_surveyor_name') || '';
  });
  const [onboardingName, setOnboardingName] = useState(() => {
    return localStorage.getItem('ps_surveyor_name') || '';
  });
  const [activeProvider, setActiveProvider] = useState(() => {
    return localStorage.getItem('ps_active_provider') || '';
  });
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard' | 'guide'>('list');

  // Unified Database tables
  const [patients, setPatients] = useState<Patient[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [callAttempts, setCallAttempts] = useState<CallAttempt[]>([]);

  // Selection states
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [isSavingSurvey, setIsSavingSurvey] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [showCancelSurveyModal, setShowCancelSurveyModal] = useState(false);

  // General loader states
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: 'success' as 'success' | 'error' | 'info' });
  const [spreadsheetNeedsInit, setSpreadsheetNeedsInit] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);

  const [isIframe, setIsIframe] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('No se pudo entrar a pantalla completa:', err);
        setFeedbackMsg({
          text: 'Para pantalla completa, por favor abre la aplicación en una pestaña nueva usando el botón superior.',
          type: 'info'
        });
      });
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  };

  // 1. Initial listener and check for Google Sign-In redirect token hashes
  useEffect(() => {
    // If this is the callback popup window, notify parent and close
    if (window.opener && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const popupToken = params.get('access_token');
      if (popupToken) {
        try {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', token: popupToken }, window.location.origin);
          window.close();
          return;
        } catch (e) {
          console.error("Popup communication error:", e);
        }
      }
    }

    loadTokenFromSession();
    
    // Check for popup parent-opener callback or raw redirected URL hash
    let hashToken: string | null = null;
    let stateParam: string | null = null;

    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      hashToken = params.get('access_token');
      stateParam = params.get('state');
      
      if (hashToken) {
        setCachedToken(hashToken);
        // Clean URL cleanly to hide PHI and avoid re-triggering hashes
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    const token = hashToken || getCachedToken();
    let storedSheetId = getStoredSpreadsheetId();
    if (!storedSheetId && import.meta.env.VITE_DEFAULT_SPREADSHEET_ID) {
      storedSheetId = import.meta.env.VITE_DEFAULT_SPREADSHEET_ID;
      setStoredSpreadsheetId(storedSheetId);
    }

    if (token) {
      setSelectedMode('google');
      fetchGoogleUserInfo(token).then((info) => {
        if (info) {
          setGoogleUserEmail(info.email);
          setGoogleUserName(info.name);
        }
      });
      if (storedSheetId) {
        setSpreadsheetId(storedSheetId);
        loadGoogleData(storedSheetId, token);
      } else {
        // Auto-create spreadsheet if none configured
        setIsLoading(true);
        createPatientSurveySpreadsheet(token)
          .then((newSheetId) => {
            setSpreadsheetId(newSheetId);
            setStoredSpreadsheetId(newSheetId);
            return loadGoogleData(newSheetId, token);
          })
          .catch((err) => {
            console.error(err);
            showFeedback('No se pudo auto-crear la hoja de Google: ' + err.message, 'error');
          })
          .finally(() => setIsLoading(false));
      }
    } else {
      // Check if we previously selected Local Store Mode
      const activeSavedMode = localStorage.getItem('ps_survey_active_mode');
      if (activeSavedMode === 'local') {
        setSelectedMode('local');
        loadLocalData();
      } else {
        // If they chose Google but we don't have a token, keep surveyorName empty to force unified pristine login form
        setSurveyorName('');
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data?.token) {
        const rcvToken = event.data.token;
        setCachedToken(rcvToken);
        setSelectedMode('google');
        setIsLoggingInGoogle(false);

        // Fetch User Info
        fetchGoogleUserInfo(rcvToken).then((info) => {
          if (info) {
            setGoogleUserEmail(info.email);
            setGoogleUserName(info.name);
          }
        });

        // Finalize login by copying the named local entry to global active surveyorName state
        const savedName = localStorage.getItem('ps_surveyor_name') || 'Operador de Interoperabilidad';
        setSurveyorName(savedName);
        
        let sId = getStoredSpreadsheetId();
        if (!sId && import.meta.env.VITE_DEFAULT_SPREADSHEET_ID) {
          sId = import.meta.env.VITE_DEFAULT_SPREADSHEET_ID;
        }

        if (sId) {
          setSpreadsheetId(sId);
          setStoredSpreadsheetId(sId);
          loadGoogleData(sId, rcvToken);
        } else {
          // Auto-create spreadsheet for the user to make onboarding completely seamless!
          setIsLoading(true);
          createPatientSurveySpreadsheet(rcvToken)
            .then((newSheetId) => {
              setSpreadsheetId(newSheetId);
              setStoredSpreadsheetId(newSheetId);
              return loadGoogleData(newSheetId, rcvToken);
            })
            .catch((err) => {
              console.error(err);
              showFeedback('Error auto-creando la hoja de cálculo: ' + err.message, 'error');
            })
            .finally(() => setIsLoading(false));
        }
      }
    };

    setIsIframe(window.self !== window.top);
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  // 2. Load data locally from localStorage
  const loadLocalData = () => {
    setIsLoading(true);
    try {
      const storedPatients = localStorage.getItem('ps_patients');
      const storedResponses = localStorage.getItem('ps_responses');
      const storedAttempts = localStorage.getItem('ps_attempts');

      if (storedPatients) {
        setPatients(JSON.parse(storedPatients));
      } else {
        // Hydrate default INITIAL_PATIENTS
        setPatients(INITIAL_PATIENTS);
        localStorage.setItem('ps_patients', JSON.stringify(INITIAL_PATIENTS));
      }

      if (storedResponses) {
        const parsed = JSON.parse(storedResponses) as SurveyResponse[];
        const migrated = parsed.map(r => {
          if (r.CallStatus === 'Completed' && (r.generalSatisfactionScore === null || r.generalSatisfactionScore === undefined)) {
            return {
              ...r,
              ...processSurveyEvaluation(r)
            } as SurveyResponse;
          }
          return r;
        });
        setSurveyResponses(migrated);
      } else {
        setSurveyResponses(INITIAL_RESPONSES);
        localStorage.setItem('ps_responses', JSON.stringify(INITIAL_RESPONSES));
      }

      if (storedAttempts) {
        setCallAttempts(JSON.parse(storedAttempts));
      } else {
        setCallAttempts(INITIAL_ATTEMPTS);
        localStorage.setItem('ps_attempts', JSON.stringify(INITIAL_ATTEMPTS));
      }
    } catch (e) {
      console.error('Error loading local storage data', e);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Load data from Google Sheets REST endpoints
  const loadGoogleData = async (sheetId: string, token: string, isRetry = false) => {
    setIsLoading(true);
    setTokenExpired(false);
    setSpreadsheetId(sheetId);
    setSpreadsheetNeedsInit(false);
    setPermissionError(false);
    try {
      const loadedPatients = await fetchPatientsFromGoogleSheets(sheetId, token);
      setPatients(loadedPatients);

      const loadedResponses = await fetchResponsesFromGoogleSheets(sheetId, token);
      const migratedResponses = loadedResponses.map(r => {
        if (r.CallStatus === 'Completed' && (r.generalSatisfactionScore === null || r.generalSatisfactionScore === undefined)) {
          return {
            ...r,
            ...processSurveyEvaluation(r)
          } as SurveyResponse;
        }
        return r;
      });
      setSurveyResponses(migratedResponses);

      const loadedAttempts = await fetchCallAttemptsFromGoogleSheets(sheetId, token);
      setCallAttempts(loadedAttempts);

      if (surveyorName) {
        showFeedback(language === 'es' ? 'Sincronización completada' : 'Sync complete', 'success');
      }
    } catch (err: any) {
      console.error('Error fetching sheets databases', err);
      const isRangeError = err.message?.includes('Unable to parse range') || 
                           err.toString().includes('INVALID_ARGUMENT') || 
                           err.toString().includes('400') ||
                           err.message?.includes('400');
      
      if (isRangeError && !isRetry) {
        try {
          console.log('Automated setup/init for connected Google Spreadsheet triggered...');
          await initializeExistingSpreadsheet(sheetId, token);
          // Retry fetching after silent background initialization
          await loadGoogleData(sheetId, token, true);
          return;
        } catch (initErr: any) {
          console.error('Auto-initialization failed, falling back to manual prompt:', initErr);
        }
      }

      const isPermissionOrNotFound = err.message?.includes('403') || 
                                     err.message?.includes('404') || 
                                     err.toString().includes('403') || 
                                     err.toString().includes('404');

      if (err.message?.includes('401') || err.message?.includes('Invalid Credentials') || err.message?.includes('auth')) {
        setTokenExpired(true);
        if (surveyorName) {
          showFeedback('La sesión de Google expiró. Por favor ingresa una clave fresca o usa modo demo.', 'error');
        }
      } else if (isPermissionOrNotFound) {
        setPermissionError(true);
        if (surveyorName) {
          const userStr = googleUserEmail ? ` (${googleUserEmail})` : '';
          showFeedback(`La cuenta de Google actual${userStr} no tiene permisos para acceder a esta hoja de cálculo. Por favor compártela con permisos de Editor o verifica el ID.`, 'error');
        }
      } else if (isRangeError) {
        setSpreadsheetNeedsInit(true);
        if (surveyorName) {
          showFeedback('La hoja requiere inicializar las pestañas clínicas. Por favor haz clic en "Inicializar Estructura".', 'error');
        }
      } else {
        if (surveyorName) {
          showFeedback(`No se pudo leer la hoja: ${err.message || err}`, 'error');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeSpreadsheet = async () => {
    const token = getCachedToken();
    if (!token || !spreadsheetId) {
      showFeedback('Falta autenticación de Google o el ID de la hoja.', 'error');
      return;
    }

    setIsInitializing(true);
    setSpreadsheetNeedsInit(false);
    try {
      showFeedback('Creando estructura y cargando de forma segura...', 'info');
      await initializeExistingSpreadsheet(spreadsheetId, token);
      showFeedback('¡Hoja inicializada con éxito!', 'success');
      await loadGoogleData(spreadsheetId, token);
    } catch (err: any) {
      console.error(err);
      setSpreadsheetNeedsInit(true);
      showFeedback(`Error al inicializar la hoja: ${err.message || err}`, 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  // Handle setting active mode
  const handleConnectionConfigured = (mode: 'local' | 'google', configuredSheetId?: string) => {
    setSelectedMode(mode);
    localStorage.setItem('ps_survey_active_mode', mode);

    if (mode === 'local') {
      loadLocalData();
    } else if (mode === 'google' && configuredSheetId) {
      const token = getCachedToken() || '';
      setSpreadsheetId(configuredSheetId);
      setStoredSpreadsheetId(configuredSheetId);
      loadGoogleData(configuredSheetId, token);
    }
  };

  // 4. Force cloud manual refresh button
  const handleForceSync = () => {
    if (selectedMode === 'google') {
      const token = getCachedToken();
      if (token && spreadsheetId) {
        loadGoogleData(spreadsheetId, token);
      } else {
        setTokenExpired(true);
      }
    } else {
      loadLocalData();
      showFeedback('Base local recargada con éxito', 'success');
    }
  };

  const handleUnifiedLogout = () => {
    setCachedToken(null);
    setSpreadsheetId('');
    setSelectedMode('unselected');
    setTokenExpired(false);
    setSurveyorName('');
    setOnboardingName('');
    setActiveProvider('');
    setGoogleUserEmail('');
    setGoogleUserName('');
    setIsLoggingInGoogle(false);
    localStorage.removeItem('ps_surveyor_name');
    localStorage.removeItem('ps_active_provider');
    localStorage.removeItem('ps_survey_active_mode');
    localStorage.removeItem('ps_surveyor_active_mode');
    // NOTE: ps_survey_spreadsheet_id is intentionally NOT removed so all
    // users on this device share the same clinic Google Sheet.
    showFeedback('Sesión cerrada con éxito', 'info');
  };

  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg({ text: '', type: 'success' });
    }, 4500);
  };

  // Onboarding Login Submit
  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = onboardingName.trim();
    if (!trimmed) return;
    
    // Save the surveyor's name to localStorage temporarily
    localStorage.setItem('ps_surveyor_name', trimmed);

    // Request fullscreen immediately to satisfy "abre el app en toda la pantalla"
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Could not enter fullscreen automatically:', err);
      });
    }

    const cId = import.meta.env.VITE_GOOGLE_CLIENT_ID || getStoredClientId();
    const token = getCachedToken();

    // Set the selected mode to google
    setSelectedMode('google');
    localStorage.setItem('ps_surveyor_active_mode', 'google');

    if (token) {
      // If we already have a token, just use the sheet or auto-create one
      setSurveyorName(trimmed);
      const sId = getStoredSpreadsheetId() || import.meta.env.VITE_DEFAULT_SPREADSHEET_ID;
      if (sId) {
        setSpreadsheetId(sId);
        loadGoogleData(sId, token);
      }
    } else if (cId) {
      // Direct trigger of Google Sign-In Popup.
      setIsLoggingInGoogle(true);
      initiateGoogleSignIn(cId);
    } else {
      showFeedback('Error: Google Client ID no configurado. Por favor define VITE_GOOGLE_CLIENT_ID en Vercel.', 'error');
    }
  };

  const handleDirectDemoLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    const trimmed = onboardingName.trim() || 'Encuestador Demo';
    localStorage.setItem('ps_surveyor_name', trimmed);
    setSurveyorName(trimmed);

    // Request fullscreen as well
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    }

    setSelectedMode('local');
    localStorage.setItem('ps_surveyor_active_mode', 'local');
    loadLocalData();
  };

  const currentLocalDate = () => {
    const d = new Date();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const YYYY = d.getFullYear();
    return `${YYYY}-${MM}-${DD}`;
  };

  const currentLocalTime = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0].substring(0, 5); // Ej. 14:32
  };

  // 5. Action: Log general Call Attempt (No Answer, Declined, Call Back, Invalid Phone)
  const handleLogCallAttempt = async (p: Patient, result: CallAttempt['CallResult'], notes: string) => {
    setIsUpdatingStatus(p.PatientID);
    const today = currentLocalDate();
    const nowTime = currentLocalTime();

    const formattedSurveyor = googleUserEmail ? `${surveyorName} (${googleUserEmail})` : surveyorName;

    const attempt: CallAttempt = {
      AttemptID: `ATT-${Math.floor(100000 + Math.random() * 900000)}`,
      Date: today,
      Time: nowTime,
      SurveyorName: formattedSurveyor,
      Provider: p.Provider,
      MRN: p.MRN,
      PatientName: p.PatientName,
      PhoneNumber: p.PhoneNumber,
      CareManager: p.CareManager,
      CallResult: result,
      Notes: notes
    };

    try {
      if (selectedMode === 'google') {
        const token = getCachedToken();
        if (!token) throw new Error('Token expirado');

        // Append to CallAttempts Sheet
        await appendCallAttemptToGoogleSheets(spreadsheetId, token, attempt);

        // Update Patient row status in Patients Sheet
        const updatedPatient = { ...p, Status: result, Notes: notes };
        await updatePatientInGoogleSheets(spreadsheetId, token, updatedPatient);

        // Refresh locally
        await loadGoogleData(spreadsheetId, token);
      } else {
        // Local mode update
        const updatedPatients = patients.map(item => {
          if (item.PatientID === p.PatientID) {
            return { ...item, Status: result, Notes: notes };
          }
          return item;
        });

        const newAttempts = [attempt, ...callAttempts];

        setPatients(updatedPatients);
        setCallAttempts(newAttempts);

        localStorage.setItem('ps_patients', JSON.stringify(updatedPatients));
        localStorage.setItem('ps_attempts', JSON.stringify(newAttempts));
      }

      showFeedback(`Llamada registrada como "${result}" para ${p.PatientName}`, 'success');
    } catch (err: any) {
      console.error(err);
      showFeedback(`Fallo al registrar intento: ${err.message || err}`, 'error');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // 5.5. Action: Create brand new Patient
  const handleAddPatient = async (newPatientData: Omit<Patient, 'PatientID' | 'Status' | 'LastSurveyDate' | 'Notes' | 'sheetRowIndex'>) => {
    setIsLoading(true);
    const newPatient: Patient = {
      ...newPatientData,
      PatientID: `PAT-${Math.floor(100000 + Math.random() * 900000)}`,
      Status: 'Pending',
      LastSurveyDate: '—',
      Notes: ''
    };

    try {
      if (selectedMode === 'google') {
        const token = getCachedToken();
        if (!token) throw new Error('Token expirado');
        await addPatientToGoogleSheets(spreadsheetId, token, newPatient);
        await loadGoogleData(spreadsheetId, token);
      } else {
        const updatedPatients = [newPatient, ...patients];
        setPatients(updatedPatients);
        localStorage.setItem('ps_patients', JSON.stringify(updatedPatients));
      }
      showFeedback(`Paciente "${newPatient.PatientName}" añadido con éxito`, 'success');
    } catch (err: any) {
      console.error(err);
      showFeedback(`Fallo al añadir paciente: ${err.message || err}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 5.6. Action: Edit existing Patient
  const handleEditPatient = async (updatedPatient: Patient) => {
    setIsLoading(true);
    try {
      if (selectedMode === 'google') {
        const token = getCachedToken();
        if (!token) throw new Error('Token expirado');
        await updatePatientFullInGoogleSheets(spreadsheetId, token, updatedPatient);
        await loadGoogleData(spreadsheetId, token);
      } else {
        const updatedPatients = patients.map(item => item.PatientID === updatedPatient.PatientID ? updatedPatient : item);
        setPatients(updatedPatients);
        localStorage.setItem('ps_patients', JSON.stringify(updatedPatients));
      }
      showFeedback(`Información de "${updatedPatient.PatientName}" actualizada con éxito`, 'success');
    } catch (err: any) {
      console.error(err);
      showFeedback(`Fallo al actualizar paciente: ${err.message || err}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Action: Submit completed / declined Survey results
  const handleSubmitSurveyForm = async (surveyData: Partial<SurveyResponse>, quickResult: CallAttempt['CallResult'] = 'Completed') => {
    if (!activePatient) return;
    setIsSavingSurvey(true);

    const today = currentLocalDate();
    const nowTime = currentLocalTime();
    const responseId = `RES-${Math.floor(100000 + Math.random() * 900000)}`;
    const formattedSurveyor = googleUserEmail ? `${surveyorName} (${googleUserEmail})` : surveyorName;

    const rawResponse: SurveyResponse = {
      ResponseID: responseId,
      SurveyDate: today,
      SurveyTime: nowTime,
      SurveyorName: formattedSurveyor,
      Provider: activePatient.Provider,
      MRN: activePatient.MRN,
      PatientID: activePatient.PatientID,
      PatientName: activePatient.PatientName,
      PhoneNumber: activePatient.PhoneNumber,
      CareManager: activePatient.CareManager,
      ServiceType: activePatient.ServiceType,
      OverallSatisfactionScore: surveyData.OverallSatisfactionScore || 0,
      HelpsManageHealth: surveyData.HelpsManageHealth || 'No',
      CareManagerSatisfactionScore: surveyData.CareManagerSatisfactionScore || 0,
      ClearExplanation: surveyData.ClearExplanation || 'No',
      FollowUpOnHealthNeeds: surveyData.FollowUpOnHealthNeeds || 'No',
      EasyCommunication: surveyData.EasyCommunication || 'No',
      EasyToTakeMeasurements: surveyData.EasyToTakeMeasurements || 'No aplica',
      WouldRecommendService: surveyData.WouldRecommendService || 'No',
      WhatPatientLikesMost: surveyData.WhatPatientLikesMost || '',
      WhatCouldBeImproved: surveyData.WhatCouldBeImproved || '',
      CallStatus: surveyData.CallStatus || 'Completed',
      FollowUpNeeded: surveyData.FollowUpNeeded || 'No',
      InternalNotes: surveyData.InternalNotes || '',
      generalSatisfactionScore: null,
      generalSatisfactionStars: null,
      generalSatisfactionLabel: null,
      followUpRequired: false,
      followUpReasons: '',
      scoreCalculatedAt: null,
      scoreVersion: 'v1.0'
    };

    const fullResponse = processSurveyEvaluation(rawResponse) as SurveyResponse;

    const attempt: CallAttempt = {
      AttemptID: `ATT-${Math.floor(100000 + Math.random() * 900000)}`,
      Date: today,
      Time: nowTime,
      SurveyorName: formattedSurveyor,
      Provider: activePatient.Provider,
      MRN: activePatient.MRN,
      PatientName: activePatient.PatientName,
      PhoneNumber: activePatient.PhoneNumber,
      CareManager: activePatient.CareManager,
      CallResult: quickResult,
      Notes: surveyData.InternalNotes || 'Llamada e investigación de encuesta completada.'
    };

    try {
      if (selectedMode === 'google') {
        const token = getCachedToken();
        if (!token) throw new Error('Sesión finalizada de Google');

        // 1. Post to SurveyResponses Sheet (only if was not direct declined at opening script)
        if (quickResult === 'Completed') {
          await appendSurveyResponseToGoogleSheets(spreadsheetId, token, fullResponse);
        }

        // 2. Post call attempt log
        await appendCallAttemptToGoogleSheets(spreadsheetId, token, attempt);

        // 3. Update Patient Status, Date and Notes
        const statusForPatient = quickResult; // Completed or Declined
        const updateP: Patient = {
          ...activePatient,
          Status: statusForPatient,
          LastSurveyDate: today,
          Notes: surveyData.InternalNotes || ''
        };
        await updatePatientInGoogleSheets(spreadsheetId, token, updateP);

        // 4. Reload from sheets database
        await loadGoogleData(spreadsheetId, token);
      } else {
        // Offline Local storage
        const updatedPatients = patients.map(p => {
          if (p.PatientID === activePatient.PatientID) {
            return {
              ...p,
              Status: quickResult,
              LastSurveyDate: today,
              Notes: surveyData.InternalNotes || ''
            };
          }
          return p;
        });

        const newResponses = quickResult === 'Completed' ? [fullResponse, ...surveyResponses] : surveyResponses;
        const newAttempts = [attempt, ...callAttempts];

        setPatients(updatedPatients);
        setSurveyResponses(newResponses);
        setCallAttempts(newAttempts);

        localStorage.setItem('ps_patients', JSON.stringify(updatedPatients));
        localStorage.setItem('ps_responses', JSON.stringify(newResponses));
        localStorage.setItem('ps_attempts', JSON.stringify(newAttempts));
      }

      showFeedback(`Encuesta guardada de satisfacción para ${activePatient.PatientName}`, 'success');
      setActivePatient(null);
    } catch (err: any) {
      console.error(err);
      showFeedback(`Error al registrar la encuesta: ${err.message || err}`, 'error');
    } finally {
      setIsSavingSurvey(false);
    }
  };

  // 7. Extract Unique Providers from cached Patients list
  const availableProviders = useMemo(() => {
    return Array.from(new Set(patients.map(p => p.Provider))).filter(Boolean);
  }, [patients]);

  const providerCounts = useMemo(() => {
    const counts: { [key: string]: { pending: number; completed: number; total: number } } = {};
    patients.forEach(p => {
      if (!counts[p.Provider]) {
        counts[p.Provider] = { pending: 0, completed: 0, total: 0 };
      }
      counts[p.Provider].total++;
      if (p.Status === 'Pending') counts[p.Provider].pending++;
      if (p.Status === 'Completed') counts[p.Provider].completed++;
    });
    return counts;
  }, [patients]);

  return (
    <div className="min-h-screen text-slate-900 font-sans flex flex-col justify-between" id="applet-main-container">
      
      {/* Dynamic Iframe Navigation / Full Screen Bar Alert */}
      {isIframe && (
        <div className="bg-slate-900 text-white border-b border-sky-950 px-4 py-2.5 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs transition-all duration-300 z-50 shrink-0" id="iframe-tip-banner">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping"></span>
            <span className="text-[11px] font-medium text-slate-300 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-sky-300" />
              Para evitar bloqueos de ventanas de Google Sheets, inicia sesión en pantalla completa.
            </span>
          </div>
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="px-3.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-[10px] transition shadow-xs flex items-center gap-1 cursor-pointer select-none"
            title="Abrir aplicación en pestaña independiente sin marcos"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir en Pantalla Completa
          </button>
        </div>
      )}

      {/* Dynamic Global Notification Toast Banner */}
      {feedbackMsg.text && (
        <div 
          className={`fixed bottom-5 right-5 z-55 max-w-sm p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
            feedbackMsg.type === 'error' ? 'bg-rose-50 border-rose-250 text-rose-800' :
            feedbackMsg.type === 'info' ? 'bg-sky-50 border-sky-200 text-sky-800' :
            'bg-emerald-50 border-emerald-250 text-emerald-800'
          }`}
          id="global-toast-feedback"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* STAGE I: Welcome Onboarding Form */}
      {!surveyorName ? (
        <div className="flex-1 flex items-center justify-center p-6" id="login-container">
          <div
            className="bg-white w-full animate-slideUp"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '48px 52px',
              margin: '0 auto',
              border: '1px solid #e4eaf4',
              borderRadius: 24,
              boxShadow: '0 10px 40px rgba(13,31,60,0.08)',
            }}
          >
            {/* Logo + heading */}
            <div className="flex flex-col items-center text-center">
              <div style={{ marginBottom: '28px' }}>
                <IteraLogo showSubtitle={true} variant="dark" className="w-[260px] max-w-full" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--itera-ink)', marginBottom: '10px' }}>
                {T.appTitle}
              </h2>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--itera-muted)', marginBottom: '32px' }}>
                {T.appSubtitle}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleOnboardingSubmit} id="surveyor-onboarding-form">
              <div style={{ marginBottom: '28px' }}>
                <label className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: 'var(--itera-muted)', marginBottom: '8px' }}>
                  {T.surveyorNameLabel}
                </label>
                <input
                  required
                  type="text"
                  value={onboardingName}
                  onChange={(e) => setOnboardingName(e.target.value)}
                  placeholder={T.surveyorNamePlaceholder}
                  className="w-full text-sm border font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-sky-400"
                  style={{
                    minHeight: '48px',
                    padding: '0 16px',
                    borderRadius: '14px',
                    borderColor: 'var(--itera-line)',
                    color: 'var(--itera-ink)',
                    background: '#f9fafb',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                disabled={isLoggingInGoogle}
                className="w-full text-white font-bold text-sm transition flex items-center justify-center cursor-pointer select-none"
                style={{
                  background: isLoggingInGoogle ? '#7db0e8' : 'linear-gradient(135deg, #1B6FD9 0%, #1254B5 100%)',
                  marginTop: '18px',
                  minHeight: '56px',
                  padding: '0 24px',
                  gap: '12px',
                  borderRadius: '14px',
                  boxShadow: isLoggingInGoogle ? 'none' : '0 4px 16px rgba(27,111,217,0.30)',
                  border: 'none',
                }}
              >
                {isLoggingInGoogle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white shrink-0" />
                    <span>{T.btnGoogleLoginWaiting}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.5 24c0-1.61-.15-3.16-.41-4.69H24v8.89h12.64c-.55 2.95-2.22 5.46-4.73 7.14l7.35 5.7C43.54 36.31 46.5 30.73 46.5 24z" />
                      <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.15 15.89-5.85l-7.35-5.7c-2.22 1.5-5.06 2.4-8.54 2.4-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>{T.btnGoogleLogin}</span>
                  </>
                )}
              </button>

              {isIframe && (
                <div className="pt-2 flex flex-col gap-2" style={{ borderTop: '1px solid var(--itera-line)' }}>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="w-full py-2.5 font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{
                      background: 'rgba(27,127,196,0.06)',
                      border: '1px solid rgba(27,127,196,0.2)',
                      borderRadius: 'var(--itera-radius)',
                      color: 'var(--itera-blue)'
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {T.btnFullscreen}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      ) : !activeProvider ? (
        /* STAGE III: Selection of Clinician Provider (Doctor Office Filter) */
        <div className="flex-1 flex items-center justify-center p-6 animate-fadeIn" id="provider-selection-view">
          <div
            className="bg-white w-full max-w-2xl space-y-6 animate-slideUp"
            style={{
              border: '1px solid #e4eaf4',
              borderRadius: 24,
              boxShadow: '0 8px 40px rgba(13,31,60,0.10)',
              padding: '44px 40px 40px',
            }}
          >
            <div className="text-center space-y-3">
              <div className="mx-auto mb-4 w-[220px] max-w-full">
                <IteraLogo showSubtitle={true} variant="dark" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--itera-ink)' }}>
                {T.providerSelectionTitle}
              </h2>
              <p className="text-xs max-w-md mx-auto leading-relaxed" style={{ color: 'var(--itera-muted)', textAlign: 'center', paddingBottom: '16px' }}>
                {T.providerSelectionSubtitle}
              </p>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-sky-600 flex flex-col items-center gap-2">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs font-semibold">{T.loadingDatabase}</span>
              </div>
            ) : availableProviders.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs space-y-3 text-gray-500">
                {permissionError ? (
                  <div className="space-y-4 py-4 animate-fadeIn" id="need-sheet-permissions-block">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
                      <ShieldAlert className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Error de Permisos en Google Sheets</h3>
                      <p className="text-[11px] text-gray-505 mt-2 max-w-md mx-auto leading-relaxed">
                        La cuenta de Google autenticada actual <strong className="text-rose-700 font-semibold">{googleUserEmail || 'invitado'}</strong> no tiene permisos para acceder a esta hoja de cálculo.
                      </p>
                      <div className="text-[11px] text-left max-w-sm mx-auto bg-white p-3.5 border border-slate-200 rounded-lg mt-3 space-y-1.5 text-slate-600">
                        <p className="font-bold text-slate-800">Para solucionar este error:</p>
                        <p>1. Pídele al propietario que comparta la hoja de cálculo con tu correo ({googleUserEmail || 'tu correo de Google'}) otorgándote acceso de <strong>Editor</strong>.</p>
                        <p>2. O puedes cerrar sesión con el botón de abajo y entrar con la cuenta correcta.</p>
                        <p>3. O bien, haz clic en el botón de abajo para crear una nueva hoja automáticamente con tu cuenta actual:</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const token = getCachedToken();
                        if (token) {
                          setIsLoading(true);
                          createPatientSurveySpreadsheet(token)
                            .then((newSheetId) => {
                              setSpreadsheetId(newSheetId);
                              setStoredSpreadsheetId(newSheetId);
                              return loadGoogleData(newSheetId, token);
                            })
                            .catch((err) => {
                              console.error(err);
                              showFeedback('Error al crear una nueva hoja: ' + err.message, 'error');
                            })
                            .finally(() => setIsLoading(false));
                        }
                      }}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center mx-auto gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" /> Crear Nueva Hoja de Cálculo Propia
                    </button>
                  </div>
                ) : spreadsheetNeedsInit ? (
                  <div className="space-y-4 py-4 animate-fadeIn" id="need-sheet-init-block">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                      <AlertCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Estructura No Inicializada en Google Sheets</h3>
                      <p className="text-[11px] text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                        Tu hoja de cálculo de Google está correctamente vinculada, pero no contiene las pestañas requeridas (<code>Patients</code>, <code>SurveyResponses</code>, y <code>CallAttempts</code>).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleInitializeSpreadsheet}
                      disabled={isInitializing}
                      className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center mx-auto gap-2"
                    >
                      {isInitializing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Creando pestañas en Google Sheet...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Inicializar Colecciones y Pacientes Demo
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-gray-400 leading-normal max-w-xs mx-auto">
                      * Esto creará de forma segura las 3 pestañas requeridas y cargará 10 pacientes clínicos iniciales para habilitar el listado y el dashboard de inmediato.
                    </p>
                  </div>
                ) : (
                  <>
                    <ServerCrash className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="font-bold">No se encontraron proveedores clínicos.</p>
                    <p className="text-[10px] text-gray-400">
                      Asegúrate de que tus hojas de Google Sheets contienen filas o usa "Reiniciar Configuración" abajo para forzar la demo local.
                    </p>
                    <button
                      onClick={() => {
                        handleConnectionConfigured('local');
                      }}
                      className="mt-2 text-sky-600 underline font-semibold text-xs animate-pulse"
                    >
                      Cambiar a Modo Demo Local
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3" id="providers-list">
                {availableProviders.map(provider => {
                  const counts = providerCounts[provider] || { pending: 0, completed: 0, total: 0 };
                  return (
                    <button
                      key={provider}
                      onClick={() => {
                        setActiveProvider(provider);
                        localStorage.setItem('ps_active_provider', provider);
                      }}
                      className="text-left transition-all group"
                      style={{
                        background: '#f8fafd',
                        border: '1px solid #e4eaf4',
                        borderRadius: 14,
                        padding: '18px 20px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#93c5fd';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(27,111,217,0.12)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = '#f8fafd';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#e4eaf4';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.03)';
                      }}
                    >
                      <p className="font-extrabold text-sm mb-3" style={{ color: 'var(--itera-ink)' }}>{provider}</p>
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                        <span className="px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(27,111,217,0.08)', color: '#1B6FD9' }}>
                          {T.statusPending}: {counts.pending}
                        </span>
                        <span className="px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(10,173,163,0.08)', color: '#0aada3' }}>
                          {T.statusCompleted}: {counts.completed}
                        </span>
                        <span className="px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.04)', color: '#7d8fa8' }}>
                          {T.statusTotal}: {counts.total}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold" style={{ borderTop: '1px solid var(--itera-line)', paddingTop: '24px' }}>
              <div className="flex items-center gap-2" style={{ color: 'var(--itera-muted)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--itera-teal)' }}></span>
                <span>{T.sessionLabel}: <strong style={{ color: 'var(--itera-ink)' }}>{surveyorName}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleUnifiedLogout}
                className="font-bold text-[11px] transition cursor-pointer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '44px',
                  paddingLeft: '18px',
                  paddingRight: '20px',
                  boxSizing: 'border-box',
                  background: 'rgba(232,85,42,0.06)',
                  border: '1px solid rgba(232,85,42,0.2)',
                  borderRadius: '14px',
                  color: 'var(--itera-coral)'
                }}
              >
                <LogOut className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                {T.btnLogout}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* STAGE IV: Operational Clinical Console (Main Panel) */
        <div className="flex-1 flex flex-col" id="dashboard-operational-console">
          
          {/* Centered Main Container for both Header and Content */}
          <div className="app-shell flex flex-col flex-1" id="operational-console-container">

            {/* Main Top clinical navbar header presenting absolute premium Itera brand identity */}
            <div className="w-full pt-4 md:pt-6" style={{ boxSizing: 'border-box' }}>
              <nav 
                className="w-full z-10"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e4eaf4',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px rgba(13, 31, 45, 0.03)',
                }}
              >
                <div className="w-full py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 top-header" style={{ paddingTop: '12px', paddingBottom: '12px', boxSizing: 'border-box' }}>
                  {/* Title / Provider logo block card */}
                  <div className="flex items-center gap-4">
                    <IteraLogo showSubtitle={true} variant="dark" className="w-[218px] origin-left" />
                    
                    <div className="border-l border-[#e4eaf4] pl-4 py-1 flex flex-col justify-center">
                      <button 
                        onClick={() => {
                          setActiveProvider('');
                          localStorage.removeItem('ps_active_provider');
                        }}
                        className="group"
                        style={{
                          background: '#1B6FD9',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '20px',
                          padding: '6px 16px',
                          fontWeight: 700,
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          transition: 'background 150ms ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1558b0')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#1B6FD9')}
                      >
                        <span>{activeProvider.toUpperCase()}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: '#7d8fa8', fontWeight: 650 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                        <span>{T.agentLabel}: <strong style={{ color: '#111827' }}>{surveyorName}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Nav Links */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setActiveTab('list');
                        setActivePatient(null);
                      }}
                      className="text-xs font-bold transition flex items-center whitespace-nowrap animate-fadeIn header-tab"
                      style={{
                        background: activeTab === 'list' ? '#1B6FD9' : '#f1f5f9',
                        color: activeTab === 'list' ? '#ffffff' : '#64748b',
                        border: '1px solid',
                        borderColor: activeTab === 'list' ? '#1B6FD9' : '#e2e8f0',
                        boxShadow: activeTab === 'list' ? '0 4px 10px rgba(27,111,217,0.25)' : 'none',
                        cursor: 'pointer',
                        minHeight: '44px',
                        paddingLeft: '18px',
                        paddingRight: '18px',
                        gap: '8px',
                        borderRadius: 'var(--itera-radius)',
                      }}
                    >
                      <Users className={`w-4 h-4 ${activeTab === 'list' ? 'text-white' : 'text-slate-400'}`} />
                      <span>{T.tabPatients}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('dashboard');
                        setActivePatient(null);
                      }}
                      className="text-xs font-bold transition flex items-center whitespace-nowrap animate-fadeIn header-tab"
                      style={{
                        background: activeTab === 'dashboard' ? '#1B6FD9' : '#f1f5f9',
                        color: activeTab === 'dashboard' ? '#ffffff' : '#64748b',
                        border: '1px solid',
                        borderColor: activeTab === 'dashboard' ? '#1B6FD9' : '#e2e8f0',
                        boxShadow: activeTab === 'dashboard' ? '0 4px 10px rgba(27,111,217,0.25)' : 'none',
                        cursor: 'pointer',
                        minHeight: '44px',
                        paddingLeft: '18px',
                        paddingRight: '18px',
                        gap: '8px',
                        borderRadius: 'var(--itera-radius)',
                      }}
                    >
                      <TrendingUp className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-400'}`} />
                      <span>{T.tabDashboard}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('guide');
                        setActivePatient(null);
                      }}
                      className="text-xs font-bold transition flex items-center whitespace-nowrap animate-fadeIn header-tab"
                      style={{
                        background: activeTab === 'guide' ? '#0aada3' : '#f1f5f9',
                        color: activeTab === 'guide' ? '#ffffff' : '#64748b',
                        border: '1px solid',
                        borderColor: activeTab === 'guide' ? '#0aada3' : '#e2e8f0',
                        boxShadow: activeTab === 'guide' ? '0 4px 10px rgba(10,173,163,0.28)' : 'none',
                        cursor: 'pointer',
                        minHeight: '44px',
                        paddingLeft: '18px',
                        paddingRight: '18px',
                        gap: '8px',
                        borderRadius: 'var(--itera-radius)',
                      }}
                    >
                      <BookOpen className={`w-4 h-4 ${activeTab === 'guide' ? 'text-white' : 'text-slate-400'}`} />
                      <span>{language === 'es' ? 'Metodología' : 'Methodology'}</span>
                    </button>
                  </div>

                  {/* Quick action buttons */}
                  <div className="header-right">
                    {/* Language Selector Button */}
                    <button
                      onClick={() => handleSetLanguage(language === 'es' ? 'en' : 'es')}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition text-[11px] flex items-center font-bold cursor-pointer language-button"
                      style={{
                        minHeight: '44px',
                        paddingLeft: '18px',
                        paddingRight: '18px',
                        gap: '8px',
                        borderRadius: 'var(--itera-radius)',
                      }}
                      title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
                    >
                      <span>🌐</span>
                      <span>{language === 'es' ? 'EN' : 'ES'}</span>
                    </button>

                    {/* Back to selecting provider */}
                    <button
                      onClick={() => {
                        setActiveProvider('');
                        localStorage.removeItem('ps_active_provider');
                      }}
                      className="hover:bg-slate-50 text-[#5a6b82] transition text-[11px] flex items-center font-bold border-none bg-transparent cursor-pointer header-button"
                      style={{
                        minHeight: '44px',
                        paddingLeft: '18px',
                        paddingRight: '18px',
                        gap: '8px',
                        borderRadius: 'var(--itera-radius)',
                      }}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{T.btnChangeProvider}</span>
                    </button>

                    {/* Log out surveyor operator */}
                    <button
                      onClick={handleUnifiedLogout}
                      className="bg-[#fef2f2] hover:bg-[#fee2e2] text-[#ef4444] border border-[#fecaca] transition text-[11px] flex items-center font-bold cursor-pointer animate-fadeIn logout-button"
                      style={{
                        minHeight: '44px',
                        paddingLeft: '18px',
                        paddingRight: '22px',
                        gap: '8px',
                        borderRadius: 'var(--itera-radius)',
                      }}
                      title={T.btnLogout}
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-450" /> 
                      <span>{T.btnLogout}</span>
                    </button>
                  </div>
                </div>
              </nav>
            </div>

            {/* Core Panel Content workspace */}
            <div className="flex-1 py-4 md:py-6 space-y-4 animate-fadeIn" id="applet-workspace-container">

              {/* Header Loader indicator */}
              {isLoading && (
                <div className="p-4 bg-sky-50 border border-sky-150 rounded-xl text-sky-800 text-xs flex items-center justify-between gap-3 animate-pulse shadow-sm" id="global-spinner">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-sky-600 animate-spin" />
                    <span>{T.syncingText}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-sky-600">{language === 'es' ? 'Transmitiendo de forma segura' : 'Securely Transmitting'}</span>
                </div>
              )}

              {activeTab === 'list' ? (
                activePatient ? (
                  /* surveyor telephone layout */
                  <SurveyForm 
                    patient={activePatient}
                    surveyorName={surveyorName}
                    onCancel={() => setShowCancelSurveyModal(true)}
                    onSubmitSurvey={handleSubmitSurveyForm}
                    isSaving={isSavingSurvey}
                    language={language}
                  />
                ) : (
                  /* patient table index */
                  <PatientList 
                    patients={patients}
                    selectedProvider={activeProvider}
                    onSelectPatient={(p) => setActivePatient(p)}
                    onLogCallAttempt={handleLogCallAttempt}
                    isUpdatingStatus={isUpdatingStatus}
                    onAddPatient={handleAddPatient}
                    onEditPatient={handleEditPatient}
                    responses={surveyResponses}
                    language={language}
                  />
                )
              ) : activeTab === 'dashboard' ? (
                /* aggregate executive metrics dashboard visualizer */
                <Dashboard 
                  patients={patients}
                  responses={surveyResponses}
                  attempts={callAttempts}
                  language={language}
                />
              ) : (
                /* evaluation methodology guide */
                <EvaluationGuide language={language} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Survey Confirmation Modal ────────────────── */}
      {showCancelSurveyModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 200ms ease both',
          }}
        >
          <div style={{
            width: '100%', maxWidth: 440,
            background: '#fff',
            borderRadius: 20,
            boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
            border: '1px solid #fde68a',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fff 100%)',
              borderBottom: '1px solid #fde68a',
              padding: '20px 24px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: '#fef3c7', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertCircle style={{ width: 20, height: 20, color: '#d97706' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>
                  {language === 'es' ? 'Salir de la encuesta activa' : 'Exit Active Survey'}
                </p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 }}>
                  {language === 'es' ? 'Los cambios no guardados se perderán' : 'Unsaved changes will be lost'}
                </p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 24px 20px' }}>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 }}>
                {language === 'es'
                  ? '¿Estás seguro de que deseas salir del script activo? Ningún dato de la encuesta actual será guardado.'
                  : 'Are you sure you want to exit the active script? Any unsaved survey changes will be lost.'}
              </p>
              <div style={{
                marginTop: 16,
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <ShieldAlert style={{ width: 14, height: 14, color: '#f97316', marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                  {language === 'es'
                    ? 'Esta acción cerrará el formulario. Si deseas registrar la llamada, usa los botones de resultado antes de salir.'
                    : 'This will close the form. To log the call result, use the outcome buttons before exiting.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              padding: '0 24px 24px',
              display: 'flex', gap: 10, justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={() => setShowCancelSurveyModal(false)}
                style={{
                  padding: '10px 20px', borderRadius: 12,
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  color: '#475569', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {language === 'es' ? 'Continuar encuesta' : 'Continue Survey'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCancelSurveyModal(false); setActivePatient(null); }}
                style={{
                  padding: '10px 24px', borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                  boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
                }}
              >
                <ArrowLeft style={{ width: 14, height: 14 }} />
                {language === 'es' ? 'Sí, salir al listado' : 'Yes, exit to list'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
