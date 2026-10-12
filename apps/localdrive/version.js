import app from './app.json';

// app.json is the single source: the PS5 package needs `00.000.002`, people read `0.0.2`.
export const VERSION = app.version.split('.').map(Number).join('.');
