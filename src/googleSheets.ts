import { Patient, SurveyResponse, CallAttempt } from './types';
import { INITIAL_PATIENTS } from './data';

const LOCAL_STORAGE_KEY_TOKEN = 'ps_survey_oauth_token';
const LOCAL_STORAGE_KEY_SPREADSHEET_ID = 'ps_survey_spreadsheet_id';
const LOCAL_STORAGE_KEY_CLIENT_ID = 'ps_survey_client_id';

// Token in-memory cache as requested by the guidelines
let inMemoryToken: string | null = null;

function normalizeServiceType(value: unknown): Patient['ServiceType'] {
  const normalized = String(value || '').toUpperCase().replace(/\s+/g, '');
  if (normalized === 'RPM') return 'RPM';
  if (normalized === 'CCM/RPM' || normalized === 'RPM/CCM' || normalized === 'CCM+RPM') return 'CCM/RPM';
  return 'CCM';
}

export function getStoredClientId(): string {
  return localStorage.getItem(LOCAL_STORAGE_KEY_CLIENT_ID) || (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
}

export function setStoredClientId(clientId: string) {
  localStorage.setItem(LOCAL_STORAGE_KEY_CLIENT_ID, clientId);
}

export function getStoredSpreadsheetId(): string {
  return localStorage.getItem(LOCAL_STORAGE_KEY_SPREADSHEET_ID) || (import.meta.env.VITE_DEFAULT_SPREADSHEET_ID as string) || '';
}

export function setStoredSpreadsheetId(id: string) {
  localStorage.setItem(LOCAL_STORAGE_KEY_SPREADSHEET_ID, id);
}

export function getCachedToken(): string | null {
  return inMemoryToken;
}

export function setCachedToken(token: string | null) {
  inMemoryToken = token;
  if (token) {
    sessionStorage.setItem(LOCAL_STORAGE_KEY_TOKEN, token);
  } else {
    sessionStorage.removeItem(LOCAL_STORAGE_KEY_TOKEN);
  }
}

export function loadTokenFromSession() {
  inMemoryToken = sessionStorage.getItem(LOCAL_STORAGE_KEY_TOKEN);
}

/**
 * Initiates the Google OAuth 2.0 Popup sign-in flow.
 */
export function initiateGoogleSignIn(clientId: string) {
  const redirectUri = window.location.origin;
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid'
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&include_granted_scopes=true` +
    `&state=patient_satisfaction_survey_auth`;

  // Open the Google login page directly in a popup
  const width = 600;
  const height = 650;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  const authWindow = window.open(
    authUrl,
    'Google_Sign_In_CCM_RPM',
    `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
  );

  if (!authWindow) {
    alert('¡El popup fue bloqueado! Por favor habilita los popups para iniciar sesión con Google.');
  }
}

/**
 * Fetches the Google userinfo (email and name) using the provided OAuth token.
 */
export async function fetchGoogleUserInfo(token: string): Promise<{ email: string; name: string } | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      email: data.email || '',
      name: data.name || ''
    };
  } catch (e) {
    console.error('Error fetching Google userinfo:', e);
    return null;
  }
}


/**
 * Headers maps for each sheet to ensure matching spreadsheet structures.
 */
const PATIENTS_HEADERS = [
  'PatientID',
  'MRN',
  'Patient Name',
  'Phone Number',
  'Care Manager',
  'Provider',
  'Service Type',
  'Status',
  'Last Survey Date',
  'Notes'
];

const SURVEY_RESPONSES_HEADERS = [
  'ResponseID',
  'Survey Date',
  'Survey Time',
  'Surveyor Name',
  'Provider',
  'MRN',
  'PatientID',
  'Patient Name',
  'Phone Number',
  'Care Manager',
  'Service Type',
  'Overall Satisfaction Score',
  'Helps Manage Health',
  'Care Manager Satisfaction Score',
  'Clear Explanation',
  'Follow-up on Health Needs',
  'Easy Communication',
  'Easy to Take Measurements',
  'Would Recommend Service',
  'What Patient Likes Most',
  'What Could Be Improved',
  'Call Status',
  'Follow-up Needed',
  'Internal Notes',
  'General Satisfaction Score',
  'General Satisfaction Stars',
  'General Satisfaction Label',
  'Follow-up Required',
  'Follow-up Reasons',
  'Score Calculated At',
  'Score Version'
];

const CALL_ATTEMPTS_HEADERS = [
  'AttemptID',
  'Date',
  'Time',
  'Surveyor Name',
  'Provider',
  'MRN',
  'Patient Name',
  'Phone Number',
  'Care Manager',
  'Call Result',
  'Notes'
];

/**
 * Creates a brand new fully formatted Google Sheet with three tabs: Patients, SurveyResponses, CallAttempts.
 * Populates Patients with the default patients.
 */
export async function createPatientSurveySpreadsheet(token: string): Promise<string> {
  // 1. Create a blank spreadsheet
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: 'Patient Satisfaction Surveys (CCM & RPM)'
      }
    })
  });

  if (!createResponse.ok) {
    const errorDetails = await createResponse.text();
    throw new Error(`Failed to create spreadsheet: ${errorDetails}`);
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;

  // 2. Add structural sheets: Patients, SurveyResponses, CallAttempts (Sheet1 is always created by default)
  const defaultSheetTitle = spreadsheet.sheets?.[0]?.properties?.title || 'Sheet1';

  // We batch update to add "SurveyResponses", "CallAttempts", rename default to "Patients"
  const batchUpdateRequest = {
    requests: [
      {
        updateSheetProperties: {
          properties: {
            sheetId: spreadsheet.sheets?.[0]?.properties?.sheetId,
            title: 'Patients'
          },
          fields: 'title'
        }
      },
      {
        addSheet: {
          properties: {
            title: 'SurveyResponses'
          }
        }
      },
      {
        addSheet: {
          properties: {
            title: 'CallAttempts'
          }
        }
      }
    ]
  };

  const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(batchUpdateRequest)
  });

  if (!updateResponse.ok) {
    const err = await updateResponse.text();
    throw new Error(`Failed to format sheets: ${err}`);
  }

  // 3. Write Headers
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'Patients!A1:J1',
          values: [PATIENTS_HEADERS]
        },
        {
          range: 'SurveyResponses!A1:AE1',
          values: [SURVEY_RESPONSES_HEADERS]
        },
        {
          range: 'CallAttempts!A1:K1',
          values: [CALL_ATTEMPTS_HEADERS]
        }
      ]
    })
  });

  // 4. Populate default patients inside Patients sheet
  const patientRows = INITIAL_PATIENTS.map(p => [
    p.PatientID,
    p.MRN,
    p.PatientName,
    p.PhoneNumber,
    p.CareManager,
    p.Provider,
    p.ServiceType,
    p.Status,
    p.LastSurveyDate,
    p.Notes
  ]);

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Patients!A2:J${INITIAL_PATIENTS.length + 1}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: patientRows
    })
  });

  setStoredSpreadsheetId(spreadsheetId);
  return spreadsheetId;
}

/**
 * Fetch Patients from Google Sheets.
 */
export async function fetchPatientsFromGoogleSheets(spreadsheetId: string, token: string): Promise<Patient[]> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Patients!A2:J2000`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Failed to fetch patients from sheet: ${errorDetails}`);
  }

  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any[], index: number) => {
    // Fill up empty columns safely
    return {
      PatientID: row[0] || `PAT-${100 + index}`,
      MRN: row[1] || '—',
      PatientName: row[2] || 'Sin Nombre',
      PhoneNumber: row[3] || '—',
      CareManager: row[4] || '—',
      Provider: row[5] || '—',
      ServiceType: normalizeServiceType(row[6]),
      Status: (row[7] || 'Pending') as Patient['Status'],
      LastSurveyDate: row[8] || '—',
      Notes: row[9] || '',
      sheetRowIndex: index + 2 // Row 2 corresponds to index 0 of data lists
    };
  });
}

/**
 * Fetch Survey Responses from Google Sheet
 */
export async function fetchResponsesFromGoogleSheets(spreadsheetId: string, token: string): Promise<SurveyResponse[]> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/SurveyResponses!A2:AE2000`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) return [];

  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any[]) => ({
    ResponseID: row[0] || '',
    SurveyDate: row[1] || '',
    SurveyTime: row[2] || '',
    SurveyorName: row[3] || '',
    Provider: row[4] || '',
    MRN: row[5] || '',
    PatientID: row[6] || '',
    PatientName: row[7] || '',
    PhoneNumber: row[8] || '',
    CareManager: row[9] || '',
    ServiceType: normalizeServiceType(row[10]),
    OverallSatisfactionScore: Number(row[11]) || 0,
    HelpsManageHealth: (row[12] || 'No') as SurveyResponse['HelpsManageHealth'],
    CareManagerSatisfactionScore: Number(row[13]) || 0,
    ClearExplanation: (row[14] || 'No') as SurveyResponse['ClearExplanation'],
    FollowUpOnHealthNeeds: (row[15] || 'No') as SurveyResponse['FollowUpOnHealthNeeds'],
    EasyCommunication: (row[16] || 'No') as SurveyResponse['EasyCommunication'],
    EasyToTakeMeasurements: (row[17] || 'No aplica') as SurveyResponse['EasyToTakeMeasurements'],
    WouldRecommendService: (row[18] || 'No') as SurveyResponse['WouldRecommendService'],
    WhatPatientLikesMost: row[19] || '',
    WhatCouldBeImproved: row[20] || '',
    CallStatus: (row[21] || 'Completed') as SurveyResponse['CallStatus'],
    FollowUpNeeded: (row[22] || 'No') as SurveyResponse['FollowUpNeeded'],
    InternalNotes: row[23] || '',
    generalSatisfactionScore: row[24] !== undefined && row[24] !== '' ? Number(row[24]) : null,
    generalSatisfactionStars: row[25] !== undefined && row[25] !== '' ? Number(row[25]) : null,
    generalSatisfactionLabel: row[26] || null,
    followUpRequired: row[27] === 'TRUE' || row[27] === 'true' || row[27] === true,
    followUpReasons: row[28] || '',
    scoreCalculatedAt: row[29] || null,
    scoreVersion: row[30] || 'v1.0'
  }));
}

/**
 * Fetch Call Attempts from Google Sheet
 */
export async function fetchCallAttemptsFromGoogleSheets(spreadsheetId: string, token: string): Promise<CallAttempt[]> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CallAttempts!A2:K2000`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) return [];

  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any[]) => ({
    AttemptID: row[0] || '',
    Date: row[1] || '',
    Time: row[2] || '',
    SurveyorName: row[3] || '',
    Provider: row[4] || '',
    MRN: row[5] || '',
    PatientName: row[6] || '',
    PhoneNumber: row[7] || '',
    CareManager: row[8] || '',
    CallResult: (row[9] || 'No Answer') as CallAttempt['CallResult'],
    Notes: row[10] || ''
  }));
}

/**
 * Append a Survey Response row
 */
export async function appendSurveyResponseToGoogleSheets(spreadsheetId: string, token: string, res: SurveyResponse) {
  const row = [
    res.ResponseID,
    res.SurveyDate,
    res.SurveyTime,
    res.SurveyorName,
    res.Provider,
    res.MRN,
    res.PatientID,
    res.PatientName,
    res.PhoneNumber,
    res.CareManager,
    res.ServiceType,
    res.OverallSatisfactionScore,
    res.HelpsManageHealth,
    res.CareManagerSatisfactionScore,
    res.ClearExplanation,
    res.FollowUpOnHealthNeeds,
    res.EasyCommunication,
    res.EasyToTakeMeasurements,
    res.WouldRecommendService,
    res.WhatPatientLikesMost,
    res.WhatCouldBeImproved,
    res.CallStatus,
    res.FollowUpNeeded,
    res.InternalNotes,
    res.generalSatisfactionScore !== null ? res.generalSatisfactionScore : '',
    res.generalSatisfactionStars !== null ? res.generalSatisfactionStars : '',
    res.generalSatisfactionLabel || '',
    res.followUpRequired ? 'TRUE' : 'FALSE',
    res.followUpReasons || '',
    res.scoreCalculatedAt || '',
    res.scoreVersion || ''
  ];

  const surveyAppendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/SurveyResponses!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    }
  );
  if (!surveyAppendRes.ok) {
    const errText = await surveyAppendRes.text();
    throw new Error(`Failed to append survey response: ${errText}`);
  }
}

/**
 * Append a Call Attempt row
 */
export async function appendCallAttemptToGoogleSheets(spreadsheetId: string, token: string, attempt: CallAttempt) {
  const row = [
    attempt.AttemptID,
    attempt.Date,
    attempt.Time,
    attempt.SurveyorName,
    attempt.Provider,
    attempt.MRN,
    attempt.PatientName,
    attempt.PhoneNumber,
    attempt.CareManager,
    attempt.CallResult,
    attempt.Notes
  ];

  const callAppendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CallAttempts!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    }
  );
  if (!callAppendRes.ok) {
    const errText = await callAppendRes.text();
    throw new Error(`Failed to append call attempt: ${errText}`);
  }
}

/**
 * Update dynamic Patient Status, Last Survey Date and Notes in Google Sheets.
 * Relies on the row index retrieved during load.
 */
export async function updatePatientInGoogleSheets(
  spreadsheetId: string,
  token: string,
  p: Patient
): Promise<void> {
  if (!p.sheetRowIndex) {
    throw new Error('Imposible actualizar el paciente sin conocer su índice de fila.');
  }

  // Update Status (H), LastSurveyDate (I), Notes (J) inside matching row
  const range = `Patients!H${p.sheetRowIndex}:J${p.sheetRowIndex}`;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [[p.Status, p.LastSurveyDate, p.Notes]]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to update patient row: ${errText}`);
  }
}

/**
 * Append a brand new patient to the Patients sheet
 */
export async function addPatientToGoogleSheets(
  spreadsheetId: string,
  token: string,
  p: Patient
): Promise<void> {
  const row = [
    p.PatientID,
    p.MRN,
    p.PatientName,
    p.PhoneNumber,
    p.CareManager,
    p.Provider,
    p.ServiceType,
    p.Status,
    p.LastSurveyDate,
    p.Notes
  ];

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Patients!A1:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [row]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to append new patient: ${err}`);
  }
}

/**
 * Update all columns of an existing Patient in Google Sheets
 */
export async function updatePatientFullInGoogleSheets(
  spreadsheetId: string,
  token: string,
  p: Patient
): Promise<void> {
  if (!p.sheetRowIndex) {
    throw new Error('Imposible actualizar el paciente sin conocer su índice de fila.');
  }

  const range = `Patients!A${p.sheetRowIndex}:J${p.sheetRowIndex}`;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [[
        p.PatientID,
        p.MRN,
        p.PatientName,
        p.PhoneNumber,
        p.CareManager,
        p.Provider,
        p.ServiceType,
        p.Status,
        p.LastSurveyDate,
        p.Notes
      ]]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to update full patient row: ${errText}`);
  }
}


/**
 * Safe initializer for an existing Google Sheet that might be blank or have other tabs.
 * It queries existing tabs, creates "Patients", "SurveyResponses", and "CallAttempts" if they don't exist,
 * and populates Patients with default patient rows.
 */
export async function initializeExistingSpreadsheet(spreadsheetId: string, token: string): Promise<void> {
  // 1. Fetch spreadsheet metadata to check existing sheet names
  const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!metadataResponse.ok) {
    const errorDetails = await metadataResponse.text();
    throw new Error(`Failed to read spreadsheet metadata: ${errorDetails}`);
  }

  const spreadsheet = await metadataResponse.json();
  const existingTitles = (spreadsheet.sheets || []).map((s: any) => s.properties?.title as string);

  const requests: any[] = [];
  let firstSheetId = spreadsheet.sheets?.[0]?.properties?.sheetId;

  const hasPatients = existingTitles.includes('Patients');
  const hasResponses = existingTitles.includes('SurveyResponses');
  const hasAttempts = existingTitles.includes('CallAttempts');

  if (!hasPatients) {
    // If we only have 1 tab and it has a default generic name, rename it to 'Patients' to be clean,
    // otherwise add a new 'Patients' tab.
    const isSingleDefaultTab = existingTitles.length === 1 && 
      (existingTitles[0] === 'Sheet1' || existingTitles[0] === 'Hoja 1' || existingTitles[0] === 'Hoja1' || existingTitles[0] === 'Sheet 1');

    if (isSingleDefaultTab && firstSheetId !== undefined) {
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: firstSheetId,
            title: 'Patients'
          },
          fields: 'title'
        }
      });
    } else {
      requests.push({
        addSheet: {
          properties: {
            title: 'Patients'
          }
        }
      });
    }
  }

  if (!hasResponses) {
    requests.push({
      addSheet: {
        properties: {
          title: 'SurveyResponses'
        }
      }
    });
  }

  if (!hasAttempts) {
    requests.push({
      addSheet: {
        properties: {
          title: 'CallAttempts'
        }
      }
    });
  }

  // 2. Execute batch update to create/rename tabs
  if (requests.length > 0) {
    const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!updateResponse.ok) {
      const err = await updateResponse.text();
      throw new Error(`Failed to update spreadsheet structure: ${err}`);
    }
  }

  // 3. Write Headers
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'Patients!A1:J1',
          values: [PATIENTS_HEADERS]
        },
        {
          range: 'SurveyResponses!A1:AE1',
          values: [SURVEY_RESPONSES_HEADERS]
        },
        {
          range: 'CallAttempts!A1:K1',
          values: [CALL_ATTEMPTS_HEADERS]
        }
      ]
    })
  });

  // 4. Populate Patients if the Patients list is empty
  const checkPatientsResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Patients!A2:A5`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  let needToPopulatePatients = true;
  if (checkPatientsResponse.ok) {
    const checkData = await checkPatientsResponse.json();
    if (checkData.values && checkData.values.length > 0) {
      needToPopulatePatients = false;
    }
  }

  if (needToPopulatePatients) {
    const patientRows = INITIAL_PATIENTS.map(p => [
      p.PatientID,
      p.MRN,
      p.PatientName,
      p.PhoneNumber,
      p.CareManager,
      p.Provider,
      p.ServiceType,
      p.Status,
      p.LastSurveyDate,
      p.Notes
    ]);

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Patients!A2:J${INITIAL_PATIENTS.length + 1}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: patientRows
      })
    });
  }
}
