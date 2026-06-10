import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  User, 
  HelpCircle, 
  AlertCircle, 
  Compass, 
  CheckCircle2, 
  ArrowLeft, 
  ChevronRight,
  ChevronLeft,
  ThumbsUp, 
  Flag,
  FileText
} from 'lucide-react';
import { Patient, SurveyResponse, CallAttempt } from '../types';

interface SurveyFormProps {
  patient: Patient;
  surveyorName: string;
  onCancel: () => void;
  onSubmitSurvey: (response: Partial<SurveyResponse>, quickResult?: CallAttempt['CallResult']) => Promise<void>;
  isSaving: boolean;
  language?: 'es' | 'en';
}

// Translations dictionary for bilingual survey
const T = {
  es: {
    cancelAndBack: "Cancelar y volver al listado",
    activeSurvey: "Encuesta de Servicio",
    patient: "Paciente",
    mrn: "Ficha Médica (MRN)",
    phoneToCall: "Teléfono a Llamar",
    careManagerAndDoctor: "Care Manager / Médico",
    dr: "Dr.",
    openingScriptTitle: "GUION DE APERTURA (POR FAVOR LEER EN VOZ ALTA)",
    openingScriptText: (patientName: string, surveyorName: string, provider: string) => {
      return (
        <>
          “Buenos días/tardes, ¿hablo con <strong className="text-slate-800 not-italic font-bold">Sofía Al-Jamil</strong>? <br /><br />
          Mi nombre es <strong className="text-sky-700 not-italic font-bold">Sandra</strong>, llamo en nombre de la oficina del <strong className="text-slate-800 not-italic font-bold">Dr. Allison Cameron</strong> para conocer su opinión sobre el <strong className="text-sky-855 not-italic font-bold">Digital Care Management Service</strong> que recibe con su Care Manager. <br /><br />
          Esta encuesta es breve, toma aproximadamente 3 minutos. Sus respuestas nos ayudarán a mejorar el servicio. <br /><br />
          ¿Me permite hacerle unas preguntas?”
        </>
      );
    },
    closingScriptTitle: "GUION DE CIERRE (POR FAVOR LEER EN VOZ ALTA)",
    closingScriptText: (
      <>
        “Muchas gracias por su tiempo. Sus respuestas son muy importantes para mejorar la atención que recibe. <br /><br />
        Recuerde que si tiene una emergencia médica debe llamar al 911. <br /><br />
        Que tenga un excelente día.”
      </>
    ),
    callInProgress: (patientName: string, mrn: string) => (
      <>
        Llamada en progreso con <strong className="font-bold">{patientName}</strong> ({mrn}) • Registre las respuestas tal como las indica el paciente.
      </>
    ),
    stepConsentTitle: "¿El paciente acepta responder la encuesta?",
    stepConsentSubtitle: "Confirma el consentimiento verbal obligatorio antes de desbloquear el formulario clínico.",
    acceptConsent: "Sí, Acepta",
    declineConsent: "No, Rechazó",
    confirmDecline: "¿Confirmas que el paciente rechazó realizar la encuesta? Esto guardará su estado como 'Declinó' de forma permanente.",
    declineComment: "Paciente declinó la encuesta al iniciar la llamada.",
    declineInternalNotes: "Llamada cortada durante el guión de apertura.",
    
    // Part I
    part1Title: "PARTE I: Satisfacción General y Utilidad",
    q1Label: "1. En general, ¿qué tan satisfecho está con el servicio de CCM/RPM que recibe?",
    q1VeryDissatisfied: "Muy insatisfecho (1)",
    q1VerySatisfied: "Muy satisfecho (5)",
    q2Label: "2. ¿Siente que este servicio le ayuda a manejar mejor su salud?",
    q2Yes: "Sí",
    q2No: "No",
    q2Little: "Un poco",
    q3Label: "3. ¿Qué tan satisfecho está con la atención de su Care Manager?",
    q3VeryDissatisfied: "Muy insatisfecho (1)",
    q3VerySatisfied: "Muy satisfecho (5)",
    q4Label: "4. ¿Su Care Manager le explica la información de forma clara y fácil de entender?",
    q4Yes: "Sí",
    q4No: "No",
    q4Sometimes: "A veces",
    q5Label: "5. ¿Siente que su Care Manager le da seguimiento a sus necesidades de salud?",
    q5Yes: "Sí",
    q5No: "No",
    q5Sometimes: "A veces",
    
    // Part II
    part2Title: "PARTE II: Comunicación y Recomendación",
    q6Label: "6. ¿Es fácil comunicarse con su Care Manager cuando necesita ayuda?",
    q6Yes: "Sí",
    q6No: "No",
    q6Sometimes: "A veces",
    q7Label: "7. ¿Le resulta fácil tomar sus mediciones? (Glucometría, Presión, Oxígeno, etc.)",
    q7CCMHint: "Sugerido: N/A para CCM",
    q7Yes: "Sí",
    q7No: "No",
    q7Sometimes: "A veces",
    q7NA: "No aplica",
    q8Label: "8. ¿Recomendaría este servicio a otro paciente?",
    q8Yes: "Sí",
    q8No: "No",
    q8Maybe: "Tal vez",
    q9Label: "9. ¿Qué es lo que más le gusta del servicio?",
    q9Placeholder: "Escribe textualmente los comentarios del paciente...",
    q10Label: "10. ¿Qué podríamos mejorar?",
    q10Placeholder: "Escribe sugerencias de mejora recogidas del paciente...",
    
    // Part III
    part3Title: "PARTE III: Gestión Interna y Cierre",
    qFollowUpLabel: "¿Se requiere seguimiento clínico interno (Follow-up)?",
    qFollowUpDesc: "Marca 'Sí' de forma preventiva si el paciente reportó fallas severas en toma de signos, falta de medicamentos urgentes, o insatisfacción crítica para alertar al Care Manager de inmediato.",
    qFollowUpYes: "Sí",
    qFollowUpNo: "No",
    internalNotesLabel: "Notas Internas de Oficina del Encuestador (No se leen al paciente)",
    internalNotesPlaceholder: "Escribe observaciones operacionales (Ej. Voz un poco entrecortada, responde bien, etc.)",
    defaultInternalNotes: "Completada de manera regular.",
    
    // Validation
    valQ1: "Pregunta 1 es obligatoria (Satisfacción general).",
    valQ2: "Pregunta 2 es obligatoria (Ayuda a manejar salud).",
    valQ3: "Pregunta 3 es obligatoria (Satisfacción de Care Manager).",
    valQ4: "Pregunta 4 es obligatoria (Explicación clara).",
    valQ5: "Pregunta 5 es obligatoria (Seguimiento de necesidades).",
    valQ6: "Pregunta 6 es obligatoria (Facilidad para comunicarse).",
    valQ7: "Pregunta 7 es obligatoria (Facilidad para tomar mediciones).",
    valQ8: "Pregunta 8 es obligatoria (Recomendaría el servicio).",
    
    // Controls
    btnPrev: "Anterior",
    btnCancel: "Cancelar",
    btnNext: "Siguiente",
    btnSaving: "Guardando encuesta...",
    btnSaveFinish: "Guardar Encuesta y Finalizar",
  },
  en: {
    cancelAndBack: "Cancel and return to list",
    activeSurvey: "Service Survey",
    patient: "Patient",
    mrn: "Medical Record Number (MRN)",
    phoneToCall: "Phone to Call",
    careManagerAndDoctor: "Care Manager / Doctor",
    dr: "Dr.",
    openingScriptTitle: "OPENING SCRIPT (PLEASE READ ALOUD)",
    openingScriptText: (patientName: string, surveyorName: string, provider: string) => {
      return (
        <>
          “Good morning/afternoon, am I speaking with <strong className="text-slate-800 not-italic font-bold">Sofía Al-Jamil</strong>? <br /><br />
          My name is <strong className="text-sky-700 not-italic font-bold">Sandra</strong>, calling on behalf of <strong className="text-slate-800 not-italic font-bold">Dr. Allison Cameron</strong>’s office to hear your feedback on the <strong className="text-sky-850 not-italic font-bold">Digital Care Management Service</strong> you receive with your Care Manager. <br /><br />
          This survey is brief, taking about 3 minutes. Your responses will help us improve our service. <br /><br />
          May I ask you a few questions?”
        </>
      );
    },
    closingScriptTitle: "CLOSING SCRIPT (PLEASE READ ALOUD)",
    closingScriptText: (
      <>
        “Thank you very much for your time. Your answers are very important to help us improve the care you receive. <br /><br />
        Remember that if you have a medical emergency you should call 911. <br /><br />
        Have a wonderful day.”
      </>
    ),
    callInProgress: (patientName: string, mrn: string) => (
      <>
        Call in progress with <strong className="font-bold">{patientName}</strong> ({mrn}) • Record answers exactly as given by the patient.
      </>
    ),
    stepConsentTitle: "Does the patient accept to answer the survey?",
    stepConsentSubtitle: "Confirm required verbal consent before unlocking the clinical form.",
    acceptConsent: "Yes, Accepts",
    declineConsent: "No, Declined",
    confirmDecline: "Do you confirm the patient declined to take the survey? This will permanently save their status as 'Declined'.",
    declineComment: "Patient declined the survey at the start of the call.",
    declineInternalNotes: "Call dropped during the opening script.",
    
    // Part I
    part1Title: "PART I: General Satisfaction and Usefulness",
    q1Label: "1. Overall, how satisfied are you with the CCM/RPM service you receive?",
    q1VeryDissatisfied: "Very dissatisfied (1)",
    q1VerySatisfied: "Very satisfied (5)",
    q2Label: "2. Do you feel this service helps you manage your health better?",
    q2Yes: "Yes",
    q2No: "No",
    q2Little: "A little",
    q3Label: "3. How satisfied are you with the care provided by your Care Manager?",
    q3VeryDissatisfied: "Very dissatisfied (1)",
    q3VerySatisfied: "Very satisfied (5)",
    q4Label: "4. Does your Care Manager explain information to you clearly and in an easy-to-understand way?",
    q4Yes: "Yes",
    q4No: "No",
    q4Sometimes: "Sometimes",
    q5Label: "5. Do you feel your Care Manager follows up on your health needs?",
    q5Yes: "Yes",
    q5No: "No",
    q5Sometimes: "Sometimes",
    
    // Part II
    part2Title: "PART II: Communication and Recommendation",
    q6Label: "6. Is it easy to reach your Care Manager when you need help?",
    q6Yes: "Yes",
    q6No: "No",
    q6Sometimes: "Sometimes",
    q7Label: "7. Do you find it easy to take your measurements? (Blood Sugar, Blood Pressure, Oxygen, etc.)",
    q7CCMHint: "Suggested: N/A for CCM",
    q7Yes: "Yes",
    q7No: "No",
    q7Sometimes: "Sometimes",
    q7NA: "Not applicable",
    q8Label: "8. Would you recommend this service to another patient?",
    q8Yes: "Yes",
    q8No: "No",
    q8Maybe: "Maybe",
    q9Label: "9. What do you like most about the service?",
    q9Placeholder: "Type the patient's comments verbatim...",
    q10Label: "10. What could we improve?",
    q10Placeholder: "Type improvement suggestions collected from the patient...",
    
    // Part III
    part3Title: "PART III: Internal Management and Closure",
    qFollowUpLabel: "Is internal clinical follow-up required?",
    qFollowUpDesc: "Mark 'Yes' preventively if the patient reported severe issues with vital measurements, lack of urgent medications, or critical dissatisfaction to alert the Care Manager immediately.",
    qFollowUpYes: "Yes",
    qFollowUpNo: "No",
    internalNotesLabel: "Internal Surveyor Office Notes (Not read to the patient)",
    internalNotesPlaceholder: "Type operational observations (e.g., Voice is slightly broken, responds well, etc.)",
    defaultInternalNotes: "Completed regularly.",
    
    // Validation
    valQ1: "Question 1 is required (Overall satisfaction).",
    valQ2: "Question 2 is required (Helps manage health).",
    valQ3: "Question 3 is required (Care Manager satisfaction).",
    valQ4: "Question 4 is required (Clear explanation).",
    valQ5: "Question 5 is required (Follow-up on needs).",
    valQ6: "Question 6 is required (Ease of communication).",
    valQ7: "Question 7 is required (Ease of taking measurements).",
    valQ8: "Question 8 is required (Would recommend service).",
    
    // Controls
    btnPrev: "Previous",
    btnCancel: "Cancel",
    btnNext: "Next",
    btnSaving: "Saving survey...",
    btnSaveFinish: "Save Survey and Finish",
  }
};

export default function SurveyForm({ 
  patient, 
  surveyorName, 
  onCancel, 
  onSubmitSurvey, 
  isSaving,
  language = 'es'
}: SurveyFormProps) {
  // Survey Active Language State
  const [lang, setLang] = useState<'es' | 'en'>(language);

  useEffect(() => {
    setLang(language);
  }, [language]);

  // Survey State
  const [consentGiven, setConsentGiven] = useState<'unanswered' | 'yes' | 'no'>('unanswered');
  const [currentStep, setCurrentStep] = useState<number>(0); // 0: Consent, 1: Questions 1-5, 2: Questions 6-10, 3: Internal & Closure

  // Questions and Ratings state
  const [overallSatisfaction, setOverallSatisfaction] = useState<number | null>(null);
  const [helpsManage, setHelpsManage] = useState<'Sí' | 'No' | 'Un poco' | null>(null);
  const [careManagerSatisfaction, setCareManagerSatisfaction] = useState<number | null>(null);
  const [clearExplanation, setClearExplanation] = useState<'Sí' | 'No' | 'A veces' | null>(null);
  const [followUpOnNeeds, setFollowUpOnNeeds] = useState<'Sí' | 'No' | 'A veces' | null>(null);
  
  const [easyCommunication, setEasyCommunication] = useState<'Sí' | 'No' | 'A veces' | null>(null);
  const [easyToTakeMeasurements, setEasyToTakeMeasurements] = useState<'Sí' | 'No' | 'A veces' | 'No aplica' | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<'Sí' | 'No' | 'Tal vez' | null>(null);
  const [likesMost, setLikesMost] = useState<string>('');
  const [couldBeImproved, setCouldBeImproved] = useState<string>('');

  // Internal surveyor answers
  const [followUpNeeded, setFollowUpNeeded] = useState<'Sí' | 'No'>('No');
  const [internalNotes, setInternalNotes] = useState<string>('');

  // Validation feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  const currentT = T[lang];

  const handleConsentAnswer = (given: 'yes' | 'no') => {
    if (given === 'no') {
      setErrorMsg('');
      setShowDeclineModal(true);
    } else {
      setConsentGiven('yes');
      setCurrentStep(1);
    }
  };

  const handleConfirmDecline = async () => {
    setShowDeclineModal(false);
    setConsentGiven('no');
    const declinedResponse: Partial<SurveyResponse> = {
      OverallSatisfactionScore: 0,
      HelpsManageHealth: 'No',
      CareManagerSatisfactionScore: 0,
      ClearExplanation: 'No',
      FollowUpOnHealthNeeds: 'No',
      EasyCommunication: 'No',
      EasyToTakeMeasurements: 'No aplica',
      WouldRecommendService: 'No',
      WhatPatientLikesMost: currentT.declineComment,
      WhatCouldBeImproved: '',
      CallStatus: 'Declined' as const,
      FollowUpNeeded: 'No' as const,
      InternalNotes: currentT.declineInternalNotes
    };
    await onSubmitSurvey(declinedResponse, 'Declined');
  };

  const handleCancelDecline = () => {
    setShowDeclineModal(false);
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!overallSatisfaction) {
        setErrorMsg(currentT.valQ1);
        return;
      }
      if (!helpsManage) {
        setErrorMsg(currentT.valQ2);
        return;
      }
      if (!careManagerSatisfaction) {
        setErrorMsg(currentT.valQ3);
        return;
      }
      if (!clearExplanation) {
        setErrorMsg(currentT.valQ4);
        return;
      }
      if (!followUpOnNeeds) {
        setErrorMsg(currentT.valQ5);
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!easyCommunication) {
        setErrorMsg(currentT.valQ6);
        return;
      }
      if (!easyToTakeMeasurements) {
        setErrorMsg(currentT.valQ7);
        return;
      }
      if (!wouldRecommend) {
        setErrorMsg(currentT.valQ8);
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setCurrentStep(prev => prev - 1);
  };

  const handleFinishAndSave = async () => {
    setErrorMsg('');
    
    const finalResponse: Partial<SurveyResponse> = {
      OverallSatisfactionScore: overallSatisfaction || 3,
      HelpsManageHealth: helpsManage || 'No',
      CareManagerSatisfactionScore: careManagerSatisfaction || 3,
      ClearExplanation: clearExplanation || 'No',
      FollowUpOnHealthNeeds: followUpOnNeeds || 'No',
      EasyCommunication: easyCommunication || 'No',
      EasyToTakeMeasurements: easyToTakeMeasurements || 'No aplica',
      WouldRecommendService: wouldRecommend || 'No',
      WhatPatientLikesMost: likesMost.trim() || '—',
      WhatCouldBeImproved: couldBeImproved.trim() || '—',
      CallStatus: 'Completed' as const,
      FollowUpNeeded: followUpNeeded,
      InternalNotes: internalNotes.trim() || currentT.defaultInternalNotes
    };

    await onSubmitSurvey(finalResponse, 'Completed');
  };

  const renderActiveScript = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="bg-gradient-to-br from-sky-50 to-indigo-50/50 border border-sky-100 shadow-xs" id="opening-script-box" style={{ padding: '24px', borderRadius: '20px', lineHeight: '1.6' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-sky-100 rounded-lg text-sky-700">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-sky-700 block">
                {currentT.openingScriptTitle}
              </span>
            </div>
            <div className="text-slate-755 text-sm italic font-medium leading-relaxed font-sans border-t border-sky-100/50 pt-3">
              {currentT.openingScriptText(patient.PatientName, surveyorName, patient.Provider)}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 shadow-xs" id="closing-script-box" style={{ padding: '24px', borderRadius: '20px', lineHeight: '1.6' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700 block">
                {currentT.closingScriptTitle}
              </span>
            </div>
            <div className="text-emerald-900 text-sm italic font-medium leading-relaxed font-sans border-t border-emerald-150 pt-3">
              {currentT.closingScriptText}
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-gradient-to-br from-slate-50 to-sky-50/30 border border-slate-200/60 flex items-center gap-3.5 shadow-xs" id="ongoing-script-banner" style={{ padding: '24px', borderRadius: '20px', lineHeight: '1.6' }}>
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shrink-0 animate-bounce">
              <Phone className="w-4 h-4" />
            </div>
            <div className="text-slate-705 text-[11px] font-medium leading-normal">
              {currentT.callInProgress(patient.PatientName, patient.MRN)}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="survey-shell space-y-6" id="survey-form-root">

      {/* ── Top Header Bar: Patient info + controls ───────────── */}
      <div 
        className="w-full bg-white border border-[#e4eaf4] rounded-2xl shadow-sm flex items-center justify-between" 
        id="survey-toolbar-card"
        style={{ padding: '8px 20px', boxSizing: 'border-box' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{currentT.cancelAndBack}</span>
          </button>
          <span className="h-4 w-px bg-slate-200"></span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-800 tracking-wide">
              {currentT.activeSurvey}
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-sky-850 bg-sky-50 rounded border border-sky-100">
              {patient.ServiceType}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Active Call</span>
            </span>
          </div>
        </div>

        {/* ES / EN Segmented selector */}
        <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200" style={{ height: '36px', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setLang('es')}
            className="text-xs font-bold rounded-lg transition-all cursor-pointer"
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 14px',
              background: lang === 'es' ? '#ffffff' : 'transparent',
              color: lang === 'es' ? '#1B6FD9' : '#64748b',
              boxShadow: lang === 'es' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              border: 'none',
            }}
          >
            ES
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className="text-xs font-bold rounded-lg transition-all cursor-pointer"
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 14px',
              background: lang === 'en' ? '#ffffff' : 'transparent',
              color: lang === 'en' ? '#1B6FD9' : '#64748b',
              boxShadow: lang === 'en' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              border: 'none',
            }}
          >
            EN
          </button>
        </div>
      </div>

      {/* ── Patient details card ─────────────────────────── */}
      <div 
        className="w-full bg-white border border-[#e4eaf4] shadow-sm" 
        id="patient-summary-card"
        style={{ 
          padding: '10px 20px', 
          borderRadius: '18px', 
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: '1.1fr 1.1fr 1.1fr 1.3fr',
          gap: '32px',
          alignItems: 'center'
        }}
      >
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 m-0">{currentT.patient.toUpperCase()}</p>
          <p className="font-extrabold text-slate-800 text-sm leading-tight m-0">{patient.PatientName}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 m-0">{currentT.mrn.toUpperCase()}</p>
          <p className="font-mono text-slate-700 font-bold text-sm bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100 inline-block m-0">{patient.MRN}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 m-0">{currentT.phoneToCall.toUpperCase()}</p>
          <p className="font-mono font-bold text-sky-650 text-sm flex items-center gap-1.5 m-0">
            <span className="p-1 bg-sky-50 rounded-full border border-sky-100 text-sky-600"><Phone className="w-3 h-3 shrink-0" /></span>
            <span>{patient.PhoneNumber}</span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 m-0">CARE MANAGER / DOCTOR</p>
          <p className="font-bold text-slate-800 leading-snug m-0">
            {patient.CareManager}
            <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
              {patient.Provider.toLowerCase().startsWith('dr.') ? '' : `${currentT.dr} `}
              {patient.Provider}
            </span>
          </p>
        </div>
      </div>

      {/* ── Two-column main layout ────────────────────────────── */}
      <div className="survey-layout">

        {/* Left sidebar: script + step progress */}
        <div className="hidden lg:flex flex-col gap-6 shrink-0 w-full">
          {/* Script reader */}
          {renderActiveScript()}

          {/* Step progress */}
          <div className="bg-white border border-[#e4eaf4] shadow-sm" style={{ padding: '16px', borderRadius: '20px', boxSizing: 'border-box' }}>
            <p className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 mb-4 px-1">{lang === 'es' ? 'PROGRESO' : 'PROGRESS'}</p>
            <div className="flex flex-col" style={{ gap: '8px' }}>
              {[
                { es: 'Consentimiento verbal', en: 'Verbal Consent' },
                { es: 'Satisfacción y Utilidad', en: 'Satisfaction & Usefulness' },
                { es: 'Comunicación y Recomendación', en: 'Communication & Recommendation' },
                { es: 'Gestión Interna y Cierre', en: 'Internal Notes & Closure' }
              ].map((step, stepIdx) => {
                const label = lang === 'es' ? step.es : step.en;
                const isActive = currentStep === stepIdx;
                const isDone = currentStep > stepIdx;
                
                const itemStyle: React.CSSProperties = {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '6px 16px',
                  borderRadius: '12px',
                  border: '1px solid',
                  minHeight: '38px',
                  boxSizing: 'border-box',
                  fontSize: '12px',
                  fontWeight: '700',
                  transition: 'all 150ms ease',
                  ...(isActive ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af', boxShadow: '0 1px 3px rgba(30,64,175,0.05)' } :
                      isDone ? { background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' } :
                      { background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' })
                };

                const circleStyle: React.CSSProperties = {
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '800',
                  flexShrink: 0,
                  transition: 'all 150ms ease',
                  ...(isActive ? { background: '#1B6FD9', color: '#ffffff', boxShadow: '0 2px 6px rgba(27,111,217,0.2)' } :
                      isDone ? { background: '#10b981', color: '#ffffff' } :
                      { background: '#ffffff', border: '1px solid #cbd5e1', color: '#64748b' })
                };

                return (
                  <div key={stepIdx} style={itemStyle}>
                    <div style={circleStyle}>{isDone ? '✓' : stepIdx + 1}</div>
                    <span className="tracking-wide">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile: script + step bubbles (shown below lg) */}
        <div className="flex lg:hidden flex-col gap-6 w-full mb-2">
          {renderActiveScript()}
          <div className="flex justify-center items-center gap-2 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm" id="survey-steps-mobile">
            {[0, 1, 2, 3].map((stepIdx) => {
              const isActive = currentStep === stepIdx;
              const isDone = currentStep > stepIdx;
              return (
                <React.Fragment key={stepIdx}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition border-2 ${
                    isActive ? 'bg-sky-600 border-sky-600 text-white shadow-sm ring-2 ring-sky-100' :
                    isDone  ? 'bg-emerald-100 border-emerald-500 text-emerald-700' :
                              'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {stepIdx + 1}
                  </div>
                  {stepIdx < 3 && (
                    <div className={`flex-1 h-0.5 ${isDone ? 'bg-emerald-400' : 'bg-gray-200'}`} style={{ maxWidth: '40px' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Main interactive Form questionnaire body */}
        <div className="form-card bg-white border border-slate-200/80 shadow-sm">
        
        {/* Step 0: Consent Check screen */}
        {currentStep === 0 && (
          <div className="text-center py-8 px-6 w-full flex flex-col items-center" id="step-consent-container" style={{ gap: '24px' }}>
            <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center border border-sky-100 text-sky-500 shadow-xs">
              <HelpCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2.5xl font-extrabold text-slate-800 tracking-tight leading-snug m-0">
                {currentT.stepConsentTitle}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-lg mx-auto m-0">
                {currentT.stepConsentSubtitle}
              </p>
            </div>
 
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg" id="consent-buttons">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleConsentAnswer('yes')}
                className="text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  minHeight: '48px',
                  padding: '0 24px',
                  background: '#1B6FD9',
                  border: 'none',
                }}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{currentT.acceptConsent}</span>
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleConsentAnswer('no')}
                className="text-rose-700 border border-rose-200 bg-rose-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  minHeight: '48px',
                  padding: '0 24px',
                }}
              >
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>{currentT.declineConsent}</span>
              </button>
            </div>
          </div>
        )}
 
        {/* Step 1: Questions 1-5 */}
        {currentStep === 1 && (
          <div className="animate-fadeIn flex flex-col" id="questions-group-1" style={{ gap: '20px' }}>
            <div className="border-b border-slate-100 pb-4" style={{ marginBottom: '24px' }}>
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2.5 m-0">
                <Compass className="w-5 h-5 text-sky-600" /> 
                <span>{currentT.part1Title}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium m-0">
                {lang === 'es' ? 'Responda cada pregunta seleccionando una de las opciones.' : 'Answer each question by selecting one of the options.'}
              </p>
            </div>
 
            {/* Q1: Overall satisfaction (1-5 scale) */}
            <div className="flex flex-col" style={{ gap: '12px' }} id="q-overall">
              <label className="block font-bold text-slate-800 leading-normal text-sm">
                {currentT.q1Label}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <div className="flex flex-col" style={{ gap: '8px' }}>
                <div className="rating-row" id="rating-1">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = overallSatisfaction === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setOverallSatisfaction(val)}
                        style={{
                          minHeight: '38px',
                          padding: '6px 16px',
                          borderRadius: '16px',
                          border: isSelected ? '1px solid #1B6FD9' : '1px solid #e2e8f0',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 150ms ease',
                          background: isSelected ? '#1B6FD9' : '#f8fafc',
                          color: isSelected ? '#ffffff' : '#475569',
                          boxShadow: isSelected ? '0 4px 12px rgba(27,111,217,0.2)' : 'none',
                        }}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>{currentT.q1VeryDissatisfied}</span>
                  <span className="flex items-center gap-1">{currentT.q1VerySatisfied}<span className="w-1.5 h-1.5 rounded-full bg-sky-300"></span></span>
                </div>
              </div>
            </div>
 
            {/* Q2: Helps manage health */}
            <div className="flex flex-col" style={{ gap: '12px' }} id="q-helps">
              <label className="block font-bold text-slate-800 leading-normal text-sm">
                {currentT.q2Label}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <div className="answer-row">
                {[
                  { val: 'Sí', eng: currentT.q2Yes },
                  { val: 'No', eng: currentT.q2No },
                  { val: 'Un poco', eng: currentT.q2Little }
                ].map(({ val, eng }) => {
                  const isSelected = helpsManage === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setHelpsManage(val as any)}
                      style={{
                        minHeight: '38px',
                        padding: '6px 16px',
                        borderRadius: '16px',
                        border: isSelected ? '1px solid #1B6FD9' : '1px solid #e2e8f0',
                        fontSize: '13px',
                        fontWeight: '750',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 150ms ease',
                        background: isSelected ? '#1B6FD9' : '#f8fafc',
                        color: isSelected ? '#ffffff' : '#475569',
                        boxShadow: isSelected ? '0 4px 12px rgba(27,111,217,0.2)' : 'none',
                      }}
                    >
                      {eng}
                    </button>
                  );
                })}
              </div>
            </div>
 
            {/* Q3: Care Manager satisfaction (1-5 scale) */}
            <div className="flex flex-col" style={{ gap: '12px' }} id="q-cm-sat">
              <label className="block font-bold text-slate-800 leading-normal text-sm">
                {currentT.q3Label}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <div className="flex flex-col" style={{ gap: '8px' }}>
                <div className="rating-row" id="rating-3">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = careManagerSatisfaction === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCareManagerSatisfaction(val)}
                        style={{
                          minHeight: '38px',
                          padding: '6px 16px',
                          borderRadius: '16px',
                          border: isSelected ? '1px solid #1B6FD9' : '1px solid #e2e8f0',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 150ms ease',
                          background: isSelected ? '#1B6FD9' : '#f8fafc',
                          color: isSelected ? '#ffffff' : '#475569',
                          boxShadow: isSelected ? '0 4px 12px rgba(27,111,217,0.2)' : 'none',
                        }}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>{currentT.q3VeryDissatisfied}</span>
                  <span className="flex items-center gap-1">{currentT.q3VerySatisfied}<span className="w-1.5 h-1.5 rounded-full bg-sky-300"></span></span>
                </div>
              </div>
            </div>
 
            {/* Q4: Clear explanations */}
            <div className="flex flex-col" style={{ gap: '12px' }} id="q-clear-exp">
              <label className="block font-bold text-slate-800 leading-normal text-sm">
                {currentT.q4Label}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <div className="answer-row">
                {[
                  { val: 'Sí', eng: currentT.q4Yes },
                  { val: 'No', eng: currentT.q4No },
                  { val: 'A veces', eng: currentT.q4Sometimes }
                ].map(({ val, eng }) => {
                  const isSelected = clearExplanation === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setClearExplanation(val as any)}
                      style={{
                        minHeight: '38px',
                        padding: '6px 16px',
                        borderRadius: '16px',
                        border: isSelected ? '1px solid #1B6FD9' : '1px solid #e2e8f0',
                        fontSize: '13px',
                        fontWeight: '750',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 150ms ease',
                        background: isSelected ? '#1B6FD9' : '#f8fafc',
                        color: isSelected ? '#ffffff' : '#475569',
                        boxShadow: isSelected ? '0 4px 12px rgba(27,111,217,0.2)' : 'none',
                      }}
                    >
                      {eng}
                    </button>
                  );
                })}
              </div>
            </div>
 
            {/* Q5: Follow-up on health needs */}
            <div className="flex flex-col" style={{ gap: '12px' }} id="q-follow-up">
              <label className="block font-bold text-slate-800 leading-normal text-sm">
                {currentT.q5Label}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <div className="answer-row">
                {[
                  { val: 'Sí', eng: currentT.q5Yes },
                  { val: 'No', eng: currentT.q5No },
                  { val: 'A veces', eng: currentT.q5Sometimes }
                ].map(({ val, eng }) => {
                  const isSelected = followUpOnNeeds === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFollowUpOnNeeds(val as any)}
                      style={{
                        minHeight: '38px',
                        padding: '6px 16px',
                        borderRadius: '16px',
                        border: isSelected ? '1px solid #1B6FD9' : '1px solid #e2e8f0',
                        fontSize: '13px',
                        fontWeight: '750',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 150ms ease',
                        background: isSelected ? '#1B6FD9' : '#f8fafc',
                        color: isSelected ? '#ffffff' : '#475569',
                        boxShadow: isSelected ? '0 4px 12px rgba(27,111,217,0.2)' : 'none',
                      }}
                    >
                      {eng}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
 
        {/* Step 2: Questions 6-10 */}
        {currentStep === 2 && (
          <div className="animate-fadeIn flex flex-col" id="questions-group-2" style={{ gap: '20px' }}>
            <div className="border-b border-slate-100 pb-4" style={{ marginBottom: '24px' }}>
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2.5 m-0">
                <ThumbsUp className="w-5 h-5 text-sky-600" /> 
                <span>{currentT.part2Title}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium m-0">
                {lang === 'es' ? 'Responda cada pregunta seleccionando una de las opciones.' : 'Answer each question by selecting one of the options.'}
              </p>
            </div>
 
            {/* Q6: Easy communication */}
            <div className="flex flex-col" style={{ gap: '12px' }} id="q-easy-comm">
              <label className="block font-bold text-slate-800 leading-normal text-sm">
                {currentT.q6Label}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <div className="answer-row">
                {[
                  { val: 'Sí', eng: currentT.q6Yes },
                  { val: 'No', eng: currentT.q6No },
                  { val: 'A veces', eng: currentT.q6Sometimes }
                ].map(({ val, eng }) => {
                  const isSelected = easyCommunication === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEasyCommunication(val as any)}
                      style={{
                        minHeight: '38px',
                        padding: '6px 16px',
                        borderRadius: '16px',
                        border: isSelected ? '1px solid #1B6FD9' : '1px solid #e2e8f0',
                        fontSize: '13px',
                        fontWeight: '750',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 150ms ease',
                        background: isSelected ? '#1B6FD9' : '#f8fafc',
                        color: isSelected ? '#ffffff' : '#475569',
                        boxShadow: isSelected ? '0 4px 12px rgba(27,111,217,0.2)' : 'none',
                      }}
                    >
                      {eng}
                    </button>
                  );
                })}
              </div>
            </div>
 
            {/* Q7: Easy to take measurements */}
            <div className="flex flex-col" style={{ gap: '12px' }} id="q-measurements">
              <div className="flex justify-between items-center w-full">
                <label className="block font-bold text-slate-800 leading-normal text-sm m-0">
                  {currentT.q7Label}
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                {patient.ServiceType.includes('CCM') && (
                  <span className="text-[10px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1 font-bold border border-amber-200 m-0">
                    {currentT.q7CCMHint}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
                {[
                  { val: 'Sí', eng: currentT.q7Yes },
                  { val: 'No', eng: currentT.q7No },
                  { val: 'A veces', eng: currentT.q7Sometimes },
                  { val: 'No aplica', eng: currentT.q7NA }
                ].map(({ val, eng }) => {
                  const isSelected = easyToTakeMeasurements === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEasyToTakeMeasurements(val as any)}
                      style={{
                        minHeight: '38px',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        border: isSelected ? '1px solid #1B6FD9' : '1px solid #e2e8f0',
                        fontSize: '13px',
                        fontWeight: '750',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 150ms ease',
                        background: isSelected ? '#1B6FD9' : '#f8fafc',
                        color: isSelected ? '#ffffff' : '#475569',
                        boxShadow: isSelected ? '0 4px 12px rgba(27,111,217,0.2)' : 'none',
                      }}
                    >
                      {eng}
                    </button>
                  );
                })}
              </div>
            </div>
 
            {/* Q8: Would recommend */}
            <div className="flex flex-col" style={{ gap: '12px' }} id="q-recommend">
              <label className="block font-bold text-slate-800 leading-normal text-sm">
                {currentT.q8Label}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <div className="answer-row">
                {[
                  { val: 'Sí', eng: currentT.q8Yes },
                  { val: 'No', eng: currentT.q8No },
                  { val: 'Tal vez', eng: currentT.q8Maybe }
                ].map(({ val, eng }) => {
                  const isSelected = wouldRecommend === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setWouldRecommend(val as any)}
                      style={{
                        minHeight: '38px',
                        padding: '6px 16px',
                        borderRadius: '16px',
                        border: isSelected ? '1px solid #1B6FD9' : '1px solid #e2e8f0',
                        fontSize: '13px',
                        fontWeight: '750',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 150ms ease',
                        background: isSelected ? '#1B6FD9' : '#f8fafc',
                        color: isSelected ? '#ffffff' : '#475569',
                        boxShadow: isSelected ? '0 4px 12px rgba(27,111,217,0.2)' : 'none',
                      }}
                    >
                      {eng}
                    </button>
                  );
                })}
              </div>
            </div>
 
            {/* Q9: What likes most */}
            <div className="flex flex-col" style={{ gap: '12px' }} id="q-likes">
              <label className="block font-bold text-slate-800 text-sm">
                {currentT.q9Label}
              </label>
              <textarea
                value={likesMost}
                onChange={(e) => setLikesMost(e.target.value)}
                rows={3}
                placeholder={currentT.q9Placeholder}
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  borderRadius: '16px',
                  minHeight: '110px',
                  border: '1px solid #e2eaf4',
                  background: '#f8fafc',
                  fontSize: '13px',
                  color: '#334155',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease'
                }}
              />
            </div>
 
            {/* Q10: What could be improved */}
            <div className="flex flex-col" style={{ gap: '12px' }} id="q-improved">
              <label className="block font-bold text-slate-800 text-sm">
                {currentT.q10Label}
              </label>
              <textarea
                value={couldBeImproved}
                onChange={(e) => setCouldBeImproved(e.target.value)}
                rows={3}
                placeholder={currentT.q10Placeholder}
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  borderRadius: '16px',
                  minHeight: '110px',
                  border: '1px solid #e2eaf4',
                  background: '#f8fafc',
                  fontSize: '13px',
                  color: '#334155',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease'
                }}
              />
            </div>
          </div>
        )}
 
        {/* Step 3: Internal Notes & Closure */}
        {currentStep === 3 && (
          <div className="animate-fadeIn flex flex-col" id="survey-completion-notes" style={{ gap: '20px' }}>
            <div className="border-b border-slate-100 pb-4" style={{ marginBottom: '24px' }}>
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2.5 m-0">
                <FileText className="w-5 h-5 text-sky-600" /> 
                <span>{currentT.part3Title}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium m-0">
                {lang === 'es' ? 'Complete las observaciones operacionales finales.' : 'Complete the final operational observations.'}
              </p>
            </div>
 
            {/* Internal Flag for FollowUp needed */}
            <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-5 flex flex-col" style={{ gap: '16px' }} id="internal-alert-needed">
              <div className="flex gap-2.5 items-center text-amber-900">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700">
                  <Flag className="w-4 h-4 shrink-0" />
                </div>
                <span className="font-extrabold text-sm m-0">{currentT.qFollowUpLabel}</span>
              </div>
              
              <p className="text-[11px] text-amber-800 font-medium leading-relaxed m-0">
                {currentT.qFollowUpDesc}
              </p>
 
              <div className="flex gap-3 max-w-md pt-1">
                {[
                  { val: 'Sí', eng: currentT.qFollowUpYes },
                  { val: 'No', eng: currentT.qFollowUpNo }
                ].map(({ val, eng }) => {
                  const isSelected = followUpNeeded === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFollowUpNeeded(val as any)}
                      style={{
                        minHeight: '36px',
                        padding: '6px 16px',
                        borderRadius: '12px',
                        border: isSelected ? '1px solid #d97706' : '1px solid #f59e0b',
                        fontSize: '13px',
                        fontWeight: '750',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 150ms ease',
                        background: isSelected ? '#d97706' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#b45309',
                        boxShadow: isSelected ? '0 4px 12px rgba(217,119,6,0.2)' : 'none',
                        flex: 1
                      }}
                    >
                      {eng}
                    </button>
                  );
                })}
              </div>
            </div>
 
            {/* Surveyor Internal Notes */}
            <div className="flex flex-col" style={{ gap: '12px' }} id="surveyor-notes-box">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {currentT.internalNotesLabel}
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                placeholder={currentT.internalNotesPlaceholder}
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  borderRadius: '16px',
                  minHeight: '110px',
                  border: '1px solid #e2eaf4',
                  background: '#f8fafc',
                  fontSize: '13px',
                  color: '#334155',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease'
                }}
              />
            </div>
          </div>
        )}
 
        {/* Validation errors */}
        {errorMsg && (
          <div className="mt-6 p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs flex items-center gap-2.5 animate-pulse" id="form-error">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
        )}
 
        {/* Bottom Control buttons */}
        <div 
          className="mt-8 pt-6 border-t border-slate-100 flex justify-between gap-4" 
          id="form-nav-buttons"
          style={{ borderTop: '1px solid #e4eaf4', paddingTop: '18px', display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '32px' }}
        >
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="transition-all cursor-pointer font-bold text-xs"
              style={{
                minHeight: '44px',
                padding: '0 24px',
                borderRadius: '12px',
                border: '1px solid #dde3ef',
                background: '#ffffff',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ChevronLeft className="w-4 h-4" /> {currentT.btnPrev}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="transition-all cursor-pointer font-bold text-xs"
              style={{
                minHeight: '44px',
                padding: '0 24px',
                borderRadius: '12px',
                border: '1px solid #dde3ef',
                background: '#ffffff',
                color: '#5a6b82',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {currentT.btnCancel}
            </button>
          )}
 
          {currentStep < 3 ? (
            currentStep > 0 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="text-white transition-all shadow-md hover:shadow-lg cursor-pointer font-bold text-xs"
                style={{
                  minHeight: '44px',
                  padding: '0 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#1B6FD9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(27,111,217,0.2)',
                }}
              >
                <span>{currentT.btnNext}</span> 
                <ChevronRight className="w-4 h-4" />
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinishAndSave}
              className="text-white transition-all shadow-md hover:shadow-lg cursor-pointer disabled:bg-sky-400 font-bold text-xs animate-fadeIn"
              style={{
                minHeight: '44px',
                padding: '0 24px',
                borderRadius: '12px',
                border: 'none',
                background: '#1B6FD9',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(27,111,217,0.2)',
              }}
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
                  <span>{currentT.btnSaving}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> 
                  <span>{currentT.btnSaveFinish}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      </div>

      {/* ── Decline Confirmation Modal ──────────────────────── */}
      {showDeclineModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="bg-white w-full max-w-md animate-slideUp"
            style={{
              borderRadius: '20px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
              border: '1px solid #fecaca',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #fff1f2 0%, #fff 100%)',
              borderBottom: '1px solid #fecaca',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: '#fee2e2', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <AlertCircle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>
                  {lang === 'es' ? 'Confirmar Rechazo de Encuesta' : 'Confirm Survey Decline'}
                </p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 }}>
                  {lang === 'es' ? 'Esta acción es permanente' : 'This action is permanent'}
                </p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 24px 20px' }}>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 }}>
                {currentT.confirmDecline}
              </p>
              <div style={{
                marginTop: 16,
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <Flag className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                <p style={{ fontSize: 11, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                  {lang === 'es'
                    ? 'El estado del paciente quedará registrado como "Declinó" en el sistema.'
                    : "The patient's status will be permanently recorded as 'Declined' in the system."}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              padding: '0 24px 24px',
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={handleCancelDecline}
                disabled={isSaving}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                disabled={isSaving}
                style={{
                  padding: '10px 24px',
                  borderRadius: 12,
                  border: 'none',
                  background: isSaving ? '#fca5a5' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  boxShadow: '0 4px 14px rgba(239,68,68,0.30)',
                  transition: 'all 150ms ease',
                }}
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    {lang === 'es' ? 'Guardando...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {lang === 'es' ? 'Sí, Confirmar Rechazo' : 'Yes, Confirm Decline'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
