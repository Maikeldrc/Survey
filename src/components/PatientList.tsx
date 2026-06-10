import React, { useState } from 'react';
import {
  Search, X as ClearIcon, Filter, Phone, UserPlus,
  Clock, CheckCircle, XOctagon, UserX, AlertTriangle,
  AlertCircle, Edit2, Star, Activity,
  ChevronDown, ChevronLeft, ChevronRight,
  Stethoscope, RotateCcw, PhoneCall, RefreshCw,
} from 'lucide-react';
import { Patient, CallAttempt, ServiceType, SurveyResponse } from '../types';
import { TRANSLATIONS } from '../translations';

const PAGE_SIZE = 10;
const TODAY = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

interface PatientListProps {
  patients: Patient[];
  selectedProvider: string;
  onSelectPatient: (p: Patient) => void;
  onLogCallAttempt: (patient: Patient, result: CallAttempt['CallResult'], notes: string) => Promise<void>;
  isUpdatingStatus: string | null;
  onAddPatient: (patient: Omit<Patient, 'PatientID' | 'Status' | 'LastSurveyDate' | 'Notes' | 'sheetRowIndex'>) => Promise<void>;
  onEditPatient: (patient: Patient) => Promise<void>;
  responses?: SurveyResponse[];
  language?: 'es' | 'en';
}

/* ── KPI Card ──────────────────────────────────────────────── */
function KPICard({ icon, label, value, sub, color, bg }: {
  icon: React.ReactNode; label: string; value: string;
  sub: string; color: string; bg: string;
}) {
  return (
    <div style={{
      flex: '1 1 130px', minWidth: 128,
      background: '#ffffff',
      border: '1px solid #e4eaf4',
      borderRadius: 12, padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: bg, color, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#7d8fa8', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 10, color: '#b0bec5', marginTop: 3 }}>{sub}</div>
      </div>
    </div>
  );
}

/* ── Action Button ─────────────────────────────────────────── */
function ActionBtn({ icon, label, onClick, primary, color, bg, border }: {
  icon: React.ReactNode; label: string;
  onClick: () => void; primary?: boolean;
  color?: string; bg?: string; border?: string;
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3,
    padding: '3px 6px', borderRadius: 6, fontSize: 9, fontWeight: 700,
    cursor: 'pointer', border: border ?? '1px solid #dde3ef',
    background: bg ?? '#f8fafd', color: color ?? '#5a6b82',
    whiteSpace: 'nowrap', transition: 'opacity 120ms ease',
  };
  if (primary) Object.assign(base, {
    background: '#1B6FD9', color: '#fff', border: 'none',
    boxShadow: '0 3px 10px rgba(27,111,217,0.32)',
  });
  return (
    <button style={base}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ── Status Badge ──────────────────────────────────────────── */
function StatusBadge({ status, language = 'es' }: { status: Patient['Status']; language?: 'es' | 'en' }) {
  const T = TRANSLATIONS[language];
  const map: Record<Patient['Status'], { label: string; bg: string; color: string }> = {
    'Pending': { label: T.filterPending.toUpperCase(), bg: '#1B6FD9', color: '#fff' },
    'Completed': { label: T.filterCompleted.toUpperCase(), bg: '#16a34a', color: '#fff' },
    'No Answer': { label: T.filterNoAnswer.toUpperCase(), bg: '#f97316', color: '#fff' },
    'Declined': { label: T.filterDeclined.toUpperCase(), bg: '#ef4444', color: '#fff' },
    'Call Back': { label: T.filterCallBack.toUpperCase(), bg: '#8b5cf6', color: '#fff' },
    'Invalid Phone': { label: T.filterInvalidPhone.toUpperCase(), bg: '#6b7280', color: '#fff' },
  };
  const s = map[status];
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

/* ── Service Badge ─────────────────────────────────────────── */
function ServiceBadge({ type }: { type: string }) {
  if (type.includes('RPM') && type.includes('CCM'))
    return <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 6 }}>CCM/RPM</span>;
  if (type === 'RPM')
    return <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 6 }}>RPM</span>;
  return <span style={{ background: '#fff3e0', color: '#c2410c', fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 6 }}>CCM</span>;
}

/* ── Modal form input styles ───────────────────────────────── */
const inputSt: React.CSSProperties = {
  width: '100%', fontSize: 12, padding: '9px 12px',
  background: '#f8fafd', border: '1px solid #dde3ef',
  borderRadius: 8, color: '#111827', outline: 'none',
};
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  color: '#7d8fa8', marginBottom: 5,
};

/* ── Dropdown (module-level to avoid remounting) ───────────── */
function DropDown({ value, onChange, options, icon }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; icon?: React.ReactNode;
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon && <span style={{ position: 'absolute', left: 10, color: '#9baac1', pointerEvents: 'none' }}>{icon}</span>}
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none', paddingLeft: icon ? 30 : 12, paddingRight: 28, paddingTop: 8, paddingBottom: 8,
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: '#ffffff', border: '1px solid #dde3ef', borderRadius: 9,
          color: value !== 'All' ? '#1B6FD9' : '#5a6b82', outline: 'none',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown style={{ position: 'absolute', right: 8, width: 13, height: 13, color: '#9baac1', pointerEvents: 'none' }} />
    </div>
  );
}

/* ── Modal shell (module-level to avoid remounting) ─────────── */
function Modal({ title, headerBg, onClose, children }: {
  title: string; headerBg: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16, background: 'rgba(17,24,39,0.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid #e4eaf4', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: headerBg, padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{title}</span>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}>
            <ClearIcon style={{ width: 15, height: 15 }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Patient Form Body (module-level to avoid remounting) ───── */
interface FormBodyProps {
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  submitLabel: string;
  headerBg: string;
  formName: string; setFormName: (v: string) => void;
  formMRN: string; setFormMRN: (v: string) => void;
  formPhone: string; setFormPhone: (v: string) => void;
  formCareManager: string; setFormCareManager: (v: string) => void;
  formServiceTypes: ServiceType[]; setFormServiceTypes: React.Dispatch<React.SetStateAction<ServiceType[]>>;
  uniqueCareManagers: string[];
  language: string;
  labelPatientName: string; labelPhone: string; labelServiceType: string; btnSaving: string;
}
function FormBody({
  onSubmit, saving, submitLabel, headerBg,
  formName, setFormName, formMRN, setFormMRN,
  formPhone, setFormPhone, formCareManager, setFormCareManager,
  formServiceTypes, setFormServiceTypes,
  uniqueCareManagers, language,
  labelPatientName, labelPhone, labelServiceType, btnSaving,
}: FormBodyProps) {
  return (
    <form onSubmit={onSubmit} style={{ padding: '22px 22px 18px' }}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelSt}>{labelPatientName}</label>
        <input required value={formName} onChange={e => setFormName(e.target.value)} placeholder={language === 'es' ? 'Ej. Juan Pérez' : 'e.g. John Doe'} style={inputSt} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelSt}>MRN</label>
          <input required value={formMRN} onChange={e => setFormMRN(e.target.value)} style={{ ...inputSt, fontFamily: 'monospace' }} />
        </div>
        <div>
          <label style={labelSt}>{labelPhone}</label>
          <input required value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="(555) 000-0000" style={{ ...inputSt, fontFamily: 'monospace' }} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelSt}>Care Manager</label>
        <select value={formCareManager} onChange={e => setFormCareManager(e.target.value)} style={inputSt}>
          {uniqueCareManagers.length > 0
            ? uniqueCareManagers.map(cm => <option key={cm} value={cm}>{cm}</option>)
            : ['Sarah Jenkins, RN', 'Elena Torres, LPN', 'Michael Chang, NP'].map(cm => <option key={cm} value={cm}>{cm}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelSt}>{labelServiceType}</label>
        <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
          {(['CCM', 'RPM'] as const).map(st => (
            <label key={st} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
              <input
                type="checkbox"
                checked={formServiceTypes.includes(st)}
                onChange={e => {
                  setFormServiceTypes(prev =>
                    e.target.checked
                      ? [...prev.filter(x => x !== st), st]
                      : prev.filter(x => x !== st)
                  );
                }}
                style={{ accentColor: '#1B6FD9', width: 15, height: 15 }}
              />
              {st}
            </label>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        style={{
          width: '100%', padding: '11px 0', background: headerBg,
          color: '#fff', border: 'none', borderRadius: 10, fontSize: 13,
          fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: saving ? 0.7 : 1, transition: 'opacity 150ms',
        }}
      >
        {saving ? <><RefreshCw style={{ width: 14, height: 14 }} className="animate-spin" />{btnSaving}</> : submitLabel}
      </button>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function PatientList({
  patients, selectedProvider, onSelectPatient, onLogCallAttempt,
  isUpdatingStatus, onAddPatient, onEditPatient, responses = [],
  language = 'es',
}: PatientListProps) {
  const T = TRANSLATIONS[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [careManagerFilter, setCareManagerFilter] = useState('All');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('All');
  const [callbackPatientId, setCallbackPatientId] = useState<string | null>(null);
  const [callbackNotes, setCallbackNotes] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formMRN, setFormMRN] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCareManager, setFormCareManager] = useState('');
  const [formServiceTypes, setFormServiceTypes] = useState<ServiceType[]>(['CCM']);
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  /* ── Data ────────────────────────────────────────────────── */
  const providerPatients = patients.filter(p => p.Provider === selectedProvider);
  const uniqueCareManagers = Array.from(new Set(providerPatients.map(p => p.CareManager))).filter(Boolean);

  const filtered = providerPatients.filter(p => {
    const q = searchQuery.toLowerCase();
    const ms = !q || p.PatientName.toLowerCase().includes(q) || p.MRN.toLowerCase().includes(q) || p.PhoneNumber.includes(q);
    const mst = statusFilter === 'All' || p.Status === statusFilter;
    const mcm = careManagerFilter === 'All' || p.CareManager === careManagerFilter;
    const msv = serviceTypeFilter === 'All' || p.ServiceType.includes(serviceTypeFilter);
    return ms && mst && mcm && msv;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /* ── KPIs ────────────────────────────────────────────────── */
  const kpiPending  = providerPatients.filter(p => p.Status === 'Pending').length;
  const kpiDoneToday = providerPatients.filter(p => p.Status === 'Completed' && p.LastSurveyDate === TODAY).length;
  const kpiNoAns   = providerPatients.filter(p => p.Status === 'No Answer').length;
  const kpiCB      = providerPatients.filter(p => p.Status === 'Call Back').length;
  const kpiDecl    = providerPatients.filter(p => p.Status === 'Declined').length;
  const provResponses = (responses || []).filter(r => r.Provider === selectedProvider);
  const completedResponses = provResponses.filter(r => r.CallStatus === 'Completed' && r.generalSatisfactionScore !== null);
  const kpiAvg = completedResponses.length > 0
    ? (completedResponses.reduce((s, r) => s + (r.generalSatisfactionScore || 0), 0) / completedResponses.length).toFixed(1)
    : '—';

  /* ── Form helpers ────────────────────────────────────────── */
  const getServiceValue = (): ServiceType => {
    const u = Array.from(new Set(formServiceTypes));
    if (u.includes('CCM') && u.includes('RPM')) return 'CCM/RPM';
    return (u[0] || 'CCM') as ServiceType;
  };

  const toggleSvcType = (s: 'CCM' | 'RPM') =>
    setFormServiceTypes(prev => {
      const n = prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s];
      return n.length > 0 ? n : [s];
    });

  const openAdd = () => {
    setFormMRN('');
    setFormName(''); setFormPhone('');
    setFormCareManager(uniqueCareManagers[0] || '');
    setFormServiceTypes(['CCM']);
    setIsAddOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditingPatient(p);
    setFormMRN(p.MRN); setFormName(p.PatientName);
    setFormPhone(p.PhoneNumber); setFormCareManager(p.CareManager);
    setFormServiceTypes(p.ServiceType.split('/') as ServiceType[]);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;
    setIsSavingPatient(true);
    try {
      await onAddPatient({ MRN: formMRN, PatientName: formName, PhoneNumber: formPhone, CareManager: formCareManager, ServiceType: getServiceValue(), Provider: selectedProvider });
      setIsAddOpen(false);
    } finally { setIsSavingPatient(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient || !formName.trim()) return;
    setIsSavingPatient(true);
    try {
      await onEditPatient({ ...editingPatient, MRN: formMRN, PatientName: formName, PhoneNumber: formPhone, CareManager: formCareManager, ServiceType: getServiceValue() });
      setEditingPatient(null);
    } finally { setIsSavingPatient(false); }
  };

  const logAttempt = (p: Patient, r: CallAttempt['CallResult'], note = '') =>
    onLogCallAttempt(p, r, note);

  /* ── Avatar ──────────────────────────────────────────────── */
  const avatarColor = (p: Patient) =>
    p.Status === 'Completed'
      ? { bg: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }
      : ['ER', 'LM'].includes(p.PatientName.split(' ').map(n => n[0]).slice(0, 2).join(''))
        ? { bg: 'linear-gradient(135deg,#14b8a6,#0d9488)' }
        : { bg: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} id="patient-list-root">

      {/* ── Header Card ──────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e4eaf4', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#1B6FD9" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>{T.surveysToConduct}</h2>
            <p style={{ fontSize: 12, color: '#7d8fa8', margin: '2px 0 0' }}>
              {T.viewingPatientsCurrentProvider}{' '}
              <strong style={{ color: '#1B6FD9' }}>{selectedProvider}</strong>
            </p>
          </div>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 20px', background: '#1B6FD9', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,111,217,0.35)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1558b0')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1B6FD9')}
        >
          <UserPlus style={{ width: 16, height: 16 }} />
          {T.btnAddPatient}
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPICard icon={<Clock style={{ width: 18, height: 18 }} />} label={T.kpiPending} value={String(kpiPending)} sub={`${providerPatients.length > 0 ? Math.round(kpiPending / providerPatients.length * 100) : 0}% ${T.ofTotal}`} color="#1B6FD9" bg="#EFF6FF" />
        <KPICard icon={<CheckCircle style={{ width: 18, height: 18 }} />} label={T.kpiCompletedToday} value={String(kpiDoneToday)} sub={kpiDoneToday > 0 ? `↑ ${T.today}` : T.today} color="#16a34a" bg="#f0fdf4" />
        <KPICard icon={<PhoneCall style={{ width: 18, height: 18 }} />} label={T.kpiNoAnswer} value={String(kpiNoAns)} sub={T.today} color="#f97316" bg="#fff7ed" />
        <KPICard icon={<RotateCcw style={{ width: 18, height: 18 }} />} label={T.kpiCallBack} value={String(kpiCB)} sub={T.today} color="#8b5cf6" bg="#f5f3ff" />
        <KPICard icon={<XOctagon style={{ width: 18, height: 18 }} />} label={T.kpiDeclined} value={String(kpiDecl)} sub={T.today} color="#ef4444" bg="#fef2f2" />
        <KPICard icon={<Star style={{ width: 18, height: 18 }} />} label={T.kpiAvgScore} value={kpiAvg !== '—' ? `${kpiAvg}/5` : '—'} sub={T.last7Days} color="#1B6FD9" bg="#EFF6FF" />
      </div>

      {/* ── Search + Filters ─────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e4eaf4', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }} id="filters-container">
        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search style={{ position: 'absolute', left: 12, width: 15, height: 15, color: '#9baac1' }} />
          <input
            type="text" value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder={T.searchPlaceholder}
            style={{ ...inputSt, paddingLeft: 36, paddingRight: searchQuery ? 32 : 12, background: '#f8fafd' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9baac1', display: 'flex' }}>
              <ClearIcon style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
        <DropDown value={statusFilter} onChange={v => { setStatusFilter(v); setCurrentPage(1); }} icon={<Filter style={{ width: 13, height: 13 }} />} options={[
          { value: 'All', label: T.filterAllStatus },
          { value: 'Pending', label: T.filterPending },
          { value: 'Completed', label: T.filterCompleted },
          { value: 'No Answer', label: T.filterNoAnswer },
          { value: 'Declined', label: T.filterDeclined },
          { value: 'Call Back', label: T.filterCallBack },
          { value: 'Invalid Phone', label: T.filterInvalidPhone },
        ]} />
        <DropDown value={careManagerFilter} onChange={v => { setCareManagerFilter(v); setCurrentPage(1); }} icon={<Stethoscope style={{ width: 13, height: 13 }} />} options={[
          { value: 'All', label: T.filterCareManagerAll },
          ...uniqueCareManagers.map(cm => ({ value: cm, label: cm })),
        ]} />
        <DropDown value={serviceTypeFilter} onChange={v => { setServiceTypeFilter(v); setCurrentPage(1); }} icon={<Activity style={{ width: 13, height: 13 }} />} options={[
          { value: 'All', label: T.filterServiceAll },
          { value: 'CCM', label: 'CCM' },
          { value: 'RPM', label: 'RPM' },
        ]} />
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e4eaf4', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }} id="patients-table-container">

        {filtered.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <AlertCircle style={{ width: 24, height: 24, color: '#94a3b8' }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>{T.noPatientsFound}</p>
            <p style={{ fontSize: 12, color: '#9baac1', marginTop: 4 }}>{T.adjustFiltersHint}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1290 }}>
              <thead>
                <tr style={{ background: '#f8fafd', borderBottom: '1px solid #e4eaf4' }}>
                  {[
                    { label: T.thPatient, w: '220px' },
                    { label: T.thPhone, w: '160px' },
                    { label: T.thCareManager, w: '180px' },
                    { label: T.thService, w: '100px' },
                    { label: T.thStatus, w: '140px' },
                    { label: T.thSurveyResult, w: '130px' },
                    { label: T.thActions, w: '360px', align: 'center', size: 9 },
                  ].map((h, i) => (
                    <th key={i} style={{ padding: '10px 14px', fontSize: h.size ?? 10, fontWeight: 800, letterSpacing: '0.05em', color: '#7d8fa8', textAlign: (h.align as any) ?? 'left', whiteSpace: 'nowrap', minWidth: h.w, width: h.w }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((p, idx) => {
                  const isUpdating = isUpdatingStatus === p.PatientID;
                  const isCallback = callbackPatientId === p.PatientID;
                  const initials = p.PatientName.split(' ').map(n => n[0]).slice(0, 2).join('');
                  const av = avatarColor(p);
                  const resp = (responses || []).find(r => r.PatientID === p.PatientID);

                  return (
                    <tr key={p.PatientID} style={{
                      borderBottom: idx < paged.length - 1 ? '1px solid #f0f4f9' : 'none',
                      transition: 'background 120ms ease',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fbff')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {/* Patient */}
                      <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: av.bg, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>{p.PatientName}</span>
                              {resp?.followUpRequired && (
                                <span style={{
                                  background: '#fef2f2',
                                  color: '#ef4444',
                                  border: '1px solid #fecaca',
                                  fontSize: 9,
                                  fontWeight: 800,
                                  padding: '1.5px 6px',
                                  borderRadius: 4,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2
                                }}>
                                  <AlertCircle style={{ width: 10, height: 10 }} />
                                  <span>{language === 'es' ? 'Seguimiento' : 'Follow-up'}</span>
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 10, color: '#9baac1', marginTop: 1 }}>MRN: {p.MRN}</div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: 'monospace', color: '#374151' }}>
                          <Phone style={{ width: 12, height: 12, color: '#9baac1', flexShrink: 0 }} />
                          {p.PhoneNumber}
                        </div>
                      </td>

                      {/* Care Manager */}
                      <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 12, color: '#5a6b82' }}>{p.CareManager}</span>
                      </td>

                      {/* Service */}
                      <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                        <ServiceBadge type={p.ServiceType} />
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                        <StatusBadge status={p.Status} language={language} />
                      </td>

                      {/* Survey Result */}
                      <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const score = resp?.generalSatisfactionScore;
                          const stars = resp?.generalSatisfactionStars || 0;
                          if (resp?.CallStatus !== 'Completed' || score === null || score === undefined) {
                            return <span style={{ color: '#9baac1', fontSize: 12 }}>—</span>;
                          }
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                                {score}/5
                              </span>
                              <div style={{ display: 'flex', color: '#eab308', alignItems: 'center' }}>
                                {Array.from({ length: 5 }).map((_, i) => {
                                  const index = i + 1;
                                  let fill = 'none';
                                  let color = '#cbd5e1';
                                  
                                  if (stars >= index) {
                                    fill = '#eab308';
                                    color = '#eab308';
                                  } else if (stars >= index - 0.5) {
                                    return (
                                      <span key={i} style={{ position: 'relative', width: 12, height: 12, display: 'inline-block', marginLeft: 1 }}>
                                        <Star style={{ width: 12, height: 12, color: '#cbd5e1', fill: 'none', position: 'absolute', left: 0 }} />
                                        <span style={{ position: 'absolute', left: 0, top: 0, width: '50%', overflow: 'hidden', height: '100%' }}>
                                          <Star style={{ width: 12, height: 12, color: '#eab308', fill: '#eab308' }} />
                                        </span>
                                      </span>
                                    );
                                  }
                                  
                                  return (
                                    <Star
                                      key={i}
                                      style={{
                                        width: 12,
                                        height: 12,
                                        fill,
                                        color,
                                        marginLeft: 1,
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {isUpdating ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1B6FD9', padding: '6px 12px', background: '#EFF6FF', borderRadius: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '55%', background: '#1B6FD9', animation: 'ping 1s infinite' }} />
                            {T.btnSaving}
                          </div>
                        ) : isCallback ? (
                          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: 12, minWidth: 240 }}>
                            <p style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                              {T.scheduleCallTitle}
                            </p>
                            <input type="text" value={callbackNotes} onChange={e => setCallbackNotes(e.target.value)} placeholder={language === 'es' ? 'Ej. Mañana 4pm' : 'e.g. Tomorrow 4pm'} style={{ ...inputSt, marginBottom: 8, fontSize: 11 }} />
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button onClick={() => setCallbackPatientId(null)} style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, background: '#fff', border: '1px solid #dde3ef', borderRadius: 6, cursor: 'pointer', color: '#5a6b82' }}>{T.btnCancel}</button>
                              <button onClick={async () => { if (!callbackNotes.trim()) return; await logAttempt(p, 'Call Back', `Callback: ${callbackNotes}`); setCallbackPatientId(null); setCallbackNotes(''); }} style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{T.btnConfirm}</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '5px 6px', justifyContent: 'center' }}>
                            {/* Row 1 */}
                            <ActionBtn icon={<Edit2 style={{ width: 12, height: 12 }} />} label={T.btnEdit} onClick={() => openEdit(p)} />
                            <ActionBtn icon={<PhoneCall style={{ width: 12, height: 12 }} />} label={T.btnStartSurvey} onClick={() => onSelectPatient(p)} primary />
                            <ActionBtn icon={<UserX style={{ width: 12, height: 12 }} />} label={T.btnNoAnswer} onClick={() => logAttempt(p, 'No Answer', 'Sin respuesta.')} color="#c2410c" bg="#fff7ed" border="1px solid #fed7aa" />
                            {/* Row 2 */}
                            <ActionBtn icon={<RotateCcw style={{ width: 12, height: 12 }} />} label={T.btnCallBack} onClick={() => { setCallbackPatientId(p.PatientID); setCallbackNotes(''); }} />
                            <ActionBtn icon={<XOctagon style={{ width: 12, height: 12 }} />} label={T.btnDeclined} onClick={() => logAttempt(p, 'Declined', 'Declinó encuesta.')} color="#b91c1c" bg="#fef2f2" border="1px solid #fecaca" />
                            <ActionBtn icon={<AlertTriangle style={{ width: 12, height: 12 }} />} label={T.btnInvalid} onClick={() => logAttempt(p, 'Invalid Phone', 'Número inválido.')} color="#b45309" bg="#fffbeb" border="1px solid #fde68a" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Table Footer / Pagination ─────────────────────── */}
        {filtered.length > 0 && (
          <div style={{ borderTop: '1px solid #e4eaf4', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafcff' }}>
            <span style={{ fontSize: 12, color: '#7d8fa8' }}>
              {T.showing} <strong style={{ color: '#374151' }}>{paged.length}</strong> {T.ofText} <strong style={{ color: '#374151' }}>{filtered.length}</strong> {T.patientsText}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #dde3ef', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === 1 ? 0.4 : 1, color: '#5a6b82' }}
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{ width: 30, height: 30, borderRadius: 7, border: page === currentPage ? 'none' : '1px solid #dde3ef', background: page === currentPage ? '#1B6FD9' : '#fff', color: page === currentPage ? '#fff' : '#5a6b82', fontWeight: page === currentPage ? 700 : 500, fontSize: 12, cursor: 'pointer' }}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #dde3ef', background: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === totalPages ? 0.4 : 1, color: '#5a6b82' }}
              >
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Add ──────────────────────────────────────── */}
      {isAddOpen && (
        <Modal title={T.modalAddNewPatient} headerBg="linear-gradient(135deg,#1B6FD9,#1558b0)" onClose={() => setIsAddOpen(false)}>
          <FormBody
            onSubmit={handleAdd} saving={isSavingPatient} submitLabel={T.btnAddPatient} headerBg="#1B6FD9"
            formName={formName} setFormName={setFormName}
            formMRN={formMRN} setFormMRN={setFormMRN}
            formPhone={formPhone} setFormPhone={setFormPhone}
            formCareManager={formCareManager} setFormCareManager={setFormCareManager}
            formServiceTypes={formServiceTypes} setFormServiceTypes={setFormServiceTypes}
            uniqueCareManagers={uniqueCareManagers}
            language={language}
            labelPatientName={T.labelPatientName} labelPhone={T.labelPhone}
            labelServiceType={T.labelServiceType} btnSaving={T.btnSaving}
          />
        </Modal>
      )}

      {/* ── Modal: Edit ─────────────────────────────────────── */}
      {editingPatient && (
        <Modal title={T.modalEditPatient} headerBg="linear-gradient(135deg,#1e293b,#334155)" onClose={() => setEditingPatient(null)}>
          <FormBody
            onSubmit={handleEdit} saving={isSavingPatient} submitLabel={T.btnSaveChanges} headerBg="#1e293b"
            formName={formName} setFormName={setFormName}
            formMRN={formMRN} setFormMRN={setFormMRN}
            formPhone={formPhone} setFormPhone={setFormPhone}
            formCareManager={formCareManager} setFormCareManager={setFormCareManager}
            formServiceTypes={formServiceTypes} setFormServiceTypes={setFormServiceTypes}
            uniqueCareManagers={uniqueCareManagers}
            language={language}
            labelPatientName={T.labelPatientName} labelPhone={T.labelPhone}
            labelServiceType={T.labelServiceType} btnSaving={T.btnSaving}
          />
        </Modal>
      )}
    </div>
  );
}
