/* 県ページの市町村一覧の絞り込み。JSが無くても全市町村のリンクはそのまま読める。 */
(() => {
  const normalize = (v) => v.normalize('NFKC').toLowerCase().replace(/[\s　]/g, '').replace(/[ァ-ヶ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60));
  document.querySelectorAll('[data-city-dir]').forEach((dir) => {
    const filter = dir.querySelector('.city-dir__filter');
    const input = filter && filter.querySelector('input');
    if (!input) return;
    const status = filter.querySelector('[role="status"]');
    const items = [...dir.querySelectorAll('[data-city-name]')];
    const groups = [...dir.querySelectorAll('.city-dir__group')];
    const empty = dir.querySelector('.city-dir__empty');
    filter.hidden = false;
    const update = () => {
      const q = normalize(input.value);
      let count = 0;
      items.forEach((it) => { it.hidden = !normalize(it.dataset.cityName).includes(q); if (!it.hidden) count++; });
      groups.forEach((g) => { g.hidden = ![...g.querySelectorAll('[data-city-name]')].some((it) => !it.hidden); });
      if (empty) empty.hidden = count !== 0;
      if (status) status.textContent = q ? `${count}市町村` : '';
    };
    input.addEventListener('input', update);
    input.addEventListener('search', update);
  });
})();
