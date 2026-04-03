// ════════════════════════════════════
//   nauc.me — app.js
// ════════════════════════════════════

import { supabase } from './supabase.js'

// ─────────────────────────────────────
//  STAV
// ─────────────────────────────────────
let currentUser = null

// ─────────────────────────────────────
//  INIT
// ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) { currentUser = session.user; onLogin(currentUser) }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) { currentUser = session.user; onLogin(currentUser) }
    else         { currentUser = null; onLogout() }
  })

  nactiInzeraty()

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
      this.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      this.classList.add('active')
    })
  })
})

// ─────────────────────────────────────
//  NAVIGACE
// ─────────────────────────────────────
function showPage(id) {
  if (id === 'page-add' && !currentUser) {
    document.getElementById('modal-auth-guard').classList.add('show')
    return
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.getElementById(id).classList.add('active')
  window.scrollTo(0, 0)
  if (id === 'page-browse') nactiInzeraty()
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show')
}

// ─────────────────────────────────────
//  REGISTRACE
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
    options: { data: { jmeno, prijmeni, telefon } }
  })
  setLoading('btn-register', false)

  if (error) return showError('reg-error', prekladChyby(error.message))
  showPage('page-home')
  showToast('Zkontroluj email a potvrď registraci 📧')
}

// ─────────────────────────────────────
//  PŘIHLÁŠENÍ
// ─────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('login-email').value.trim()
  const heslo = document.getElementById('login-heslo').value

  if (!email || !heslo) return showError('login-error', 'Vyplň email a heslo.')

  setLoading('btn-login', true)
  const { error } = await supabase.auth.signInWithPassword({ email, password: heslo })
  setLoading('btn-login', false)

  if (error) return showError('login-error', prekladChyby(error.message))
}

// ─────────────────────────────────────
//  ODHLÁŠENÍ
// ─────────────────────────────────────
async function doLogout() {
  await supabase.auth.signOut()
  closeMenu()
}

function onLogin(user) {
  document.getElementById('nav-lo').style.display = 'none'
  document.getElementById('nav-li').style.display = 'inline-flex'
  document.getElementById('sm-logged-out').style.display = 'none'
  document.getElementById('sm-logged-in').style.display = 'block'
  const jmeno = user.user_metadata?.jmeno || user.email.split('@')[0]
  const el = document.getElementById('nav-user-name')
  if (el) el.textContent = jmeno
}

function onLogout() {
  document.getElementById('nav-lo').style.display = 'inline-flex'
  document.getElementById('nav-li').style.display = 'none'
  document.getElementById('sm-logged-out').style.display = 'block'
  document.getElementById('sm-logged-in').style.display = 'none'
  showPage('page-home')
}

// ─────────────────────────────────────
//  NAČTENÍ INZERÁTŮ
// ─────────────────────────────────────
async function nactiInzeraty() {
  const grid = document.getElementById('cards-grid')
  if (!grid) return

  grid.innerHTML = '<div class="loading-msg">Načítám inzeráty...</div>'

  const { data: inzeraty, error } = await supabase
    .from('inzeraty')
    .select('*, profily(jmeno, prijmeni)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) { grid.innerHTML = '<div class="loading-msg">Chyba při načítání 😕</div>'; return }
  if (!inzeraty.length) { grid.innerHTML = '<div class="loading-msg">Zatím žádné inzeráty. Buď první! 🚀</div>'; return }

  grid.innerHTML = inzeraty.map(renderKarta).join('')

  grid.querySelectorAll('.heart-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation()
      this.textContent = this.textContent.trim() === '🤍' ? '❤️' : '🤍'
    })
  })
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
    <div class="card">
      <div class="card-img ${cls}">
        <div class="heart-btn">🤍</div>${img}
      </div>
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
//  PŘIDÁNÍ INZERÁTU
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

  setLoading('btn-add', true)

  let obrazekUrl = null
  const imgInput = document.getElementById('img-input')
  if (imgInput?.files[0]) obrazekUrl = await uploadObrazek(imgInput.files[0])

  const { error } = await supabase.from('inzeraty').insert({
    user_id: currentUser.id, nazev, popis, predmet,
    lokalita:    lok || null,
    koho_hledam: koho !== 'Koho hledám' ? koho : null,
    cena_od:     cenaOd ? parseInt(cenaOd) : null,
    cena_do:     cenaDo ? parseInt(cenaDo) : null,
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
  const ext  = file.name.split('.').pop()
  const name = `${currentUser.id}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('obrazky').upload(name, file, { upsert: true })
  if (error) { console.error(error); return null }
  return supabase.storage.from('obrazky').getPublicUrl(name).data.publicUrl
}

// ─────────────────────────────────────
//  HELPERS
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
//  MENU / UI
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
//  GLOBAL EXPORT
// ─────────────────────────────────────
Object.assign(window, {
  showPage, closeModal, doLogin, doRegister, doLogout,
  openMenu, closeMenu, togglePw, previewImg, fmt, fmtBlock,
  togglePriceDohodou, openPredmet, filterPredmet, selectPredmet,
  useCustomPredmet, toggleDropdown, selectDd, pridatInzerat
})
