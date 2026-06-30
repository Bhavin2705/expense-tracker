var dashboardService = (function () {
  var BASE = '/api/v1/dashboard';

  function request(url) {
    var headers = { 'Accept': 'application/json' };
    var token = localStorage.getItem('accessToken');
    if (token) headers['Authorization'] = 'Bearer ' + token;

    return fetch(url, { credentials: 'include', headers: headers })
      .then(function (res) {
        if (res.status === 401) {
          // Try refresh through the api object
          if (window.api && window.api.refreshAccessToken) {
            return window.api.refreshAccessToken().then(function (refreshed) {
              if (refreshed) {
                var retryHeaders = { 'Accept': 'application/json' };
                var newToken = localStorage.getItem('accessToken');
                if (newToken) retryHeaders['Authorization'] = 'Bearer ' + newToken;
                return fetch(url, { credentials: 'include', headers: retryHeaders })
                  .then(function (r) { return r.json(); });
              }
              throw new Error('Session expired');
            });
          }
        }
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.message || 'Request failed');
          return data;
        });
      });
  }

  function buildQuery(params) {
    var q = new URLSearchParams();
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value !== undefined && value !== null && value !== '') q.set(key, value);
    });
    var qs = q.toString();
    return qs ? '?' + qs : '';
  }

  return {
    get: function (params) { return request(BASE + buildQuery(params || {})); }
  };
})();
