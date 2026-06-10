export type ServiceType = 'CCM' | 'RPM' | 'CCM/RPM';

export interface Patient {
  PatientID: string;
  MRN: string;
  PatientName: string;
  PhoneNumber: string;
  CareManager: string;
  Provider: string;
  ServiceType: ServiceType;
  Status: 'Pending' | 'Completed' | 'No Answer' | 'Declined' | 'Call Back' | 'Invalid Phone';
  LastSurveyDate: string;
  Notes: string;
  // Temporary index in spreadsheet row for updates (1-based, adjusted for headers)
  sheetRowIndex?: number;
}

export interface SurveyResponse {
  ResponseID: string;
  SurveyDate: string;
  SurveyTime: string;
  SurveyorName: string;
  Provider: string;
  MRN: string;
  PatientID: string;
  PatientName: string;
  PhoneNumber: string;
  CareManager: string;
  ServiceType: ServiceType;
  OverallSatisfactionScore: number; // 1-5
  HelpsManageHealth: 'Sí' | 'No' | 'Un poco';
  CareManagerSatisfactionScore: number; // 1-5
  ClearExplanation: 'Sí' | 'No' | 'A veces';
  FollowUpOnHealthNeeds: 'Sí' | 'No' | 'A veces';
  EasyCommunication: 'Sí' | 'No' | 'A veces';
  EasyToTakeMeasurements: 'Sí' | 'No' | 'A veces' | 'No aplica';
  WouldRecommendService: 'Sí' | 'No' | 'Tal vez';
  WhatPatientLikesMost: string;
  WhatCouldBeImproved: string;
  CallStatus: 'Completed' | 'Declined';
  FollowUpNeeded: 'Sí' | 'No';
  InternalNotes: string;
}

export interface CallAttempt {
  AttemptID: string;
  Date: string;
  Time: string;
  SurveyorName: string;
  Provider: string;
  MRN: string;
  PatientName: string;
  PhoneNumber: string;
  CareManager: string;
  CallResult: 'Completed' | 'No Answer' | 'Declined' | 'Call Back' | 'Invalid Phone';
  Notes: string;
}

// FHIR Resource Mappings for Patient Surveys
export interface FHIRIdentifier {
  use?: string;
  system?: string;
  value: string;
}

export interface FHIRReference {
  reference: string;
  display?: string;
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier: FHIRIdentifier[];
  active: boolean;
  name: [{
    use?: string;
    text: string;
    family?: string;
    given?: string[];
  }];
  telecom: [{
    system: 'phone';
    value: string;
    use?: string;
  }];
}

export interface FHIRQuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  id: string;
  status: 'completed' | 'in-progress' | 'stopped';
  subject: FHIRReference; // Link to Patient
  authored: string; // ISO date-time
  author: FHIRReference; // Link to Practitioner/Surveyor
  item: Array<{
    linkId: string;
    text: string;
    answer: Array<{
      valueInteger?: number;
      valueString?: string;
      valueBoolean?: boolean;
    }>;
  }>;
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id: string;
  status: 'final';
  category: Array<{
    coding: Array<{
      system: 'http://terminology.hl7.org/CodeSystem/observation-category';
      code: 'survey';
      display: 'Survey';
    }>;
  }>;
  code: {
    text: string;
  };
  subject: FHIRReference;
  effectiveDateTime: string;
  valueInteger?: number;
  valueString?: string;
}

export interface FHIRTask {
  resourceType: 'Task';
  id: string;
  status: 'requested' | 'ready' | 'completed' | 'cancelled';
  intent: 'order';
  code: {
    text: string;
  };
  description?: string;
  focus?: FHIRReference;
  for: FHIRReference; // Link to Patient
  authoredOn: string;
  note?: Array<{ text: string }>;
}
