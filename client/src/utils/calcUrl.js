export function getCalcUrl() {
  const token = localStorage.getItem('token');
  if (token) {
    return `https://calc.money-tracker.xyz/?token=${encodeURIComponent(token)}`;
  }
  return 'https://calc.money-tracker.xyz';
}
