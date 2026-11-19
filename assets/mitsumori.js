/* かんたん費用チェック：質問を1つずつ出し、答えを吹き出しに畳み、最後に目安を出す。
   金額は data-bands（料金表を公開している22社の帯）から引くだけで、計算はしない。 */
(function () {
  'use strict';
  var root = document.querySelector('[data-mitsu]');
  if (!root) return;
  var bands, links;
  try { bands = JSON.parse(root.getAttribute('data-bands')); links = JSON.parse(root.getAttribute('data-links')); } catch (_) { return; }
  var steps = Array.prototype.slice.call(root.querySelectorAll('[data-step]'));
  var result = root.querySelector('[data-result]');
  var progress = Array.prototype.slice.call(root.querySelectorAll('[data-progress]'));
  var answers = {};
  var started = false;

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }
  function field(key) { return root.querySelector('[data-field="' + key + '"]'); }

  function show(index, scroll) {
    steps.forEach(function (el, i) {
      var done = i < index;
      el.hidden = i > index;
      el.classList.toggle('is-done', done);
      el.querySelector('.mitsu-opts').hidden = done;
      el.querySelector('.mitsu-a').hidden = !done;
    });
    result.hidden = index < steps.length;
    progress.forEach(function (el, i) {
      el.classList.toggle('is-now', i === index);
      el.classList.toggle('is-done', i < index);
    });
    if (!scroll) return;
    var target = index < steps.length ? steps[index] : result;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (target.scrollIntoView) target.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }

  function render() {
    var band = bands[Number(answers.madori.value)];
    var scopeLabel = answers.scope.value === 'ihin' ? '遺品整理まで頼む場合' : '特殊清掃のみ';
    var value = answers.scope.value === 'ihin' ? band.ihin : band.tokusou;
    root.querySelector('[data-r-label]').textContent = band.label + '／' + scopeLabel;
    root.querySelector('[data-r-band]').textContent = value;
    root.querySelector('[data-r-days]').hidden = ['2w', '1m', 'over'].indexOf(answers.days.value) === -1;
    var link = links[answers.area.value] || links.other;
    var a = root.querySelector('[data-r-link]');
    a.setAttribute('href', link[0]);
    a.textContent = '電話番号を入れずに、' + link[1];
    steps.forEach(function (el) {
      var key = el.getAttribute('data-step');
      var f = field(key);
      if (f) f.value = answers[key].label;
    });
    field('band').value = band.label + '／' + scopeLabel + '：' + value;
    track('mitsumori_result', { madori: band.label, scope: scopeLabel, area: answers.area.label });
  }

  root.addEventListener('click', function (ev) {
    var back = ev.target.closest && ev.target.closest('[data-back]');
    if (back) {
      var at = steps.indexOf(back.closest('[data-step]'));
      steps.slice(at).forEach(function (el) { delete answers[el.getAttribute('data-step')]; });
      show(at, true);
      return;
    }
    var btn = ev.target.closest && ev.target.closest('.mitsu-opts button');
    if (!btn) return;
    var step = btn.closest('[data-step]');
    var index = steps.indexOf(step);
    var key = step.getAttribute('data-step');
    answers[key] = { value: btn.getAttribute('data-value'), label: btn.textContent };
    step.querySelector('[data-answer]').textContent = btn.textContent;
    if (!started) { started = true; track('mitsumori_start', { location: location.pathname }); }
    track('mitsumori_answer', { step: key, value: btn.textContent });
    if (index + 1 >= steps.length) render();
    show(index + 1, true);
  });

  show(0, false);
})();
