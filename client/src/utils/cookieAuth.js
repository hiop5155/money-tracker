// Cross-subdomain Single Sign-On (SSO) Cookie Manager for money-tracker.xyz & calc.money-tracker.xyz

const COOKIE_TOKEN_NAME = 'mt_auth_token';
const COOKIE_USER_NAME = 'mt_auth_user';

function getCookieDomain() {
  const hostname = window.location.hostname;
  if (hostname.endsWith('money-tracker.xyz')) {
    return '; domain=.money-tracker.xyz';
  }
  return '';
}

export function setSharedAuth(token, user) {
  const domainAttr = getCookieDomain();
  const maxAge = 60 * 60 * 24 * 30; // 30 天
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  
  document.cookie = `${COOKIE_TOKEN_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${domainAttr}${secure}`;
  document.cookie = `${COOKIE_USER_NAME}=${encodeURIComponent(typeof user === 'string' ? JSON.stringify({ name: user, email: user }) : JSON.stringify(user))}; path=/; max-age=${maxAge}; SameSite=Lax${domainAttr}${secure}`;
}

export function getSharedAuth() {
  const cookies = document.cookie.split(';').reduce((acc, str) => {
    const [rawKey, ...rawVal] = str.trim().split('=');
    if (rawKey) {
      acc[rawKey] = decodeURIComponent(rawVal.join('='));
    }
    return acc;
  }, {});

  const token = cookies[COOKIE_TOKEN_NAME] || null;
  let user = null;
  if (cookies[COOKIE_USER_NAME]) {
    try {
      user = JSON.parse(cookies[COOKIE_USER_NAME]);
    } catch {
      user = null;
    }
  }

  return { token, user };
}

export function clearSharedAuth() {
  const domainAttr = getCookieDomain();
  document.cookie = `${COOKIE_TOKEN_NAME}=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
  document.cookie = `${COOKIE_USER_NAME}=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
}
