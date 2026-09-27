/** Art-directed Korean local time, not an astronomical sunrise/weather model. */
export type TimeMoodName = '새벽' | '오전' | '오후' | '노을' | '저녁';
interface Mood {
  sky: string; ground: string; sun: string; ambient: string;
  sunPower: number; fill: number; ambientPower: number; lamps: number; exposure: number;
}
const night: Mood = { sky: '#192a49', ground: '#665879', sun: '#9fb6eb', ambient: '#9bace1', sunPower: .35, fill: .8, ambientPower: .5, lamps: 1, exposure: 1.05 };
const dawn: Mood = { sky: '#77839f', ground: '#ae91a6', sun: '#edbac0', ambient: '#aebfe1', sunPower: .65, fill: .9, ambientPower: .45, lamps: .65, exposure: 1.08 };
const morning: Mood = { sky: '#c5dfed', ground: '#dfd2b4', sun: '#fff1d6', ambient: '#b8cee4', sunPower: 2, fill: 1.1, ambientPower: .45, lamps: .04, exposure: 1 };
const afternoon: Mood = { sky: '#b3d5e9', ground: '#d4c6ae', sun: '#fff4e1', ambient: '#c4d5e7', sunPower: 2.4, fill: 1.05, ambientPower: .4, lamps: .02, exposure: .98 };
const sunset: Mood = { sky: '#cca294', ground: '#bd886c', sun: '#ffb078', ambient: '#a2a5cc', sunPower: 1.7, fill: .9, ambientPower: .4, lamps: .55, exposure: 1.05 };
const keys = [
  { hour: 0, mood: night }, { hour: 4, mood: night }, { hour: 5.5, mood: dawn },
  { hour: 8, mood: morning }, { hour: 12, mood: afternoon }, { hour: 16, mood: afternoon },
  { hour: 18, mood: sunset }, { hour: 20, mood: night }, { hour: 24, mood: night },
];
function mixHex(a: string, b: string, t: number) {
  const aValue = parseInt(a.slice(1), 16), bValue = parseInt(b.slice(1), 16);
  const channel = (shift: number) => Math.round(((aValue >> shift) & 255) * (1 - t) + ((bValue >> shift) & 255) * t).toString(16).padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}
export function timeMoodAt(date = new Date()): Mood & { name: TimeMoodName; hour: number } {
  const hour = (date.getUTCHours() + 9) % 24 + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const i = Math.max(0, keys.findIndex((key, j) => j + 1 < keys.length && hour >= key.hour && hour < keys[j + 1].hour));
  const a = keys[i], b = keys[i + 1];
  const t = (hour - a.hour) / (b.hour - a.hour);
  const k = t * t * (3 - 2 * t);
  const number = (key: 'sunPower' | 'fill' | 'ambientPower' | 'lamps' | 'exposure') => a.mood[key] + (b.mood[key] - a.mood[key]) * k;
  return {
    name: hour < 6 ? '새벽' : hour < 12 ? '오전' : hour < 16 ? '오후' : hour < 19 ? '노을' : '저녁', hour,
    sky: mixHex(a.mood.sky, b.mood.sky, k), ground: mixHex(a.mood.ground, b.mood.ground, k),
    sun: mixHex(a.mood.sun, b.mood.sun, k), ambient: mixHex(a.mood.ambient, b.mood.ambient, k),
    sunPower: number('sunPower'), fill: number('fill'), ambientPower: number('ambientPower'), lamps: number('lamps'), exposure: number('exposure'),
  };
}
