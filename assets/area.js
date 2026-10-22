/* Area navigation is progressively enhanced; every destination exists in HTML. */
(() => {
  const hub = document.querySelector('.area-hub');
  if (!hub) return;
  const directories = [...hub.querySelectorAll('.area-cities')];
  const regions = [...hub.querySelectorAll('.area-region')];
  const compact = window.matchMedia('(max-width: 540px)');
  const arrangeRegions = () => regions.forEach((region) => { region.open = !compact.matches || `#${region.id}` === location.hash; });
  arrangeRegions();
  compact.addEventListener('change', arrangeRegions);
  function followHash() {
    const hash = location.hash.slice(1);
    regions.forEach((r) => {
      r.classList.toggle('is-selected', r.id === hash);
      if (r.id === hash) r.open = true;
      else if (compact.matches && hash.startsWith('region-')) r.open = false;
    });
    hub.querySelectorAll('.area-map__region').forEach((r) => r.classList.toggle('is-selected', `region-${r.dataset.region}` === hash));
    const directory = directories.find((d) => d.id === hash);
    if (directory) {
      directories.forEach((d) => { d.open = d === directory; });
      requestAnimationFrame(() => directory.scrollIntoView({ block: 'start' }));
    }
  }
  window.addEventListener('hashchange', followHash);
  // Also handles a second click on the current hash after a panel was closed.
  hub.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (link?.getAttribute('href') === location.hash) followHash();
  });
  followHash();

  const normalize = (value) => value.normalize('NFKC').toLowerCase().replace(/[\s　]/g, '').replace(/[ァ-ヶ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60));
  directories.forEach((directory) => {
    const filter = directory.querySelector('.area-city-filter');
    const input = filter.querySelector('input');
    const status = filter.querySelector('[role="status"]');
    const cards = [...directory.querySelectorAll('[data-city-name]')];
    const empty = directory.querySelector('.area-city-empty');
    filter.hidden = false;
    function update() {
      const query = normalize(input.value);
      let count = 0;
      cards.forEach((card) => {
        card.hidden = !normalize(card.dataset.cityName).includes(query);
        if (!card.hidden) count++;
      });
      empty.hidden = count !== 0;
      status.textContent = query ? `${count}件の市区町村` : '';
    }
    input.addEventListener('input', update);
    input.addEventListener('search', update);
  });
})();
