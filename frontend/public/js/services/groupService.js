// Group Service — uses Bearer token auth
const api = window.api || (window.api = {});

function getGroupAuthHeaders(includeContentType) {
  var headers = {};
  if (includeContentType !== false) headers['Content-Type'] = 'application/json';
  var token = localStorage.getItem('accessToken');
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

api.group = {
  getGroups: async function (params) {
    params = params || {};
    var filteredParams = {};
    Object.keys(params).forEach(function (k) {
      if (params[k] !== "" && params[k] != null) filteredParams[k] = params[k];
    });
    var queryString = new URLSearchParams(filteredParams).toString();
    var url = '/api/v1/groups' + (queryString ? '?' + queryString : '');
    var response = await fetch(url, { method: 'GET', headers: getGroupAuthHeaders(), credentials: 'include' });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to load groups');
    }
    return response.json();
  },

  getGroup: async function (id) {
    if (!id) throw new Error('Group ID is required');
    var response = await fetch('/api/v1/groups/' + id, { method: 'GET', headers: getGroupAuthHeaders(), credentials: 'include' });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to load group');
    }
    return response.json();
  },

  createGroup: async function (payload) {
    if (!payload || !payload.name || !payload.name.trim()) throw new Error('Group name is required');
    var response = await fetch('/api/v1/groups', { method: 'POST', headers: getGroupAuthHeaders(), body: JSON.stringify(payload), credentials: 'include' });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to create group');
    }
    return response.json();
  },

  updateGroup: async function (id, payload) {
    if (!id) throw new Error('Group ID is required');
    var response = await fetch('/api/v1/groups/' + id, { method: 'PATCH', headers: getGroupAuthHeaders(), body: JSON.stringify(payload), credentials: 'include' });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to update group');
    }
    return response.json();
  },

  deleteGroup: async function (id) {
    if (!id) throw new Error('Group ID is required');
    var response = await fetch('/api/v1/groups/' + id, { method: 'DELETE', headers: getGroupAuthHeaders(), credentials: 'include' });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to delete group');
    }
    var text = await response.text();
    return text ? JSON.parse(text) : {};
  },

  archiveGroup: async function (id) {
    if (!id) throw new Error('Group ID is required');
    var response = await fetch('/api/v1/groups/' + id + '/archive', { method: 'PATCH', headers: getGroupAuthHeaders(), credentials: 'include' });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to archive group');
    }
    return response.json();
  },

  createParticipant: async function (groupId, payload) {
    if (!groupId) throw new Error('Group ID is required');
    var response = await fetch('/api/v1/groups/' + groupId + '/participants', { method: 'POST', headers: getGroupAuthHeaders(), body: JSON.stringify(payload), credentials: 'include' });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to add participant');
    }
    return response.json();
  },

  deleteParticipant: async function (id) {
    if (!id) throw new Error('Participant ID is required');
    var response = await fetch('/api/v1/participants/' + id, { method: 'DELETE', headers: getGroupAuthHeaders(), credentials: 'include' });
    if (!response.ok) {
      var errorData = await response.json().catch(function () { return {}; });
      throw new Error(errorData.message || 'Failed to delete participant');
    }
    var text = await response.text();
    return text ? JSON.parse(text) : {};
  }
};

window.groupService = api.group;