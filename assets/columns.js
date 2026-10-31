'use strict';
(() => {
  const root = document.querySelector('[data-library]');
  if (!root) return;
  const input = root.querySelector('#article-search');
  const sections = [...root.querySelectorAll('[data-category]')];
  const filters = [...root.querySelectorAll('[data-theme]')];
  const reset = root.querySelector('[data-reset]');
  const opened = new Set();
  let theme = 'all';
  const normal = s => s.normalize('NFKC').toLocaleLowerCase('ja').trim();
  function update() {
    const words = normal(input.value).split(/\s+/).filter(Boolean);
    let matches = 0, shown = 0;
    for (const section of sections) {
      const selected = theme === 'all' || theme === section.dataset.category;
      const cards = [...section.querySelectorAll('[data-article]')];
      const eligible = cards.filter(card => selected && words.every(word => normal(card.dataset.search).includes(word)));
      const allVisible = words.length || theme !== 'all' || opened.has(section.dataset.category);
      const visible = new Set(allVisible ? eligible : eligible.slice(0, 6));
      cards.forEach(card => { card.hidden = !visible.has(card); });
      section.hidden = !eligible.length;
      section.querySelector('[data-section-count]').textContent = `${eligible.length}本`;
      const more = section.querySelector('[data-more]');
      more.hidden = allVisible || eligible.length <= 6;
      if (!more.hidden) more.textContent = `ほか${eligible.length - 6}本の記事を見る`;
      matches += eligible.length;
      shown += visible.size;
    }
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === theme)));
    root.querySelector('[data-result]').textContent = matches === shown ? `${matches}本の記事` : `${matches}本の記事から${shown}本を表示`;
    root.querySelector('[data-empty]').hidden = matches !== 0;
    reset.hidden = !words.length && theme === 'all' && !opened.size;
  }
  root.querySelector('[data-library-tools]').hidden = false;
  input.addEventListener('input', update);
  root.querySelector('form').addEventListener('submit', event => { event.preventDefault(); update(); });
  filters.forEach(button => button.addEventListener('click', () => { theme = button.dataset.theme; update(); }));
  sections.forEach(section => section.querySelector('[data-more]').addEventListener('click', () => {
    const next = [...section.querySelectorAll('[data-article]')].find(card => card.hidden);
    opened.add(section.dataset.category);
    update();
    // A disappearing button must not leave keyboard focus at the end of the document.
    next?.querySelector('a').focus({preventScroll: true});
  }));
  reset.addEventListener('click', () => { input.value = ''; theme = 'all'; opened.clear(); update(); input.focus(); });
  update();
  // Preserve old audience anchors, and allow links to a specific theme to open its full list.
  const hash = location.hash.slice(1);
  if (sections.some(s => s.dataset.category === hash)) { theme = hash; update(); }
})();
