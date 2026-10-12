import {localeData} from './locales.js';

function groupInteger(digits, {group, indian, minGroup = 1}) {
  if (digits.length < 4 + minGroup - 1) return digits;
  if (!indian) return digits.replace(/\B(?=(\d{3})+$)/g, group);
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+$)/g, group);
  return `${head}${group}${digits.slice(-3)}`;
}

export function formatNumber(
  locale,
  n,
  {minimumFractionDigits = 0, maximumFractionDigits = minimumFractionDigits, useGrouping = true} = {}
) {
  const data = localeData(locale);
  const factor = 10 ** maximumFractionDigits;
  const rounded = Math.round(Math.abs(n) * factor) / factor;
  let [whole, fraction = ''] = rounded.toFixed(maximumFractionDigits).split('.');
  fraction = fraction.replace(/0+$/, '').padEnd(minimumFractionDigits, '0');
  const sign = n < 0 && rounded !== 0 ? '-' : '';
  return `${sign}${useGrouping ? groupInteger(whole, data) : whole}${fraction ? data.decimal + fraction : ''}`;
}

export const formatPercent = (locale, percent) =>
  localeData(locale).percent.replace('{n}', formatNumber(locale, percent));

export function formatDate(locale, iso) {
  const [year, month, day] = iso.split('-').map(Number);
  const {date, months} = localeData(locale);
  return date.replace(/\{(MMM|M|d|y)\}/g, (_, token) =>
    token === 'MMM' ? months[month - 1] : String(token === 'M' ? month : token === 'd' ? day : year)
  );
}
