const fs = require('fs');
const path = require('path');

const apiFilePath = path.join(__dirname, 'public', 'js', 'utils', 'api.js');

try {
  // Read the original api.js file
  let apiContent = fs.readFileSync(apiFilePath, 'utf8');

  // Determine the API base URL from the environment (defaulting to relative /api/v1 for local/monolithic)
  const apiUrl = process.env.VITE_API_URL || process.env.API_BASE || '/api/v1';

  console.log(`[Build] Injecting API_BASE: ${apiUrl}`);

  // Replace the hardcoded const API_BASE = "...";
  // We use a regex to ensure we grab the right line.
  apiContent = apiContent.replace(
    /const API_BASE = ".*";/,
    `const API_BASE = "${apiUrl}";`
  );

  // Write it back
  fs.writeFileSync(apiFilePath, apiContent, 'utf8');
  console.log('[Build] Successfully injected dynamic API URL into frontend/public/js/utils/api.js');
} catch (error) {
  console.error('[Build] Failed to inject dynamic API URL:', error);
  process.exit(1);
}
