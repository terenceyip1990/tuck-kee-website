/* ============================================================
   IPOH TUCK KEE — MAIN JS v3 (Heritage Asian Modern)
   ============================================================ */
'use strict';

/* ── STATUS BAR — live open/closed ────────────────────────── */
(function initStatusBar(){
  const pulse = document.getElementById('statusPulse');
  if (!pulse) return;
  const HOURS = {
    0:[10,22.75], 1:[11,22.75], 2:[11,22.75], 3:[11,22.75],
    4:[11,22.75], 5:[11,23.5],  6:[11,23.5],
  };
  function update(){
    const now = new Date();
    const day = now.getDay();
    const t = now.getHours() + now.getMinutes()/60;
    const [open,close] = HOURS[day];
    const isOpen = t >= open && t < close;
    const label = pulse.querySelector('.status-pulse-label');
    if (!label) return;
    if (isOpen){
      pulse.classList.remove('closed');
      label.textContent = `Open Now · Closes ${close >= 23 ? '11:30 PM' : '10:45 PM'}`;
    } else {
      pulse.classList.add('closed');
      label.textContent = `Closed · Opens ${open}:00 AM`;
    }
  }
  update();
  setInterval(update, 60*1000);
})();

/* ── NAV ──────────────────────────────────────────────────── */
(function initNav(){
  const nav    = document.getElementById('nav');
  const burger = document.getElementById('navBurger');
  const links  = document.getElementById('navLinks');
  if (nav){
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }
  if (burger && links){
    burger.addEventListener('click', () => {
      const open = links.classList.toggle('mobile-open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    document.addEventListener('click', e => {
      if (!nav?.contains(e.target) && links.classList.contains('mobile-open')){
        links.classList.remove('mobile-open');
        burger.classList.remove('open');
        document.body.style.overflow = '';
        burger.setAttribute('aria-expanded','false');
      }
    });
  }
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href') === page);
  });
})();

/* ── HERO VIDEO + SCROLL-SLICE + REVEAL + PARALLAX ─────────── */
(function initHero(){
  const video  = document.getElementById('heroVideo');
  const canvas   = document.getElementById('heroCanvas');
  const hero     = document.getElementById('heroSection');
  const copy     = document.getElementById('heroCopy');
  const wmarkL   = document.querySelector('.hero-fw-panel-l .hfp-watermark');
  const wmarkR   = document.querySelector('.hero-fw-panel-r .hfp-watermark');
  if (!video || !canvas || !hero) return;

  /* ── Canvas context ── */
  const ctx = canvas.getContext('2d', { alpha: false });

  /* Offscreen buffer for cover-fit draw */
  let buf, bCtx;
  function makeBuf(w, h){
    buf  = document.createElement('canvas');
    buf.width = w; buf.height = h;
    bCtx = buf.getContext('2d', { alpha: false });
  }

  let W = 0, H = 0;
  function resize(){
    W = canvas.width  = hero.offsetWidth  || window.innerWidth;
    H = canvas.height = hero.offsetHeight || window.innerHeight;
    makeBuf(W, H);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(hero);

  /* ── Shared input state ── */
  let winScrollY = 0;
  let mxNorm = 0, myNorm = 0; /* -0.5 … 0.5 */
  window.addEventListener('scroll',    () => { winScrollY = window.scrollY; }, { passive: true });
  window.addEventListener('mousemove', e => {
    mxNorm = e.clientX / window.innerWidth  - 0.5;
    myNorm = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });


  /* ── Smoothed values ── */
  let tSmooth    = 0;  /* scroll progress, lerped */
  let pxSmooth   = 0;  /* parallax X */
  let pySmooth   = 0;  /* parallax Y */

  /* Ease: smooth-stop (decelerates as it approaches target) */
  function lerp(a, b, k){ return a + (b - a) * k; }
  function easeOut2(t){ return 1 - (1 - t) * (1 - t); }

  /* ── Video cover draw ── */
  function drawVideoToBuf(){
    if (video.readyState < 2) return false;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return false;
    const scale = Math.max(W / vw, H / vh);
    const dw = vw * scale, dh = vh * scale;
    bCtx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return true;
  }

  /* ── Pause when off-screen ── */
  let visible = true, rafId = null;
  new IntersectionObserver(e => {
    visible = e[0].isIntersecting;
    if (visible && !rafId) rafId = requestAnimationFrame(draw);
  }, { threshold: 0 }).observe(hero);

  function draw(){
    rafId = null;
    if (!visible) return;

    /* Raw scroll progress 0→1 over hero height */
    const heroH  = hero.offsetHeight || H;
    const tRaw   = Math.max(0, Math.min(winScrollY / heroH, 1));

    /* Lerp everything toward targets */
    tSmooth  = lerp(tSmooth,  tRaw,    0.055);
    pxSmooth = lerp(pxSmooth, mxNorm,  0.07);
    pySmooth = lerp(pySmooth, myNorm,  0.07);

    /* ── Draw video to offscreen buffer ── */
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (!drawVideoToBuf()){
      rafId = requestAnimationFrame(draw);
      return;
    }

    /* ── Draw video frame smoothly, fade out on scroll ── */
    ctx.globalAlpha = Math.max(0, 1 - tSmooth * 1.6);
    ctx.drawImage(buf, 0, 0, W, H);
    ctx.globalAlpha = 1;

    /* Bottom-to-black fade (static, always present for section separation) */
    const g = ctx.createLinearGradient(0, H * 0.62, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.96)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* ── Watermark depth parallax — drift up at 60% of scroll speed ── */
    const wDrift = tSmooth * -55;
    if (wmarkL) wmarkL.style.transform = `translateY(${wDrift}px)`;
    if (wmarkR) wmarkR.style.transform = `translateY(${wDrift}px)`;

    /* ── Mouse parallax + scroll exit on copy column ── */
    if (copy){
      const px    = -pxSmooth * 16;
      const py    = -pySmooth * 9;
      /* Past 30% scroll: copy lifts and fades away */
      const exitT = Math.max(0, (tSmooth - 0.28) / 0.72);
      const exitY = exitT * -36;
      copy.style.transform = `translate(${px}px,${py + exitY}px)`;
      copy.style.opacity   = String(Math.max(0, 1 - exitT * 0.85));
    }

    rafId = requestAnimationFrame(draw);
  }

  /* ── Start playback + canvas ── */
  function start(){ if (!rafId) rafId = requestAnimationFrame(draw); }
  video.addEventListener('canplay',    start);
  video.addEventListener('loadeddata', start);
  if (video.readyState >= 2) start();
  video.play().catch(() => {});

  /* ── Text reveal: add .hero-revealed after video can play ── */
  function reveal(){
    hero.classList.add('hero-revealed');
    video.removeEventListener('canplay', reveal);
  }
  video.addEventListener('canplay', reveal);
  /* Fallback if video stalls */
  setTimeout(() => hero.classList.add('hero-revealed'), 800);
})();

/* ── SCROLL REVEAL ────────────────────────────────────────── */
(function initReveal(){
  if (!window.IntersectionObserver) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  const auto = ['.d-card','.strip-item','.rev-card','.menu-item','.gal-item',
                '.res-info-card','.getting-card','.pillar-card','.tl-row',
                '.heritage-card','.metric'];
  document.querySelectorAll(auto.join(',')).forEach((el,i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 6) * 0.06}s`;
    obs.observe(el);
  });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();

/* ── RATING BARS ──────────────────────────────────────────── */
(function initRatingBars(){
  const bars = document.querySelectorAll('.rb-fill');
  if (!bars.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting){ e.target.classList.add('animated'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.4 });
  bars.forEach(b => obs.observe(b));
})();

/* ── MENU TABS ────────────────────────────────────────────── */
(function initMenuTabs(){
  const btns = document.querySelectorAll('.menu-cat-btn');
  const secs = document.querySelectorAll('.menu-section');
  if (!btns.length) return;
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      btns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      secs.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-pressed','true');
      const sec = document.getElementById('cat-' + cat);
      if (sec){
        sec.classList.add('active');
        if (window.matchMedia('(max-width:900px)').matches){
          document.getElementById('menu-main')?.scrollIntoView({behavior:'smooth',block:'start'});
        }
      }
    });
  });
})();

/* ── CART ─────────────────────────────────────────────────── */
(function initCart(){
  const panel    = document.getElementById('cartPanel');
  const trigger  = document.getElementById('cartTrigger');
  const closeBtn = document.getElementById('cartCloseBtn');
  const itemsEl  = document.getElementById('cartItems');
  const countEl  = document.getElementById('cartCount');
  const totalEl  = document.getElementById('cartTotal');
  if (!panel) return;
  let cart = {};
  function render(){
    const items = Object.values(cart);
    const count = items.reduce((s,i) => s + i.qty, 0);
    const total = items.reduce((s,i) => s + i.price * i.qty, 0);
    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = `RM ${total.toFixed(2)}`;
    if (!itemsEl) return;
    if (!items.length){
      itemsEl.innerHTML = '<div class="cart-empty"><p>Your bowl is empty</p><p style="font-size:0.82rem;color:var(--ink-3);margin-top:6px">Add a dish from the menu</p></div>';
      return;
    }
    itemsEl.innerHTML = items.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">RM ${(item.price * item.qty).toFixed(2)}</div>
          <div class="cart-item-qty">
            <button class="cart-qty-btn" onclick="cartAdjust('${item.id}',-1)" aria-label="Decrease">−</button>
            <span class="cart-qty-num">${item.qty}</span>
            <button class="cart-qty-btn" onclick="cartAdjust('${item.id}',1)"  aria-label="Increase">+</button>
          </div>
        </div>
        <button class="cart-remove" onclick="cartRemove('${item.id}')" aria-label="Remove">×</button>
      </div>
    `).join('');
  }
  window.addToCart = (id, name, price) => {
    if (cart[id]) cart[id].qty++;
    else cart[id] = { id, name, price: parseFloat(price), qty: 1 };
    render();
    panel.classList.add('open');
  };
  window.cartAdjust = (id, delta) => {
    if (!cart[id]) return;
    cart[id].qty += delta;
    if (cart[id].qty <= 0) delete cart[id];
    render();
  };
  window.cartRemove = (id) => { delete cart[id]; render(); };
  if (trigger) trigger.addEventListener('click', () => panel.classList.toggle('open'));
  if (closeBtn) closeBtn.addEventListener('click', () => panel.classList.remove('open'));
  document.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.id, btn.dataset.name, btn.dataset.price);
      const orig = btn.textContent;
      btn.textContent = '✓ Added';
      btn.style.background = 'var(--jade)';
      setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 1400);
    });
  });

  const placeBtn   = document.getElementById('placeOrderBtn');
  const errEl      = document.getElementById('cartFormError');
  const nameEl     = document.getElementById('custName');
  const phoneEl    = document.getElementById('custPhone');
  const emailEl    = document.getElementById('custEmail');
  const addressEl  = document.getElementById('custAddress');

  if (placeBtn) {
    placeBtn.addEventListener('click', () => {
      const items = Object.values(cart);
      if (!items.length) {
        if (errEl) { errEl.textContent = 'Please add at least one dish first.'; errEl.style.display = 'block'; }
        return;
      }
      const name    = nameEl    ? nameEl.value.trim()    : '';
      const phone   = phoneEl   ? phoneEl.value.trim()   : '';
      const email   = emailEl   ? emailEl.value.trim()   : '';
      const address = addressEl ? addressEl.value.trim() : '';
      if (!name || !phone || !email || !address) {
        if (errEl) { errEl.textContent = 'Please fill in all fields before placing your order.'; errEl.style.display = 'block'; }
        return;
      }
      if (errEl) errEl.style.display = 'none';
      const total = items.reduce((s,i) => s + i.price * i.qty, 0);
      const orderLines = items.map(i => `• ${i.name} x${i.qty} — RM ${(i.price*i.qty).toFixed(2)}`).join('%0A');
      const msg = `Hello Tuck Kee! I'd like to place an order 🙏%0A%0A${orderLines}%0A%0AEstimated Total%3A RM ${total.toFixed(2)}%0A%0AName%3A ${encodeURIComponent(name)}%0APhone%3A ${encodeURIComponent(phone)}%0AEmail%3A ${encodeURIComponent(email)}%0AAddress%3A ${encodeURIComponent(address)}%0A%0APlease confirm my order. Thank you!`;
      window.open(`https://wa.me/60162209361?text=${msg}`, '_blank');
    });
  }

  render();
})();

/* ── GALLERY FILTERS + LIGHTBOX ───────────────────────────── */
document.querySelectorAll('.gal-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.gallery-filter-row').querySelectorAll('.gal-filter-btn')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.filter;
    document.querySelectorAll('.gal-item').forEach(item => {
      item.style.display = (cat === 'all' || item.dataset.cat === cat) ? '' : 'none';
    });
  });
});
(function initLightbox(){
  const lb       = document.getElementById('lightbox');
  const closeBtn = document.getElementById('lbClose');
  const caption  = document.getElementById('lbCaption');
  const imgArea  = document.getElementById('lbImgArea');
  if (!lb) return;
  document.querySelectorAll('.gal-item').forEach(item => {
    item.addEventListener('click', () => {
      const label = item.querySelector('.gal-label')?.textContent || '';
      const sub   = item.querySelector('.gal-sub')?.textContent || '';
      if (caption) caption.textContent = label + (sub ? ' — ' + sub : '');
      const img = item.querySelector('.gal-img');
      if (imgArea && img) imgArea.style.background = getComputedStyle(img).background;
      lb.classList.add('open');
      lb.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden';
    });
  });
  const close = () => {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  };
  if (closeBtn) closeBtn.addEventListener('click', close);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();

/* ── STAR SELECTOR ────────────────────────────────────────── */
const starBtns = document.querySelectorAll('.star-btn');
starBtns.forEach((btn,idx) => {
  btn.addEventListener('click', () => {
    starBtns.forEach((b,i) => b.classList.toggle('selected', i <= idx));
    const inp = document.getElementById('ratingValue');
    if (inp) inp.value = idx + 1;
  });
  btn.addEventListener('mouseenter', () => starBtns.forEach((b,i) => b.style.color = i <= idx ? 'var(--gold)' : ''));
  btn.addEventListener('mouseleave', () => starBtns.forEach(b => b.style.color = ''));
});

/* ── REVIEW READ MORE & FILTERS ───────────────────────────── */
document.querySelectorAll('.rev-read-more').forEach(btn => {
  btn.addEventListener('click', () => {
    const body = btn.previousElementSibling;
    const collapsed = body.classList.toggle('collapsed');
    btn.textContent = collapsed ? 'Read more' : 'Show less';
    btn.setAttribute('aria-expanded', !collapsed);
  });
});
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.filter-strip').querySelectorAll('.filter-btn')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ── FORMS ────────────────────────────────────────────────── */
const revForm = document.getElementById('reviewForm');
if (revForm){
  revForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = revForm.querySelector('[type="submit"]');
    btn.textContent = 'Submitting…'; btn.disabled = true;
    setTimeout(() => {
      btn.textContent = '✓ Thank you — Review Submitted';
      btn.style.background = 'var(--jade)';
      revForm.reset();
      starBtns.forEach(b => b.classList.remove('selected'));
    }, 1200);
  });
}
const resForm = document.getElementById('reservationForm');
if (resForm){
  resForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = resForm.querySelector('[type="submit"]');
    const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xvznnlbp';
    btn.textContent = 'Sending…'; btn.disabled = true;
    try {
      const data = new FormData(resForm);
      // Collect named inputs manually since inputs lack name attrs
      data.set('name',    document.getElementById('res-name')?.value    || '');
      data.set('phone',   document.getElementById('res-phone')?.value   || '');
      data.set('date',    document.getElementById('res-date')?.value    || '');
      data.set('time',    document.getElementById('res-time')?.value    || '');
      data.set('guests',  document.getElementById('res-guests')?.value  || '');
      data.set('occasion',document.getElementById('res-occasion')?.value|| '');
      data.set('message', document.getElementById('res-message')?.value || '');
      const res = await fetch(FORMSPREE_ENDPOINT, { method:'POST', body: data, headers:{'Accept':'application/json'} });
      if (res.ok) {
        btn.textContent = '✓ Message Sent';
        btn.style.background = 'var(--jade)';
        const msg = document.getElementById('reserveSuccess');
        if (msg){ msg.hidden = false; msg.scrollIntoView({behavior:'smooth',block:'center'}); }
        resForm.reset();
      } else {
        btn.textContent = 'Send Enquiry'; btn.disabled = false;
        alert('Something went wrong. Please call us at 016-220 9361.');
      }
    } catch(err) {
      btn.textContent = 'Send Enquiry'; btn.disabled = false;
      alert('Could not send. Please call us at 016-220 9361.');
    }
  });
}
