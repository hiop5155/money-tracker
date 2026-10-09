export function getCalcUrl() {
  const token = localStorage.getItem('token');
  if (token) {
    return `/calc/?token=${encodeURIComponent(token)}`;
  }
  return '/calc/';
}
