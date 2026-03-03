export const config = {
  API_URL: process.env.API_URL || 'http://localhost:3000',
  REFRESH_MS: Number(process.env.TUI_REFRESH_MS) || 5000,
  ALERTS_REFRESH_MS: Number(process.env.TUI_ALERTS_REFRESH_MS) || 10000,
  PROCESS_LIMIT: Number(process.env.TUI_PROCESS_LIMIT) || 200,
  API_TIMEOUT_MS: Number(process.env.TUI_API_TIMEOUT_MS) || 10000,
  API_RETRIES: Number(process.env.TUI_API_RETRIES) || 3,
  THEME: (process.env.TUI_THEME || 'dark').toLowerCase(),
};
