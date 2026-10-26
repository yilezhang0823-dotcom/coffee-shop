/* ==========================================================================
   山间咖啡 Shanjian Coffee — 交互
   纯前端演示：不发送任何网络请求，不使用任何外部库。
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  /** 与 CSS 中 --dur 保持一致（毫秒） */
  var DURATION = 600;

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $all(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toMinutes(hhmm) {
    var parts = hhmm.split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  function fromMinutes(total) {
    return pad(Math.floor(total / 60)) + ':' + pad(total % 60);
  }

  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** 把 input[type=date] 的 "YYYY-MM-DD" 解析成本地时间的当天零点 */
  function parseDate(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  function toInputDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* ---------- 营业时间：唯一数据源是 HTML 表格里的 data-* ---------- */
  var hourRows = $all('.hours tr[data-day]');

  function hoursFor(weekday) {
    var row = hourRows.filter(function (r) {
      return Number(r.dataset.day) === weekday;
    })[0];
    if (!row || row.hasAttribute('data-closed')) return null;
    return { open: toMinutes(row.dataset.open), close: toMinutes(row.dataset.close) };
  }

  function initHours() {
    var now = new Date();
    var today = now.getDay();
    hourRows.forEach(function (row) {
      if (Number(row.dataset.day) === today) {
        row.classList.add('is-today');
        row.setAttribute('aria-current', 'date');
      }
    });

    var status = $('#open-status');
    if (!status) return;
    var h = hoursFor(today);
    var nowMin = now.getHours() * 60 + now.getMinutes();
    if (!h) {
      status.textContent = '今天店休，明天见';
    } else if (nowMin < h.open) {
      status.textContent = '还没开门 · 今天 ' + fromMinutes(h.open) + ' 开门';
    } else if (nowMin < h.close) {
      status.textContent = '营业中 · 今天 ' + fromMinutes(h.close) + ' 打烊';
      status.classList.add('is-open');
    } else {
      status.textContent = '今天已打烊，明天见';
    }
  }

  /* ---------- 导航：移动端展开 / 收起 ---------- */
  var header = $('.site-header');
  var nav = $('#site-nav');
  var toggle = $('.nav-toggle');
  var navLinks = $all('.site-nav__link');

  function setNavOpen(open, returnFocus) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.nav-toggle__label').textContent = open ? '关闭' : '菜单';
    nav.classList.toggle('is-open', open);
    if (!open && returnFocus) toggle.focus();
  }

  function initNav() {
    toggle.addEventListener('click', function () {
      setNavOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        setNavOpen(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setNavOpen(false, true);
      }
    });

    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !header.contains(e.target)) {
        setNavOpen(false);
      }
    });

    window.matchMedia('(min-width: 821px)').addEventListener('change', function (e) {
      if (e.matches) setNavOpen(false);
    });
  }

  /* ---------- 吸顶边线 + 回到顶部 ---------- */
  var toTop = $('.to-top');

  function initScrollState() {
    var ticking = false;

    function update() {
      var y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 8);
      toTop.classList.toggle('is-visible', y > window.innerHeight * 0.8);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();

    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      // 焦点回到页面开头，键盘用户可以从品牌处继续 Tab
      $('.brand').focus({ preventScroll: true });
    });
  }

  /* ---------- 当前区块导航高亮 ---------- */
  function initScrollSpy() {
    if (!('IntersectionObserver' in window)) return;
    var sections = navLinks
      .map(function (link) { return $(link.getAttribute('href')); })
      .filter(Boolean);
    var home = $('#home');

    function setCurrent(id) {
      navLinks.forEach(function (link) {
        if (link.getAttribute('href') === '#' + id) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.concat(home ? [home] : []).forEach(function (s) { observer.observe(s); });
  }

  /* ---------- 进入视口时分批淡入 ---------- */
  function initReveal() {
    var items = $all('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (entry, index) {
        var el = entry.target;
        el.style.transitionDelay = (index * 90) + 'ms';
        el.classList.add('is-visible');
        observer.unobserve(el);
        // 动画结束后清掉延迟，避免影响之后的交互
        window.setTimeout(function () { el.style.transitionDelay = ''; }, 900 + index * 90);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- 菜单分类标签 ---------- */
  function initTabs() {
    var list = $('.tabs__list');
    if (!list) return;
    var tabs = $all('[role="tab"]', list);
    var indicator = $('.tabs__indicator', list);

    function moveIndicator(tab) {
      indicator.style.transform =
        'translateX(' + tab.offsetLeft + 'px) scaleX(' + tab.offsetWidth + ')';
    }

    function select(tab, focus) {
      var current = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      if (focus) tab.focus();
      if (current === tab) return;

      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        panel.hidden = !selected;
        panel.classList.remove('is-entering');
        if (selected) {
          // 强制重排后再加类，保证动画每次都能重新播放
          void panel.offsetWidth;
          panel.classList.add('is-entering');
        }
      });
      moveIndicator(tab);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });

    function syncIndicator() {
      var current = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      if (current) moveIndicator(current);
    }

    // 首次定位不需要滑动过渡
    indicator.style.transition = 'none';
    syncIndicator();
    void indicator.offsetWidth;
    indicator.style.transition = '';

    if ('ResizeObserver' in window) {
      new ResizeObserver(syncIndicator).observe(list);
    } else {
      window.addEventListener('resize', syncIndicator);
    }
  }

  /* ---------- 预约表单 ---------- */
  var MAX_DAYS_AHEAD = 30;
  var LAST_ORDER_BEFORE_CLOSE = 60; // 打烊前多少分钟停止接受到店
  var MIN_LEAD_MINUTES = 30;        // 当天预约至少提前多少分钟

  function initForm() {
    var form = $('#reserve-form');
    if (!form) return;
    var confirmCard = $('#reserve-confirm');
    var fields = {
      name: $('#f-name'),
      phone: $('#f-phone'),
      date: $('#f-date'),
      time: $('#f-time'),
      guests: $('#f-guests'),
      note: $('#f-note')
    };
    var noteCount = $('#note-count');

    var today = startOfToday();
    var maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
    fields.date.min = toInputDate(today);
    fields.date.max = toInputDate(maxDate);

    function digits(value) {
      return value.replace(/[\s-]/g, '');
    }

    /* 每个校验器返回错误文字，通过时返回空字符串 */
    var validators = {
      name: function () {
        var v = fields.name.value.trim();
        if (!v) return '怎么称呼你呢？写个姓氏或昵称就好';
        return '';
      },
      phone: function () {
        var v = digits(fields.phone.value);
        if (!v) return '留个手机号吧，座位有变动时方便联系你';
        if (!/^1[3-9]\d{9}$/.test(v)) return '手机号好像不太对，请填写 11 位大陆手机号';
        return '';
      },
      date: function () {
        var v = fields.date.value;
        if (!v) return '选一个想来的日子吧';
        var d = parseDate(v);
        if (!d) return '日期格式不太对，请重新选择';
        if (d < today) return '这一天已经过去啦，请选今天或之后的日期';
        if (d > maxDate) return '目前只接受 ' + MAX_DAYS_AHEAD + ' 天内的预约，再近一点吧';
        if (!hoursFor(d.getDay())) return WEEKDAYS[d.getDay()] + '是我们的店休日（烘豆日），换一天来吧';
        return '';
      },
      time: function () {
        var v = fields.time.value;
        if (!v) return '大概几点到店呢？';
        var d = parseDate(fields.date.value);
        // 日期还没选好时，只检查是否填写
        if (!d || validators.date()) return '';
        var h = hoursFor(d.getDay());
        var t = toMinutes(v);
        var latest = h.close - LAST_ORDER_BEFORE_CLOSE;
        if (t < h.open || t > latest) {
          return '那天 ' + fromMinutes(h.open) + ' 开门，最晚 ' + fromMinutes(latest) + ' 前到店哦';
        }
        if (d.getTime() === today.getTime()) {
          var now = new Date();
          var earliest = now.getHours() * 60 + now.getMinutes() + MIN_LEAD_MINUTES;
          if (t < earliest) {
            return earliest > latest
              ? '今天的位置已经约不上了，换个日子吧'
              : '这个时间有点赶，请选 ' + fromMinutes(Math.ceil(earliest / 15) * 15) + ' 之后';
          }
        }
        return '';
      },
      guests: function () {
        return fields.guests.value ? '' : '请选择几位一起来';
      }
    };

    var touched = {};

    function showResult(name, message) {
      var input = fields[name];
      var field = input.closest('.field');
      var error = document.getElementById('err-' + name);
      var wasInvalid = field.classList.contains('is-invalid');
      if (message) {
        input.setAttribute('aria-invalid', 'true');
        if (error.textContent !== message) error.textContent = message;
        if (!wasInvalid) field.classList.add('is-invalid');
      } else {
        input.removeAttribute('aria-invalid');
        error.textContent = '';
        field.classList.remove('is-invalid');
      }
    }

    function validate(name) {
      var message = validators[name]();
      showResult(name, message);
      return !message;
    }

    Object.keys(validators).forEach(function (name) {
      var input = fields[name];
      input.addEventListener('blur', function () {
        touched[name] = true;
        validate(name);
      });
      // 已经报错的字段，边改边复查，改对了立刻消失
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', function () {
        if (touched[name]) validate(name);
      });
    });

    // 日期变了，时间是否合规也可能随之变化
    fields.date.addEventListener('change', function () {
      touched.date = true;
      validate('date');
      if (fields.time.value) {
        touched.time = true;
        validate('time');
      }
    });

    fields.note.addEventListener('input', function () {
      noteCount.textContent = fields.note.value.length + ' / ' + fields.note.maxLength;
    });

    function formatDate(d) {
      return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · ' + WEEKDAYS[d.getDay()];
    }

    function maskPhone(v) {
      var p = digits(v);
      return p.slice(0, 3) + ' **** ' + p.slice(7);
    }

    function swap(hideEl, showEl, after) {
      var wait = reduceMotion.matches ? 0 : DURATION;
      hideEl.classList.add('is-leaving');
      window.setTimeout(function () {
        hideEl.hidden = true;
        hideEl.classList.remove('is-leaving');
        showEl.hidden = false;
        showEl.classList.remove('is-entering');
        void showEl.offsetWidth;
        showEl.classList.add('is-entering');
        after();
      }, wait);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      Object.keys(validators).forEach(function (name) {
        touched[name] = true;
        if (!validate(name) && !firstInvalid) firstInvalid = fields[name];
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      // 只在页面上展示摘要，不发送任何数据
      $('#c-name').textContent = fields.name.value.trim();
      $('#c-date').textContent = formatDate(parseDate(fields.date.value));
      $('#c-time').textContent = fields.time.value;
      $('#c-guests').textContent = fields.guests.value + ' 位';
      $('#c-phone').textContent = maskPhone(fields.phone.value);

      swap(form, confirmCard, function () {
        $('#confirm-title').focus();
      });
    });

    $('#reserve-again').addEventListener('click', function () {
      form.reset();
      touched = {};
      Object.keys(validators).forEach(function (name) { showResult(name, ''); });
      noteCount.textContent = '0 / ' + fields.note.maxLength;
      confirmCard.classList.remove('is-entering');
      swap(confirmCard, form, function () {
        fields.name.focus();
      });
    });
  }

  /* ---------- 启动 ---------- */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  initHours();
  initNav();
  initScrollState();
  initScrollSpy();
  initReveal();
  initTabs();
  initForm();
})();
