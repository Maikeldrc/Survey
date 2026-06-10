import { SurveyResponse, FHIRQuestionnaireResponse, FHIRObservation } from './types';

const weights: Record<string, number> = {
  Q1: 20,
  Q2: 15,
  Q3: 20,
  Q4: 12.5,
  Q5: 12.5,
  Q6: 10,
  Q7: 5,
  Q8: 5
};

const answersMap: Record<string, keyof SurveyResponse> = {
  Q1: 'OverallSatisfactionScore',
  Q2: 'HelpsManageHealth',
  Q3: 'CareManagerSatisfactionScore',
  Q4: 'ClearExplanation',
  Q5: 'FollowUpOnHealthNeeds',
  Q6: 'EasyCommunication',
  Q7: 'EasyToTakeMeasurements',
  Q8: 'WouldRecommendService'
};

export function mapAnswerToScore(questionId: string, answer: string | null | undefined): number | null {
  if (answer === null || answer === undefined) return null;

  const normalized = answer.trim();

  if (questionId === 'Q1' || questionId === 'Q3') {
    const value = Number(normalized);
    if (value >= 1 && value <= 5) return value;
    return null;
  }

  const lower = normalized.toLowerCase();

  // Yes / Sí / SÃ­ / Sï¿½ / Si -> 5
  if (lower === 'yes' || lower === 'sí' || lower === 'si' || lower === 'sã­' || lower === 'sï¿½') {
    return 5;
  }
  // Sometimes / A veces -> 3
  if (lower === 'sometimes' || lower === 'a veces') {
    return 3;
  }
  // A little / Un poco -> 3
  if (lower === 'a little' || lower === 'un poco') {
    return 3;
  }
  // Maybe / Tal vez / Tal vez -> 3
  if (lower === 'maybe' || lower === 'tal vez') {
    return 3;
  }
  // No -> 1
  if (lower === 'no') {
    return 1;
  }
  // Not applicable / No aplica -> null
  if (lower === 'not applicable' || lower === 'no aplica' || lower === 'n/a') {
    return null;
  }

  return null;
}

export function calculateGeneralSatisfaction(survey: Partial<SurveyResponse>) {
  if (survey.CallStatus !== 'Completed') {
    return {
      generalSatisfactionScore: null,
      generalSatisfactionStars: null,
      generalSatisfactionLabel: null
    };
  }

  let totalWeightedScore = 0;
  let totalApplicableWeight = 0;

  for (const questionId of Object.keys(weights)) {
    const fieldName = answersMap[questionId];
    const rawValue = survey[fieldName];
    const answerStr = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
    const answerScore = mapAnswerToScore(questionId, answerStr);

    if (answerScore !== null) {
      totalWeightedScore += answerScore * weights[questionId];
      totalApplicableWeight += weights[questionId];
    }
  }

  if (totalApplicableWeight === 0) {
    return {
      generalSatisfactionScore: null,
      generalSatisfactionStars: null,
      generalSatisfactionLabel: null
    };
  }

  const rawScore = totalWeightedScore / totalApplicableWeight;
  const finalScore = Math.round(rawScore * 10) / 10;

  return {
    generalSatisfactionScore: finalScore,
    generalSatisfactionStars: calculateStars(finalScore),
    generalSatisfactionLabel: classifySatisfaction(finalScore)
  };
}

export function calculateStars(score: number | null): number | null {
  if (score === null || score === undefined) return null;

  if (score >= 4.75) return 5;
  if (score >= 4.25) return 4.5;
  if (score >= 3.75) return 4;
  if (score >= 3.25) return 3.5;
  if (score >= 2.75) return 3;
  if (score >= 2.25) return 2.5;
  if (score >= 1.75) return 2;
  if (score >= 1.25) return 1.5;

  return 1;
}

export function classifySatisfaction(score: number | null): string | null {
  if (score === null || score === undefined) return null;

  if (score >= 4.5) return 'Excellent Satisfaction';
  if (score >= 3.8) return 'Good Satisfaction';
  if (score >= 3.0) return 'Needs Attention';
  if (score >= 2.0) return 'At Risk';

  return 'Critical Dissatisfaction';
}

export function detectFollowUpRequired(survey: Partial<SurveyResponse>) {
  const reasons: string[] = [];

  const q1 = Number(survey.OverallSatisfactionScore);
  const q3 = Number(survey.CareManagerSatisfactionScore);

  if (q1 && q1 <= 2) {
    reasons.push('Low overall service satisfaction');
  }

  if (q3 && q3 <= 2) {
    reasons.push('Low Care Manager satisfaction');
  }

  const q5Str = survey.FollowUpOnHealthNeeds ? String(survey.FollowUpOnHealthNeeds).trim() : '';
  if (q5Str === 'No') {
    reasons.push('Care Manager follow-up concern');
  }

  const q6Str = survey.EasyCommunication ? String(survey.EasyCommunication).trim() : '';
  if (q6Str === 'No') {
    reasons.push('Patient reports difficulty reaching Care Manager');
  }

  const q8Str = survey.WouldRecommendService ? String(survey.WouldRecommendService).trim() : '';
  if (q8Str === 'No') {
    reasons.push('Patient would not recommend the service');
  }

  const followUpVal = survey.FollowUpNeeded ? String(survey.FollowUpNeeded).trim() : '';
  if (followUpVal === 'Sí' || followUpVal === 'Yes') {
    reasons.push('Internal clinical follow-up was marked as required');
  }

  const criticalKeywords = [
    'urgent',
    'emergency',
    'medication',
    'no response',
    'bad service',
    'complaint',
    'problem',
    'device issue',
    'blood pressure',
    'glucose',
    'oxygen',
    'dizzy',
    'pain',
    'shortness of breath',
    'chest pain'
  ];

  const comments = [
    survey.WhatPatientLikesMost || '',
    survey.WhatCouldBeImproved || '',
    survey.InternalNotes || ''
  ].join(' ').toLowerCase();

  for (const keyword of criticalKeywords) {
    if (comments.includes(keyword)) {
      reasons.push(`Critical keyword detected: ${keyword}`);
    }
  }

  return {
    followUpRequired: reasons.length > 0,
    followUpReasons: reasons.join(', ')
  };
}

export function processSurveyEvaluation(survey: Partial<SurveyResponse>): Partial<SurveyResponse> {
  const satisfaction = calculateGeneralSatisfaction(survey);
  const followUp = detectFollowUpRequired(survey);

  return {
    ...survey,
    ...satisfaction,
    ...followUp,
    scoreCalculatedAt: new Date().toISOString(),
    scoreVersion: 'v1.0'
  };
}

// FHIR Alignment mappings
export function toFHIRQuestionnaireResponse(survey: SurveyResponse): FHIRQuestionnaireResponse {
  return {
    resourceType: 'QuestionnaireResponse',
    id: `qr-${survey.ResponseID}`,
    status: 'completed',
    subject: { reference: `Patient/${survey.PatientID}`, display: survey.PatientName },
    authored: survey.scoreCalculatedAt || new Date().toISOString(),
    author: { reference: `Practitioner/${survey.SurveyorName.replace(/\s+/g, '-')}`, display: survey.SurveyorName },
    item: [
      { linkId: 'Q1', text: 'Overall, how satisfied are you with the CCM/RPM service you receive?', answer: [{ valueInteger: survey.OverallSatisfactionScore }] },
      { linkId: 'Q2', text: 'Do you feel this service helps you manage your health better?', answer: [{ valueString: survey.HelpsManageHealth }] },
      { linkId: 'Q3', text: 'How satisfied are you with the care provided by your Care Manager?', answer: [{ valueInteger: survey.CareManagerSatisfactionScore }] },
      { linkId: 'Q4', text: 'Does your Care Manager explain information to you clearly and in an easy-to-understand way?', answer: [{ valueString: survey.ClearExplanation }] },
      { linkId: 'Q5', text: 'Do you feel your Care Manager follows up on your health needs?', answer: [{ valueString: survey.FollowUpOnHealthNeeds }] },
      { linkId: 'Q6', text: 'Is it easy to reach your Care Manager when you need help?', answer: [{ valueString: survey.EasyCommunication }] },
      { linkId: 'Q7', text: 'Do you find it easy to take your measurements?', answer: [{ valueString: survey.EasyToTakeMeasurements }] },
      { linkId: 'Q8', text: 'Would you recommend this service to another patient?', answer: [{ valueString: survey.WouldRecommendService }] },
      { linkId: 'Q9', text: 'What do you like most about the service?', answer: [{ valueString: survey.WhatPatientLikesMost }] },
      { linkId: 'Q10', text: 'What could we improve?', answer: [{ valueString: survey.WhatCouldBeImproved }] }
    ]
  };
}

export function toFHIRObservation(survey: SurveyResponse): FHIRObservation | null {
  if (survey.generalSatisfactionScore === null) return null;
  return {
    resourceType: 'Observation',
    id: `obs-satisfaction-${survey.ResponseID}`,
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'survey',
            display: 'Survey'
          }
        ]
      }
    ],
    code: { text: 'General Satisfaction Score' },
    subject: { reference: `Patient/${survey.PatientID}`, display: survey.PatientName },
    effectiveDateTime: survey.scoreCalculatedAt || new Date().toISOString(),
    valueDecimal: survey.generalSatisfactionScore,
    derivedFrom: [{ reference: `QuestionnaireResponse/qr-${survey.ResponseID}` }]
  };
}
