// ════════════════════════════════════
//   nauc.me — app.js
// ════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://dxibiwizupnnmsdqovee.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4aWJpd2l6dXBubm1zZHFvdmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNDI5NDMsImV4cCI6MjA5MDgxODk0M30.KEdRUbKDqfwWooeCeuHNDScBQWGp7c7R9VGv8lWHsaY'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─────────────────────────────────────
//  stav
// ─────────────────────────────────────
let currentUser = null
let vsechnyInzeraty = []
let aktivniKategorie = 'vse'

// ─────────────────────────────────────
//  rozdělení názvů jednotlivých stránek
// ─────────────────────────────────────
const PAGE_TITLES = {
  'page-home':     'nauc.me – Doučování mezi studenty',
  'page-browse':   'nauc.me – Procházet tutory',
  'page-login':    'nauc.me – Přihlášení',
  'page-register': 'nauc.me – Vytvoření účtu',
  'page-add':      'nauc.me – Přidat inzerát',
  'page-profil':   'nauc.me – Můj profil',
}

function pushPage(id) {
  const hash = '#' + id
  if (window.location.hash !== hash) {
    history.pushState({ page: id }, '', hash)
  }
  document.title = PAGE_TITLES[id] || 'nauc.me'
}

window.addEventListener('popstate', (e) => {
  const id = e.state?.page || pageFromHash()
  _showPageInternal(id, false)
})

function pageFromHash() {
  const h = window.location.hash.replace('#', '')
  if (h && document.getElementById(h)) return h
  return 'page-home'
}

// ─────────────────────────────────────
//  inicializace
// ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // detekce reset tokenu v URL (Supabase posílá #access_token=...&type=recovery)
  const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
  const isRecovery = hashParams.get('type') === 'recovery'

  // listener musí být registrován PŘED getSession aby zachytil PASSWORD_RECOVERY
  // po inicializaci teprve reaguj na logout
  let appReady = false

  supabase.auth.onAuthStateChange((_event, session) => {
    if (_event === 'PASSWORD_RECOVERY') {
      setTimeout(() => {
        document.getElementById('modal-new-password').classList.add('show')
      }, 100)
      return
    }
    if (session) {
      currentUser = session.user
      if (_event === 'SIGNED_IN' && !isRecovery) {
        _updateNavUI(currentUser, true)
      } else if (_event === 'USER_UPDATED') {
        _updateNavUI(currentUser, false)
        closeModal('modal-new-password')
        showToast('✅ Heslo bylo úspěšně změněno!')
      } else if (_event === 'TOKEN_REFRESHED') {
        _updateNavUI(currentUser, false)
      }
    } else {
      // reaguj na logout jen pokud je aplikace plně načtená (ne při refreshi)
      if (appReady) {
        currentUser = null; onLogout()
      }
    }
  })

  const { data: { session } } = await supabase.auth.getSession()
  if (session && !isRecovery) {
    currentUser = session.user
    _updateNavUI(currentUser, false)
  }

  if (isRecovery && session) {
    setTimeout(() => {
      document.getElementById('modal-new-password').classList.add('show')
    }, 200)
  }

  initDarkMode()
  nactiInzeraty()
  const si = document.getElementById('search-input'); if (si) si.value = ''

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
      this.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      this.classList.add('active')
    })
  })

  // nastav počáteční stránku dle hashe nebo výchozí home
  const initialPage = isRecovery ? 'page-home' : pageFromHash()
  _showPageInternal(initialPage, false)
  history.replaceState({ page: initialPage }, '', '#' + initialPage)
  document.title = PAGE_TITLES[initialPage] || 'nauc.me'
})

// ─────────────────────────────────────
//  změna rozhraní navigace při přihlášení/odhlášení
// ─────────────────────────────────────
function _updateNavUI(user, showCelebration) {
  const navLo = document.getElementById('nav-lo')
  const navLi = document.getElementById('nav-li')
  const smOut = document.getElementById('sm-logged-out')
  const smIn  = document.getElementById('sm-logged-in')
  if (navLo) navLo.style.display = 'none'
  if (navLi) navLi.style.display = 'inline-flex'
  if (smOut) smOut.style.display = 'none'
  if (smIn)  smIn.style.display  = 'block'
  const jmeno = user.user_metadata?.jmeno || user.email.split('@')[0]
  const el = document.getElementById('nav-user-name')
  if (el) el.textContent = jmeno

  if (showCelebration && !window._loginAnimShown) {
    window._loginAnimShown = true
    showLoginCelebration(jmeno)
  }
}

// ─────────────────────────────────────
//  navigace
// ─────────────────────────────────────
function showPage(id) {
  if (id === 'page-add' && !currentUser) {
    const m = document.getElementById('modal-auth-guard')
    if (m) m.classList.add('show')
    return
  }
  if (id === 'page-profil' && !currentUser) {
    const m = document.getElementById('modal-auth-guard')
    if (m) m.classList.add('show')
    return
  }
  pushPage(id)
  _showPageInternal(id, true)
}

function _showPageInternal(id, scroll) {
  if (id === 'page-add' && !currentUser) {
    const m = document.getElementById('modal-auth-guard')
    if (m) m.classList.add('show')
    return
  }
  if (id === 'page-profil' && !currentUser) {
    id = 'page-home'
  }
  const target = document.getElementById(id)
  if (!target) return
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  target.classList.add('active')
  if (scroll) window.scrollTo(0, 0)
  const si = document.getElementById('search-input')
  if (si) si.value = ''
  if (id === 'page-browse') nactiInzeraty()
  if (id === 'page-profil') nactiProfil()
}

function closeModal(id) {
  const el = document.getElementById(id)
  if (el) el.classList.remove('show')
  if (id === 'modal-detail') document.body.style.overflow = ''
}

// ─────────────────────────────────────
//  registrace
// ─────────────────────────────────────
async function doRegister() {
  const jmeno    = document.getElementById('reg-jmeno').value.trim()
  const prijmeni = document.getElementById('reg-prijmeni').value.trim()
  const email    = document.getElementById('reg-email').value.trim()
  const telefon  = document.getElementById('reg-telefon').value.trim()
  const heslo    = document.getElementById('pw1').value
  const heslo2   = document.getElementById('pw2').value

  if (!jmeno || !email || !heslo) return showError('reg-error', 'Vyplň jméno, email a heslo.')
  if (heslo !== heslo2)           return showError('reg-error', 'Hesla se neshodují.')
  if (heslo.length < 6)           return showError('reg-error', 'Heslo musí mít alespoň 6 znaků.')

  setLoading('btn-register', true)
  const { error } = await supabase.auth.signUp({
    email, password: heslo,
    options: {
      data: { jmeno, prijmeni, telefon },
      emailRedirectTo: window.location.origin + window.location.pathname
    }
  })
  setLoading('btn-register', false)

  if (error) return showError('reg-error', prekladChyby(error.message))
  showPage('page-home')
  showToast('Zkontroluj email a potvrď registraci 📧')
}

// ─────────────────────────────────────
//  nové heslo (reset)
// ─────────────────────────────────────
async function doSetNewPassword() {
  const heslo  = document.getElementById('new-password-input')?.value
  const heslo2 = document.getElementById('new-password-input2')?.value

  if (!heslo)              return showError('new-password-error', 'Zadej nové heslo.')
  if (heslo.length < 6)    return showError('new-password-error', 'Heslo musí mít alespoň 6 znaků.')
  if (heslo !== heslo2)    return showError('new-password-error', 'Hesla se neshodují.')

  setLoading('btn-set-new-password', true)
  const { error } = await supabase.auth.updateUser({ password: heslo })
  setLoading('btn-set-new-password', false)

  if (error) return showError('new-password-error', prekladChyby(error.message))
  // úspěch — zachytí onAuthStateChange USER_UPDATED
}


function openForgotModal() {
  const emailInput = document.getElementById('forgot-email')
  // předvyplň email z login formuláře pokud je zadán
  const loginEmail = document.getElementById('login-email')?.value.trim()
  if (emailInput && loginEmail) emailInput.value = loginEmail
  const errEl = document.getElementById('forgot-error')
  if (errEl) errEl.style.display = 'none'
  const btn = document.getElementById('btn-forgot')
  if (btn) { btn.disabled = false; btn.textContent = 'Odeslat odkaz' }
  document.getElementById('modal-forgot').classList.add('show')
}

async function doForgotPassword() {
  const email = document.getElementById('forgot-email')?.value.trim()
  if (!email) return showError('forgot-error', 'Zadej svůj email.')
  if (!email.includes('@')) return showError('forgot-error', 'Zadej platný email.')

  setLoading('btn-forgot', true)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://nauc-me.vercel.app'
  })
  setLoading('btn-forgot', false)

  if (error) return showError('forgot-error', prekladChyby(error.message))

  closeModal('modal-forgot')
  showToast('📧 Odkaz pro reset hesla byl odeslán!')
}


async function doLogin() {
  const email = document.getElementById('login-email').value.trim()
  const heslo = document.getElementById('login-heslo').value

  if (!email || !heslo) return showError('login-error', 'Vyplň email a heslo.')

  setLoading('btn-login', true)
  const { error } = await supabase.auth.signInWithPassword({ email, password: heslo })
  setLoading('btn-login', false)

  if (error) return showError('login-error', prekladChyby(error.message))
  showPage('page-home')
}

// ─────────────────────────────────────
//  odhlášení
// ─────────────────────────────────────
async function doLogout() {
  await supabase.auth.signOut()
  closeMenu()
}

function onLogin(user) {
  _updateNavUI(user, true)
}

function showLoginCelebration(jmeno) {
  const el = document.createElement('div')
  el.id = 'login-celebration'
  el.innerHTML = `
    <div class="celebration-inner">
      <div class="celebration-avatar">${jmeno.charAt(0).toUpperCase()}</div>
      <div class="celebration-text">Vítej zpět, <b>${escHtml(jmeno)}</b>! 👋</div>
      <div class="celebration-sub">Přihlášení proběhlo úspěšně</div>
    </div>`
  document.body.appendChild(el)
  setTimeout(() => el.classList.add('show'), 10)
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400) }, 1600)
}

function onLogout() {
  const navLo = document.getElementById('nav-lo')
  const navLi = document.getElementById('nav-li')
  const smOut = document.getElementById('sm-logged-out')
  const smIn  = document.getElementById('sm-logged-in')
  if (navLo) navLo.style.display = 'inline-flex'
  if (navLi) navLi.style.display = 'none'
  if (smOut) smOut.style.display = 'block'
  if (smIn)  smIn.style.display  = 'none'
  window._loginAnimShown = false
  showPage('page-home')
}

// ─────────────────────────────────────
//  načtení inzerátů
// ─────────────────────────────────────
async function nactiInzeraty() {
  const grid = document.getElementById('cards-grid')
  if (!grid) return

  grid.innerHTML = '<div class="loading-msg">Načítám inzeráty...</div>'

  const { data, error } = await supabase
    .from('inzeraty')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) { grid.innerHTML = '<div class="loading-msg">Chyba při načítání 😕</div>'; console.error(error); return }

  vsechnyInzeraty = data || []
  const countEl = document.getElementById('stats-count')
  if (countEl) countEl.textContent = vsechnyInzeraty.length
  const homeGrid = document.getElementById('home-cards-grid')
  if (homeGrid) {
    const prvnich6 = vsechnyInzeraty.slice(0, 6)
    if (prvnich6.length) {
      homeGrid.innerHTML = prvnich6.map(renderKarta).join('')
    } else {
      homeGrid.innerHTML = '<div class="loading-msg">Zatím žádné inzeráty. Buď první! 🚀</div>'
    }
  }
  zobrazFiltrované()
}

// ─────────────────────────────────────
//  filtrování a vyhledávání
// ─────────────────────────────────────
function setKategorie(el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  el.classList.add('active')
  aktivniKategorie = el.dataset.kategorie
  zobrazFiltrované()
}

function filterInzeraty() {
  const val = document.getElementById('browse-search-input')?.value || ''
  const clearBtn = document.getElementById('browse-search-clear')
  if (clearBtn) clearBtn.style.display = val.length > 0 ? 'flex' : 'none'
  zobrazFiltrované()
}

function zobrazFiltrované() {
  const grid = document.getElementById('cards-grid')
  if (!grid) return

  const searchEl = document.getElementById('browse-search-input')
  const query = (searchEl?.value || document.getElementById('mobile-search-input')?.value || '').toLowerCase().trim()

  const KATEGORIE_MAP = {
    matematika:   ['mat', 'algebra', 'geometri', 'statist', 'kalkul'],
    jazyky:       ['angl', 'němč', 'češt', 'španěl', 'francouz', 'jazyk', 'latin'],
    prirodni:     ['fyz', 'chem', 'bio', 'přírod', 'ekolog', 'geograf'],
    humanitni:    ['děj', 'filosof', 'psycholog', 'sociolog', 'humanit', 'ekonom'],
    programovani: ['prog', 'kód', 'python', 'java', 'web', 'it ', 'software', 'html', 'css', 'grafik', 'sociální'],
  }

  let filtered = vsechnyInzeraty.filter(i => {
    if (aktivniKategorie !== 'vse') {
      const klicova = KATEGORIE_MAP[aktivniKategorie] || []
      const predmet = (i.predmet || '').toLowerCase()
      const nazev   = (i.nazev   || '').toLowerCase()
      if (!klicova.some(k => predmet.includes(k) || nazev.includes(k))) return false
    }
    if (query) {
      const text = `${i.nazev} ${i.predmet} ${i.popis || ''} ${i.lokalita || ''}`.toLowerCase()
      if (!text.includes(query)) return false
    }
    return true
  })

  if (!filtered.length) {
    grid.innerHTML = '<div class="loading-msg">Žádné výsledky 🔍</div>'
    return
  }

  grid.innerHTML = filtered.map(renderKarta).join('')
}

function renderKarta(i) {
  const cena = i.cena_dohodou ? 'Dohodou'
    : i.cena_od && i.cena_do ? `${i.cena_od} – ${i.cena_do} Kč/hod`
    : i.cena_od ? `od ${i.cena_od} Kč/hod` : ''

  const emoji = getPredmetEmoji(i.predmet)
  const cls   = getPredmetClass(i.predmet)
  const img   = i.obrazek_url
    ? `<img src="${i.obrazek_url}" style="width:100%;height:100%;object-fit:cover">`
    : `<span style="font-size:52px">${emoji}</span>`

  return `
    <div class="card" onclick="otevritDetail('${i.id}')" style="cursor:pointer">
      <div class="card-img ${cls}">${img}</div>
      <div class="card-body">
        <div class="card-meta">
          <span class="card-subject">📚 ${escHtml(i.predmet || 'Doučování')}</span>
        </div>
        <div class="card-title">${escHtml(i.nazev)}</div>
        ${cena ? `<div class="card-price">💰 ${escHtml(cena)}</div>` : ''}
        ${i.lokalita ? `<div class="card-loc">📍 ${escHtml(i.lokalita)}</div>` : ''}
      </div>
    </div>`
}

// ─────────────────────────────────────
//  detail inzerátu
// ─────────────────────────────────────
let detailInzeratId = null

function otevritDetail(id) {
  const inzerat = vsechnyInzeraty.find(i => i.id === id)
  if (!inzerat) return
  detailInzeratId = id

  const cena = inzerat.cena_dohodou ? 'Dohodou'
    : inzerat.cena_od && inzerat.cena_do ? `${inzerat.cena_od} – ${inzerat.cena_do} Kč/hod`
    : inzerat.cena_od ? `od ${inzerat.cena_od} Kč/hod` : null

  const emoji = getPredmetEmoji(inzerat.predmet)
  const cls   = getPredmetClass(inzerat.predmet)

  const obrazekWrap = document.getElementById('detail-obrazek-wrap')
  if (inzerat.obrazek_url) {
    obrazekWrap.innerHTML = `<img src="${inzerat.obrazek_url}" alt="${escHtml(inzerat.nazev)}">`
  } else {
    obrazekWrap.innerHTML = `<div class="detail-obrazek-placeholder ${cls}">${emoji}</div>`
  }

  const tags = [inzerat.predmet, inzerat.koho_hledam].filter(Boolean)
  document.getElementById('detail-tags').innerHTML = tags.map(t =>
    `<span class="detail-tag">📚 ${escHtml(t)}</span>`
  ).join('')

  document.getElementById('detail-nazev').textContent = inzerat.nazev

  const meta = []
  if (cena)             meta.push(`<span>💰 ${escHtml(cena)}</span>`)
  if (inzerat.lokalita) meta.push(`<span>📍 ${escHtml(inzerat.lokalita)}</span>`)
  document.getElementById('detail-meta').innerHTML = meta.join('')

  const popisEl = document.getElementById('detail-popis')
  if (inzerat.popis && inzerat.popis !== '<br>' && inzerat.popis.trim()) {
    popisEl.innerHTML = inzerat.popis
    popisEl.style.display = 'block'
  } else {
    popisEl.style.display = 'none'
  }

  const jmeno = inzerat.autor_jmeno || (inzerat.autor_email ? inzerat.autor_email.split('@')[0] : 'Tutor')
  const initials = jmeno.charAt(0).toUpperCase()
  document.getElementById('detail-autor').innerHTML = `
    <div class="detail-autor-avatar">${initials}</div>
    <div class="detail-autor-info">
      <div class="detail-autor-jmeno">${escHtml(jmeno)}</div>
      <div>Tutor</div>
    </div>`

  const jmenoInput = document.getElementById('detail-zajem-jmeno')
  const emailInput = document.getElementById('detail-zajem-email')
  const errorEl    = document.getElementById('detail-zajem-error')
  if (jmenoInput) {
    jmenoInput.value = currentUser ? (currentUser.user_metadata?.jmeno || '') : ''
    jmenoInput.readOnly = !!currentUser
    jmenoInput.style.background = currentUser ? '#F3F4F6' : ''
  }
  if (emailInput) {
    emailInput.value = currentUser ? currentUser.email : ''
    emailInput.readOnly = !!currentUser
    emailInput.style.background = currentUser ? '#F3F4F6' : ''
  }
  if (errorEl) errorEl.style.display = 'none'
  const textarea = document.getElementById('detail-zajem-zprava')
  if (textarea) textarea.value = ''
  const oldSuccess = document.getElementById('detail-zajem-success')
  if (oldSuccess) oldSuccess.remove()
  const btn = document.getElementById('btn-detail-odeslat')
  if (btn) { btn.disabled = false; btn.textContent = 'Odeslat zájem' }

  // Odstraň heart tlačítko z detailu (oblíbené zrušeno)
  const heartBtn = document.getElementById('detail-heart-btn')
  if (heartBtn) heartBtn.style.display = 'none'

  document.getElementById('modal-detail').classList.add('show')
  document.body.style.overflow = 'hidden'
}

function zavritDetail(e) {
  if (e && e.target !== document.getElementById('modal-detail')) return
  closeModal('modal-detail')
  document.body.style.overflow = ''
}

async function odeslatZajemZDetailu() {
  const jmeno  = document.getElementById('detail-zajem-jmeno')?.value.trim()
  const email  = document.getElementById('detail-zajem-email')?.value.trim()
  const zprava = document.getElementById('detail-zajem-zprava')?.value.trim()
  const errorEl = document.getElementById('detail-zajem-error')

  if (!jmeno || !email) {
    if (errorEl) { errorEl.textContent = 'Vyplň jméno a email.'; errorEl.style.display = 'block' }
    return
  }
  if (!email.includes('@')) {
    if (errorEl) { errorEl.textContent = 'Zadej platný email.'; errorEl.style.display = 'block' }
    return
  }
  if (errorEl) errorEl.style.display = 'none'

  const btn = document.getElementById('btn-detail-odeslat')
  if (btn) { btn.disabled = true; btn.textContent = 'Odesílám...' }

  const { error } = await supabase.from('zajem').insert({
    inzerat_id: detailInzeratId,
    od_user_id: currentUser?.id || null,
    zprava:     zprava || null,
    od_email:   email,
    od_jmeno:   jmeno
  })

  if (error) {
    if (btn) { btn.disabled = false; btn.textContent = 'Odeslat zájem' }
    if (errorEl) { errorEl.textContent = 'Chyba: ' + error.message; errorEl.style.display = 'block' }
    return
  }

  if (btn) { btn.disabled = true; btn.textContent = '✅ Zájem odeslán!' }
  const section = document.querySelector('.detail-zajem-section')
  if (section) {
    const s = document.createElement('div')
    s.id = 'detail-zajem-success'
    s.className = 'detail-success'
    s.textContent = 'Tvůj zájem byl odeslán! Tutor tě brzy kontaktuje.'
    section.appendChild(s)
  }
}

function projevitZajemZDetailu() {
  odeslatZajemZDetailu()
}

// ─────────────────────────────────────
//  kontrola cenových hodnot
// ─────────────────────────────────────
function validatePriceInput(input) {
  // povolení pouze čísel a desetinných čárek
  let val = input.value.replace(/[^0-9.,]/g, '')
  // stanovení desetinné čárky
  val = val.replace(',', '.')
  // desetinné tečky
  const parts = val.split('.')
  if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('')
  // eliminace záporných čísel
  if (parseFloat(val) < 0) val = ''
  input.value = val
}

function validatePriceRange() {
  const minEl = document.getElementById('price-min')
  const maxEl = document.getElementById('price-max')
  const errEl = document.getElementById('price-error')
  if (!minEl || !maxEl) return true

  const od = parseFloat(minEl.value)
  const do_ = parseFloat(maxEl.value)

  if (minEl.value && maxEl.value && !isNaN(od) && !isNaN(do_)) {
    if (od > do_) {
      if (errEl) { errEl.textContent = 'Cena „od" musí být menší než „do".'; errEl.style.display = 'block' }
      minEl.style.borderColor = '#DC2626'
      maxEl.style.borderColor = '#DC2626'
      return false
    }
  }
  if (errEl) errEl.style.display = 'none'
  minEl.style.borderColor = ''
  maxEl.style.borderColor = ''
  return true
}

function validateEditPriceRange() {
  const minEl = document.getElementById('edit-cena-od')
  const maxEl = document.getElementById('edit-cena-do')
  const errEl = document.getElementById('edit-error')
  if (!minEl || !maxEl) return true

  const od = parseFloat(minEl.value)
  const do_ = parseFloat(maxEl.value)

  if (minEl.value && maxEl.value && !isNaN(od) && !isNaN(do_)) {
    if (od > do_) {
      if (errEl) { errEl.textContent = 'Cena „od" musí být menší než „do".'; errEl.style.display = 'block' }
      return false
    }
  }
  if (errEl) errEl.style.display = 'none'
  return true
}

// ─────────────────────────────────────
//  přidání inzerátu
// ─────────────────────────────────────
async function pridatInzerat() {
  if (!currentUser) { document.getElementById('modal-auth-guard').classList.add('show'); return }

  const nazev   = document.querySelector('#page-add input[placeholder="Název inzerátu"]')?.value.trim()
  const popis   = document.getElementById('rte')?.innerHTML
  const predmet = document.getElementById('predmet-input')?.value.trim()
  const lok     = document.querySelector('#page-add input[placeholder="Lokalita (Praha, Online...)"]')?.value.trim()
  const koho    = document.getElementById('dd-kdo-label')?.textContent
  const cenaOd  = document.getElementById('price-min')?.value || null
  const cenaDo  = document.getElementById('price-max')?.value || null
  const dohod   = document.getElementById('price-dohodou')?.checked

  if (!nazev)   return showError('add-error', 'Zadej název inzerátu.')
  if (!predmet) return showError('add-error', 'Vyber předmět.')
  if (!dohod && !validatePriceRange()) return

  setLoading('btn-add', true)

  let obrazekUrl = null
  const imgInput = document.getElementById('img-input')
  if (imgInput?.files[0]) obrazekUrl = await uploadObrazek(imgInput.files[0])

  const { error } = await supabase.from('inzeraty').insert({
    user_id: currentUser.id, nazev, popis, predmet,
    lokalita:    lok || null,
    koho_hledam: koho !== 'Koho hledám' ? koho : null,
    cena_od:     cenaOd ? parseFloat(cenaOd) : null,
    cena_do:     cenaDo ? parseFloat(cenaDo) : null,
    cena_dohodou: dohod,
    obrazek_url: obrazekUrl,
    autor_jmeno: currentUser.user_metadata?.jmeno || null,
    autor_email: currentUser.email
  })

  setLoading('btn-add', false)

  if (error) return showError('add-error', 'Chyba: ' + error.message)
  document.getElementById('modal-success').classList.add('show')
}

async function uploadObrazek(file) {
  const ext      = file.name.split('.').pop().toLowerCase()
  const allowed  = ['jpg','jpeg','png','webp','gif']
  if (!allowed.includes(ext)) { showToast('Podporované formáty: jpg, png, webp'); return null }

  const name = `inzeraty/${currentUser.id}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('obrazky').upload(name, file, {
    upsert: true,
    contentType: file.type
  })
  if (error) { console.error('Upload error:', error.message); showToast('Chyba uploadu: ' + error.message); return null }
  const { data } = supabase.storage.from('obrazky').getPublicUrl(name)
  return data.publicUrl
}

// ─────────────────────────────────────
//  helpery
// ─────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = msg; el.style.display = 'block'
  setTimeout(() => { el.style.display = 'none' }, 4000)
}

function showToast(msg) {
  const t = document.createElement('div')
  t.className = 'toast'; t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.classList.add('show'), 10)
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300) }, 3500)
}

function setLoading(id, loading) {
  const btn = document.getElementById(id)
  if (!btn) return
  btn.disabled = loading; btn.style.opacity = loading ? '0.7' : '1'
  if (loading) btn.dataset.orig = btn.textContent
  else btn.textContent = btn.dataset.orig || btn.textContent
}

function prekladChyby(msg) {
  if (msg.includes('Invalid login'))       return 'Špatný email nebo heslo.'
  if (msg.includes('Email not confirmed')) return 'Nejdřív potvrď email v emailu.'
  if (msg.includes('already registered'))  return 'Tento email je již registrován.'
  if (msg.includes('Password should be'))  return 'Heslo musí mít alespoň 6 znaků.'
  if (msg.includes('rate limit'))          return 'Příliš mnoho pokusů, zkus to za chvíli.'
  return msg
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function getPredmetEmoji(p = '') {
  p = p.toLowerCase()
  if (p.includes('mat'))  return '🧮'
  if (p.includes('angl')) return '🇬🇧'
  if (p.includes('fyz'))  return '⚗️'
  if (p.includes('bio'))  return '🧬'
  if (p.includes('češt')) return '📝'
  if (p.includes('prog')) return '💻'
  if (p.includes('děj'))  return '🗺️'
  if (p.includes('chem')) return '🔬'
  if (p.includes('hud'))  return '🎵'
  if (p.includes('němč')) return '🇩🇪'
  return '📚'
}

function getPredmetClass(p = '') {
  p = p.toLowerCase()
  if (p.includes('mat'))  return 'math'
  if (p.includes('angl')) return 'english'
  if (p.includes('fyz') || p.includes('chem')) return 'physics'
  if (p.includes('češt')) return 'czech'
  return 'math'
}

// ─────────────────────────────────────
//  menu / ui
// ─────────────────────────────────────
function openMenu()  { document.getElementById('slide-menu').classList.add('open'); document.getElementById('menu-overlay').classList.add('open') }
function closeMenu() { document.getElementById('slide-menu').classList.remove('open'); document.getElementById('menu-overlay').classList.remove('open') }
function togglePw(id, btn) { const i = document.getElementById(id); i.type = i.type === 'password' ? 'text' : 'password'; btn.textContent = i.type === 'text' ? '🙈' : '👁' }
function previewImg(input) {
  if (!input.files?.[0]) return
  const r = new FileReader()
  r.onload = e => { document.getElementById('upload-preview').src = e.target.result; document.getElementById('upload-preview').style.display = 'block'; document.getElementById('upload-placeholder').style.display = 'none' }
  r.readAsDataURL(input.files[0])
}
function fmt(cmd) { document.execCommand(cmd, false, null); document.getElementById('rte').focus() }
function fmtBlock(tag) { if (tag) document.execCommand('formatBlock', false, tag); document.getElementById('rte').focus() }
function togglePriceDohodou(cb) {
  ;['price-min','price-max'].forEach(id => { const el = document.getElementById(id); el.disabled = cb.checked; el.style.opacity = cb.checked ? '0.4' : '1' })
  const errEl = document.getElementById('price-error')
  if (cb.checked && errEl) errEl.style.display = 'none'
}
function openPredmet()  { document.getElementById('predmet-panel').classList.add('open'); document.getElementById('predmet-chevron').style.transform = 'rotate(180deg)' }
function closePredmet() { document.getElementById('predmet-panel').classList.remove('open'); document.getElementById('predmet-chevron').style.transform = 'rotate(0deg)' }
function filterPredmet(val) {
  openPredmet()
  const q = val.toLowerCase().trim()
  document.querySelectorAll('.predmet-item').forEach(i => i.classList.toggle('hidden', !i.dataset.val.toLowerCase().includes(q)))
  const exact = [...document.querySelectorAll('.predmet-item')].some(i => i.dataset.val.toLowerCase().replace(/^.\s/,'') === q)
  const cr = document.getElementById('predmet-custom-row')
  if (val.length > 0 && !exact) { document.getElementById('predmet-custom-text').textContent = val; cr.style.display = 'flex' }
  else cr.style.display = 'none'
}
function selectPredmet(el) {
  document.querySelectorAll('.predmet-item').forEach(i => i.classList.remove('selected'))
  el.classList.add('selected'); document.getElementById('predmet-input').value = el.dataset.val
  document.getElementById('predmet-custom-row').style.display = 'none'; closePredmet()
}
function useCustomPredmet() { closePredmet(); document.getElementById('predmet-custom-row').style.display = 'none'; document.querySelectorAll('.predmet-item').forEach(i => i.classList.remove('selected')) }
document.addEventListener('click', e => { if (!e.target.closest('#predmet-wrap')) closePredmet() })
function toggleDropdown(id) { const dd = document.getElementById(id); const open = dd.classList.contains('open'); document.querySelectorAll('.dropdown-list').forEach(d => d.classList.remove('open')); if (!open) dd.classList.add('open') }
function selectDd(id, val) { document.getElementById(id+'-label').textContent = val; document.getElementById(id+'-label').style.color = 'var(--dark)'; document.getElementById(id).classList.remove('open') }
document.addEventListener('click', e => { if (!e.target.closest('.select-wrap') && !e.target.closest('.dropdown-list')) document.querySelectorAll('.dropdown-list').forEach(d => d.classList.remove('open')) })

// ─────────────────────────────────────
//  "dark mode"
// ─────────────────────────────────────
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark')
  localStorage.setItem('darkMode', isDark ? '1' : '0')
  const emoji = isDark ? '☀️' : '🌙'
  const label = isDark ? 'Denní režim' : 'Noční režim'
  const btn = document.getElementById('dark-mode-btn')
  if (btn) btn.textContent = emoji
  const btnMobile = document.getElementById('dark-mode-btn-mobile')
  if (btnMobile) btnMobile.textContent = emoji
  const labelMobile = document.getElementById('dark-mode-label-mobile')
  if (labelMobile) labelMobile.textContent = label
}

function initDarkMode() {
  const saved = localStorage.getItem('darkMode')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = saved !== null ? saved === '1' : prefersDark
  if (isDark) {
    document.body.classList.add('dark')
    const btn = document.getElementById('dark-mode-btn')
    if (btn) btn.textContent = '☀️'
    const btnMobile = document.getElementById('dark-mode-btn-mobile')
    if (btnMobile) btnMobile.textContent = '☀️'
    const labelMobile = document.getElementById('dark-mode-label-mobile')
    if (labelMobile) labelMobile.textContent = 'Denní režim'
  }
}

function toggleMobileSearch() {
  const wrap = document.getElementById('mobile-search-input-wrap')
  const input = document.getElementById('mobile-search-input')
  const isOpen = wrap.classList.toggle('open')
  if (isOpen) { setTimeout(() => input.focus(), 300) }
  else { input.value = ''; syncMobileSearch('') }
}

function clearMobileSearch() {
  const input = document.getElementById('mobile-search-input')
  input.value = ''
  syncMobileSearch('')
  input.focus()
}

function syncMobileSearch(val) {
  zobrazFiltrované()
}

function setKategorieById(kat) {
  const tab = document.querySelector(`.tab[data-kategorie="${kat}"]`)
  if (tab) setKategorie(tab)
  // synchronizuj select
  const sel = document.getElementById('browse-cat-select')
  if (sel) sel.value = kat
}

function setQuickKat(el) {
  document.querySelectorAll('.quick-cat').forEach(b => b.classList.remove('active'))
  el.classList.add('active')
  aktivniKategorie = el.dataset.kategorie
  zobrazFiltrované()
}

function clearBrowseSearch() {
  const input = document.getElementById('browse-search-input')
  if (input) { input.value = ''; input.focus() }
  const clearBtn = document.getElementById('browse-search-clear')
  if (clearBtn) clearBtn.style.display = 'none'
  zobrazFiltrované()
}

// listener pro select → kategorie
document.addEventListener('kategorieChange', (e) => {
  aktivniKategorie = e.detail
  zobrazFiltrované()
})

Object.assign(window, { toggleMobileSearch, clearMobileSearch, syncMobileSearch, setKategorieById })

// ─────────────────────────────────────
//  profil
// ─────────────────────────────────────
async function nactiProfil() {
  if (!currentUser) return

  const jmeno = currentUser.user_metadata?.jmeno || ''
  const prijmeni = currentUser.user_metadata?.prijmeni || ''
  const displayJmeno = [jmeno, prijmeni].filter(Boolean).join(' ') || currentUser.email.split('@')[0]

  const avatarEl = document.getElementById('profil-avatar')
  const jmenoEl  = document.getElementById('profil-jmeno')
  const emailEl  = document.getElementById('profil-email')

  if (avatarEl) avatarEl.textContent = displayJmeno.charAt(0).toUpperCase()
  if (jmenoEl)  jmenoEl.textContent  = displayJmeno
  if (emailEl)  emailEl.textContent  = currentUser.email

  nactiMojeInzeraty()
}

async function nactiMojeInzeraty() {
  const list = document.getElementById('moje-inzeraty-list')
  if (!list || !currentUser) return

  list.innerHTML = '<div class="profil-empty"><div class="profil-empty-icon">⏳</div><p>Načítám...</p></div>'

  const { data, error } = await supabase
    .from('inzeraty')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })

  if (error || !data) {
    list.innerHTML = '<div class="profil-empty"><div class="profil-empty-icon">😕</div><h3>Chyba při načítání</h3></div>'
    return
  }

  if (data.length === 0) {
    list.innerHTML = `
      <div class="profil-empty">
        <div class="profil-empty-icon">📋</div>
        <h3>Zatím žádné inzeráty</h3>
        <p>Přidej svůj první inzerát a oslovuj studenty.</p>
        <button class="submit-btn" style="max-width:220px;margin:16px auto 0" onclick="showPage('page-add')">+ Přidat inzerát</button>
      </div>`
    return
  }

  list.innerHTML = data.map(i => renderProfilInzerat(i)).join('')
}

function renderProfilInzerat(i) {
  const emoji = getPredmetEmoji(i.predmet)
  const cena  = i.cena_dohodou ? 'Dohodou'
    : i.cena_od ? `${i.cena_od}${i.cena_do ? ' – ' + i.cena_do : ''} Kč/hod` : '—'
  const datum = new Date(i.created_at).toLocaleDateString('cs-CZ', { day:'numeric', month:'short', year:'numeric' })

  return `
    <div class="profil-inzerat-card" id="inzerat-card-${i.id}">
      <div class="profil-inzerat-emoji">${emoji}</div>
      <div class="profil-inzerat-body">
        <div class="profil-inzerat-nazev">${escHtml(i.nazev)}</div>
        <div class="profil-inzerat-meta">
          <span class="profil-inzerat-tag">📚 ${escHtml(i.predmet || '—')}</span>
          ${i.lokalita ? `<span class="profil-inzerat-tag">📍 ${escHtml(i.lokalita)}</span>` : ''}
          <span class="profil-inzerat-tag">💰 ${cena}</span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">Přidáno ${datum}</div>
      </div>
      <div class="profil-inzerat-actions">
        <button class="profil-btn edit" onclick="otevritEditModal('${i.id}')">✏️ Upravit</button>
        <button class="profil-btn delete" onclick="potvrditSmazani('${i.id}')">🗑 Smazat</button>
      </div>
    </div>`
}

async function nactiPrijatyZajem() {
  const list = document.getElementById('zajem-list')
  if (!list || !currentUser) return

  list.innerHTML = '<div class="profil-empty"><div class="profil-empty-icon">⏳</div><p>Načítám...</p></div>'

  const { data: mojeInzeraty } = await supabase
    .from('inzeraty')
    .select('id')
    .eq('user_id', currentUser.id)

  if (!mojeInzeraty || mojeInzeraty.length === 0) {
    list.innerHTML = `
      <div class="profil-empty">
        <div class="profil-empty-icon">💬</div>
        <h3>Zatím žádný zájem</h3>
        <p>Zde uvidíš zprávy od studentů, kteří se zajímají o tvé inzeráty.</p>
      </div>`
    return
  }

  const ids = mojeInzeraty.map(i => i.id)

  const { data, error } = await supabase
    .from('zajem')
    .select('*')
    .in('inzerat_id', ids)
    .order('created_at', { ascending: false })

  if (error) {
    list.innerHTML = '<div class="profil-empty"><div class="profil-empty-icon">😕</div><h3>Chyba při načítání</h3></div>'
    return
  }

  if (!data || data.length === 0) {
    list.innerHTML = `
      <div class="profil-empty">
        <div class="profil-empty-icon">💬</div>
        <h3>Zatím žádný zájem</h3>
        <p>Zde uvidíš zprávy od studentů, kteří se zajímají o tvé inzeráty.</p>
      </div>`
    return
  }

  list.innerHTML = data.map(z => renderZajemKarta(z)).join('')
}

function renderZajemKarta(z) {
  const datum = new Date(z.created_at).toLocaleDateString('cs-CZ', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
  const jmeno = z.od_jmeno || z.od_email || 'Anonymní'

  return `
    <div class="zajem-card">
      <div class="zajem-card-header">
        <div>
          <div class="zajem-od">👤 ${escHtml(jmeno)}</div>
          ${z.od_email ? `<div style="font-size:12px;color:var(--muted)">${escHtml(z.od_email)}</div>` : ''}
        </div>
      </div>
      ${z.zprava ? `<div class="zajem-zprava">"${escHtml(z.zprava)}"</div>` : ''}
      <div class="zajem-datum">📅 ${datum}</div>
    </div>`
}

function switchProfilTab(tab) {
  document.querySelectorAll('.profil-tab').forEach(t => t.classList.remove('active'))
  document.getElementById('ptab-' + tab).classList.add('active')
  document.getElementById('ptab-content-moje').style.display  = tab === 'moje'  ? 'block' : 'none'
  document.getElementById('ptab-content-zajem').style.display = tab === 'zajem' ? 'block' : 'none'
  if (tab === 'zajem') nactiPrijatyZajem()
  else nactiMojeInzeraty()
}

let inzeratKeSmazani = null

function potvrditSmazani(id) {
  inzeratKeSmazani = id
  document.getElementById('modal-smazat').classList.add('show')
  document.getElementById('btn-confirm-smazat').onclick = () => smazatInzerat(id)
}

async function smazatInzerat(id) {
  closeModal('modal-smazat')
  const { error } = await supabase.from('inzeraty').delete().eq('id', id)
  if (error) { showToast('Chyba při mazání: ' + error.message); return }
  const card = document.getElementById('inzerat-card-' + id)
  if (card) card.style.display = 'none'
  showToast('Inzerát byl smazán 🗑')
  nactiMojeInzeraty()
}

let inzeratProZajem = null

function projevitZajem(inzeratId) {
  if (!currentUser) {
    document.getElementById('modal-auth-guard').classList.add('show')
    return
  }
  inzeratProZajem = inzeratId
  document.getElementById('modal-zajem').classList.add('show')
  document.getElementById('zajem-zprava-input').value = ''
}

async function odeslatzajem() {
  if (!currentUser || !inzeratProZajem) return
  const zprava = document.getElementById('zajem-zprava-input')?.value.trim()

  setLoading('btn-odeslat-zajem', true)

  const { error } = await supabase.from('zajem').insert({
    inzerat_id: inzeratProZajem,
    od_user_id: currentUser.id,
    zprava: zprava || null,
    od_email: currentUser.email,
    od_jmeno: currentUser.user_metadata?.jmeno || null
  })

  setLoading('btn-odeslat-zajem', false)

  if (error) { showToast('Chyba: ' + error.message); return }
  closeModal('modal-zajem')
  showToast('Zájem byl odeslán! 🎉')
  inzeratProZajem = null
}

let inzeratProEdit = null
let editNovyObrazek = null

function editPreviewImg(input) {
  if (!input.files?.[0]) return
  editNovyObrazek = input.files[0]
  const r = new FileReader()
  r.onload = e => {
    const prev = document.getElementById('edit-upload-preview')
    const ph   = document.getElementById('edit-upload-placeholder')
    prev.src = e.target.result; prev.style.display = 'block'
    ph.style.display = 'none'
  }
  r.readAsDataURL(input.files[0])
}

function otevritEditModal(id) {
  const inzerat = vsechnyInzeraty.find(i => i.id === id)
    || { id, nazev:'', predmet:'', lokalita:'', cena_od:null, cena_do:null, cena_dohodou:false, obrazek_url:null }
  inzeratProEdit = id
  editNovyObrazek = null

  const prev = document.getElementById('edit-upload-preview')
  const ph   = document.getElementById('edit-upload-placeholder')
  const imgInput = document.getElementById('edit-img-input')
  if (imgInput) imgInput.value = ''
  if (prev) {
    if (inzerat.obrazek_url) {
      prev.src = inzerat.obrazek_url; prev.style.display = 'block'
      if (ph) ph.style.display = 'none'
    } else {
      prev.style.display = 'none'
      if (ph) ph.style.display = 'flex'
    }
  }

  supabase.from('inzeraty').select('*').eq('id', id).single().then(({ data }) => {
    if (data) {
      document.getElementById('edit-nazev').value    = data.nazev || ''
      document.getElementById('edit-predmet').value  = data.predmet || ''
      document.getElementById('edit-lokalita').value = data.lokalita || ''
      document.getElementById('edit-cena-od').value  = data.cena_od || ''
      document.getElementById('edit-cena-do').value  = data.cena_do || ''
      const cb = document.getElementById('edit-dohodou')
      cb.checked = !!data.cena_dohodou; toggleEditDohodou(cb)
      if (data.obrazek_url && !editNovyObrazek) {
        const p = document.getElementById('edit-upload-preview')
        const pl = document.getElementById('edit-upload-placeholder')
        if (p) { p.src = data.obrazek_url; p.style.display = 'block' }
        if (pl) pl.style.display = 'none'
      }
    }
  })

  document.getElementById('edit-nazev').value    = inzerat.nazev || ''
  document.getElementById('edit-predmet').value  = inzerat.predmet || ''
  document.getElementById('edit-lokalita').value = inzerat.lokalita || ''
  document.getElementById('edit-cena-od').value  = inzerat.cena_od || ''
  document.getElementById('edit-cena-do').value  = inzerat.cena_do || ''
  const cb = document.getElementById('edit-dohodou')
  cb.checked = !!inzerat.cena_dohodou; toggleEditDohodou(cb)

  const errEl = document.getElementById('edit-error')
  if (errEl) errEl.style.display = 'none'
  document.getElementById('modal-edit').classList.add('show')
}

function toggleEditDohodou(cb) {
  ;['edit-cena-od','edit-cena-do'].forEach(id => {
    const el = document.getElementById(id)
    if (el) { el.disabled = cb.checked; el.style.opacity = cb.checked ? '0.4' : '1' }
  })
}

async function ulozitUpravuInzeratu() {
  if (!inzeratProEdit) return
  const nazev    = document.getElementById('edit-nazev').value.trim()
  const predmet  = document.getElementById('edit-predmet').value.trim()
  const lokalita = document.getElementById('edit-lokalita').value.trim()
  const cenaOd   = document.getElementById('edit-cena-od').value || null
  const cenaDo   = document.getElementById('edit-cena-do').value || null
  const dohodou  = document.getElementById('edit-dohodou').checked

  if (!nazev)   return showError('edit-error', 'Zadej název inzerátu.')
  if (!predmet) return showError('edit-error', 'Zadej předmět.')
  if (!dohodou && !validateEditPriceRange()) return

  setLoading('btn-edit-save', true)

  let obrazekUrl = undefined
  if (editNovyObrazek) {
    obrazekUrl = await uploadObrazek(editNovyObrazek)
  }

  const updates = {
    nazev, predmet,
    lokalita:    lokalita || null,
    cena_od:     cenaOd ? parseFloat(cenaOd) : null,
    cena_do:     cenaDo ? parseFloat(cenaDo) : null,
    cena_dohodou: dohodou
  }
  if (obrazekUrl !== undefined) updates.obrazek_url = obrazekUrl

  const { error } = await supabase.from('inzeraty').update(updates).eq('id', inzeratProEdit)

  setLoading('btn-edit-save', false)

  if (error) return showError('edit-error', 'Chyba: ' + error.message)
  closeModal('modal-edit')
  showToast('Inzerát byl upraven ✅')
  inzeratProEdit = null
  editNovyObrazek = null
  nactiMojeInzeraty()
  nactiInzeraty()
}

Object.assign(window, {
  nactiProfil, switchProfilTab, potvrditSmazani, smazatInzerat,
  projevitZajem, odeslatzajem,
  otevritEditModal, toggleEditDohodou, ulozitUpravuInzeratu, editPreviewImg,
  validatePriceInput, validatePriceRange, validateEditPriceRange
})

Object.assign(window, {
  showPage, closeModal, doLogin, doRegister, doLogout,
  openForgotModal, doForgotPassword, doSetNewPassword,
  openMenu, closeMenu, togglePw, previewImg, fmt, fmtBlock,
  togglePriceDohodou, openPredmet, filterPredmet, selectPredmet,
  useCustomPredmet, toggleDropdown, selectDd, pridatInzerat,
  setKategorie, filterInzeraty, otevritDetail, zavritDetail, projevitZajemZDetailu, odeslatZajemZDetailu,
  toggleDarkMode, toggleMobileSearch, clearMobileSearch, syncMobileSearch, setKategorieById,
  setQuickKat, clearBrowseSearch
})
