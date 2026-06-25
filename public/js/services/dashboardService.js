var dashboardService = (function () {
  var BASE = '/api/v1/dashboard';

  function request(url) {
    return fetch(url, { credentials: 'same-origin' })
      .then(function (res) {
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
