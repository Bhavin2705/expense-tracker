/* ============================================================
   public/js/services/profileService.js
   All API calls for the profile page.
   ============================================================ */

(function () {
    'use strict';

    var BASE = '/api/v1/profile';

    async function request(url, options) {
        var res = await fetch(url, Object.assign({
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        }, options));

        // For multipart requests, don't force Content-Type (let browser set boundary)
        if (options && options._multipart) {
            delete options._multipart;
        }

        if (!res.ok) {
            var err = {};
            try { err = await res.json(); } catch (_) { }
            throw new Error(err.message || ('Request failed (' + res.status + ')'));
        }

        var text = await res.text();
        return text ? JSON.parse(text) : {};
    }

    window.profileService = {
        /** GET /api/v1/profile — fetch current user */
        getProfile: function () {
            return fetch(BASE, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            }).then(function (res) {
                if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to load profile'); });
                return res.json();
            });
        },

        /** PATCH /api/v1/profile — update name / email */
        updateProfile: function (payload) {
            return fetch(BASE, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function (res) {
                if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to update profile'); });
                return res.json();
            });
        },

        /** PATCH /api/v1/profile/password — change password */
        changePassword: function (payload) {
            return fetch(BASE + '/password', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function (res) {
                if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to change password'); });
                return res.json();
            });
        },

        /** POST /api/v1/profile/avatar — upload photo (multipart/form-data) */
        uploadAvatar: function (formData) {
            // Do NOT set Content-Type; browser sets it with the correct boundary
            return fetch(BASE + '/avatar', {
                method: 'POST',
                credentials: 'include',
                body: formData
            }).then(function (res) {
                if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to upload avatar'); });
                return res.json();
            });
        },

        /** DELETE /api/v1/profile/avatar — remove photo */
        removeAvatar: function () {
            return fetch(BASE + '/avatar', {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            }).then(function (res) {
                if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to remove avatar'); });
                var ct = res.headers.get('content-type') || '';
                return ct.includes('application/json') ? res.json() : {};
            });
        },

        /** DELETE /api/v1/profile — delete account */
        deleteAccount: function () {
            return fetch(BASE, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            }).then(function (res) {
                if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || 'Failed to delete account'); });
                var ct = res.headers.get('content-type') || '';
                return ct.includes('application/json') ? res.json() : {};
            });
        }
    };

    console.log('%c✅ ProfileService loaded', 'color:#10b981;font-weight:500');
})();