// =============================================
// Group Service - Production Ready
// =============================================

const api = window.api || (window.api = {});

api.group = {
  getGroups: async function (params = {}) {
    try {
      // FIX: filter out empty-string params so they don't pollute the query string
      const filteredParams = {};
      Object.keys(params).forEach(function (k) {
        if (params[k] !== "" && params[k] != null) filteredParams[k] = params[k];
      });
      const queryString = new URLSearchParams(filteredParams).toString();
      const url = `/api/v1/groups${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to load groups (status ${response.status})`);
      }

      return await response.json();
    } catch (err) {
      console.error('Group getGroups failed:', err);
      throw err;
    }
  },

  getGroup: async function (id) {
    if (!id) throw new Error('Group ID is required');

    try {
      const response = await fetch(`/api/v1/groups/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to load group (status ${response.status})`);
      }

      return await response.json();
    } catch (err) {
      console.error('Group getGroup failed:', err);
      throw err;
    }
  },

  createGroup: async function (payload) {
    // FIX: validate payload before sending
    if (!payload || !payload.name || !payload.name.trim()) {
      throw new Error('Group name is required');
    }

    try {
      const response = await fetch('/api/v1/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create group (status ${response.status})`);
      }

      return await response.json();
    } catch (err) {
      console.error('Group create failed:', err);
      throw err;
    }
  },

  updateGroup: async function (id, payload) {
    if (!id) throw new Error('Group ID is required');

    try {
      const response = await fetch(`/api/v1/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update group (status ${response.status})`);
      }

      return await response.json();
    } catch (err) {
      console.error('Group update failed:', err);
      throw err;
    }
  },

  deleteGroup: async function (id) {
    if (!id) throw new Error('Group ID is required');

    try {
      const response = await fetch(`/api/v1/groups/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete group (status ${response.status})`);
      }

      // FIX: some DELETE endpoints return 204 No Content; handle empty body gracefully
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (err) {
      console.error('Group delete failed:', err);
      throw err;
    }
  },

  archiveGroup: async function (id) {
    if (!id) throw new Error('Group ID is required');

    try {
      const response = await fetch(`/api/v1/groups/${id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to archive group (status ${response.status})`);
      }

      return await response.json();
    } catch (err) {
      console.error('Group archive failed:', err);
      throw err;
    }
  },

  createParticipant: async function (groupId, payload) {
    if (!groupId) throw new Error('Group ID is required');
    // FIX: validate participant name
    if (!payload || !payload.name || !payload.name.trim()) {
      throw new Error('Participant name is required');
    }

    try {
      const response = await fetch(`/api/v1/groups/${groupId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to add participant (status ${response.status})`);
      }

      return await response.json();
    } catch (err) {
      console.error('Participant create failed:', err);
      throw err;
    }
  },

  updateParticipant: async function (id, payload) {
    if (!id) throw new Error('Participant ID is required');

    try {
      const response = await fetch(`/api/v1/participants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update participant (status ${response.status})`);
      }

      return await response.json();
    } catch (err) {
      console.error('Participant update failed:', err);
      throw err;
    }
  },

  deleteParticipant: async function (id) {
    if (!id) throw new Error('Participant ID is required');

    try {
      const response = await fetch(`/api/v1/participants/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete participant (status ${response.status})`);
      }

      // FIX: handle 204 No Content gracefully
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (err) {
      console.error('Participant delete failed:', err);
      throw err;
    }
  },

  linkParticipant: async function (id, payload) {
    if (!id) throw new Error('Participant ID is required');
    // FIX: validate email before sending
    if (!payload || !payload.email || !payload.email.trim()) {
      throw new Error('Email is required to link an account');
    }

    try {
      const response = await fetch(`/api/v1/participants/${id}/link-user`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to link account (status ${response.status})`);
      }

      return await response.json();
    } catch (err) {
      console.error('Participant link failed:', err);
      throw err;
    }
  }
};

// Global exposure
window.groupService = api.group;

console.log('%c✅ GroupService loaded successfully', 'color: #10b981; font-weight: 500');