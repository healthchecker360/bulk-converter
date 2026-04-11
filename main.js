// ============================================================
// FileForge — main.js  (bug-fixed version)
// ============================================================

// ---- Helpers (defined FIRST so all functions can use them) ----
function formatBytes(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showResult(id) {
  var el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function showProgress(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function hideProgress(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// ---- Dark Mode (runs immediately on page load) ----
(function () {
  try {
    var saved = localStorage.getItem('ff-dark');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'true' || (!saved && prefersDark)) {
      document.documentElement.setAttribute('data-dark', 'true');
    }
  } catch (e) { /* localStorage blocked */ }
})();

function toggleDark() {
  var isDark = document.documentElement.getAttribute('data-dark') === 'true';
  document.documentElement.setAttribute('data-dark', String(!isDark));
  try { localStorage.setItem('ff-dark', String(!isDark)); } catch (e) {}
}

// ---- Search Toggle ----
function toggleSearch() {
  var bar = document.getElementById('searchBar');
  if (!bar) return;
  bar.classList.toggle('active');
  if (bar.classList.contains('active')) {
    setTimeout(function() {
      var inp = document.getElementById('toolSearch');
      if (inp) inp.focus();
    }, 50);
  }
}

// ---- Tool Search / Filter ----
function filterTools(query) {
  query = (query || '').toLowerCase().trim();
  var allCards = document.querySelectorAll('.tool-card');
  var visible = 0;

  allCards.forEach(function(card) {
    var tags = (card.getAttribute('data-tags') || '').toLowerCase();
    var nameEl = card.querySelector('strong');
    var descEl = card.querySelector('p');
    var name = nameEl ? nameEl.textContent.toLowerCase() : '';
    var desc = descEl ? descEl.textContent.toLowerCase() : '';
    var match = !query || tags.indexOf(query) !== -1 || name.indexOf(query) !== -1 || desc.indexOf(query) !== -1;
    card.classList.toggle('hidden', !match);
    if (match) visible++;
  });

  var noResults = document.getElementById('noResults');
  if (noResults) noResults.style.display = (visible === 0 && query) ? 'block' : 'none';

  // Sync both search inputs without feedback loops
  var heroInput = document.getElementById('heroSearch');
  var headerInput = document.getElementById('toolSearch');
  if (heroInput && document.activeElement !== heroInput) heroInput.value = query;
  if (headerInput && document.activeElement !== headerInput) headerInput.value = query;
}

// ---- Mobile Nav Toggle ----
function toggleNav() {
  var nav = document.querySelector('.main-nav');
  if (nav) nav.classList.toggle('mobile-open');
}

// ---- FAQ Toggle ----
function toggleFAQ(btn) {
  var answer = btn.nextElementSibling;
  if (!answer) return;
  var isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-a').forEach(function(a) { a.classList.remove('open'); });
  document.querySelectorAll('.faq-q').forEach(function(b) { b.classList.remove('open'); });
  if (!isOpen) {
    answer.classList.add('open');
    btn.classList.add('open');
  }
}

// ---- Upload Zone ----
// FIXED: remove button now updates internal files[] array via index closure
// FIXED: dragleave only fires when leaving the entire zone
// FIXED: getElementById(null) prevented by checking listId first
function initUploadZone(zoneId, inputId, listId, opts) {
  opts = opts || {};
  var zone = document.getElementById(zoneId);
  var input = document.getElementById(inputId);
  var listEl = listId ? document.getElementById(listId) : null;

  if (!zone || !input) {
    console.warn('initUploadZone: element not found', zoneId, inputId);
    return null;
  }

  var files = [];

  zone.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', function(e) {
    // Only remove highlight when leaving the whole zone, not a child element
    if (!zone.contains(e.relatedTarget)) {
      zone.classList.remove('dragover');
    }
  });

  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files) {
      addFiles(Array.prototype.slice.call(e.dataTransfer.files));
    }
  });

  input.addEventListener('change', function() {
    if (input.files && input.files.length) {
      addFiles(Array.prototype.slice.call(input.files));
    }
    input.value = ''; // Reset so same file can be re-added
  });

  function addFiles(newFiles) {
    var accepted = opts.accept
      ? newFiles.filter(function(f) { return matchesAccept(f, opts.accept); })
      : newFiles;

    if (!accepted.length) {
      if (newFiles.length > 0) {
        alert('Unsupported file type. Please use the accepted format for this tool.');
      }
      return;
    }

    if (opts.single) {
      files = [accepted[0]]; // Replace, not append
    } else {
      files = files.concat(accepted);
    }
    renderList();
    if (opts.onChange) opts.onChange(files.slice()); // pass a copy
  }

  // FIX: removes from files[] by index, then re-renders
  function removeFile(index) {
    files.splice(index, 1);
    renderList();
    if (opts.onChange) opts.onChange(files.slice());
  }

  function matchesAccept(file, accept) {
    var types = accept.split(',').map(function(s) { return s.trim(); });
    return types.some(function(t) {
      if (t.charAt(0) === '.') return file.name.toLowerCase().endsWith(t.toLowerCase());
      if (t.slice(-2) === '/*') return file.type.startsWith(t.slice(0, -2));
      return file.type === t;
    });
  }

  function renderList() {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!files.length) return;

    files.forEach(function(f, i) {
      var item = document.createElement('div');
      item.className = 'file-item';

      var iconEl = document.createElement('div');
      iconEl.className = 'file-item-icon';
      iconEl.textContent = f.type === 'application/pdf' ? '📄' : '🖼';

      var infoEl = document.createElement('div');
      infoEl.className = 'file-item-info';

      var nameEl = document.createElement('div');
      nameEl.className = 'file-item-name';
      nameEl.textContent = f.name; // textContent is safe (no XSS)

      var sizeEl = document.createElement('div');
      sizeEl.className = 'file-item-size';
      sizeEl.textContent = formatBytes(f.size);

      infoEl.appendChild(nameEl);
      infoEl.appendChild(sizeEl);

      var removeBtn = document.createElement('button');
      removeBtn.className = 'file-item-remove';
      removeBtn.setAttribute('type', 'button');
      removeBtn.setAttribute('aria-label', 'Remove ' + f.name);
      removeBtn.textContent = '✕';

      // FIX: IIFE captures correct index for async closure
      ;(function(capturedIndex) {
        removeBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          removeFile(capturedIndex);
        });
      })(i);

      item.appendChild(iconEl);
      item.appendChild(infoEl);
      item.appendChild(removeBtn);
      listEl.appendChild(item);
    });
  }

  return {
    getFiles: function() { return files.slice(); }, // return copy to prevent external mutation
    clear: function() {
      files = [];
      if (listEl) listEl.innerHTML = '';
      if (opts.onChange) opts.onChange([]);
    }
  };
}

// ---- Progress Bar (simulated smooth fill) ----
function simulateProgress(fillId, labelId, duration) {
  duration = duration || 2000;
  var fill = document.getElementById(fillId);
  var label = document.getElementById(labelId);
  if (!fill) return Promise.resolve();

  return new Promise(function(resolve) {
    var pct = 0;
    var interval = setInterval(function() {
      var rand = 1 + Math.random() * 0.5;
      pct = Math.min(pct + (100 / (duration / 50)) * rand, 95);
      fill.style.width = pct.toFixed(1) + '%';
      if (label) label.textContent = Math.floor(pct) + '%';
    }, 50);

    setTimeout(function() {
      clearInterval(interval);
      fill.style.width = '100%';
      if (label) label.textContent = '100%';
      resolve();
    }, duration);
  });
}

// ---- Init on DOM Ready ----
document.addEventListener('DOMContentLoaded', function() {
  // Dropdown nav: support click for touch devices as well as hover
  var dropdowns = document.querySelectorAll('.nav-dropdown');
  dropdowns.forEach(function(dd) {
    var btn = dd.querySelector('.nav-btn');
    var menu = dd.querySelector('.dropdown-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = dd.classList.contains('open');
      // Close all
      dropdowns.forEach(function(other) { other.classList.remove('open'); });
      // Toggle this one
      if (!isOpen) dd.classList.add('open');
    });
  });

  // Close dropdowns and mobile nav on outside click
  document.addEventListener('click', function(e) {
    dropdowns.forEach(function(dd) {
      if (!dd.contains(e.target)) dd.classList.remove('open');
    });
    var nav = document.querySelector('.main-nav');
    var hamburger = document.querySelector('.hamburger');
    if (nav && hamburger && !nav.contains(e.target) && !hamburger.contains(e.target)) {
      nav.classList.remove('mobile-open');
    }
  });

  // Close mobile nav on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var nav = document.querySelector('.main-nav');
      if (nav) nav.classList.remove('mobile-open');
      dropdowns.forEach(function(dd) { dd.classList.remove('open'); });
      var searchBar = document.getElementById('searchBar');
      if (searchBar) searchBar.classList.remove('active');
    }
  });
});
