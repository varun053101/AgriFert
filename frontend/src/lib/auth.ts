// Token storage helpers — uses sessionStorage for security (cleared on tab close)
// Access token is short-lived, refresh token persisted for silent refresh

const ACCESS_TOKEN_KEY = 'agrifert_access_token';
const REFRESH_TOKEN_KEY = 'agrifert_refresh_token';

export const getAccessToken = (): string | null =>
  sessionStorage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = (): string | null =>
  sessionStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = (accessToken: string, refreshToken: string): void => {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = (): void => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const hasTokens = (): boolean =>
  Boolean(getAccessToken() && getRefreshToken());
