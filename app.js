// ════════════════════════════════════
//   nauc.me — app.js
// ════════════════════════════════════

// ── STATE ──
let isLoggedIn = false;

// ── PAGES ──
function showPage(id) {
  if (id === 'page-add' && !isLoggedIn) {
    document.getElementById('modal-auth-guard').classList.add('show');
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// ── AUTH ──
function doLogin() {
  isLoggedIn = true;
  document.getElementById('nav-lo').style.display = 'none';
  document.getElementById('nav-li').style.display = 'inline-flex';
  document.getElementById('sm-logged-out').style.display = 'none';
  document.getElementById('sm-logged-in').style.display = 'block';
  showPage('page-home');
}

function doLogout() {
  isLoggedIn = false;
  document.getElementById('nav-lo').style.display = 'inline-flex';
  document.getElementById('nav-li').style.display = 'none';
  document.getElementById('sm-logged-out').style.display = 'block';
  document.getElementById('sm-logged-in').style.display = 'none';
  closeMenu();
  showPage('page-home');
}

// ── MOBILE MENU ──
function openMenu() {
  document.getElementById('slide-menu').classList.add('open');
  document.getElementById('menu-overlay').classList.add('open');
}

function closeMenu() {
  document.getElementById('slide-menu').classList.remove('open');
  document.getElementById('menu-overlay').classList.remove('open');
}

// ── PASSWORD TOGGLE ──
function togglePw(id, btn) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'text' ? '🙈' : '👁';
}

// ── TABS ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
      this.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // ── HEARTS ──
  document.querySelectorAll('.heart-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      this.textContent = this.textContent.trim() === '🤍' ? '❤️' : '🤍';
    });
  });
});

// ── IMAGE UPLOAD PREVIEW ──
function previewImg(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      const preview = document.getElementById('upload-preview');
      const placeholder = document.getElementById('upload-placeholder');
      preview.src = e.target.result;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// ── RICH TEXT EDITOR ──
function fmt(cmd) {
  document.execCommand(cmd, false, null);
  document.getElementById('rte').focus();
}

function fmtBlock(tag) {
  if (tag) document.execCommand('formatBlock', false, tag);
  document.getElementById('rte').focus();
}

// ── PRICE DOHODOU ──
function togglePriceDohodou(cb) {
  ['price-min', 'price-max'].forEach(id => {
    const el = document.getElementById(id);
    el.disabled = cb.checked;
    el.style.opacity = cb.checked ? '0.4' : '1';
  });
}

// ── SUCCESS MODAL ──
function showSuccess() {
  document.getElementById('modal-success').classList.add('show');
}

// ── PŘEDMĚT COMBOBOX ──
function openPredmet() {
  document.getElementById('predmet-panel').classList.add('open');
  document.getElementById('predmet-chevron').style.transform = 'rotate(180deg)';
}

function closePredmet() {
  document.getElementById('predmet-panel').classList.remove('open');
  document.getElementById('predmet-chevron').style.transform = 'rotate(0deg)';
}

function filterPredmet(val) {
  openPredmet();
  const q = val.toLowerCase().trim();
  document.querySelectorAll('.predmet-item').forEach(item => {
    item.classList.toggle('hidden', !item.dataset.val.toLowerCase().includes(q));
  });
  const exactMatch = [...document.querySelectorAll('.predmet-item')].some(i =>
    i.dataset.val.toLowerCase().replace(/^.\s/, '') === q
  );
  const customRow = document.getElementById('predmet-custom-row');
  if (val.length > 0 && !exactMatch) {
    document.getElementById('predmet-custom-text').textContent = val;
    customRow.style.display = 'flex';
  } else {
    customRow.style.display = 'none';
  }
}

function selectPredmet(el) {
  document.querySelectorAll('.predmet-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('predmet-input').value = el.dataset.val;
  document.getElementById('predmet-custom-row').style.display = 'none';
  closePredmet();
}

function useCustomPredmet() {
  closePredmet();
  document.getElementById('predmet-custom-row').style.display = 'none';
  document.querySelectorAll('.predmet-item').forEach(i => i.classList.remove('selected'));
}

document.addEventListener('click', function (e) {
  if (!e.target.closest('#predmet-wrap')) closePredmet();
});

// ── DROPDOWN ──
function toggleDropdown(id) {
  const dd = document.getElementById(id);
  const isOpen = dd.classList.contains('open');
  document.querySelectorAll('.dropdown-list').forEach(d => d.classList.remove('open'));
  if (!isOpen) dd.classList.add('open');
}

function selectDd(id, val) {
  document.getElementById(id + '-label').textContent = val;
  document.getElementById(id + '-label').style.color = 'var(--dark)';
  document.getElementById(id).classList.remove('open');
}

document.addEventListener('click', function (e) {
  if (!e.target.closest('.select-wrap') && !e.target.closest('.dropdown-list')) {
    document.querySelectorAll('.dropdown-list').forEach(d => d.classList.remove('open'));
  }
});
