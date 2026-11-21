// Fixed scenes for screenshots. The query drives the scene:
//   ?shot=cover  — the cover alone, full-bleed (the editor chrome is hidden
//                  by the shot-cover class on <body>)
//   ?shot=editor — the editor with a sample photo loaded
// Parameters: photo (sample name), caption (title), subtitle, size
// (square | story | wide), layout, grade.
// window.__shotReady is set once the cover has painted, after two nested
// requestAnimationFrame calls so the frame is actually on screen.
export async function runShot(shot, query, setup) {
  const params = {
    mode: shot,
    photo: query.get('photo') || 'pier',
    caption: query.get('caption') || 'Sunset Heist',
    subtitle: query.get('subtitle') || 'Vice City nights',
    size: query.get('size') || 'square',
    layout: query.get('layout') || 'hero',
    grade: query.get('grade') || 'sunset',
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setup(params);
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
