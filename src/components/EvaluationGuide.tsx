import React, { useState } from 'react';
import {
  Star,
  Info,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  BarChart2,
  MessageSquare,
  Zap,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface Props {
  language: 'es' | 'en';
}

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  es: {
    pageTitle: 'Guía del Sistema de Evaluación',
    pageSubtitle: 'Metodología de Satisfacción del Paciente · Digital Care Management Services',
    // Sections
    sec1Title: 'Cómo se calcula el Score',
    sec1Sub: 'Algoritmo ponderado de satisfacción general',
    sec2Title: 'Escala de Resultados',
    sec2Sub: 'Clasificación cualitativa y estrellas',
    sec3Title: 'Preguntas Incluidas',
    sec3Sub: 'Las 8 preguntas que componen el cálculo',
    sec4Title: 'Alertas de Seguimiento',
    sec4Sub: 'Cuándo se activa el badge ⚑ Follow-up',
    sec5Title: 'Estados de Encuesta',
    sec5Sub: 'Cuándo se calcula y cuándo no',
    sec6Title: 'Compatibilidad FHIR',
    sec6Sub: 'Alineación con estándar HL7 FHIR R4',
    // General
    formula: 'Fórmula',
    formulaDesc: 'El score es un promedio ponderado de las respuestas cerradas (Q1–Q8). Las preguntas contestadas como "No aplica" se excluyen del numerador y del denominador.',
    formulaEq: 'Score = Σ(respuesta × peso) ÷ Σ(pesos aplicables)',
    versionLabel: 'Versión del algoritmo',
    // Questions table
    qNum: '#',
    qText: 'Pregunta',
    qType: 'Tipo de respuesta',
    qWeight: 'Peso',
    qField: 'Campo',
    // Answers map
    ansYes: 'Sí / Yes',
    ansSometimes: 'A veces / Sometimes / Tal vez',
    ansNo: 'No',
    ansNA: 'No aplica',
    ansScore: 'Valor numérico',
    // Labels
    labelExcellent: 'Excellent Satisfaction',
    labelGood: 'Good Satisfaction',
    labelNeeds: 'Needs Attention',
    labelAtRisk: 'At Risk',
    labelCritical: 'Critical Dissatisfaction',
    // States
    stateCompleted: 'Completed',
    statePending: 'Pending',
    stateNoAnswer: 'No Answer',
    stateCallBack: 'Call Back',
    stateDeclined: 'Declined',
    stateInvalid: 'Invalid',
    stateCalc: 'Se calcula ✓',
    stateNoCalc: 'No se calcula — muestra "—"',
    // Alerts
    alertTitle: 'Se activa Follow-up cuando:',
    alert1: 'Q1 (Satisfacción general) ≤ 2',
    alert2: 'Q3 (Satisfacción con Care Manager) ≤ 2',
    alert3: 'Q5 (Seguimiento de salud) = No',
    alert4: 'Q6 (Facilidad de contacto) = No',
    alert5: 'Q8 (Recomendaría el servicio) = No',
    alert6: 'Seguimiento clínico interno marcado como requerido',
    alert7: 'Palabras clave críticas detectadas en comentarios abiertos',
    keywords: 'Palabras clave críticas monitoreadas',
    keywordsList: 'urgent · emergency · medication · no response · bad service · complaint · problem · device issue · blood pressure · glucose · oxygen · dizzy · pain · shortness of breath · chest pain',
    // FHIR
    fhirDesc: 'Cada encuesta completada genera recursos FHIR R4 equivalentes para interoperabilidad clínica:',
    fhirQR: 'QuestionnaireResponse',
    fhirObs: 'Observation (derivada)',
    fhirQRDesc: 'Contiene las 10 preguntas (Q1–Q10) con sus respuestas como items enlazados.',
    fhirObsDesc: 'Observation de categoría "survey" con valueDecimal = score y referencia al QuestionnaireResponse.',
    fhirNote: 'Estos recursos son compatibles conceptualmente con FHIR R4. La transmisión a un servidor FHIR real requiere configuración adicional.',
    // Stars table header
    scoreRange: 'Rango de score',
    stars: 'Estrellas',
    label: 'Clasificación',
    color: 'Color',
  },
  en: {
    pageTitle: 'Evaluation System Guide',
    pageSubtitle: 'Patient Satisfaction Methodology · Digital Care Management Services',
    sec1Title: 'How the Score is Calculated',
    sec1Sub: 'Weighted general satisfaction algorithm',
    sec2Title: 'Results Scale',
    sec2Sub: 'Qualitative classification and stars',
    sec3Title: 'Questions Included',
    sec3Sub: 'The 8 questions that make up the calculation',
    sec4Title: 'Follow-up Alerts',
    sec4Sub: 'When the ⚑ Follow-up badge is triggered',
    sec5Title: 'Survey States',
    sec5Sub: 'When the score is calculated and when it is not',
    sec6Title: 'FHIR Compatibility',
    sec6Sub: 'Alignment with HL7 FHIR R4 standard',
    formula: 'Formula',
    formulaDesc: 'The score is a weighted average of closed-ended responses (Q1–Q8). Questions answered as "Not applicable" are excluded from both the numerator and denominator.',
    formulaEq: 'Score = Σ(response × weight) ÷ Σ(applicable weights)',
    versionLabel: 'Algorithm version',
    qNum: '#',
    qText: 'Question',
    qType: 'Response type',
    qWeight: 'Weight',
    qField: 'Field',
    ansYes: 'Yes / Sí',
    ansSometimes: 'Sometimes / A veces / Maybe',
    ansNo: 'No',
    ansNA: 'Not applicable',
    ansScore: 'Numeric value',
    labelExcellent: 'Excellent Satisfaction',
    labelGood: 'Good Satisfaction',
    labelNeeds: 'Needs Attention',
    labelAtRisk: 'At Risk',
    labelCritical: 'Critical Dissatisfaction',
    stateCompleted: 'Completed',
    statePending: 'Pending',
    stateNoAnswer: 'No Answer',
    stateCallBack: 'Call Back',
    stateDeclined: 'Declined',
    stateInvalid: 'Invalid',
    stateCalc: 'Calculated ✓',
    stateNoCalc: 'Not calculated — shows "—"',
    alertTitle: 'Follow-up is triggered when:',
    alert1: 'Q1 (Overall satisfaction) ≤ 2',
    alert2: 'Q3 (Care Manager satisfaction) ≤ 2',
    alert3: 'Q5 (Health follow-up) = No',
    alert4: 'Q6 (Ease of contact) = No',
    alert5: 'Q8 (Would recommend service) = No',
    alert6: 'Internal clinical follow-up marked as required',
    alert7: 'Critical keywords detected in open-ended comments',
    keywords: 'Critical keywords monitored',
    keywordsList: 'urgent · emergency · medication · no response · bad service · complaint · problem · device issue · blood pressure · glucose · oxygen · dizzy · pain · shortness of breath · chest pain',
    fhirDesc: 'Each completed survey generates equivalent FHIR R4 resources for clinical interoperability:',
    fhirQR: 'QuestionnaireResponse',
    fhirObs: 'Observation (derived)',
    fhirQRDesc: 'Contains all 10 questions (Q1–Q10) with their answers as linked items.',
    fhirObsDesc: 'Survey-category Observation with valueDecimal = score and a reference to the QuestionnaireResponse.',
    fhirNote: 'These resources are conceptually compatible with FHIR R4. Transmission to a live FHIR server requires additional configuration.',
    scoreRange: 'Score range',
    stars: 'Stars',
    label: 'Classification',
    color: 'Color',
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const QUESTIONS = [
  { id: 'Q1', weight: '20%', type: 'scale', field: 'OverallSatisfactionScore',
    en: 'Overall, how satisfied are you with the CCM/RPM service?',
    es: '¿Qué tan satisfecho está con el servicio CCM/RPM en general?' },
  { id: 'Q2', weight: '15%', type: 'yes/no', field: 'HelpsManageHealth',
    en: 'Do you feel this service helps you manage your health better?',
    es: '¿Siente que este servicio le ayuda a manejar mejor su salud?' },
  { id: 'Q3', weight: '20%', type: 'scale', field: 'CareManagerSatisfactionScore',
    en: 'How satisfied are you with the care from your Care Manager?',
    es: '¿Qué tan satisfecho está con su Care Manager?' },
  { id: 'Q4', weight: '12.5%', type: 'yes/no', field: 'ClearExplanation',
    en: 'Does your Care Manager explain information clearly?',
    es: '¿Su Care Manager le explica la información de forma clara?' },
  { id: 'Q5', weight: '12.5%', type: 'yes/no', field: 'FollowUpOnHealthNeeds',
    en: 'Do you feel your Care Manager follows up on your health needs?',
    es: '¿Siente que su Care Manager hace seguimiento de sus necesidades?' },
  { id: 'Q6', weight: '10%', type: 'yes/no', field: 'EasyCommunication',
    en: 'Is it easy to reach your Care Manager when you need help?',
    es: '¿Es fácil comunicarse con su Care Manager cuando lo necesita?' },
  { id: 'Q7', weight: '5%', type: 'yes/no/na', field: 'EasyToTakeMeasurements',
    en: 'Do you find it easy to take your measurements? (optional)',
    es: '¿Le resulta fácil tomar sus mediciones? (opcional)' },
  { id: 'Q8', weight: '5%', type: 'yes/no/maybe', field: 'WouldRecommendService',
    en: 'Would you recommend this service to another patient?',
    es: '¿Recomendaría este servicio a otro paciente?' },
];

const SCALE_LEVELS = [
  { range: '4.75 – 5.0',  stars: 5,   label: 'Excellent Satisfaction',    color: '#059669', bg: '#d1fae5', starStr: '★★★★★' },
  { range: '4.25 – 4.74', stars: 4.5, label: 'Excellent Satisfaction',    color: '#059669', bg: '#d1fae5', starStr: '★★★★½' },
  { range: '3.75 – 4.24', stars: 4,   label: 'Good Satisfaction',         color: '#2563eb', bg: '#dbeafe', starStr: '★★★★☆' },
  { range: '3.25 – 3.74', stars: 3.5, label: 'Good Satisfaction',         color: '#2563eb', bg: '#dbeafe', starStr: '★★★½☆' },
  { range: '2.75 – 3.24', stars: 3,   label: 'Needs Attention',           color: '#d97706', bg: '#fef3c7', starStr: '★★★☆☆' },
  { range: '2.25 – 2.74', stars: 2.5, label: 'Needs Attention',           color: '#d97706', bg: '#fef3c7', starStr: '★★½☆☆' },
  { range: '1.75 – 2.24', stars: 2,   label: 'At Risk',                   color: '#ea580c', bg: '#ffedd5', starStr: '★★☆☆☆' },
  { range: '1.25 – 1.74', stars: 1.5, label: 'At Risk',                   color: '#ea580c', bg: '#ffedd5', starStr: '★½☆☆☆' },
  { range: '1.0 – 1.24',  stars: 1,   label: 'Critical Dissatisfaction',  color: '#dc2626', bg: '#fee2e2', starStr: '★☆☆☆☆' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function Section({
  icon, title, subtitle, children, defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2eaf0',
      borderRadius: 16,
      boxShadow: '0 2px 8px rgba(13,31,45,0.06)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #1b7fc4 0%, #0aada3 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0d1f2d' }}>{title}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>
        {open
          ? <ChevronUp style={{ width: 16, height: 16, color: '#94a3b8' }} />
          : <ChevronDown style={{ width: 16, height: 16, color: '#94a3b8' }} />
        }
      </button>
      {open && (
        <div style={{ padding: '0 24px 24px', animation: 'fadeIn 200ms ease both' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function StarDisplay({ stars }: { stars: number }) {
  const full = Math.floor(stars);
  const half = stars % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span style={{ letterSpacing: 2, fontSize: 16 }}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(empty)}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EvaluationGuide({ language }: Props) {
  const t = T[language];

  return (
    <div id="evaluation-guide-root" style={{ maxWidth: 960, margin: '0 auto', padding: '8px 0 48px' }}>

      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1f2d 0%, #132238 60%, #1b7fc4 100%)',
        borderRadius: 20, padding: '36px 40px', marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative blobs */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(10,173,163,0.12)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: '40%', width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(27,127,196,0.15)', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
          }}>
            <BookOpen style={{ width: 26, height: 26, color: '#7dd3fc' }} />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              {t.pageTitle}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
              {t.pageSubtitle}
            </p>
          </div>
        </div>

        {/* Formula pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 10, padding: '10px 18px', backdropFilter: 'blur(8px)',
        }}>
          <BarChart2 style={{ width: 15, height: 15, color: '#7dd3fc' }} />
          <code style={{ color: '#e0f2fe', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0 }}>
            {t.formulaEq}
          </code>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6, padding: '2px 10px', color: '#bae6fd', fontSize: 11, fontWeight: 600,
          }}>
            {t.versionLabel}: v1.0
          </span>
          <span style={{
            background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)',
            borderRadius: 6, padding: '2px 10px', color: '#6ee7b7', fontSize: 11, fontWeight: 600,
          }}>
            FHIR R4 Compatible
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Section 1: Formula ──────────────────────────────── */}
        <Section icon={<BarChart2 style={{ width: 20, height: 20, color: '#fff' }} />}
          title={t.sec1Title} subtitle={t.sec1Sub}>
          <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.7, marginBottom: 20 }}>
            {t.formulaDesc}
          </p>

          {/* Answer Value Map */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 10 }}>
              {t.ansScore}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {[
                { label: t.ansYes, value: '5', color: '#059669', bg: '#d1fae5' },
                { label: t.ansSometimes, value: '3', color: '#d97706', bg: '#fef3c7' },
                { label: t.ansNo, value: '1', color: '#dc2626', bg: '#fee2e2' },
                { label: t.ansNA, value: 'null', color: '#64748b', bg: '#f1f5f9' },
              ].map(item => (
                <div key={item.label} style={{
                  background: item.bg, border: `1px solid ${item.color}33`,
                  borderRadius: 10, padding: '10px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: '#0d1f2d' }}>{item.label}</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: item.color, fontFamily: 'JetBrains Mono, monospace' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Scale 1-5 visual */}
          <div style={{
            background: 'linear-gradient(90deg, #fee2e2 0%, #ffedd5 25%, #fef3c7 50%, #dbeafe 75%, #d1fae5 100%)',
            borderRadius: 10, height: 28, position: 'relative', border: '1px solid #e2eaf0',
          }}>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{
                position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                left: `${(n - 1) / 4 * 100}%`,
                marginLeft: n === 1 ? 12 : n === 5 ? -12 : 0,
                fontSize: 11, fontWeight: 700, color: '#0d1f2d',
              }}>{n}</div>
            ))}
          </div>
        </Section>

        {/* ── Section 2: Scale levels ─────────────────────────── */}
        <Section icon={<Star style={{ width: 20, height: 20, color: '#fff' }} />}
          title={t.sec2Title} subtitle={t.sec2Sub}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
              <thead>
                <tr>
                  {[t.scoreRange, t.stars, t.label, ''].map(h => (
                    <th key={h} style={{
                      padding: '4px 12px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: '#94a3b8',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCALE_LEVELS.map(lvl => (
                  <tr key={lvl.range} style={{ background: lvl.bg, borderRadius: 10 }}>
                    <td style={{ padding: '10px 12px', borderRadius: '10px 0 0 10px' }}>
                      <code style={{ fontSize: 12.5, fontWeight: 600, color: '#0d1f2d', fontFamily: 'JetBrains Mono, monospace' }}>
                        {lvl.range}
                      </code>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#f59e0b', fontSize: 16, letterSpacing: 2 }}>
                      <StarDisplay stars={lvl.stars} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontWeight: 700, fontSize: 12.5, color: lvl.color,
                      }}>{lvl.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', borderRadius: '0 10px 10px 0' }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: lvl.color, display: 'inline-block',
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Section 3: Questions ─────────────────────────────── */}
        <Section icon={<MessageSquare style={{ width: 20, height: 20, color: '#fff' }} />}
          title={t.sec3Title} subtitle={t.sec3Sub}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {QUESTIONS.map((q, idx) => {
              const typeColors: Record<string, { bg: string; color: string }> = {
                'scale':       { bg: '#dbeafe', color: '#1d4ed8' },
                'yes/no':      { bg: '#d1fae5', color: '#065f46' },
                'yes/no/na':   { bg: '#fef3c7', color: '#92400e' },
                'yes/no/maybe':{ bg: '#ede9fe', color: '#5b21b6' },
              };
              const tc = typeColors[q.type] || { bg: '#f1f5f9', color: '#475569' };
              return (
                <div key={q.id} style={{
                  display: 'grid', gridTemplateColumns: '48px 1fr 80px 80px',
                  alignItems: 'center', gap: 12,
                  background: idx % 2 === 0 ? '#f8fafd' : '#fff',
                  border: '1px solid #e2eaf0', borderRadius: 10, padding: '12px 16px',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'linear-gradient(135deg, #1b7fc4, #0aada3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>{q.id}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0d1f2d', lineHeight: 1.4 }}>
                      {language === 'es' ? q.es : q.en}
                    </div>
                    <code style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                      {q.field}
                    </code>
                  </div>
                  <div style={{
                    background: tc.bg, color: tc.color,
                    borderRadius: 6, padding: '3px 8px', fontSize: 10.5, fontWeight: 700,
                    textAlign: 'center', whiteSpace: 'nowrap',
                  }}>
                    {q.type}
                  </div>
                  <div style={{
                    background: '#1b7fc420', color: '#1b7fc4',
                    borderRadius: 6, padding: '3px 8px', fontSize: 13, fontWeight: 800,
                    textAlign: 'center',
                  }}>
                    {q.weight}
                  </div>
                </div>
              );
            })}

            {/* Open questions note */}
            <div style={{
              marginTop: 8, padding: '12px 16px', background: '#f0f7ff',
              border: '1px solid #bfdbfe', borderRadius: 10,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <Info style={{ width: 15, height: 15, color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>
                {language === 'es'
                  ? 'Q9 (¿Qué le gustó más?) y Q10 (¿Qué podría mejorar?) son preguntas abiertas. No contribuyen al score numérico pero sus textos son analizados para detectar palabras clave críticas que activan el Follow-up.'
                  : 'Q9 (What did you like most?) and Q10 (What could we improve?) are open-ended questions. They do not contribute to the numerical score, but their text is analyzed to detect critical keywords that trigger a Follow-up alert.'
                }
              </p>
            </div>
          </div>
        </Section>

        {/* ── Section 4: Follow-up Alerts ─────────────────────── */}
        <Section icon={<AlertTriangle style={{ width: 20, height: 20, color: '#fff' }} />}
          title={t.sec4Title} subtitle={t.sec4Sub}>

          <p style={{ fontSize: 13.5, fontWeight: 700, color: '#dc2626', marginBottom: 14 }}>
            {t.alertTitle}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[t.alert1, t.alert2, t.alert3, t.alert4, t.alert5, t.alert6].map((a, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: '#fff5f5', border: '1px solid #fecaca',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, background: '#dc2626',
                  color: '#fff', fontSize: 11, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>!</div>
                <span style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>{a}</span>
              </div>
            ))}
          </div>

          {/* Keywords */}
          <div style={{
            background: '#18181b', border: '1px solid #3f3f46',
            borderRadius: 12, padding: '16px 20px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f4f4f5', marginBottom: 10 }}>
              <Zap style={{ display: 'inline', width: 12, height: 12, marginRight: 6, color: '#fbbf24' }} />
              {t.keywords}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {t.keywordsList.split(' · ').map(kw => (
                <span key={kw} style={{
                  background: '#3f3f46', color: '#fbbf24', border: '1px solid #52525b',
                  borderRadius: 6, padding: '3px 10px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Section 5: Survey States ─────────────────────────── */}
        <Section icon={<CheckCircle2 style={{ width: 20, height: 20, color: '#fff' }} />}
          title={t.sec5Title} subtitle={t.sec5Sub}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { state: t.stateCompleted, calculates: true },
              { state: t.statePending,   calculates: false },
              { state: t.stateNoAnswer,  calculates: false },
              { state: t.stateCallBack,  calculates: false },
              { state: t.stateDeclined,  calculates: false },
              { state: t.stateInvalid,   calculates: false },
            ].map(row => (
              <div key={row.state} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 10,
                background: row.calculates ? '#d1fae5' : '#f8fafd',
                border: `1px solid ${row.calculates ? '#6ee7b7' : '#e2eaf0'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: row.calculates ? '#10b981' : '#94a3b8',
                  }} />
                  <span style={{
                    fontWeight: 700, fontSize: 13,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: row.calculates ? '#065f46' : '#475569',
                  }}>{row.state}</span>
                </div>
                <span style={{
                  fontSize: 12.5, fontWeight: 600,
                  color: row.calculates ? '#059669' : '#94a3b8',
                }}>
                  {row.calculates ? t.stateCalc : t.stateNoCalc}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Section 6: FHIR ──────────────────────────────────── */}
        <Section icon={<Shield style={{ width: 20, height: 20, color: '#fff' }} />}
          title={t.sec6Title} subtitle={t.sec6Sub} defaultOpen={false}>
          <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.7, marginBottom: 20 }}>
            {t.fhirDesc}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { name: t.fhirQR, desc: t.fhirQRDesc, icon: '📋', color: '#1d4ed8', bg: '#dbeafe' },
              { name: t.fhirObs, desc: t.fhirObsDesc, icon: '🔬', color: '#059669', bg: '#d1fae5' },
            ].map(r => (
              <div key={r.name} style={{
                background: r.bg, border: `1px solid ${r.color}40`,
                borderRadius: 12, padding: '18px 20px',
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{r.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 13, color: r.color, marginBottom: 6 }}>
                  {r.name}
                </div>
                <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 14, padding: '12px 16px',
            background: '#fefce8', border: '1px solid #fde047',
            borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <HelpCircle style={{ width: 15, height: 15, color: '#ca8a04', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12.5, color: '#854d0e', margin: 0, lineHeight: 1.6 }}>
              {t.fhirNote}
            </p>
          </div>
        </Section>

      </div>
    </div>
  );
}
