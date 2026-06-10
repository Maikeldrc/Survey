import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  LogOut,
  Info,
  CheckCircle2
} from 'lucide-react';
import { 
  getStoredClientId, 
  setStoredClientId, 
  getStoredSpreadsheetId, 
  setStoredSpreadsheetId, 
  initiateGoogleSignIn, 
  getCachedToken, 
  setCachedToken,
  createPatientSurveySpreadsheet
} from '../googleSheets';
import IteraLogo from './IteraLogo';

interface OAuthSetupProps {
  onConnectionConfigured: (mode: 'local' | 'google', spreadsheetId?: string) => void;
  tokenExpired: boolean;
  onClearSession: () => void;
}

export default function OAuthSetup({ onConnectionConfigured, tokenExpired, onClearSession }: OAuthSetupProps) {
  const [clientId, setClientId] = useState(getStoredClientId() || import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const [spreadsheetId, setSpreadsheetId] = useState(getStoredSpreadsheetId() || import.meta.env.VITE_DEFAULT_SPREADSHEET_ID || '');
  const [manualToken, setManualToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeToken = getCachedToken();

  // Automatic connection resolver if we hold a valid token
  useEffect(() => {
    if (activeToken) {
      setIsLoading(true);
      setErrorMsg('');
      const targetSheetId = spreadsheetId || getStoredSpreadsheetId() || import.meta.env.VITE_DEFAULT_SPREADSHEET_ID || '';

      if (targetSheetId) {
        // Save ID and connect
        setStoredSpreadsheetId(targetSheetId);
        setTimeout(() => {
          setIsLoading(false);
          onConnectionConfigured('google', targetSheetId);
        }, 1200);
      } else {
        // Automatically create sheet if none specified, in order to make it completely seamless
        createPatientSurveySpreadsheet(activeToken)
          .then((newId) => {
            setSpreadsheetId(newId);
            setStoredSpreadsheetId(newId);
            onConnectionConfigured('google', newId);
          })
          .catch((err: any) => {
            setErrorMsg(`Error al inicializar la base de datos: ${err.message || err}`);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }
  }, [activeToken, onConnectionConfigured]);

  const handleConnectWithClientId = () => {
    const finalClientId = clientId.trim() || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    if (!finalClientId) {
      setErrorMsg('Falta el Google Client ID de autenticación. Por favor, añádelo en Ajustes Avanzados abajo.');
      setShowAdvanced(true);
      return;
    }
    setErrorMsg('');
    setStoredClientId(finalClientId);
    initiateGoogleSignIn(finalClientId);
  };

  const handleApplyManualToken = () => {
    if (!manualToken.trim()) {
      setErrorMsg('Por favor ingresa un Access Token válido.');
      return;
    }
    setErrorMsg('');
    setCachedToken(manualToken.trim());
  };

  // If already authenticated and initializing
  if (activeToken) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white border border-slate-100 rounded-3xl shadow-premium text-center space-y-6 my-12" id="oauth-loading-state">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <span className="p-4 bg-sky-50 text-brand-blue rounded-full border border-sky-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#1b98e0]" />
            </span>
            <span className="absolute -top-1 -right-1 p-1 bg-emerald-500 rounded-full border-2 border-white w-4.5 h-4.5 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animate-duration-1000"></span>
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-[#202e34] text-base font-sans tracking-tight">
              Sincronizando con Google Drive
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
              Estableciendo canal FHIR seguro e inicializando tablas de pacientes...
            </p>
          </div>
        </div>

        {errorMsg ? (
          <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs font-mono font-medium">
            ⚠️ Error: {errorMsg}
          </div>
        ) : (
          <div className="pt-2 flex justify-center items-center gap-2 text-[10px] text-emerald-600 font-bold tracking-wide uppercase">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ACCESO AUTORIZADO</span>
          </div>
        )}

        <button 
          onClick={onClearSession}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Cancelar y Desconectar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8" id="oauth-setup-root">
      {/* High-fidelity Authentication Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-premium-lg space-y-6 relative overflow-hidden my-6">
        {/* Top accent visual effect */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-coral"></div>
        
        {/* Logo and subtitle block */}
        <div className="flex flex-col items-center text-center space-y-4">
          <IteraLogo showSubtitle={true} variant="dark" className="transform scale-105 mb-1" />
          
          <div className="space-y-1">
            <h2 className="text-lg font-black text-brand-dark font-sans tracking-tight">
              Conexión de Google Workspace
            </h2>
            <p className="text-slate-450 text-[11px] leading-relaxed max-w-xs">
              Inicia sesión con tu cuenta institucional para sincronizar las encuestas a la base de datos de Google Sheets.
            </p>
          </div>
        </div>

        {tokenExpired && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800" id="token-expired-alert">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
            <div className="text-[11px] leading-normal">
              <p className="font-bold">Sesión expirada o token inválido</p>
              <p className="text-amber-700 mt-0.5">Por favor vuelve a iniciar sesión para re-establecer el canal clínico remoto.</p>
            </div>
          </div>
        )}

        {/* The beautiful Premium Google Authentication Button */}
        <div className="pt-2 flex flex-col items-center">
          <button
            onClick={handleConnectWithClientId}
            id="btn-google-signin-direct"
            className="w-full py-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-slate-300 rounded-2xl font-extrabold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer select-none"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24c0-1.61-.15-3.16-.41-4.69H24v8.89h12.64c-.55 2.95-2.22 5.46-4.73 7.14l7.35 5.7C43.54 36.31 46.5 30.73 46.5 24z" />
              <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.15 15.89-5.85l-7.35-5.7c-2.22 1.5-5.06 2.4-8.54 2.4-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Autenticar con Cuenta de Google</span>
          </button>
        </div>

        {/* Display generic error messages nicely */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-[11px] font-semibold" id="config-error">
            ⚠️ {errorMsg}
          </div>
        )}

      </div>
    </div>
  );
}
