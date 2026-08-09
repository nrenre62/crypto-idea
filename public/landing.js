// D12: the landing page's script, externalized from index.html so the CSP can drop
// 'unsafe-inline' for scripts. Loaded at the end of <body> (same execution point).
// Header
const hdr=document.getElementById('header');
const onS=()=>hdr.classList.toggle('scrolled',scrollY>8);
window.addEventListener('scroll',onS,{passive:true});onS();

// Mobile menu
const tog=document.getElementById('menuToggle');
tog.addEventListener('click',()=>hdr.classList.toggle('menu-open'));
document.querySelectorAll('#navLinks a').forEach(a=>a.addEventListener('click',()=>hdr.classList.remove('menu-open')));

// Billing toggle
function setBilling(p){
  const m=p==='monthly';
  document.getElementById('btnMonthly').classList.toggle('active',m);
  document.getElementById('btnYearly').classList.toggle('active',!m);
  document.querySelectorAll('.plan-price').forEach(el=>{
    const v=m?el.dataset.m:el.dataset.y;
    const free=v==='$0';
    el.innerHTML=v+'<span>'+(free?'/month':(m?'/month':'/month, billed yearly'))+'</span>';
  });
}

// Subscribe
function subscribe(){
  const input=document.getElementById('emailInput');
  const msg=document.getElementById('subMsg');
  const email=input.value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){msg.style.color='var(--warn)';msg.textContent='Please enter a valid email.';return;}
  msg.style.color='var(--ink-faint)';msg.textContent='Subscribing…';
  fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email,hp:document.getElementById('hpField')?.value||''})})
    .then(r=>r.json().catch(()=>({})).then(d=>({ok:r.ok,d})))
    .then(res=>{
      if(res.ok&&res.d?.success){msg.style.color='var(--accent)';msg.textContent="You're on the list — thanks!";input.value='';}
      else{msg.style.color='var(--warn)';msg.textContent="Couldn't subscribe right now — please try again.";}
    }).catch(()=>{msg.style.color='var(--warn)';msg.textContent='Network error — please try again.';});
}
document.getElementById('emailInput').addEventListener('keydown',e=>{if(e.key==='Enter')subscribe();});
// Bind the billing toggle + Subscribe button here (not inline onclick=): the production CSP
// script-src has no 'unsafe-inline', so inline handlers are blocked at click time (D12).
document.getElementById('btnMonthly').addEventListener('click',()=>setBilling('monthly'));
document.getElementById('btnYearly').addEventListener('click',()=>setBilling('yearly'));
document.getElementById('subscribeBtn').addEventListener('click',subscribe);

// Year
document.getElementById('year').textContent=new Date().getFullYear();

// Reveal on scroll
const io=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
},{threshold:.1,rootMargin:'0px 0px -36px 0px'});
document.querySelectorAll('.reveal').forEach((el,i)=>{
  el.style.transitionDelay=(Math.min(i%5,4)*80)+'ms';io.observe(el);});

// Live plan prices from admin config (falls back to hardcoded data-* values)
fetch('/api/config').then(r=>r.ok?r.json():null).then(c=>{
  if(!c)return;
  // CRYP-101 (LAUNCH-FREE Part B): free-launch mode hides every pricing surface on the
  // landing. CSP-safe — programmatic el.style only, no inline script/style injected.
  if(c.paidPlansEnabled===false){
    ['#pricing','.nav-links a[href="#pricing"]','.foot-links a[href="#pricing"]'].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){if(el)el.style.display='none';});
    });
  }
  if(!c.plans)return;
  var cards=document.querySelectorAll('.plan-price');
  ['free','pro','premium'].forEach((t,i)=>{
    var p=c.plans[t];if(!cards[i]||!p||p.price==null)return;
    // Yearly shows the per-month equivalent of the stored annual price (priceYear).
    // Fallback if priceYear is absent: 2 months free (= price*10/12).
    var y=(p.priceYear!=null)?Math.round(p.priceYear/12*100)/100:Math.round(p.price*10/12*100)/100;
    cards[i].dataset.m='$'+p.price;cards[i].dataset.y='$'+y;
  });
  var yEl=document.getElementById('btnYearly');
  setBilling(yEl&&yEl.classList.contains('active')?'yearly':'monthly');
}).catch(()=>{});

// ── DCA Calculator ──
// Prefers the live API (3,000+ coins, CDN-cached on the deployed site). When the
// backend isn't reachable (e.g. this preview), it falls back to a small embedded
// dataset so the tool stays fully usable as a demo. The fallback is clearly
// approximate monthly data for major coins only.
(function(){
  var inp=document.getElementById('dcaCoin');if(!inp)return;
  var dd=document.getElementById('dcaDD');
  var sel={id:'bitcoin',symbol:'BTC',name:'Bitcoin'};
  var freq='weekly';
  inp.value='Bitcoin (BTC)';

  // Embedded fallback: approximate month-end USD prices, Jan 2021 → Jun 2026.
  var FB_PRICES={
    bitcoin:[33,45,58,57,37,35,41,47,43,61,57,46, 38,43,45,38,31,19,23,20,19,20,17,16, 23,23,28,29,27,30,29,26,27,34,37,42, 43,61,71,60,67,62,66,59,63,70,96,94, 102,84,82,94,104,107,115,112,109,110,105,103, 103,100,98,101,103,103].map(v=>v*1000),
    ethereum:[1.3,1.4,1.9,2.7,2.6,2.3,2.5,3.2,3.0,4.3,4.6,3.7, 2.7,2.9,3.3,2.8,1.9,1.0,1.7,1.6,1.3,1.6,1.3,1.2, 1.6,1.6,1.8,1.9,1.9,1.9,1.9,1.7,1.7,1.8,2.0,2.3, 2.3,3.3,3.5,3.0,3.8,3.4,3.2,2.5,2.6,2.5,3.7,3.3, 3.3,2.2,1.8,1.8,2.5,2.4,2.6,2.4,2.3,2.3,2.2,2.1, 2.1,2.0,1.9,2.0,2.1,2.1].map(v=>v*1000),
    solana:[3,13,19,28,35,33,37,110,170,200,240,170, 100,90,130,100,45,35,40,32,33,30,14,10, 24,23,21,20,20,18,24,21,21,38,60,100, 96,110,190,135,165,145,135,145,155,170,235,190, 215,140,125,150,165,150,180,200,185,190,170,160, 160,150,140,150,160,160],
    cardano:[.34,.93,1.18,1.20,1.68,1.36,1.30,2.95,2.20,2.00,1.55,1.31, 1.10,.92,1.15,.78,.50,.45,.51,.45,.43,.32,.31,.25, .35,.39,.40,.38,.37,.29,.30,.26,.25,.30,.38,.59, .54,.72,.65,.45,.46,.39,.39,.33,.35,.34,1.04,.85, .95,.62,.65,.70,.75,.65,.80,.85,.78,.80,.72,.68, .68,.62,.58,.62,.66,.66],
    ripple:[.28,.45,.57,1.38,.88,.66,.67,1.12,.92,1.06,1.02,.83, .76,.78,.83,.63,.40,.31,.37,.34,.43,.46,.39,.34, .39,.40,.47,.46,.47,.47,.71,.51,.52,.56,.62,.62, .56,.62,.63,.51,.52,.49,.59,.56,.59,.52,1.45,2.10, 2.40,2.20,2.10,2.20,2.30,2.10,3.10,2.90,2.80,2.85,2.50,2.30, 2.30,2.10,2.00,2.10,2.20,2.20]
  };
  var FB_META={
    bitcoin:{symbol:'BTC',name:'Bitcoin',color:'#f7931a',g:'₿'},
    ethereum:{symbol:'ETH',name:'Ethereum',color:'#4b6ef5',g:'Ξ'},
    solana:{symbol:'SOL',name:'Solana',color:'#11b886',g:'◎'},
    cardano:{symbol:'ADA',name:'Cardano',color:'#0d6dca',g:'₳'},
    ripple:{symbol:'XRP',name:'XRP',color:'#23292f',g:'✕'}
  };
  var FB_COINS=Object.keys(FB_META).map((id,i)=>({id:id,symbol:FB_META[id].symbol,name:FB_META[id].name,rank:i+1}));
  function fbHist(id){
    var arr=FB_PRICES[id];if(!arr)return [];
    var out=[];for(var i=0;i<arr.length;i++){out.push([Date.UTC(2021,i,1),arr[i]]);}
    return out;
  }

  function iso(d){return d.toISOString().split('T')[0];}
  var eEl=document.getElementById('dcaEnd'),sEl=document.getElementById('dcaStart');
  var e0=new Date(),s0=new Date();s0.setFullYear(s0.getFullYear()-3);
  eEl.value=iso(e0);sEl.value=iso(s0);
  document.querySelectorAll('#dcaFreq button').forEach(b=>{
    b.addEventListener('click',function(){
      document.querySelectorAll('#dcaFreq button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');freq=b.dataset.f;calc();
    });
  });

  var COINS=null,cr=null;
  function loadCoins(){
    if(COINS)return Promise.resolve(COINS);
    if(cr)return cr;
    cr=fetch('/api/coinlist').then(r=>r.ok?r.json():{coins:[]})
      .then(d=>{COINS=(d&&d.coins&&d.coins.length)?d.coins:FB_COINS;return COINS;})
      .catch(()=>{COINS=FB_COINS;return COINS;});
    return cr;
  }
  function render(list){
    dd.textContent='';
    list.slice(0,50).forEach(c=>{
      var el=document.createElement('div');el.className='opt';
      var meta=FB_META[c.id];
      if(c.thumb){var img=document.createElement('img');img.alt='';img.src=c.thumb;img.onerror=function(){this.style.visibility='hidden';};el.appendChild(img);}
      else{var oic=document.createElement('div');oic.className='oic';oic.style.background=(meta&&meta.color)||'#888';oic.textContent=(meta&&meta.g)||(c.symbol||'?').charAt(0);el.appendChild(oic);}
      var box=document.createElement('div');
      var n=document.createElement('div');n.className='n';n.textContent=c.name;
      var s=document.createElement('div');s.className='s';s.textContent=c.symbol+(c.rank?' · #'+c.rank:'');
      box.appendChild(n);box.appendChild(s);el.appendChild(box);
      el.addEventListener('click',function(){
        sel={id:c.id,symbol:c.symbol,name:c.name};
        inp.value=c.name+' ('+c.symbol+')';dd.style.display='none';calc();
      });
      dd.appendChild(el);
    });
    dd.style.display=list.length?'block':'none';
  }
  inp.addEventListener('focus',loadCoins);
  inp.addEventListener('input',function(){
    var q=inp.value.trim().toLowerCase();
    if(q.length<1){dd.style.display='none';return;}
    loadCoins().then(all=>{
      var pre=[],sub=[];
      for(var i=0;i<all.length;i++){
        var c=all[i];
        var nm=(c.name||'').toLowerCase(),sy=(c.symbol||'').toLowerCase(),id=(c.id||'').toLowerCase();
        if(sy.indexOf(q)===0||nm.indexOf(q)===0||id.indexOf(q)===0){if(pre.length<50)pre.push(c);}
        else if(sy.indexOf(q)>=0||nm.indexOf(q)>=0||id.indexOf(q)>=0){if(sub.length<50)sub.push(c);}
      }
      render(pre.concat(sub));
    });
  });
  document.addEventListener('click',ev=>{if(!inp.parentNode.contains(ev.target))dd.style.display='none';});
  function money(n){if(n==null||isNaN(n))return'$0';var a=Math.abs(n);
    if(a>=1000)return'$'+n.toLocaleString('en-US',{maximumFractionDigits:0});
    if(a>=1)return'$'+n.toFixed(2);return'$'+n.toFixed(a<0.0001?8:4);}
  function genDates(start,end,f){
    var d=[],c=new Date(start),e=new Date(end);
    while(c<=e){d.push(new Date(c));
      if(f==='daily')c.setDate(c.getDate()+1);
      else if(f==='weekly')c.setDate(c.getDate()+7);
      else if(f==='biweekly')c.setDate(c.getDate()+14);
      else c.setMonth(c.getMonth()+1);}
    return d;}
  var btn=document.getElementById('dcaBtn'),msg=document.getElementById('dcaMsg'),aEl=document.getElementById('dcaAmt');
  var hCache={},histDegraded=false;
  // fetch() has no default timeout: if /api/history hangs (connection open, no
  // response), the promise never settles and the button is stuck on "Calculating…"
  // forever. Bound it with an AbortController; on timeout or network error fall back
  // to the built-in offline estimate (fbHist) and flag it so calc() can say so. The
  // fallback is NOT cached, so a later attempt can still reach the live API.
  function getHist(id){
    if(hCache[id])return Promise.resolve(hCache[id]);
    var ctrl=new AbortController(),to=setTimeout(function(){ctrl.abort();},12000);
    return fetch('/api/history?id='+encodeURIComponent(id),{signal:ctrl.signal})
      .then(r=>r.ok?r.json():{prices:[]})
      .then(d=>{var p=(d&&d.prices&&d.prices.length)?d.prices:fbHist(id);hCache[id]=p;return p;})
      .catch(()=>{histDegraded=true;return fbHist(id);})
      .then(function(p){clearTimeout(to);return p;});
  }
  function calc(){
    msg.textContent='';histDegraded=false;
    var amount=parseFloat(aEl.value),start=sEl.value,end=eEl.value;
    if(!sel){msg.textContent='Pick a coin first.';return;}
    if(!amount||amount<=0){msg.textContent='Enter an amount.';return;}
    if(!start||!end||new Date(start)>=new Date(end)){msg.textContent='Pick a valid date range (start before end).';return;}
    if(btn){btn.textContent='Calculating…';btn.disabled=true;}
    getHist(sel.id).then(hist=>{
      if(!hist.length){msg.textContent='No historical data available in offline demo mode. On the live site, every coin in your library is supported.';return;}
      var sm=new Date(start).getTime(),ea=hist[0][0];if(sm<ea)sm=ea;
      var dates=genDates(new Date(sm),new Date(end),freq);
      var coins=0,invested=0,buys=0;
      for(var i=0;i<dates.length;i++){
        var ts=dates[i].getTime(),best=hist[0],bd=Infinity;
        for(var j=0;j<hist.length;j++){var df=Math.abs(hist[j][0]-ts);if(df<bd){bd=df;best=hist[j];}}
        var price=best[1];if(price>0){coins+=amount/price;invested+=amount;buys++;}
      }
      if(!buys){msg.textContent='No price points in that range.';return;}
      var nowP=hist[hist.length-1][1],value=coins*nowP,profit=value-invested,
          roi=invested>0?(profit/invested)*100:0,avg=coins>0?invested/coins:0;
      document.getElementById('dcaInvested').textContent=money(invested);
      document.getElementById('dcaValue').textContent=money(value);
      var p=document.getElementById('dcaProfit');p.textContent=(profit>=0?'+':'')+money(profit);p.className='v '+(profit>=0?'pos':'neg');
      var rr=document.getElementById('dcaRoi');rr.textContent=(roi>=0?'+':'')+roi.toFixed(1)+'%';rr.className='v '+(roi>=0?'pos':'neg');
      document.getElementById('dcaRCoin').textContent=sel.name+' ('+sel.symbol+')';
      document.getElementById('dcaRBuys').textContent=buys.toLocaleString();
      document.getElementById('dcaRCoins').textContent=coins.toLocaleString('en-US',{maximumFractionDigits:6})+' '+sel.symbol;
      document.getElementById('dcaRAvg').textContent=money(avg);
      document.getElementById('dcaRNow').textContent=money(nowP);
      document.getElementById('dcaRes').classList.add('show');
      if(histDegraded)msg.textContent='Live price data was slow to load — showing an offline estimate.';
    }).catch(()=>{msg.textContent='Could not load price data. Try again.';})
      .then(()=>{if(btn){btn.textContent='Calculate returns';btn.disabled=false;}});
  }
  btn&&btn.addEventListener('click',calc);
  var aT;aEl.addEventListener('input',()=>{clearTimeout(aT);aT=setTimeout(calc,350);});
  sEl.addEventListener('change',calc);eEl.addEventListener('change',calc);
  calc();
})();
