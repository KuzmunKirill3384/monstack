/**
 * Цветовая схема TUI. Поддержка dark / light.
 */
import { config } from './config.js';

const dark = {
  header: { bg: 'blue', fg: 'white', bold: true },
  footer: { fg: 'black', bg: 'cyan' },
  table: {
    header: { fg: 'cyan', bold: true },
    cell: { fg: 'white' },
    selected: { bg: 'blue', fg: 'white' },
    border: { fg: 'gray' },
  },
  prompt: { border: { fg: 'cyan' } },
  error: { fg: 'red', bold: true },
  loading: { fg: 'yellow' },
};

const light = {
  header: { bg: 'white', fg: 'black', bold: true },
  footer: { fg: 'white', bg: 'blue' },
  table: {
    header: { fg: 'blue', bold: true },
    cell: { fg: 'black' },
    selected: { bg: 'cyan', fg: 'black' },
    border: { fg: 'black' },
  },
  prompt: { border: { fg: 'blue' } },
  error: { fg: 'red', bold: true },
  loading: { fg: 'magenta' },
};

export const theme = config.THEME === 'light' ? light : dark;

export const FOOTERS = {
  hosts: ' 1-4|F1-F4: screens  Enter: select host  /: search  r: refresh  q: quit ',
  processes: ' 1-4|F1-F4: screens  s: sort  S: direction  f: filter  k: kill  h: host  r: refresh  q: quit ',
  metrics: ' 1-4|F1-F4: screens  r: refresh  q: quit ',
  alerts: ' 1-4|F1-F4: screens  f: filter status  r: refresh  q: quit ',
  rules: ' 1-4|F1-F4: screens  5|F5: rules  t: toggle enabled  r: refresh  q: quit ',
};
