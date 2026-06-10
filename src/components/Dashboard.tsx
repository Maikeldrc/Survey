import React, { useState, useMemo } from 'react';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  HelpCircle, 
  PhoneCall, 
  TrendingUp, 
  Heart, 
  Star, 
  Calendar,
  AlertCircle,
  Activity,
  Award,
  ChevronDown
} from 'lucide-react';
import { Patient, SurveyResponse, CallAttempt } from '../types';
import { TRANSLATIONS } from '../translations';

interface DashboardProps {
  patients: Patient[];
  responses: SurveyResponse[];
  attempts: CallAttempt[];
  language?: 'es' | 'en';
}

/* ── KPI Card ──────────────────────────────────────────────── */
function KPICard({ icon, label, value, sub, color, bg }: {
  icon: React.ReactNode; label: string; value: string;
  sub: string; color: string; bg: string;
}) {
  return (
    <div style={{
      flex: '1 1 180px', minWidth: 150,
      background: 'linear-gradient(180deg, #ffffff 0%, #fdfdff 100%)',
      border: '1px solid #e2e8f0',
      borderRadius: 16, padding: '20px 22px',
      display: 'flex', alignItems: 'flex-start', gap: 16,
      boxShadow: '0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: bg, color, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: '#7d8fa8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 3, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 10, color: '#9baac1', marginTop: 3, fontWeight: 500 }}>{sub}</div>
      </div>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, ${color}cc)`
      }} />
    </div>
  );
}

/* ── Custom Dropdown ───────────────────────────────────────── */
const DropDown = ({ label, value, onChange, options, icon }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; icon?: React.ReactNode;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 160px' }}>
    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7d8fa8' }}>{label}</span>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon && <span style={{ position: 'absolute', left: 10, color: '#9baac1', pointerEvents: 'none' }}>{icon}</span>}
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none', width: '100%', paddingLeft: icon ? 30 : 12, paddingRight: 28, paddingTop: 8, paddingBottom: 8,
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: '#ffffff', border: '1px solid #dde3ef', borderRadius: 9,
          color: value !== 'All' ? '#1B6FD9' : '#5a6b82', outline: 'none',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown style={{ position: 'absolute', right: 8, width: 13, height: 13, color: '#9baac1', pointerEvents: 'none' }} />
    </div>
  </div>
);

/* ── Custom Date Input ─────────────────────────────────────── */
const DateInput = ({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 130px' }}>
    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7d8fa8', display: 'flex', alignItems: 'center', gap: 4 }}>
      <Calendar style={{ width: 11, height: 11 }} /> {label}
    </span>
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '7px 12px', fontSize: 12, fontWeight: 650,
        background: '#ffffff', border: '1px solid #dde3ef', borderRadius: 9,
        color: '#5a6b82', outline: 'none',
      }}
    />
  </div>
);

/* ── Chart Card Panel ─────────────────────────────────────── */
const ChartCard = ({ title, desc, icon, children }: { title: string; desc: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div style={{
    background: 'linear-gradient(180deg, #ffffff 0%, #fdfdff 100%)',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: '24px 26px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  }}>
    <div>
      <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#111827', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
        {icon}
        {title}
      </h3>
      <p style={{ fontSize: 11, color: '#7d8fa8', margin: '4px 0 0', lineHeight: 1.3 }}>{desc}</p>
    </div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 8 }}>
      {children}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Dashboard({ patients, responses, attempts, language = 'es' }: DashboardProps) {
  const T = TRANSLATIONS[language];
  // Filters State
  const [providerFilter, setProviderFilter] = useState<string>('All');
  const [careManagerFilter, setCareManagerFilter] = useState<string>('All');
  const [serviceFilter, setServiceFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');

  // Unified unique filters based on complete dataset
  const uniqueProviders = useMemo(() => Array.from(new Set(patients.map(p => p.Provider))).filter(Boolean), [patients]);
  const uniqueCareManagers = useMemo(() => Array.from(new Set(patients.map(p => p.CareManager))).filter(Boolean), [patients]);

  // Compute stats reactively based on selected filters
  const filteredData = useMemo(() => {
    // 1. Filter Patients
    const fp = patients.filter(p => {
      const matchProv = providerFilter === 'All' || p.Provider === providerFilter;
      const matchCM = careManagerFilter === 'All' || p.CareManager === careManagerFilter;
      const matchServ = serviceFilter === 'All' || p.ServiceType.includes(serviceFilter);
      return matchProv && matchCM && matchServ;
    });

    const fpIds = new Set(fp.map(p => p.PatientID));
    const fpMRNs = new Set(fp.map(p => p.MRN));

    // 2. Filter Survey Responses (using Patient link and Date Range)
    const fr = responses.filter(r => {
      // Must belong to filtered patients cohort
      if (!fpIds.has(r.PatientID)) return false;

      // Filter by Date
      if (r.SurveyDate) {
        if (r.SurveyDate < startDate || r.SurveyDate > endDate) return false;
      }
      return true;
    });

    // 3. Filter Call Attempts
    const fa = attempts.filter(a => {
      if (!fpMRNs.has(a.MRN)) return false;
      if (a.Date) {
        if (a.Date < startDate || a.Date > endDate) return false;
      }
      return true;
    });

    return { filteredPatients: fp, filteredResponses: fr, filteredAttempts: fa };
  }, [patients, responses, attempts, providerFilter, careManagerFilter, serviceFilter, startDate, endDate]);

  const { filteredPatients, filteredResponses, filteredAttempts } = filteredData;

  // KPIs Calculations
  const totalPatients = filteredPatients.length;
  
  const pendingCount = filteredPatients.filter(p => p.Status === 'Pending').length;
  const completedCount = filteredPatients.filter(p => p.Status === 'Completed').length;
  const noAnswerCount = filteredPatients.filter(p => p.Status === 'No Answer').length;
  const declinedCount = filteredPatients.filter(p => p.Status === 'Declined').length;
  const callBackCount = filteredPatients.filter(p => p.Status === 'Call Back').length;
  const invalidPhoneCount = filteredPatients.filter(p => p.Status === 'Invalid Phone').length;

  const completionRate = totalPatients > 0 
    ? Math.round((completedCount / totalPatients) * 1000) / 10 
    : 0;

  // Average overall satisfaction
  const avgOverallSatisfaction = useMemo(() => {
    const completed = filteredResponses.filter(r => r.CallStatus === 'Completed' && r.generalSatisfactionScore !== null && r.generalSatisfactionScore !== undefined);
    if (completed.length === 0) return 0;
    const sum = completed.reduce((acc, r) => acc + (r.generalSatisfactionScore || 0), 0);
    return Math.round((sum / completed.length) * 10) / 10;
  }, [filteredResponses]);

  // Average Care Manager satisfaction
  const avgCmSatisfaction = useMemo(() => {
    const completed = filteredResponses.filter(r => r.CallStatus === 'Completed');
    const valid = completed.filter(r => r.CareManagerSatisfactionScore > 0);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, r) => acc + r.CareManagerSatisfactionScore, 0);
    return Math.round((sum / valid.length) * 10) / 10;
  }, [filteredResponses]);

  // Would recommend rate: ('Sí' or 'Yes' out of total Q8 answered in Completed)
  const recommendationRate = useMemo(() => {
    const completed = filteredResponses.filter(r => r.CallStatus === 'Completed');
    const valid = completed.filter(r => r.WouldRecommendService === 'Sí' || r.WouldRecommendService === 'Yes' || r.WouldRecommendService === 'No' || r.WouldRecommendService === 'Tal vez' || r.WouldRecommendService === 'Maybe');
    if (valid.length === 0) return 0;
    const recommendYes = valid.filter(r => r.WouldRecommendService === 'Sí' || r.WouldRecommendService === 'Yes').length;
    return Math.round((recommendYes / valid.length) * 100);
  }, [filteredResponses]);

  // Overall distribution of scores (1 to 5) for general satisfaction
  const ratingDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredResponses.forEach(r => {
      if (r.CallStatus === 'Completed' && r.generalSatisfactionScore !== null && r.generalSatisfactionScore !== undefined) {
        const roundedScore = Math.max(1, Math.min(5, Math.round(r.generalSatisfactionScore))) as 1 | 2 | 3 | 4 | 5;
        counts[roundedScore]++;
      }
    });
    return counts;
  }, [filteredResponses]);

  // Count follow-up required surveys
  const followUpRequiredCount = useMemo(() => {
    return filteredResponses.filter(r => r.CallStatus === 'Completed' && r.followUpRequired === true).length;
  }, [filteredResponses]);

  // CCM vs RPM proportions
  const serviceSplit = useMemo(() => {
    const ccm = filteredPatients.filter(p => p.ServiceType.includes('CCM')).length;
    const rpm = filteredPatients.filter(p => p.ServiceType.includes('RPM')).length;
    return { ccm, rpm };
  }, [filteredPatients]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} id="dashboard-root">
      
      {/* ── Header Card & Filters ────────────────────────────── */}
      <div style={{ background: 'linear-gradient(180deg, #ffffff 0%, #fdfdff 100%)', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp style={{ width: 20, height: 20, color: '#1B6FD9' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>{T.dashboardTitle}</h2>
            <p style={{ fontSize: 12, color: '#7d8fa8', margin: '2px 0 0' }}>
              {T.dashboardSubtitle}
            </p>
          </div>
        </div>

        {/* Filters Panel Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 16, borderTop: '1px solid #f0f4f9' }} id="dashboard-filter-bento">
          <DropDown 
            label={language === 'es' ? 'Proveedor / Doctor' : 'Provider / Doctor'} 
            value={providerFilter} 
            onChange={setProviderFilter} 
            options={[
              { value: 'All', label: T.allProviders },
              ...uniqueProviders.map(p => ({ value: p, label: p }))
            ]}
          />
          <DropDown 
            label="Care Manager" 
            value={careManagerFilter} 
            onChange={setCareManagerFilter} 
            options={[
              { value: 'All', label: T.allCareManagers },
              ...uniqueCareManagers.map(cm => ({ value: cm, label: cm }))
            ]}
          />
          <DropDown 
            label={language === 'es' ? 'Servicio' : 'Service'} 
            value={serviceFilter} 
            onChange={setServiceFilter} 
            options={[
              { value: 'All', label: T.bothServices },
              { value: 'CCM', label: 'CCM (Chronic Care)' },
              { value: 'RPM', label: 'RPM (Remote Monitoring)' }
            ]}
          />
          <DateInput label={T.labelStartDate} value={startDate} onChange={setStartDate} />
          <DateInput label={T.labelEndDate} value={endDate} onChange={setEndDate} />
        </div>
      </div>

      {/* ── KPI Cards Grid ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }} id="kpis-summary-grid">
        <KPICard icon={<Users style={{ width: 18, height: 18 }} />} label={T.cohortTotal} value={String(totalPatients)} sub={T.assignedPatients} color="#475569" bg="#f1f5f9" />
        <KPICard icon={<TrendingUp style={{ width: 18, height: 18 }} />} label={T.completionRate} value={`${completionRate}%`} sub={`${completedCount} ${T.ofText} ${totalPatients} ${T.ofSurveys}`} color="#1B6FD9" bg="#EFF6FF" />
        <KPICard icon={<Star style={{ width: 18, height: 18 }} />} label={T.overallSatisfaction} value={avgOverallSatisfaction > 0 ? `${avgOverallSatisfaction} / 5` : '—'} sub={T.weightedAverage} color="#8b5cf6" bg="#f5f3ff" />
        <KPICard icon={<Heart style={{ width: 18, height: 18 }} />} label={T.cmSatisfaction} value={avgCmSatisfaction > 0 ? `${avgCmSatisfaction} / 5` : '—'} sub={T.personalizedCare} color="#10b981" bg="#ecfdf5" />
        <KPICard icon={<Award style={{ width: 18, height: 18 }} />} label={T.wouldRecommend} value={`${recommendationRate}%`} sub={T.favorableRecommendation} color="#6366f1" bg="#e0e7ff" />
        <KPICard icon={<AlertCircle style={{ width: 18, height: 18 }} />} label={T.followUpRequired} value={String(followUpRequiredCount)} sub={T.followUpSubtitle} color="#ef4444" bg="#fef2f2" />
      </div>

      {/* ── Cohort Call logs status distributions pill charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }} id="call-status-distribution-pills">
        {[
          { label: T.statusPending.toUpperCase(), val: pendingCount, color: '#1B6FD9', bg: '#EFF6FF', border: '#dbeafe' },
          { label: T.statusCompleted.toUpperCase(), val: completedCount, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: T.statusNoAnswer.toUpperCase(), val: noAnswerCount, color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
          { label: T.statusDeclined.toUpperCase(), val: declinedCount, color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
          { label: T.statusCallBack.toUpperCase(), val: callBackCount, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
          { label: T.statusInvalid.toUpperCase(), val: invalidPhoneCount, color: '#6b7280', bg: '#f1f5f9', border: '#e2e8f0' }
        ].map((p, idx) => (
          <div key={idx} style={{
            padding: '12px 14px',
            background: p.bg,
            border: `1px solid ${p.border}`,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 10,
            fontWeight: 800,
            color: p.color,
            letterSpacing: '0.04em',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}>
            <span>{p.label}</span>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace' }}>{p.val}</span>
          </div>
        ))}
      </div>

      {/* ── Visualization Grid Panel ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }} id="charts-visualization-grid">
        
        {/* Chart 1: Overall rating score histogram distribution */}
        <ChartCard 
          title={T.chart1Title} 
          desc={T.chart1Subtitle}
          icon={<Activity style={{ width: 14, height: 14, color: '#8b5cf6' }} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} id="score-historgram">
            {[5, 4, 3, 2, 1].map(stars => {
              const count = ratingDistribution[stars as 1|2|3|4|5] || 0;
              const totalCompleted = filteredResponses.length || 1;
              const percent = Math.min(100, Math.round((count / totalCompleted) * 100));

              return (
                <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                  <span style={{ width: 44, fontWeight: 700, color: '#5a6b82', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {stars} <Star style={{ width: 12, height: 12, color: '#eab308', fill: '#eab308' }} />
                  </span>
                  
                  <div style={{ flex: 1, background: '#f1f5f9', height: 12, borderRadius: 6, overflow: 'hidden', position: 'relative', border: '1px solid #e2e8f0' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        borderRadius: 6,
                        background: stars === 5 ? 'linear-gradient(90deg, #10b981, #059669)' :
                                    stars === 4 ? 'linear-gradient(90deg, #10b981, #10b981)' :
                                    stars === 3 ? 'linear-gradient(90deg, #eab308, #ca8a04)' :
                                    stars === 2 ? 'linear-gradient(90deg, #f97316, #ea580c)' :
                                    'linear-gradient(90deg, #ef4444, #dc2626)',
                        width: `${percent}%`,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>

                  <span style={{ width: 64, textAlign: 'right', fontSize: 11, color: '#7d8fa8', fontWeight: 600 }}>
                    {percent}% ({count})
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Chart 2: CCM vs RPM circular donut display */}
        <ChartCard 
          title={T.chart2Title} 
          desc={T.chart2Subtitle}
          icon={<CheckCircle style={{ width: 14, height: 14, color: '#1B6FD9' }} />}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 0' }} id="circular-chart-box">
              {totalPatients === 0 ? (
                <div style={{ fontSize: 12, color: '#9baac1' }}>{language === 'es' ? 'No hay datos' : 'No data'}</div>
              ) : (
                <svg width="150" height="150" viewBox="0 0 150 150">
                  {(() => {
                    const r = 50;
                    const cx = 75;
                    const cy = 75;
                    const circ = 2 * Math.PI * r;
                    const serviceTotal = Math.max(1, serviceSplit.ccm + serviceSplit.rpm);
                    const ccmPct = serviceSplit.ccm / serviceTotal;
                    const ccmDash = circ * ccmPct;
                    const rpmDash = circ * (1 - ccmPct);

                    return (
                      <>
                        {/* Gray track background */}
                        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
                        
                        {/* CCM Ring */}
                        {serviceSplit.ccm > 0 && (
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={r} 
                            fill="none" 
                            stroke="#f59e0b" 
                            strokeWidth="14" 
                            strokeDasharray={`${ccmDash} ${circ}`}
                            strokeDashoffset="0"
                            transform="rotate(-90 75 75)"
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                          />
                        )}

                        {/* RPM Ring */}
                        {serviceSplit.rpm > 0 && (
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={r} 
                            fill="none" 
                            stroke="#6366f1" 
                            strokeWidth="14" 
                            strokeDasharray={`${rpmDash} ${circ}`}
                            strokeDashoffset={-ccmDash}
                            transform="rotate(-90 75 75)"
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                          />
                        )}

                        <text x="75" y="72" textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: '#111827', fontFamily: 'monospace' }}>
                          {totalPatients}
                        </text>
                        <text x="75" y="90" textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: '#7d8fa8', letterSpacing: '0.05em' }}>
                          {language === 'es' ? 'PACIENTES' : 'PATIENTS'}
                        </text>
                      </>
                    );
                  })()}
                </svg>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, borderTop: '1px solid #f0f4f9', paddingTop: 12 }} id="donut-legend">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#5a6b82' }}>
                <span style={{ width: 10, height: 10, background: '#f59e0b', borderRadius: 3 }}></span>
                CCM ({serviceSplit.ccm})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#5a6b82' }}>
                <span style={{ width: 10, height: 10, background: '#6366f1', borderRadius: 3 }}></span>
                RPM ({serviceSplit.rpm})
              </span>
            </div>
          </div>
        </ChartCard>

        {/* Chart 3: Call Attempts logs registry */}
        <ChartCard 
          title={T.chart3Title} 
          desc={T.chart3Subtitle}
          icon={<PhoneCall style={{ width: 14, height: 14, color: '#1B6FD9' }} />}
        >
          {(() => {
            const totalAttempts = filteredAttempts.length || 1;
            const compCount = filteredAttempts.filter(a => a.CallResult === 'Completed').length;
            const naCount = filteredAttempts.filter(a => a.CallResult === 'No Answer').length;
            const decCount = filteredAttempts.filter(a => a.CallResult === 'Declined').length;
            const cbCount = filteredAttempts.filter(a => a.CallResult === 'Call Back').length;

            const metrics = [
              { label: language === 'es' ? 'Exitosas (Completed)' : 'Successful (Completed)', count: compCount, color: '#10b981' },
              { label: language === 'es' ? 'No Contesta (No Answer)' : 'No Answer', count: naCount, color: '#f59e0b' },
              { label: language === 'es' ? 'Rechazadas (Declined)' : 'Declined', count: decCount, color: '#ef4444' },
              { label: language === 'es' ? 'Volver a Llamar (Call Back)' : 'Call Back', count: cbCount, color: '#8b5cf6' }
            ];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: '8px 12px', background: '#f8fafd', fontSize: 11, fontWeight: 700, border: '1px solid #dde3ef', borderRadius: 8, color: '#5a6b82', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{T.totalLoggedAttempts}</span>
                  <span style={{ fontFamily: 'monospace', color: '#111827' }}>{filteredAttempts.length} {T.attemptsText}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {metrics.map((m, idx) => {
                    const pct = Math.round((m.count / totalAttempts) * 100);
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 650, color: '#5a6b82' }}>
                          <span>{m.label}</span>
                          <span style={{ fontWeight: 700, color: '#111827' }}>{m.count} ({pct}%)</span>
                        </div>
                        
                        <div style={{ width: '100%', background: '#f1f5f9', height: 8, borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              borderRadius: 4,
                              background: m.color, 
                              width: `${pct}%`,
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </ChartCard>

      </div>
    </div>
  );
}
