/* =============================================
   AgeCalc - JavaScript
   ============================================= */

(function () {
  'use strict';

  // ---- DOM refs ----
  var form        = document.getElementById('calcForm');
  var birthInput  = document.getElementById('birthDate');
  var targetInput = document.getElementById('targetDate');
  var errorEl     = document.getElementById('errorMsg');
  var resultsEl   = document.getElementById('results');
  var badgeEl     = document.getElementById('resultsBadge');
  var breakdownEl = document.getElementById('resultsBreakdown');
  var copyBtn     = document.getElementById('copyBtn');
  var copyConfirm = document.getElementById('copyConfirm');

  // ---- Set default target date (today) ----
  var today = new Date();
  targetInput.value = toDateString(today);
  // Also set max date to today (can't calculate age as of a date in the far future)
  birthInput.max = toDateString(today);
  targetInput.max = toDateString(today);

  // ---- Helpers ----
  function toDateString(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function isValidDateString(s) {
    if (!s) return false;
    var parts = s.split('-');
    if (parts.length !== 3) return false;
    var d = new Date(s + 'T00:00:00');
    return !isNaN(d.getTime());
  }

  function daysInMonth(year, month) {
    // month: 1-12
    return new Date(year, month, 0).getDate();
  }

  function calcAge(birthStr, targetStr) {
    var birth = new Date(birthStr + 'T00:00:00');
    var target = new Date(targetStr + 'T00:00:00');

    var bYear  = birth.getFullYear();
    var bMonth = birth.getMonth();       // 0-indexed
    var bDay   = birth.getDate();

    var tYear  = target.getFullYear();
    var tMonth = target.getMonth();
    var tDay   = target.getDate();

    var years  = tYear - bYear;
    var months = tMonth - bMonth;
    var days   = tDay - bDay;

    if (days < 0) {
      months--;
      // borrow days from the month before target
      var borrowedMonth = tMonth === 0 ? 11 : tMonth - 1;
      var borrowedYear  = tMonth === 0 ? tYear - 1 : tYear;
      days += daysInMonth(borrowedYear, borrowedMonth + 1); // daysInMonth expects 1-indexed
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    // Total counts (relative to target)
    var totalDays = Math.round((target - birth) / (1000 * 60 * 60 * 24));
    var totalWeeks = Math.round(totalDays / 7);
    var totalMonths = years * 12 + months;

    return { years, months, days, totalDays, totalWeeks, totalMonths };
  }

  function formatAge(a, isFuture) {
    var parts = [];
    if (a.years  > 0) parts.push('<strong>' + a.years  + '</strong> ' + (a.years  === 1 ? 'year'   : 'years'));
    if (a.months > 0) parts.push('<strong>' + a.months + '</strong> ' + (a.months === 1 ? 'month'  : 'months'));
    if (a.days   > 0) parts.push('<strong>' + a.days   + '</strong> ' + (a.days   === 1 ? 'day'    : 'days'));
    var main = parts.join(', ');

    var breakdown = [
      commaNum(a.totalDays)   + ' days total',
      commaNum(a.totalWeeks) + ' weeks total',
      commaNum(a.totalMonths)+ ' months total',
    ].join(' &nbsp;|&nbsp; ');

    return { main: main, breakdown: breakdown };
  }

  function commaNum(n) {
    return String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function clearError()  { errorEl.textContent = ''; }
  function setError(msg) { errorEl.textContent = msg; }

  function showResults(badgeHtml, breakdownHtml) {
    badgeEl.innerHTML     = badgeHtml;
    breakdownEl.innerHTML = breakdownHtml;
    resultsEl.classList.remove('hidden');
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideResults() {
    resultsEl.classList.add('hidden');
    badgeEl.textContent = '';
    breakdownEl.textContent = '';
  }

  // ---- Form submit ----
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    var birthVal  = birthInput.value.trim();
    var targetVal = targetInput.value.trim();

    // Validation
    if (!birthVal) {
      setError('Please enter your date of birth.');
      birthInput.focus();
      return;
    }
    if (!isValidDateString(birthVal)) {
      setError('Please enter a valid date of birth.');
      birthInput.focus();
      return;
    }
    if (birthVal > today.toISOString().slice(0, 10)) {
      setError('Date of birth cannot be in the future.');
      birthInput.focus();
      return;
    }
    if (targetVal && !isValidDateString(targetVal)) {
      setError('Please enter a valid target date.');
      targetInput.focus();
      return;
    }

    var target = targetVal || toDateString(today);

    var age = calcAge(birthVal, target);
    var isFuture = target > today.toISOString().slice(0, 10);

    var fmt = formatAge(age, isFuture);

    // Build badge line
    var prefix = isFuture ? 'You will be ' : 'You are ';
    var badgeHtml = prefix + fmt.main + (isFuture ? ' old' : '') + ' old';

    // Build breakdown
    var targetDateStr = targetVal
      ? new Date(target + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'today';

    var breakdownHtml =
      '<div style="margin-bottom:0.5rem;color:#1e293b;font-size:0.9375rem;">' +
        'as of ' + targetDateStr +
      '</div>' +
      '<div style="color:#64748b;font-size:0.875rem;">' + fmt.breakdown + '</div>';

    showResults(badgeHtml, breakdownHtml);

    // Store for copy
    copyBtn._lastResult = fmt.main;
  });

  // ---- Reset ----
  form.addEventListener('reset', function () {
    clearError();
    hideResults();
    targetInput.value = toDateString(today);
    setTimeout(function () { birthInput.focus(); }, 50);
  });

  // ---- Copy ----
  copyBtn.addEventListener('click', function () {
    var text = copyBtn._lastResult || badgeEl.textContent;
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        flashConfirm();
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); flashConfirm(); } catch (err) {}
    document.body.removeChild(ta);
  }

  function flashConfirm() {
    copyConfirm.style.opacity = '1';
    copyBtn.textContent = '✓ Copied!';
    setTimeout(function () {
      copyConfirm.style.opacity = '0';
      copyBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Result';
    }, 2000);
  }

})();
