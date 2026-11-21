// Colour grades for the cover renderer. Each grade is a diagonal gradient
// map (drawn over each photo with an overlay blend) plus a wash tint, a neon
// accent used for the subtitle and badge, and a backdrop colour used behind
// the tilted-snapshot layout.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    stops: [[0, '#ff2e88'], [0.45, '#ff7a18'], [0.8, '#ffb347'], [1, '#00e5c7']],
    tint: '#ff5e3a',
    accent: '#ff2e88',
    neon: '#00f0ff',
    backdrop: '#2b0a3d',
  },
  neon: {
    label: 'Neon Night',
    stops: [[0, '#ff00c8'], [0.5, '#7a00ff'], [1, '#00e5ff']],
    tint: '#b400ff',
    accent: '#ff00c8',
    neon: '#00e5ff',
    backdrop: '#0a0a24',
  },
  golden: {
    label: 'Golden Hour',
    stops: [[0, '#ff9d00'], [0.5, '#ffb347'], [1, '#ffe08a']],
    tint: '#ff9d00',
    accent: '#ff8c00',
    neon: '#ffe08a',
    backdrop: '#3d1e05',
  },
  palm: {
    label: 'Palm Teal',
    stops: [[0, '#00b39a'], [0.5, '#00e5c7'], [1, '#7dff5e']],
    tint: '#00b39a',
    accent: '#00e5c7',
    neon: '#7dff5e',
    backdrop: '#04281f',
  },
  noir: {
    label: 'Mono Noir',
    stops: [[0, '#111111'], [0.5, '#777777'], [1, '#f2f2f2']],
    tint: '#ff2e88',
    accent: '#ff2e88',
    neon: '#ff5e9e',
    backdrop: '#0d0d0d',
  },
};

export const GRADE_IDS = Object.keys(GRADES);
