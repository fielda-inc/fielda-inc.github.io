/* はじめての特殊清掃 ── 最小限のスクリプト
   1) 静かに現れる（設計書 §8-2：煽らない・派手に動かさない）
   2) GA4イベント（§9：telタップ／フォーム送信／外部クリックを業者名別に）
   計測タグそのものは入れていない。GA4を入れたら window.gtag が生えるので、
   このファイルはそのまま動く。 */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('[data-animate]');
  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
    if (window.__hts_debug) console.log('[event]', name, params || {});
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a');
    if (!a) return;

    var ga = a.getAttribute('data-ga');
    if (ga === 'tel_tap') { track('tel_tap', { location: location.pathname }); return; }
    if (ga === 'form_open') { track('form_open', { location: location.pathname }); return; }

    // 業者の公式サイトへの外部クリック。どの業者へ何件送ったかが営業の証拠になる（§9）
    var company = a.getAttribute('data-company');
    if (company) {
      track('outbound_company', { company: company, location: location.pathname, link_url: a.href });
      return;
    }
    if (a.hostname && a.hostname !== location.hostname) {
      track('outbound_click', { link_url: a.href, location: location.pathname });
    }
  });

  var form = document.querySelector('[data-contact-form]');
  if (form) {
    form.addEventListener('submit', function () {
      track('form_submit', { location: location.pathname });
    });
  }
})();
