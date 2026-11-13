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
    // 長い比較表も、画面に入り始めた時点で表示する。要素全体に対する割合では判定しない。
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  // 目次・外部の深いリンク・出典番号から、折りたたみ内にも直接移動できるようにする。
  function revealHash(hash) {
    if (!hash || hash === '#') return;
    var id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (_) { return; }
    var target = document.getElementById(id);
    if (!target) return;
    var opened = false;
    for (var el = target; el; el = el.parentElement) {
      if (el.tagName === 'DETAILS' && !el.open) { el.open = true; opened = true; }
    }
    if (opened) window.requestAnimationFrame(function () { target.scrollIntoView({ block: 'start' }); });
  }
  window.addEventListener('hashchange', function () { revealHash(location.hash); });
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (a && a.origin === location.origin && a.pathname === location.pathname && a.search === location.search) revealHash(a.hash);
  });
  revealHash(location.hash);

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
    if (window.__hts_debug) console.log('[event]', name, params || {});
  }

  // 送ったあとに画面を移るイベント用。GA4へ届いたのを待ってから done を呼ぶ。
  // すぐ移ると記録が落ちることがある。返事が来ない（計測が止められている等）ときも1.2秒で先へ進む。
  function trackThen(name, params, done) {
    var called = false;
    function next() { if (!called) { called = true; done(); } }
    if (typeof window.gtag !== 'function') { next(); return; }
    var p = { event_callback: next, transport_type: 'beacon' };
    for (var k in params) p[k] = params[k];
    window.gtag('event', name, p);
    window.setTimeout(next, 1200);
  }

  // 相談フォームへ来る直前のページ。どのページの相談ボタンから来たかを、フォームの記録に添える。
  function rememberFrom(path) {
    try { window.sessionStorage.setItem('hts_form_from', path); } catch (_) {}
  }
  function formFrom() {
    try { var v = window.sessionStorage.getItem('hts_form_from'); if (v) return v; } catch (_) {}
    try { var r = new URL(document.referrer); if (r.hostname === location.hostname) return r.pathname; } catch (_) {}
    return '(direct)';
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a');
    if (!a) return;

    var ga = a.getAttribute('data-ga');
    if (ga === 'tel_tap') { track('tel_tap', { location: location.pathname }); return; }
    if (ga === 'form_open') { track('form_open', { location: location.pathname }); rememberFrom(location.pathname); return; }
    if (ga === 'regional_ranking_click') {
      track('regional_ranking_click', { location: location.pathname, link_url: a.href, placement: a.getAttribute('data-cta') || 'content' });
      return;
    }
    // それ以外の data-ga（トップの「地域のランキングを見る」など）も、名前のまま記録する。
    // 2026-11-08まで、ここに無い名前は送られていなかった。
    if (ga) { track(ga, { location: location.pathname, link_url: a.href }); return; }

    // 業者の公式サイトへの外部クリック。どの業者へ何件送ったかが営業の証拠になる（§9）
    var company = a.getAttribute('data-company');
    if (company) {
      track('outbound_company', { company: company, location: location.pathname, link_url: a.href, placement: a.getAttribute('data-cta') || 'content' });
      return;
    }
    if (a.hostname && a.hostname !== location.hostname) {
      track('outbound_click', { link_url: a.href, location: location.pathname });
    }
  });

  // スクロールの到達率。GA4の拡張計測は90%到達しか送らず、当サイトは1ページが長いので届かない。
  var marks = [25, 50, 75];
  var sent = {};
  var ticking = false;
  function measure() {
    ticking = false;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (h <= 0) return;
    var pct = (window.pageYOffset / h) * 100;
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (pct >= m && !sent[m]) { sent[m] = 1; track('scroll_depth', { percent: m, location: location.pathname }); }
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(measure); }
  }, { passive: true });

  var form = document.querySelector('[data-contact-form]');
  if (form) {
    // 入力を始めた時点で1回だけ。送信まで届かなかった人を数えるため。
    var started = false;
    var from = formFrom();
    form.addEventListener('input', function () {
      if (started) return;
      started = true;
      track('form_start', { location: location.pathname, from: from });
    });
    // 送信ボタンを押したのに必須の未入力で止まった人を数える。
    // ブラウザの標準検証は submit イベント自体を発生させないため、これが無いと
    // 「押していない」と「押したが弾かれた」がどちらも form_submit 0 件に見える。
    // メールか電話のどちらかが入っていればよい。標準の required では表せないので、
    // 片方が空のときだけ、もう片方に「まだ入っていない」印を付けて checkValidity に乗せる。
    var mailEl = form.querySelector('[name="mail"]');
    var telEl = form.querySelector('[name="tel"]');
    function syncContact() {
      if (!mailEl || !telEl) return;
      var filled = (mailEl.value || '').trim() || (telEl.value || '').trim();
      mailEl.setCustomValidity(filled ? '' : 'メールアドレスか電話番号のどちらかをご記入ください');
      telEl.setCustomValidity('');
    }
    if (mailEl && telEl) { form.addEventListener('input', syncContact); syncContact(); }

    var LABELS = { mail: 'お返事の宛先（メールか電話）', tel: 'お返事の宛先（メールか電話）', consent: '3の確認の印' };
    var pressed = false;
    var submitButton = form.querySelector('[type="submit"]');
    if (submitButton && form.checkValidity) {
      submitButton.addEventListener('click', function () {
        if (!pressed) { pressed = true; track('form_press', { location: location.pathname, from: from }); }
        if (form.checkValidity()) return;
        var missing = [];
        Array.prototype.forEach.call(form.querySelectorAll('input,textarea,select'), function (el) {
          if (el.type === 'hidden' || !el.validity || el.validity.valid) return;
          if (el.name && missing.indexOf(el.name) === -1) missing.push(el.name);
        });
        // 送るのは項目名だけ。入力された値は送らない。
        track('form_blocked', { location: location.pathname, from: from, fields: missing.join(',') });
        var status = form.querySelector('[data-submit-status]');
        if (!status) return;
        status.hidden = false;
        status.classList.add('form-status--error');
        var names = [];
        missing.forEach(function (k) { var l = LABELS[k] || k; if (names.indexOf(l) === -1) names.push(l); });
        status.textContent = 'あと少しです。' + names.join('・') + ' がまだ入っていません。';
      });
    }

    // 計測の段階（2026-11-08に整理）
    //   form_start  入力を始めた
    //   form_press  送信ボタンを押した（未入力で止まったら form_blocked）
    //   form_send   入力がそろい、送信を始めた
    //   form_submit 送信先が受け付けた（このあと完了ページへ移る。完了ページでも generate_lead）
    //   form_submit_error   受付を確認できなかった（reason に理由）
    //   form_send_abandon   送信中に画面を閉じた・移った
    // 11/7までは form_submit をボタンを押した時点で送っていたため、受付されていない送信も数えていた。
    var submitting = false;
    var accepted = false;
    window.addEventListener('pagehide', function () {
      if (submitting && !accepted) track('form_send_abandon', { location: location.pathname, from: from, transport_type: 'beacon' });
    });
    form.addEventListener('submit', async function (ev) {
      // 通常POSTの成功画面だけでは受付を判定できないため、公式APIの結果を確認する。
      var endpoint = new URL(form.action);
      if (endpoint.hostname !== 'formsubmit.co') return;
      ev.preventDefault();
      if (submitting || !form.reportValidity()) return;

      var button = form.querySelector('[type="submit"]');
      var status = form.querySelector('[data-submit-status]');
      var data = Object.fromEntries(new FormData(form));
      var controller = new AbortController();
      var timeout = window.setTimeout(function () { controller.abort(); }, 30000);
      var reason = 'network';
      var detail = '';
      accepted = false;
      submitting = true;
      button.disabled = true;
      button.textContent = '送信しています…';
      form.setAttribute('aria-busy', 'true');
      status.hidden = false;
      status.textContent = 'そのままお待ちください。';
      status.classList.remove('form-status--error');
      track('form_send', { location: location.pathname, from: from });

      try {
        endpoint.pathname = '/ajax' + endpoint.pathname;
        var response = await fetch(endpoint.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'omit',
          signal: controller.signal
        });
        reason = 'bad_response';
        var result = await response.json();
        if (!response.ok) {
          reason = 'http_' + response.status;
          throw new Error('submission_not_accepted');
        }
        // このAPIは文字列の "false" も返す。truthy判定では失敗を成功にしてしまう。
        if (result.success !== true && result.success !== 'true') {
          reason = 'not_accepted';
          // 送信先の説明文（有効化が必要、など）。入力内容は含まれない。
          detail = String(result.message || '').slice(0, 90);
          throw new Error('submission_not_accepted');
        }
        accepted = true;
        button.textContent = '送信しました';
        status.textContent = '送信を受け付けました。完了画面へ移動します。';
        trackThen('form_submit', { location: location.pathname, from: from }, function () {
          window.location.assign(data._next);
        });
      } catch (_) {
        if (controller.signal.aborted) reason = 'timeout';
        status.classList.add('form-status--error');
        status.textContent = '送信の受付を確認できませんでした。入力内容は残っています。時間をおいて再度お試しいただくか、下のメール窓口へご連絡ください。';
        status.focus();
        track('form_submit_error', { location: location.pathname, from: from, reason: reason, detail: detail });
      } finally {
        window.clearTimeout(timeout);
        form.removeAttribute('aria-busy');
        if (!accepted) {
          submitting = false;
          button.disabled = false;
          button.textContent = 'もう一度送信する';
        }
      }
    });
  }
})();
