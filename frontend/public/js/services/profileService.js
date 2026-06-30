/* Profile Service — uses Bearer token auth */
(function () {
  'use strict';

  var BASE = '/api/v1/profile';

  function getHeaders(includeContentType) {
    var headers = {};
    if (includeContentType !== false) headers['Content-Type'] = 'application/json';
    var token = localStorage.getItem('accessToken');
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  window.profileService = {
    getProfile: function () {
      return fetch(BASE, {
        method: 'GET',
        credentials: 'include',
        headers: getHeaders()
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to load profile'); });
        return res.json();
      });
    },

    updateProfile: function (payload) {
      return fetch(BASE, {
        method: 'PATCH',
        credentials: 'include',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to update profile'); });
        return res.json();
      });
    },

    changePassword: function (payload) {
      return fetch(BASE + '/password', {
        method: 'PATCH',
        credentials: 'include',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to change password'); });
        return res.json();
      });
    },

    uploadAvatar: function (formData) {
      return fetch(BASE + '/avatar', {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders(false),
        body: formData
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to upload avatar'); });
        return res.json();
      });
    },

    removeAvatar: function () {
      return fetch(BASE + '/avatar', {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeaders()
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to remove avatar'); });
        var ct = res.headers.get('content-type') || '';
        return ct.includes('application/json') ? res.json() : {};
      });
    },

    deleteAccount: function () {
      return fetch(BASE, {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeaders()
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to delete account'); });
        var ct = res.headers.get('content-type') || '';
        return ct.includes('application/json') ? res.json() : {};
      });
    }
  };
})();