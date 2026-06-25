/* ============================================================
   public/js/pages/profile.js
   Profile page controller — personal info, password, avatar,
   delete account.
   ============================================================ */

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────
  var state = {
    user: null,
    avatarUploading: false
  };

  // ── Helpers ──────────────────────────────────────────────
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function notify(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var item = document.createElement('div');
    item.className = 'toast toast-' + (type || 'info');
    item.textContent = message;
    container.appendChild(item);
    setTimeout(function () { item.remove(); }, 3500);
  }

  function setLoading(btn, loading, label) {
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Please wait…' : label;
  }

  function fmtDate(d) {
    if (!d) return '—';
    var date = new Date(d);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(function (w) { return w.charAt(0); })
      .join('').slice(0, 2).toUpperCase();
  }

  function openModal(id) {
    var el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); document.body.style.overflow = ''; }
  }

  // ── Render user into page ─────────────────────────────────
  function renderUser(user) {
    state.user = user;

    // Sidebar + topbar avatar (if they exist)
    var avatarEl = document.getElementById('userAvatar');
    if (avatarEl) avatarEl.textContent = getInitials(user.name);
    var nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = user.name || '';

    // Profile avatar
    var img = document.getElementById('profileAvatarImg');
    var initials = document.getElementById('profileAvatarInitials');
    if (user.avatar) {
      img.src = user.avatar;
      img.classList.remove('hidden');
      initials.classList.add('hidden');
    } else {
      img.classList.add('hidden');
      initials.classList.remove('hidden');
      initials.textContent = getInitials(user.name);
    }

    // Remove avatar button visibility
    var removeBtn = document.getElementById('removeAvatarBtn');
    if (removeBtn) removeBtn.style.display = user.avatar ? '' : 'none';

    // Side meta
    document.getElementById('avatarName').textContent = user.name || '—';
    document.getElementById('avatarEmail').textContent = user.email || '—';
    document.getElementById('memberSince').textContent = fmtDate(user.createdAt);
    document.getElementById('lastUpdated').textContent = fmtDate(user.updatedAt);

    // Fill info form
    document.getElementById('profileName').value = user.name || '';
    document.getElementById('profileEmail').value = user.email || '';
  }

  // ── Load profile ──────────────────────────────────────────
  async function loadProfile() {
    document.getElementById('profileLoading').style.display = 'flex';
    document.getElementById('profileError').style.display = 'none';
    document.getElementById('profileContent').classList.add('hidden');

    try {
      var response = await profileService.getProfile();
      var user = response.data ? response.data.user || response.data : response.user || response;
      renderUser(user);
      document.getElementById('profileContent').classList.remove('hidden');
    } catch (err) {
      var box = document.getElementById('profileError');
      box.textContent = err.message || 'Failed to load profile';
      box.style.display = 'flex';
    } finally {
      document.getElementById('profileLoading').style.display = 'none';
    }
  }

  // ── Save personal info ────────────────────────────────────
  async function saveInfo(e) {
    e.preventDefault();
    var form = document.getElementById('infoForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    var btn = document.getElementById('infoSaveBtn');
    setLoading(btn, true, 'Save changes');

    var payload = {
      name: document.getElementById('profileName').value.trim(),
      email: document.getElementById('profileEmail').value.trim()
    };

    try {
      var response = await profileService.updateProfile(payload);
      var user = response.data ? response.data.user || response.data : response.user || response;
      renderUser(Object.assign({}, state.user, user));
      notify('Profile updated', 'success');
    } catch (err) {
      notify(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(btn, false, 'Save changes');
    }
  }

  // ── Password strength ─────────────────────────────────────
  function checkPasswordStrength(pw) {
    if (!pw) return null;
    var score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 'weak', label: 'Weak', bars: 1 };
    if (score === 2) return { level: 'fair', label: 'Fair', bars: 2 };
    if (score === 3) return { level: 'good', label: 'Good', bars: 3 };
    return { level: 'strong', label: 'Strong', bars: 4 };
  }

  function renderStrength(pw) {
    var container = document.getElementById('passwordStrength');
    if (!container) return;
    if (!pw) { container.innerHTML = ''; return; }
    var result = checkPasswordStrength(pw);
    var bars = [1, 2, 3, 4].map(function (i) {
      var cls = i <= result.bars ? 'strength-bar filled-' + result.level : 'strength-bar';
      return '<div class="' + cls + '"></div>';
    }).join('');
    container.innerHTML =
      '<div class="strength-bar-row">' + bars + '</div>' +
      '<span class="strength-label ' + result.level + '">' + esc(result.label) + '</span>';
  }

  // ── Save password ─────────────────────────────────────────
  async function savePassword(e) {
    e.preventDefault();
    var form = document.getElementById('passwordForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    var current = document.getElementById('currentPassword').value;
    var next = document.getElementById('newPassword').value;
    var confirm = document.getElementById('confirmPassword').value;

    if (next !== confirm) {
      notify('New passwords do not match', 'error');
      document.getElementById('confirmPassword').focus();
      return;
    }

    if (next.length < 8) {
      notify('Password must be at least 8 characters', 'error');
      return;
    }

    var btn = document.getElementById('passwordSaveBtn');
    setLoading(btn, true, 'Update password');

    try {
      await profileService.changePassword({ currentPassword: current, newPassword: next });
      form.reset();
      document.getElementById('passwordStrength').innerHTML = '';
      notify('Password updated', 'success');
    } catch (err) {
      notify(err.message || 'Failed to update password', 'error');
    } finally {
      setLoading(btn, false, 'Update password');
    }
  }

  // ── Avatar upload ─────────────────────────────────────────
  function handleAvatarChange(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    var maxMB = 5;
    if (file.size > maxMB * 1024 * 1024) {
      notify('Image must be under ' + maxMB + ' MB', 'error');
      e.target.value = '';
      return;
    }

    var allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      notify('Unsupported format — use JPEG, PNG, or WebP', 'error');
      e.target.value = '';
      return;
    }

    // Optimistic preview
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = document.getElementById('profileAvatarImg');
      img.src = ev.target.result;
      img.classList.remove('hidden');
      document.getElementById('profileAvatarInitials').classList.add('hidden');
    };
    reader.readAsDataURL(file);

    uploadAvatar(file);
    e.target.value = ''; // allow re-selecting same file
  }

  async function uploadAvatar(file) {
    if (state.avatarUploading) return;
    state.avatarUploading = true;

    var wrapper = document.getElementById('avatarWrapper');
    wrapper.classList.add('avatar-uploading');

    var formData = new FormData();
    formData.append('avatar', file);

    try {
      var response = await profileService.uploadAvatar(formData);
      var user = response.data ? response.data.user || response.data : response.user || response;
      renderUser(Object.assign({}, state.user, user));
      notify('Profile photo updated', 'success');
    } catch (err) {
      // Revert preview on failure
      var img = document.getElementById('profileAvatarImg');
      if (state.user && state.user.avatar) {
        img.src = state.user.avatar;
      } else {
        img.classList.add('hidden');
        document.getElementById('profileAvatarInitials').classList.remove('hidden');
      }
      notify(err.message || 'Failed to upload photo', 'error');
    } finally {
      state.avatarUploading = false;
      wrapper.classList.remove('avatar-uploading');
    }
  }

  async function removeAvatar() {
    try {
      var response = await profileService.removeAvatar();
      var user = response.data ? response.data.user || response.data : response.user || response;
      renderUser(Object.assign({}, state.user, user, { avatar: null }));
      notify('Profile photo removed', 'success');
    } catch (err) {
      notify(err.message || 'Failed to remove photo', 'error');
    }
  }

  // ── Delete account ────────────────────────────────────────
  function setupDeleteModal() {
    var input = document.getElementById('deleteConfirmInput');
    var btn = document.getElementById('deleteConfirmBtn');

    input.addEventListener('input', function () {
      btn.disabled = input.value !== 'DELETE';
    });

    btn.onclick = async function () {
      setLoading(btn, true, 'Delete my account');
      try {
        await profileService.deleteAccount();
        notify('Account deleted. Goodbye!', 'info');
        setTimeout(function () {
          if (typeof auth !== 'undefined' && auth.logout) auth.logout();
          else window.location.href = '/login.html';
        }, 1500);
      } catch (err) {
        notify(err.message || 'Failed to delete account', 'error');
        setLoading(btn, false, 'Delete my account');
      }
    };

    document.getElementById('openDeleteBtn').onclick = function () {
      input.value = '';
      btn.disabled = true;
      openModal('deleteModalBackdrop');
      setTimeout(function () { input.focus(); }, 50);
    };
    document.getElementById('deleteModalClose').onclick = function () { closeModal('deleteModalBackdrop'); };
    document.getElementById('deleteCancelBtn').onclick = function () { closeModal('deleteModalBackdrop'); };
    document.getElementById('deleteModalBackdrop').addEventListener('click', function (e) {
      if (e.target.id === 'deleteModalBackdrop') closeModal('deleteModalBackdrop');
    });
  }

  // ── Password visibility toggles ───────────────────────────
  function bindPasswordToggles() {
    document.querySelectorAll('.pw-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.dataset.target);
        if (!input) return;
        var isText = input.type === 'text';
        input.type = isText ? 'password' : 'text';
        btn.querySelector('.eye-open').style.display = isText ? '' : 'none';
        btn.querySelector('.eye-closed').style.display = isText ? 'none' : '';
        btn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
      });
    });
  }

  // ── Theme toggle ──────────────────────────────────────────
  function bindTheme() {
    var root = document.documentElement;
    var saved = localStorage.getItem('es-theme') || 'light';
    function apply(theme) {
      root.setAttribute('data-theme', theme);
      localStorage.setItem('es-theme', theme);
      var sun = document.getElementById('themeIconSun');
      var moon = document.getElementById('themeIconMoon');
      if (sun) sun.style.display = theme === 'dark' ? 'none' : '';
      if (moon) moon.style.display = theme === 'dark' ? '' : 'none';
    }
    apply(saved);
    var toggle = document.getElementById('themeToggle');
    if (toggle) toggle.onclick = function () {
      apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    };
  }

  // ── Mobile sidebar ────────────────────────────────────────
  function bindMobileNav() {
    var sidebar = document.getElementById('sidebar');
    var btn = document.getElementById('mobileNavBtn');
    if (btn && sidebar) {
      btn.onclick = function () {
        var open = sidebar.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      };
    }
  }

  // ── Escape key ────────────────────────────────────────────
  function bindEscape() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal('deleteModalBackdrop');
    });
  }

  // ── Init ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async function () {
    if (typeof auth === 'undefined') {
      console.error('auth.js must load before profile.js');
      return;
    }

    var user = await auth.requireAuth();
    if (!user) return;

    bindTheme();
    bindMobileNav();
    bindEscape();
    bindPasswordToggles();
    setupDeleteModal();

    // Logout
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.onclick = function () {
      if (auth.logout) auth.logout();
    };

    // Forms
    document.getElementById('infoForm').addEventListener('submit', saveInfo);
    document.getElementById('passwordForm').addEventListener('submit', savePassword);

    // Avatar file input
    document.getElementById('avatarFileInput').addEventListener('change', handleAvatarChange);

    // Remove avatar
    var removeBtn = document.getElementById('removeAvatarBtn');
    if (removeBtn) removeBtn.onclick = removeAvatar;

    // Password strength live feedback
    document.getElementById('newPassword').addEventListener('input', function () {
      renderStrength(this.value);
    });

    await loadProfile();
  });
})();