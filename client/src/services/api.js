const API_BASE = '/api';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || `HTTP error! status: ${response.status}`);
  }
  return json.data !== undefined ? json.data : json;
}

// User & Auth
export const apiGetUsers = () => fetchApi('/auth/users');
export const apiGetCurrentUser = () => fetchApi('/auth/current');
export const apiSwitchUser = (userId) => fetchApi('/auth/switch-user', {
  method: 'POST',
  body: JSON.stringify({ userId })
});
export const apiLineLogin = (payload) => fetchApi('/auth/line-login', {
  method: 'POST',
  body: JSON.stringify(payload)
});
export const apiGetGoogleAuthConfig = () => fetchApi('/auth/google/config');
export const apiGoogleLogin = (payload) => fetchApi('/auth/google/login', {
  method: 'POST',
  body: JSON.stringify(payload)
});

// Workspaces
export const apiGetWorkspaces = () => fetchApi('/workspaces');
export const apiGetWorkspaceDetails = (id) => fetchApi(`/workspaces/${id}`);
export const apiCreateWorkspace = (data) => fetchApi('/workspaces', {
  method: 'POST',
  body: JSON.stringify(data)
});
export const apiUpdateWorkspace = (id, data) => fetchApi(`/workspaces/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data)
});
export const apiUpdateMemberRole = (workspaceId, userId, data) => fetchApi(`/workspaces/${workspaceId}/members/${userId}`, {
  method: 'PUT',
  body: JSON.stringify(data)
});
export const apiGetInvite = (workspaceId) => fetchApi(`/workspaces/${workspaceId}/invite`);
export const apiJoinWorkspace = (inviteCode) => fetchApi('/workspaces/join', {
  method: 'POST',
  body: JSON.stringify({ inviteCode })
});

// Categories
export const apiGetCategories = (workspaceId, type) => {
  let query = `?workspace_id=${workspaceId}`;
  if (type) query += `&type=${type}`;
  return fetchApi(`/categories${query}`);
};
export const apiCreateCategory = (data) => fetchApi('/categories', {
  method: 'POST',
  body: JSON.stringify(data)
});
export const apiUpdateCategory = (id, data) => fetchApi(`/categories/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data)
});
export const apiDeleteCategory = (id) => fetchApi(`/categories/${id}`, {
  method: 'DELETE'
});

// Transactions
export const apiGetTransactions = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/transactions?${query}`);
};
export const apiCreateTransaction = (data) => fetchApi('/transactions', {
  method: 'POST',
  body: JSON.stringify(data)
});
export const apiUpdateTransaction = (id, data) => fetchApi(`/transactions/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data)
});
export const apiDeleteTransaction = (id) => fetchApi(`/transactions/${id}`, {
  method: 'DELETE'
});
export const apiGetAuditTrail = (workspaceId) => fetchApi(`/transactions/audit-trail?workspace_id=${workspaceId}`);

// Analytics
export const apiGetOverview = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/analytics/overview?${query}`);
};
export const apiGetTrend = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/analytics/trend?${query}`);
};
export const apiGetCategoryBreakdown = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/analytics/category-breakdown?${query}`);
};
export const apiGetWordCloud = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/analytics/wordcloud?${query}`);
};

// OCR
export const apiGetSampleSlips = () => fetchApi('/ocr/sample-slips');
export const apiParseOCR = (data) => fetchApi('/ocr/parse', {
  method: 'POST',
  body: JSON.stringify(data)
});

// Voice
export const apiGetSampleVoiceCommands = () => fetchApi('/voice/sample-commands');
export const apiParseVoice = (transcript) => fetchApi('/voice/parse', {
  method: 'POST',
  body: JSON.stringify({ transcript })
});

// Admin
export const apiGetAdminUsers = () => fetchApi('/admin/users');
export const apiUpdateUserStatus = (userId, status) => fetchApi(`/admin/users/${userId}/status`, {
  method: 'PUT',
  body: JSON.stringify({ status })
});
export const apiGetSystemLogs = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/admin/logs?${query}`);
};
export const apiGetAdminStats = () => fetchApi('/admin/stats');

// LINE
export const apiProcessSlipMessage = (payload) => fetchApi('/line/process-slip-message', {
  method: 'POST',
  body: JSON.stringify(payload)
});

export const apiGetFlexPreview = (templateType, data) => fetchApi('/line/flex-preview', {
  method: 'POST',
  body: JSON.stringify({ templateType, data })
});

// Google Integrations & Export
export const apiGetGoogleStatus = () => fetchApi('/integrations/google/status');
export const apiTestGoogleConnection = (data) => fetchApi('/integrations/google/test', {
  method: 'POST',
  body: JSON.stringify(data || {})
});
export const apiSyncGoogleSheets = (data) => fetchApi('/integrations/google/sync', {
  method: 'POST',
  body: JSON.stringify(data || {})
});
export const apiUpdateGoogleConfig = (data) => fetchApi('/integrations/google/config', {
  method: 'POST',
  body: JSON.stringify(data || {})
});
export const apiGetExportCsvUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api/integrations/export/csv?${query}`;
};
