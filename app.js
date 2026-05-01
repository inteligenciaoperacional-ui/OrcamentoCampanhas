const CSV_MOT='https://docs.google.com/spreadsheets/d/e/2PACX-1vRLM9rAFP38q8N_0lffiZ5mMN9fD8S09RU6tQhMoTmb8fcR6h5G4JFYrRCtuvRl5_fcNqvPQR7PR94o/pub?gid=694466935&single=true&output=csv';

/* ============================================================
   TAMANHO DOS LOGOS NO RODAPÉ DO DASHBOARD
   Edite os valores abaixo (em px) para ajustar cada logo
   ============================================================ */
const LOGO_GRUPO_H   = 50;   // Logo Grupo JCA (topo)
const LOGO_1001_H    = 40;   // Logo 1001
const LOGO_CAT_H     = 20;   // Logo Catarinense
const LOGO_COMETA_H  = 36;   // Logo Cometa
const LOGO_EXP_H     = 75;   // Logo Expresso do Sul
const LOGO_RRP_H     = 40;   // Logo Rápido Ribeirão
/* ============================================================ */
const CSV_FAIXA='https://docs.google.com/spreadsheets/d/e/2PACX-1vRLM9rAFP38q8N_0lffiZ5mMN9fD8S09RU6tQhMoTmb8fcR6h5G4JFYrRCtuvRl5_fcNqvPQR7PR94o/pub?gid=1977350355&single=true&output=csv';
const CSV_BANNER='https://docs.google.com/spreadsheets/d/e/2PACX-1vRLM9rAFP38q8N_0lffiZ5mMN9fD8S09RU6tQhMoTmb8fcR6h5G4JFYrRCtuvRl5_fcNqvPQR7PR94o/pub?gid=1686797334&single=true&output=csv';

const MF=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MS=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const CI=[0,1,2,3,4,6,8,11];
const RES=['FOLDER','BANNER','FAIXA','BRINDE','VÍDEO','MÃO DE OBRA','ADESIVO DE ÔNIBUS'];
const PREV=['DEZ','JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV'];
const EMPRESAS=['1001','1001 URBANO','COMETA','CATARINENSE','SIT','MACAENSE','OPÇÃO'];
const PAGES={
  dashboard:{t:'Dashboard',s:'Visão executiva da campanha atual'},
  quadro:{t:'Quadro de Motoristas',s:'Motoristas orçados por empresa e mês'},
  recursos:{t:'Recursos',s:'Valor unitário de cada recurso para o ano'},
  campanhas:{t:'Campanhas',s:'Configure os recursos e registre o realizado'},
  gfaixa:{t:'Garagens — Faixa',s:'Garagens por empresa para instalação de faixas'},
  gbanner:{t:'Garagens — Banner',s:'Garagens por empresa para instalação de banners'},
  envio:{t:'Separação / Envio',s:'Distribuição de folders e brindes por empresa'},
  gerencial:{t:'Gerencial',s:'Resumo executivo por campanha — orçado vs realizado'}
};

const ARTES_KEYS=['folder_frente','folder_verso','banner','faixa'];
const ARTES_LABELS={folder_frente:'FOLDER — Frente',folder_verso:'FOLDER — Verso',banner:'BANNER',faixa:'FAIXA'};

let companies=[],driverData={};
let resources=RES.map(n=>({name:n,price:0,qty:0}));
let camps={};
CI.forEach(mi=>{camps[mi]={theme:'',resumo:'',open:false,orcEdit:false,orcCustom:RES.map(()=>({price:null,qty:null})),orc:RES.map(()=>false),real:RES.map(()=>({sel:false,price:null,qty:null})),fotos:[],artes:{folder_frente:null,folder_verso:null,banner:null,faixa:null}};});
let activeTab='quadro';
let garaFaixa={};
let garaBanner={};

// Campanhas extras (coringa)
let extras=[
  {ativa:false,mes:null,theme:'',resumo:'',orcEdit:false,orcCustom:RES.map(()=>({price:null,qty:null})),orc:RES.map(()=>false),real:RES.map(()=>({sel:false,price:null,qty:null})),fotos:[],artes:{folder_frente:null,folder_verso:null,banner:null,faixa:null},open:false},
  {ativa:false,mes:null,theme:'',resumo:'',orcEdit:false,orcCustom:RES.map(()=>({price:null,qty:null})),orc:RES.map(()=>false),real:RES.map(()=>({sel:false,price:null,qty:null})),fotos:[],artes:{folder_frente:null,folder_verso:null,banner:null,faixa:null},open:false}
];

function getTotal(mi){return companies.reduce((s,c)=>s+(driverData[c]&&driverData[c][mi]||0),0);}
function fmt(n){return(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtN(n){return(n||0).toLocaleString('pt-BR');}

/* Quantidade orçada — definida na aba Recursos */
function getTotalGaragens(data){return EMPRESAS.reduce((s,emp)=>s+(data[emp]?data[emp].length:0),0);}
function getQtdOrc(ri){return resources[ri].qty||0;}

function calcOrc(mi){
  const c=camps[mi];
  return c.orc.reduce((s,sel,ri)=>{
    if(!sel)return s;
    const p=c.orcEdit&&c.orcCustom[ri].price!==null?c.orcCustom[ri].price:(resources[ri].price||0);
    const q=c.orcEdit&&c.orcCustom[ri].qty!==null?c.orcCustom[ri].qty:(resources[ri].qty||0);
    return s+p*q;
  },0);
}
function calcReal(mi){return camps[mi].real.reduce((s,r,ri)=>{if(!r.sel)return s;const p=r.price!==null?r.price:(resources[ri].price||0);const q=r.qty!==null?r.qty:0;return s+p*q;},0);}
function totOrc(){return CI.reduce((s,mi)=>s+calcOrc(mi),0)+extras.reduce((s,ex,ei)=>s+calcExtraOrc(ei),0);}
function totReal(){return CI.reduce((s,mi)=>s+calcReal(mi),0)+extras.reduce((s,ex,ei)=>s+calcExtraReal(ei),0);}

/* ── CSV parsers ── */
function parseCSVRows(text){
  return text.trim().split('\n').filter(l=>l.trim()).map(l=>{
    const r=[];let cur='';let q=false;
    for(const c of l){if(c==='"'){q=!q;}else if(c===','&&!q){r.push(cur.trim());cur='';}else cur+=c;}
    r.push(cur.trim());return r;
  });
}

function parseMot(text){
  const rows=parseCSVRows(text);
  companies=[];driverData={};
  for(let i=1;i<rows.length;i++){
    const row=rows[i];if(!row[0]||!row[0].trim())continue;
    const n=row[0].trim();companies.push(n);driverData[n]={};
    for(let m=0;m<12;m++){const raw=(row[m+1]||'').replace(/\./g,'').replace(',','.');driverData[n][m]=parseInt(raw)||0;}
  }
  const nd=new Date();
  document.getElementById('sync-time').textContent=nd.toLocaleDateString('pt-BR')+' '+nd.getHours()+':'+String(nd.getMinutes()).padStart(2,'0');
  document.getElementById('ano-badge').textContent=nd.getFullYear();
  document.getElementById('mrow').style.display='grid';
  updMetrics();renderQuadro();renderCampanhas();
}

function parseGaragens(text, empresaCols){
  /* Estrutura: cada coluna é uma empresa, cada linha é uma garagem */
  const rows=parseCSVRows(text);
  const result={};
  empresaCols.forEach((emp,ci)=>{result[emp]=[];});
  const header=rows[0];
  // A primeira linha é o cabeçalho com os nomes das empresas
  for(let ri=1;ri<rows.length;ri++){
    const row=rows[ri];
    empresaCols.forEach((emp,ci)=>{
      const val=(row[ci]||'').trim();
      if(val)result[emp].push(val);
    });
  }
  return result;
}

function updMetrics(){
  let g=0;MS.forEach((_,mi)=>g+=getTotal(mi));
  document.getElementById('mc-emp').textContent=companies.length;
  document.getElementById('mc-tot').textContent=fmtN(g);
  document.getElementById('mc-orc').textContent='R$ '+fmt(totOrc());
  document.getElementById('mc-real').textContent='R$ '+fmt(totReal());
}

function switchTab(tab){
  activeTab=tab;
  ['dashboard','quadro','recursos','campanhas','gfaixa','gbanner','envio','gerencial'].forEach(t=>{
    document.getElementById('pnl-'+t).style.display=t===tab?'block':'none';
    const b=document.getElementById('nav-'+t);if(b)b.className=t===tab?'nav-item active':'nav-item';
  });
  document.getElementById('page-title').textContent=PAGES[tab].t;
  document.getElementById('page-sub').textContent=PAGES[tab].s;
  document.getElementById('mrow').style.display=(tab==='quadro'&&companies.length>0)?'grid':'none';
  if(tab==='envio')renderEnvio();
  if(tab==='gerencial')renderGerencial();
  if(tab==='dashboard')renderDashboard();
}

/* ── QUADRO ── */
function renderQuadro(){
  let h='<div class="sec-hdr"><div class="sec-title">Motoristas por empresa e mês</div></div>';
  h+='<div class="tbl-wrap"><table><thead><tr><th style="min-width:150px;">Empresa</th>';
  MS.forEach((m,mi)=>{const c=CI.includes(mi);h+=`<th class="r${c?' camp-th':''}" style="width:60px;">${m}${c?'<div style="font-size:8px;font-weight:400;margin-top:1px;opacity:0.75;">camp</div>':''}</th>`;});
  h+='<th class="r" style="min-width:68px;">TOTAL</th></tr></thead><tbody>';
  companies.forEach(co=>{
    let yt=0;h+=`<tr><td style="font-weight:600;color:var(--text);">${co}</td>`;
    MS.forEach((_,mi)=>{const v=driverData[co][mi]||0;yt+=v;const c=CI.includes(mi);h+=`<td class="r${c?' camp-col':''}">${v?fmtN(v):'<span style="color:var(--text3)">—</span>'}</td>`;});
    h+=`<td class="r" style="font-weight:700;color:var(--text);">${fmtN(yt)}</td></tr>`;
  });
  h+='<tr class="total-row"><td>TOTAL</td>';
  let g=0;
  MS.forEach((_,mi)=>{const t=getTotal(mi);g+=t;const c=CI.includes(mi);h+=`<td class="r${c?' camp-col':''}" style="${c?'color:var(--orange2);font-weight:700;':''}">${fmtN(t)}</td>`;});
  h+=`<td class="r">${fmtN(g)}</td></tr></tbody></table></div>`;
  h+='<p style="font-size:11px;color:var(--text3);margin-top:10px;">Meses destacados possuem campanha de segurança programada.</p>';
  document.getElementById('pnl-quadro').innerHTML=h;
}

/* ── RECURSOS ── */
function renderRecursos(){
  let h=`<div class="sec-hdr"><div class="sec-title">Valor e quantidade por recurso</div></div>`;
  h+=`<p style="font-size:12px;color:var(--text3);margin-bottom:18px;line-height:1.7;">Defina o valor unitário e a quantidade de cada recurso. Estes valores serão usados automaticamente no cálculo do orçado em todas as campanhas.</p>`;
  h+=`<div class="tbl-wrap" style="max-width:640px;"><table><thead><tr>
    <th>Recurso</th>
    <th class="r" style="width:180px;">Valor unitário (R$)</th>
    <th class="r" style="width:150px;">Quantidade</th>
    <th class="r" style="width:140px;">Total</th>
  </tr></thead><tbody>`;
  resources.forEach((res,ri)=>{
    const total=(res.price||0)*(res.qty||0);
    h+=`<tr>
      <td style="font-weight:600;">${res.name}</td>
      <td class="r">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;">
          <span style="font-size:12px;color:var(--text3);">R$</span>
          <input class="edt" type="number" min="0" step="0.01" value="${res.price||''}" placeholder="0,00" style="width:110px;"
            oninput="autoSave();resources[${ri}].price=parseFloat(this.value)||0;refreshAllHeaders();updateResTotal(${ri})">
        </div>
      </td>
      <td class="r">
        <input class="edt" type="number" min="0" step="1" value="${res.qty||''}" placeholder="0" style="width:90px;"
          oninput="autoSave();resources[${ri}].qty=parseInt(this.value)||0;refreshAllHeaders();updateResTotal(${ri})">
      </td>
      <td class="r" id="res-total-${ri}" style="font-weight:600;color:${total>0?'var(--orange2)':'var(--text3)'};">
        ${total>0?'R$ '+fmt(total):'—'}
      </td>
    </tr>`;
  });
  h+=`</tbody></table></div>`;
  document.getElementById('pnl-recursos').innerHTML=h;
}

/* ── CAMPANHAS ── */
function renderCampanhas(){
  let h='';
  CI.forEach(mi=>{
    const camp=camps[mi];const ot=calcOrc(mi);const rt=calcReal(mi);
    h+=`<div class="camp-card${camp.open?' open':''}" id="card-${mi}">
      <div class="camp-header" onclick="toggleCard(${mi})">
        <div class="camp-meta">
          <span class="m-badge">${MS[mi]}</span>
          <span class="c-name">${MF[mi]}</span>
          <span class="c-theme" id="hdr-theme-${mi}">${camp.theme||'Tema não definido'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:20px;">
          <div class="c-totals">
            <div class="ct-item"><div class="ctl">Orçado</div><div class="ctv" id="hdr-orc-${mi}" style="color:${ot>0?'var(--orange2)':'var(--text3)'};">R$ ${fmt(ot)}</div></div>
            <div class="ct-item"><div class="ctl">Realizado</div><div class="ctv" id="hdr-real-${mi}" style="color:${rt>0?'var(--green)':'var(--text3)'};">R$ ${fmt(rt)}</div></div>
          </div>
          <svg class="chevron${camp.open?' open':''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
      <div id="body-${mi}" style="display:${camp.open?'block':'none'};">${camp.open?renderBody(mi):''}</div>
    </div>`;
  });

  // Campanhas extras
  h+=`<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px;">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.09em;color:var(--text3);padding:8px 4px 12px;">Campanhas extras</div>`;
  extras.forEach((ex,ei)=>{
    h+=renderExtraCard(ei);
  });
  h+=`</div>`;

  document.getElementById('pnl-campanhas').innerHTML=h;
}

function renderExtraCard(ei){
  const ex=extras[ei];
  const mi=ex.mes;
  const isOn=ex.ativa;
  const ot=isOn&&mi!==null?calcExtraOrc(ei):0;
  const rt=isOn&&mi!==null?calcExtraReal(ei):0;

  let h=`<div class="camp-card${ex.open?' open':''}" id="extra-card-${ei}" style="border-style:dashed;margin-bottom:10px;">
    <div class="camp-header" onclick="toggleExtraCard(${ei})" style="cursor:pointer;">
      <div class="camp-meta" style="gap:10px;flex:1;flex-wrap:wrap;">
        <span style="font-size:10px;font-weight:700;white-space:nowrap;color:${isOn?'var(--orange2)':'var(--text3)'};background:${isOn?'var(--orange-bg)':'var(--bg3)'};border:1px solid ${isOn?'var(--orange-border)':'var(--border2)'};padding:3px 8px;border-radius:5px;letter-spacing:0.05em;">EXTRA ${ei+1}</span>`;

  if(isOn){
    h+=`<span onclick="event.stopPropagation()"><select onchange="extras[${ei}].mes=this.value!==''?parseInt(this.value):null;autoSave();renderExtraInline(${ei})"
      style="background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:5px 10px;font-size:12px;color:var(--text);font-family:'Inter',sans-serif;outline:none;cursor:pointer;">
      <option value="" ${mi===null?'selected':''}>Selecione o mês de uso...</option>`;
    MS.forEach((m,idx)=>{h+=`<option value="${idx}" ${mi===idx?'selected':''}>${m} — ${MF[idx]}</option>`;});
    h+=`</select></span>`;
    if(mi!==null){
      h+=`<span class="c-name" style="font-size:14px;">${MF[mi]}</span>`;
      if(ex.theme)h+=`<span class="c-theme">${ex.theme}</span>`;
    }
  } else {
    h+=`<span style="font-size:12px;color:var(--text3);">Configure os recursos · ative o toggle para incluir nos totais</span>`;
  }

  h+=`</div><div style="display:flex;align-items:center;gap:14px;" onclick="event.stopPropagation()">`;

  if(isOn&&mi!==null){
    h+=`<div class="c-totals">
      <div class="ct-item"><div class="ctl">Orçado</div><div class="ctv" id="xhdr-orc-${ei}" style="color:${ot>0?'var(--orange2)':'var(--text3)'};">R$ ${fmt(ot)}</div></div>
      <div class="ct-item"><div class="ctl">Realizado</div><div class="ctv" id="xhdr-real-${ei}" style="color:${rt>0?'var(--green)':'var(--text3)'};">R$ ${fmt(rt)}</div></div>
    </div>`;
  }

  h+=`<div style="display:flex;align-items:center;gap:7px;flex-shrink:0;">
    <span style="font-size:10px;color:${isOn?'var(--orange2)':'var(--text3)'};">${isOn?'Ativa':'Inativa'}</span>
    <div onclick="toggleExtra(${ei})" title="${isOn?'Desativar':'Ativar'} para uso"
      style="width:40px;height:22px;border-radius:11px;background:${isOn?'var(--orange)':'var(--border2)'};position:relative;cursor:pointer;transition:background 0.2s;">
      <div style="width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:3px;left:${isOn?'21px':'3px'};transition:left 0.2s;"></div>
    </div>
  </div>`;

  h+=`<svg class="chevron${ex.open?' open':''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px;color:var(--text3);transition:transform 0.25s;flex-shrink:0;" onclick="event.stopPropagation();toggleExtraCard(${ei})"><polyline points="9 18 15 12 9 6"/></svg>`;

  h+=`</div></div>`;

  h+=`<div id="extra-body-${ei}" style="display:${ex.open?'block':'none'};border-top:1px solid var(--border);">${ex.open?renderExtraBody(ei):''}</div>`;
  h+=`</div>`;
  return h;
}

function toggleExtra(ei){
  extras[ei].ativa=!extras[ei].ativa;
  if(!extras[ei].ativa)extras[ei].mes=null;
  autoSave();
  updMetrics();
  document.getElementById('extra-card-'+ei).outerHTML=renderExtraCard(ei);
}

function toggleExtraCard(ei){
  extras[ei].open=!extras[ei].open;
  const card=document.getElementById('extra-card-'+ei);
  if(card)card.outerHTML=renderExtraCard(ei);
}

function toggleExtraOrc(ei,ri){
  extras[ei].orc[ri]=!extras[ei].orc[ri];
  autoSave();
  const body=document.getElementById('extra-body-'+ei);
  if(body)body.innerHTML=renderExtraBody(ei);
  refreshExtraHeader(ei);
  updMetrics();
}

function toggleExtraReal(ei,ri){
  extras[ei].real[ri].sel=!extras[ei].real[ri].sel;
  autoSave();
  const body=document.getElementById('extra-body-'+ei);
  if(body)body.innerHTML=renderExtraBody(ei);
  refreshExtraHeader(ei);
  updMetrics();
}

function renderExtraInline(ei){
  const card=document.getElementById('extra-card-'+ei);
  if(card)card.outerHTML=renderExtraCard(ei);
}

function calcExtraOrc(ei){
  const ex=extras[ei];
  // Orçado sempre soma, sem nenhuma trava
  return ex.orc.reduce((s,sel,ri)=>sel?s+(resources[ri].price||0)*(resources[ri].qty||0):s,0);
}
function calcExtraReal(ei){
  const ex=extras[ei];
  // Realizado só soma quando há mês definido
  if(ex.mes===null)return 0;
  return ex.real.reduce((s,r,ri)=>{if(!r.sel)return s;const p=r.price!==null?r.price:(resources[ri].price||0);const q=r.qty!==null?r.qty:0;return s+p*q;},0);
}

function refreshExtraHeader(ei){
  const ot=calcExtraOrc(ei),rt=calcExtraReal(ei);
  const ho=document.getElementById('xhdr-orc-'+ei);const hr=document.getElementById('xhdr-real-'+ei);
  if(ho){ho.textContent='R$ '+fmt(ot);ho.style.color=ot>0?'var(--orange2)':'var(--text3)';}
  if(hr){hr.textContent='R$ '+fmt(rt);hr.style.color=rt>0?'var(--green)':'var(--text3)';}
}
function updateExtraRealRow(ei,ri){
  const r=extras[ei].real[ri];
  const p=r.price!==null?r.price:(resources[ri].price||0);
  const q=r.qty!==null?r.qty:0;
  const sub=p*q;
  const subEl=document.getElementById('xreal-sub-'+ei+'-'+ri);
  if(subEl)subEl.textContent=sub>0?'R$ '+fmt(sub):'—';
  const totEl=document.getElementById('xreal-total-'+ei);
  if(totEl)totEl.textContent='R$ '+fmt(calcExtraReal(ei));
}

function renderExtraBody(ei){
  const ex=extras[ei];const mi=ex.mes;const tot=getTotal(mi);
  // Reutiliza a mesma lógica do renderBody mas com extra
  let h=`<div class="camp-body">
    <div style="margin-bottom:22px;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;">
      <div>
        <div class="field-label">Tema da campanha</div>
        <input class="inp" type="text" value="${ex.theme}" placeholder="Insira o tema..."
          oninput="autoSave();extras[${ei}].theme=this.value">
      </div>
      <div>
        <div class="field-label">Resumo da campanha</div>
        <textarea class="inp" rows="2" placeholder="Descreva brevemente..."
          style="resize:vertical;min-height:42px;font-family:'Inter',sans-serif;line-height:1.5;"
          oninput="autoSave();extras[${ei}].resumo=this.value">${ex.resumo||''}</textarea>
      </div>
    </div>`;

  // ORÇADO
  h+=`<div class="sbox"><div class="sbox-title"><span class="dot dot-o"></span>Orçado <span style="margin-left:auto;font-weight:400;color:var(--text3);text-transform:none;letter-spacing:0;">${fmtN(tot)} motoristas em ${MF[mi]}</span></div>
    <div class="res-grid">`;
  resources.forEach((res,ri)=>{const s=ex.orc[ri];h+=`<label class="chk-res${s?' sel-o':''}" onclick="toggleExtraOrc(${ei},${ri});return false;"><input type="checkbox" ${s?'checked':''} style="accent-color:var(--orange)" onchange="autoSave();toggleExtraOrc(${ei},${ri})">${res.name}</label>`;});
  h+=`</div>`;
  if(ex.orc.some(s=>s)){
    h+=`<div class="tbl-wrap"><table><thead><tr><th>Recurso orçado</th><th class="r">Valor unit.</th><th class="r">Qtd.</th><th class="r">Total</th></tr></thead><tbody>`;
    let ot=0;
    ex.orc.forEach((sel,ri)=>{
      if(!sel)return;const p=resources[ri].price||0;const q=resources[ri].qty||0;const sub=p*q;ot+=sub;
      h+=`<tr><td style="font-weight:600;color:var(--text);">${resources[ri].name}</td><td class="r">${p>0?'R$ '+fmt(p):'<span style="color:var(--text3)">—</span>'}</td><td class="r" style="font-weight:600;">${q>0?fmtN(q):'<span style="color:var(--text3)">—</span>'}</td><td class="r" style="font-weight:700;color:${sub>0?'var(--orange2)':'var(--text3)'};">${sub>0?'R$ '+fmt(sub):'—'}</td></tr>`;
    });
    h+=`<tr class="total-row"><td colspan="4">Total orçado</td><td class="r" style="color:var(--orange2);">R$ ${fmt(ot)}</td></tr></tbody></table></div>`;
  }
  h+=`</div>`;

  // REALIZADO
  h+=`<div class="sbox"><div class="sbox-title"><span class="dot dot-g"></span>Realizado</div>
    <div class="res-grid">`;
  resources.forEach((res,ri)=>{const s=ex.real[ri].sel;h+=`<label class="chk-res${s?' sel-g':''}" onclick="toggleExtraReal(${ei},${ri});return false;"><input type="checkbox" ${s?'checked':''} style="accent-color:var(--green)" onchange="autoSave();toggleExtraReal(${ei},${ri})">${res.name}</label>`;});
  h+=`</div>`;
  if(ex.real.some(r=>r.sel)){
    h+=`<div class="tbl-wrap"><table><thead><tr><th>Recurso utilizado</th><th class="r">Valor unit.</th><th class="r">Quantidade</th><th class="r">Total</th></tr></thead><tbody>`;
    ex.real.forEach((r,ri)=>{
      if(!r.sel)return;
      const p=r.price!==null?r.price:(resources[ri].price||0);
      const q=r.qty!==null?r.qty:null;
      const sub=(p>0&&q!==null&&q>0)?p*q:0;
      h+=`<tr id="xreal-row-${ei}-${ri}">
        <td style="font-weight:600;color:var(--text);">${resources[ri].name}</td>
        <td class="r"><div style="display:flex;align-items:center;justify-content:flex-end;gap:5px;"><span style="font-size:11px;color:var(--text3);">R$</span>
          <input class="edt g" type="number" min="0" step="0.01" value="${p!==null?p:''}" placeholder="0,00" style="width:100px;"
            oninput="autoSave();extras[${ei}].real[${ri}].price=this.value!==''?parseFloat(this.value):null;updateExtraRealRow(${ei},${ri});refreshExtraHeader(${ei});updMetrics()">
        </div></td>
        <td class="r">
          <input class="edt g" type="number" min="0" value="${q!==null?q:''}" placeholder="qtd." style="width:85px;"
            oninput="autoSave();extras[${ei}].real[${ri}].qty=this.value!==''?parseInt(this.value):null;updateExtraRealRow(${ei},${ri});refreshExtraHeader(${ei});updMetrics()">
        </td>
        <td class="r" id="xreal-sub-${ei}-${ri}" style="font-weight:700;color:var(--green);">${sub>0?'R$ '+fmt(sub):'—'}</td>
      </tr>`;
    });
    h+=`<tr class="total-row"><td colspan="3">Total realizado</td><td class="r" id="xreal-total-${ei}" style="color:var(--green);">R$ ${fmt(calcExtraReal(ei))}</td></tr></tbody></table></div>`;
  }
  h+=`</div>`;

  // ARTES
  h+=`<div class="sbox"><div class="sbox-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2" style="flex-shrink:0;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Artes da campanha<span style="margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0;font-size:10px;color:var(--text3);">Insira os arquivos PNG</span></div>
    <div class="artes-grid">`;
  ARTES_KEYS.forEach(key=>{
    const src=ex.artes[key];const lbl=ARTES_LABELS[key];
    h+=`<div class="arte-slot"><div class="arte-slot-label"><span>${lbl}</span>${src?`<span class="rm-arte" onclick="extras[${ei}].artes['${key}']=null;if(extras[${ei}].open)document.getElementById('extra-body-${ei}').innerHTML=renderExtraBody(${ei})">✕</span>`:''}</div>
      <div class="arte-preview" onclick="document.getElementById('xarte-${ei}-${key}').click()" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="event.preventDefault();this.classList.remove('drag-over');dropExtraArte(${ei},'${key}',event)">
        ${src?`<img src="${src}">`:`<div class="upload-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Clique ou arraste</span></div>`}
        <input type="file" id="xarte-${ei}-${key}" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="addExtraArte(${ei},'${key}',this)">
      </div></div>`;
  });
  h+=`</div></div>`;

  // FOTOS
  h+=`<div class="sbox"><div class="sbox-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" style="flex-shrink:0;"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>Fotos da campanha<span style="margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0;font-size:10px;color:var(--text3);">Registro fotográfico</span></div>
    <div class="foto-grid">`;
  ex.fotos.forEach((src,fi)=>{h+=`<div class="foto-slot"><img src="${src}"><div class="rm-foto" onclick="extras[${ei}].fotos.splice(${fi},1);if(extras[${ei}].open)document.getElementById('extra-body-${ei}').innerHTML=renderExtraBody(${ei})">✕</div></div>`;});
  if(ex.fotos.length<3){
    h+=`<div class="foto-slot" onclick="document.getElementById('xfi-${ei}').click()" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="event.preventDefault();this.classList.remove('drag-over');dropExtraFoto(${ei},event)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <span>Arraste ou clique — ${ex.fotos.length}/3</span>
      <input type="file" id="xfi-${ei}" accept="image/*" style="display:none;" onchange="addExtraFoto(${ei},this)">
    </div>`;
  }
  h+=`</div></div></div>`;
  return h;
}

function addExtraArte(ei,key,input){const file=input.files[0];if(!file)return;const r=new FileReader();r.onload=e=>{extras[ei].artes[key]=e.target.result;if(extras[ei].open)document.getElementById('extra-body-'+ei).innerHTML=renderExtraBody(ei);};r.readAsDataURL(file);}
function dropExtraArte(ei,key,ev){const file=ev.dataTransfer.files[0];if(!file||!file.type.startsWith('image/'))return;const r=new FileReader();r.onload=e=>{extras[ei].artes[key]=e.target.result;if(extras[ei].open)document.getElementById('extra-body-'+ei).innerHTML=renderExtraBody(ei);};r.readAsDataURL(file);}
function addExtraFoto(ei,input){const file=input.files[0];if(!file||extras[ei].fotos.length>=3)return;const r=new FileReader();r.onload=e=>{extras[ei].fotos.push(e.target.result);if(extras[ei].open)document.getElementById('extra-body-'+ei).innerHTML=renderExtraBody(ei);};r.readAsDataURL(file);}
function dropExtraFoto(ei,ev){const file=ev.dataTransfer.files[0];if(!file||!file.type.startsWith('image/')||extras[ei].fotos.length>=3)return;const r=new FileReader();r.onload=e=>{extras[ei].fotos.push(e.target.result);if(extras[ei].open)document.getElementById('extra-body-'+ei).innerHTML=renderExtraBody(ei);};r.readAsDataURL(file);}

function renderBody(mi){
  const camp=camps[mi];const tot=getTotal(mi);
  let h=`<div class="camp-body">
    <div style="margin-bottom:22px;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;">
      <div>
        <div class="field-label">Tema da campanha <span class="f-badge">definir em ${PREV[mi]}</span></div>
        <input class="inp" type="text" value="${camp.theme}" placeholder="Insira o tema da campanha..."
          oninput="autoSave();camps[${mi}].theme=this.value;var e=document.getElementById('hdr-theme-${mi}');if(e)e.textContent=this.value||'Tema não definido'">
      </div>
      <div>
        <div class="field-label">Resumo da campanha</div>
        <textarea class="inp" rows="2" placeholder="Descreva brevemente a campanha..."
          style="resize:vertical;min-height:42px;font-family:'Inter',sans-serif;line-height:1.5;"
          oninput="autoSave();camps[${mi}].resumo=this.value">${camp.resumo||''}</textarea>
      </div>
    </div>`;
  h+=`<div class="sbox">
    <div class="sbox-title">
      <span class="dot dot-o"></span>Orçado
      <span style="margin-left:auto;display:flex;align-items:center;gap:10px;">
        <span style="font-size:10px;color:${camp.orcEdit?'var(--orange2)':'var(--text3)'};font-weight:${camp.orcEdit?700:400};">
          ${camp.orcEdit?'Edição personalizada':'Padrão (aba Recursos)'}
        </span>
        <div onclick="camps[${mi}].orcEdit=!camps[${mi}].orcEdit;autoSave();if(camps[${mi}].open)document.getElementById('body-${mi}').innerHTML=renderBody(${mi});refreshHeader(${mi});"
          title="${camp.orcEdit?'Voltar ao padrão':'Editar valores desta campanha'}"
          style="width:36px;height:20px;border-radius:10px;background:${camp.orcEdit?'var(--orange)':'var(--border2)'};position:relative;cursor:pointer;transition:background 0.2s;flex-shrink:0;">
          <div style="width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:3px;left:${camp.orcEdit?'19px':'3px'};transition:left 0.2s;"></div>
        </div>
      </span>
    </div>
    <div class="res-grid">`;
  resources.forEach((res,ri)=>{const s=camp.orc[ri];h+=`<label class="chk-res${s?' sel-o':''}" onclick="toggleOrc(${mi},${ri});return false;"><input type="checkbox" ${s?'checked':''} style="accent-color:var(--orange)" onchange="autoSave();toggleOrc(${mi},${ri})">${res.name}</label>`;});
  h+=`</div>`;
  if(camp.orc.some(s=>s)){
    if(camp.orcEdit){
      // Modo edição — campos editáveis por linha
      h+=`<div class="warn" style="margin-bottom:10px;">✏️ Modo personalizado ativo — os valores abaixo sobrepõem os valores padrão da aba Recursos.</div>`;
      h+=`<div class="tbl-wrap"><table><thead><tr><th>Recurso orçado</th><th class="r">Valor unit.</th><th class="r">Qtd.</th><th class="r">Total</th></tr></thead><tbody>`;
      let ot=0;
      camp.orc.forEach((sel,ri)=>{
        if(!sel)return;
        const p=camp.orcCustom[ri].price!==null?camp.orcCustom[ri].price:(resources[ri].price||0);
        const q=camp.orcCustom[ri].qty!==null?camp.orcCustom[ri].qty:(resources[ri].qty||0);
        const sub=p*q;ot+=sub;
        h+=`<tr>
          <td style="font-weight:600;color:var(--text);">${resources[ri].name}</td>
          <td class="r"><div style="display:flex;align-items:center;justify-content:flex-end;gap:5px;"><span style="font-size:11px;color:var(--text3);">R$</span>
            <input class="edt" type="number" min="0" step="0.01" value="${p||''}" placeholder="${resources[ri].price||'0,00'}" style="width:100px;"
              oninput="autoSave();camps[${mi}].orcCustom[${ri}].price=parseFloat(this.value)||0;refreshHeader(${mi})">
          </div></td>
          <td class="r">
            <input class="edt" type="number" min="0" value="${q||''}" placeholder="${resources[ri].qty||'0'}" style="width:80px;"
              oninput="autoSave();camps[${mi}].orcCustom[${ri}].qty=parseInt(this.value)||0;refreshHeader(${mi})">
          </td>
          <td class="r" style="font-weight:700;color:${sub>0?'var(--orange2)':'var(--text3)'};">${sub>0?'R$ '+fmt(sub):'—'}</td>
        </tr>`;
      });
      h+=`<tr class="total-row"><td colspan="3">Total orçado</td><td class="r" style="color:var(--orange2);">R$ ${fmt(ot)}</td></tr></tbody></table></div>`;
    } else {
      // Modo padrão — só leitura
      h+=`<div class="tbl-wrap"><table><thead><tr><th>Recurso orçado</th><th class="r">Valor unit.</th><th class="r">Qtd.</th><th class="r">Total</th></tr></thead><tbody>`;
      let ot=0;
      camp.orc.forEach((sel,ri)=>{
        if(!sel)return;const p=resources[ri].price||0;const q=resources[ri].qty||0;const sub=p*q;ot+=sub;
        h+=`<tr><td style="font-weight:600;color:var(--text);">${resources[ri].name}</td><td class="r">${p>0?'R$ '+fmt(p):'<span style="color:var(--text3)">—</span>'}</td><td class="r" style="font-weight:600;">${q>0?fmtN(q):'<span style="color:var(--text3)">—</span>'}</td><td class="r" style="font-weight:700;color:${sub>0?'var(--orange2)':'var(--text3)'};">${sub>0?'R$ '+fmt(sub):'—'}</td></tr>`;
      });
      h+=`<tr class="total-row"><td colspan="3">Total orçado</td><td class="r" style="color:var(--orange2);">R$ ${fmt(ot)}</td></tr></tbody></table></div>`;
      if(resources.some((r,ri)=>camp.orc[ri]&&!r.price))h+=`<div class="warn">⚠ Defina os valores na aba Recursos para calcular o total.</div>`;
    }
  }
  h+=`</div>`;
  h+=`<div class="sbox">
    <div class="sbox-title"><span class="dot dot-g"></span>Realizado</div>
    <div class="res-grid">`;
  resources.forEach((res,ri)=>{const s=camp.real[ri].sel;h+=`<label class="chk-res${s?' sel-g':''}" onclick="toggleReal(${mi},${ri});return false;"><input type="checkbox" ${s?'checked':''} style="accent-color:var(--green)" onchange="autoSave();toggleReal(${mi},${ri})">${res.name}</label>`;});
  h+=`</div>`;
  if(camp.real.some(r=>r.sel)){
    h+=`<div class="tbl-wrap"><table><thead><tr><th>Recurso utilizado</th><th class="r">Valor unit.</th><th class="r">Quantidade</th><th class="r">Total</th></tr></thead><tbody>`;
    camp.real.forEach((r,ri)=>{
      if(!r.sel)return;
      const p=r.price!==null?r.price:(resources[ri].price||0);
      const q=r.qty!==null?r.qty:null;
      const sub=(p>0&&q!==null)?p*q:0;
      h+=`<tr id="real-row-${mi}-${ri}">
        <td style="font-weight:600;color:var(--text);">${resources[ri].name}</td>
        <td class="r"><div style="display:flex;align-items:center;justify-content:flex-end;gap:5px;"><span style="font-size:11px;color:var(--text3);">R$</span>
          <input class="edt g" type="number" min="0" step="0.01" value="${p!==null?p:''}" placeholder="0,00" style="width:100px;"
            oninput="autoSave();camps[${mi}].real[${ri}].price=this.value!==''?parseFloat(this.value):null;updateRealRow(${mi},${ri});refreshHeader(${mi});updMetrics()">
        </div></td>
        <td class="r">
          <input class="edt g" type="number" min="0" value="${q!==null?q:''}" placeholder="qtd." style="width:85px;"
            oninput="autoSave();camps[${mi}].real[${ri}].qty=this.value!==''?parseInt(this.value):null;updateRealRow(${mi},${ri});refreshHeader(${mi});updMetrics()">
        </td>
        <td class="r" id="real-sub-${mi}-${ri}" style="font-weight:700;color:var(--green);">${sub>0?'R$ '+fmt(sub):'—'}</td>
      </tr>`;
    });
    h+=`<tr class="total-row"><td colspan="3">Total realizado</td><td class="r" id="real-total-row-${mi}" style="color:var(--green);">R$ ${fmt(calcReal(mi))}</td></tr></tbody></table></div>`;
  }
  h+=`</div>`;
  /* ARTES */
  h+=`<div class="sbox">
    <div class="sbox-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--blue);flex-shrink:0;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      Artes da campanha
      <span style="margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0;font-size:10px;color:var(--text3);">Insira os arquivos PNG de cada peça</span>
    </div>
    <div class="artes-grid">`;
  ARTES_KEYS.forEach(key=>{
    const src=camp.artes[key];
    const lbl=ARTES_LABELS[key];
    h+=`<div class="arte-slot">
      <div class="arte-slot-label">
        <span>${lbl}</span>
        ${src?`<span class="rm-arte" onclick="rmArte(${mi},'${key}')">✕</span>`:''}
      </div>
      <div class="arte-preview"
        onclick="document.getElementById('arte-${mi}-${key}').click()"
        ondragover="event.preventDefault();this.classList.add('drag-over')"
        ondragleave="this.classList.remove('drag-over')"
        ondrop="event.preventDefault();this.classList.remove('drag-over');dropArte(${mi},'${key}',event)">
        ${src
          ?`<img src="${src}">`
          :`<div class="upload-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Clique para inserir</span>
            </div>`
        }
        <input type="file" id="arte-${mi}-${key}" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="addArte(${mi},'${key}',this)">
      </div>
    </div>`;
  });
  h+=`</div></div>`;

  /* FOTOS */
  h+=`<div class="sbox">
    <div class="sbox-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--green);flex-shrink:0;"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
      Fotos da campanha
      <span style="margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0;font-size:10px;color:var(--text3);">Registro fotográfico</span>
    </div>
    <div class="foto-grid" id="fotos-${mi}">`;
  camp.fotos.forEach((src,fi)=>{h+=`<div class="foto-slot"><img src="${src}"><div class="rm-foto" onclick="rmFoto(${mi},${fi})">✕</div></div>`;});
  if(camp.fotos.length<3){
    h+=`<div class="foto-slot"
      onclick="document.getElementById('fi-${mi}').click()"
      ondragover="event.preventDefault();this.classList.add('drag-over')"
      ondragleave="this.classList.remove('drag-over')"
      ondrop="event.preventDefault();this.classList.remove('drag-over');dropFoto(${mi},event)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <span>Arraste ou clique — ${camp.fotos.length}/3</span>
      <input type="file" id="fi-${mi}" accept="image/*" style="display:none;" onchange="addFoto(${mi},this)">
    </div>`;
  } else {
    h+=`<div style="grid-column:1/-1;font-size:11px;color:var(--text3);padding:6px 0;display:flex;align-items:center;gap:6px;"><span style="background:var(--green-bg);border:1px solid var(--green-border);color:var(--green);border-radius:4px;padding:2px 8px;font-size:10px;font-weight:600;">3/3</span> Limite atingido. Remova uma foto para substituir.</div>`;
  }
  h+=`</div></div>

  </div>`;
  return h;
}

/* ── ENVIO ── */
function renderEnvio(){
  const pnl=document.getElementById('pnl-envio');
  const divMode=window.envioMode||4000;
  const mesSel=window.envioMes!==undefined?window.envioMes:CI[0];

  // Quantidade de cada empresa no mês selecionado
  const rows=companies.map(co=>{
    const necessario=driverData[co]&&driverData[co][mesSel]||0;
    return {co,necessario};
  });
  const totalNec=rows.reduce((s,r)=>s+r.necessario,0);

  // Distribuição proporcional com arredondamento que fecha o total exato
  const rowsCalc=rows.map(r=>{
    const divisao=totalNec>0?Math.round(Math.round((r.necessario/totalNec)*divMode)/10)*10:0;
    return {...r,divisao};
  });
  // Ajusta diferença no maior valor
  if(rowsCalc.length>0){
    const somaDiv=rowsCalc.reduce((s,r)=>s+r.divisao,0);
    const diff=divMode-somaDiv;
    if(diff!==0){
      const idx=rowsCalc.reduce((mi,r,i,a)=>r.necessario>a[mi].necessario?i:mi,0);
      rowsCalc[idx].divisao+=diff;
    }
  }
  rowsCalc.forEach(r=>{
    r.acrescimo=r.divisao-r.necessario;
    r.perc=r.necessario>0?((r.acrescimo/r.necessario)*100).toFixed(1):'—';
  });
  const totalDiv=rowsCalc.reduce((s,r)=>s+r.divisao,0);
  const totalAcrescimo=totalDiv-totalNec;
  const pctTotal=totalNec>0?((totalAcrescimo/totalNec)*100).toFixed(1):0;

  let h='';

  // Controles: seletor de mês + toggle 4000/5000
  h+=`<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
    <div class="sec-title">Distribuição por empresa</div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">`;

  // Seletor de mês de campanha
  h+=`<div style="display:flex;align-items:center;gap:6px;background:var(--card2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:4px;">`;
  CI.forEach(mi=>{
    const ativo=mi===mesSel;
    h+=`<button onclick="window.envioMes=${mi};renderEnvio()"
      style="padding:6px 12px;border-radius:var(--radius);border:none;cursor:pointer;font-size:11px;font-weight:600;font-family:'Inter',sans-serif;transition:all 0.15s;letter-spacing:0.04em;
      background:${ativo?'var(--orange)':'transparent'};color:${ativo?'#fff':'var(--text3)'};">
      ${MS[mi]}
    </button>`;
  });
  h+=`</div>`;

  // Toggle 4000/5000
  h+=`<div style="display:flex;align-items:center;gap:4px;background:var(--card2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:4px;">
    <button onclick="window.envioMode=4000;renderEnvio()"
      style="padding:7px 18px;border-radius:var(--radius);border:none;cursor:pointer;font-size:13px;font-weight:600;font-family:'Inter',sans-serif;transition:all 0.15s;
      background:${divMode===4000?'var(--orange)':'transparent'};color:${divMode===4000?'#fff':'var(--text3)'};">4.000 un.</button>
    <button onclick="window.envioMode=5000;renderEnvio()"
      style="padding:7px 18px;border-radius:var(--radius);border:none;cursor:pointer;font-size:13px;font-weight:600;font-family:'Inter',sans-serif;transition:all 0.15s;
      background:${divMode===5000?'var(--orange)':'transparent'};color:${divMode===5000?'#fff':'var(--text3)'};">5.000 un.</button>
  </div>`;

  h+=`</div></div>`;

  // Cards de resumo
  h+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;">
    <div class="mc"><div class="mc-l">Motoristas em ${MF[mesSel]}</div><div class="mc-v">${fmtN(totalNec)}</div><div class="mc-s">total no mês da campanha</div></div>
    <div class="mc orange"><div class="mc-l">Total enviado</div><div class="mc-v" style="color:var(--orange2);">${fmtN(totalDiv)}</div><div class="mc-s">${fmtN(divMode)} unidades</div></div>
    <div class="mc" style="border-color:var(--green-border);background:var(--green-bg);"><div class="mc-l">Acréscimo total</div><div class="mc-v" style="color:var(--green);">+${fmtN(totalAcrescimo)}</div><div class="mc-s">${pctTotal}% acima do necessário</div></div>
  </div>`;

  // Tabela
  h+=`<div class="tbl-wrap"><table><thead><tr>
    <th style="min-width:150px;">Empresa</th>
    <th class="r">Qtd. ${MF[mesSel]}</th>
    <th class="r" style="color:var(--orange2);">Divisão ${fmtN(divMode)}</th>
    <th class="r" style="color:var(--green);">Acréscimo</th>
    <th class="r">Percentual</th>
  </tr></thead><tbody>`;

  rowsCalc.forEach(r=>{
    const isPos=r.acrescimo>=0;
    const percNum=r.necessario>0?Math.min(Math.abs(parseFloat(r.perc)),100):0;
    h+=`<tr>
      <td style="font-weight:600;color:var(--text);">${r.co}</td>
      <td class="r">${fmtN(r.necessario)}</td>
      <td class="r" style="font-weight:700;color:var(--orange2);">${fmtN(r.divisao)}</td>
      <td class="r" style="font-weight:700;color:${isPos?'var(--green)':'#e05555'};">${r.necessario>0?(isPos?'+':'')+fmtN(r.acrescimo):'—'}</td>
      <td class="r">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;">
          <div style="width:80px;height:6px;background:var(--border2);border-radius:3px;overflow:hidden;">
            <div style="width:${percNum}%;height:100%;background:${isPos?'var(--green)':'#e05555'};border-radius:3px;"></div>
          </div>
          <span style="font-size:11px;font-weight:600;color:${isPos?'var(--green)':'#e05555'};min-width:48px;text-align:right;">${r.perc!=='—'?(isPos?'+':'')+r.perc+'%':'—'}</span>
        </div>
      </td>
    </tr>`;
  });

  h+=`<tr class="total-row">
    <td>TOTAL</td>
    <td class="r">${fmtN(totalNec)}</td>
    <td class="r" style="color:var(--orange2);">${fmtN(totalDiv)}</td>
    <td class="r" style="color:var(--green);">+${fmtN(totalAcrescimo)}</td>
    <td class="r" style="color:var(--green);">+${pctTotal}%</td>
  </tr></tbody></table></div>`;
  h+=`<p style="font-size:11px;color:var(--text3);margin-top:10px;">Distribuição proporcional ao número de motoristas de cada empresa em <strong style="color:var(--text2);">${MF[mesSel]}</strong>, sobre ${fmtN(divMode)} unidades.</p>`;

  pnl.innerHTML=h;
}

/* ── DASHBOARD ── */
function renderDashboard(){
  const pnl=document.getElementById('pnl-dashboard');
  const idx=window.dashIdx!==undefined?window.dashIdx:getCurrentCampIdx();
  window.dashIdx=idx;
  const mi=CI[idx];
  const camp=camps[mi];
  const nextIdx=(idx+1)%CI.length;
  const nextMi=CI[nextIdx];
  const nextCamp=camps[nextMi];

  const motoristas=getTotal(mi);
  const orc=calcOrc(mi);
  const real=calcReal(mi);
  const diff=real-orc;
  const pctDiff=orc>0&&real>0?((diff/orc)*100):null;
  const totalReal=CI.reduce((s,m)=>s+calcReal(m),0);

  let h='';

  // Navegação mês
  h+=`<div class="dash-month-nav">
    <button class="dash-nav-btn" onclick="window.dashIdx=(${idx}-1+${CI.length})%${CI.length};renderDashboard()">&#8249;</button>
    <div style="text-align:center;">
      <div class="dash-month-badge">${MF[mi]}</div>
      <div class="dash-month-sub">Campanha ${idx+1} de ${CI.length} · ${new Date().getFullYear()}</div>
    </div>
    <button class="dash-nav-btn" onclick="window.dashIdx=(${idx}+1)%${CI.length};renderDashboard()">&#8250;</button>
  </div>`;

  // Cards
  const pctCor=pctDiff===null?'var(--text3)':diff>0?'#e05555':'var(--green)';
  const pctTxt=pctDiff!==null?(diff>0?'Acima ':'Abaixo ')+(Math.abs(pctDiff).toFixed(1))+'% do orçado':'Sem registro';
  const pctBadgeBg=pctDiff===null?'var(--bg3)':diff>0?'rgba(224,85,85,0.15)':'var(--green-bg)';
  const pctBadgeColor=pctDiff===null?'var(--text3)':diff>0?'#e05555':'var(--green)';

  h+=`<div class="dash-cards">
    <div class="dash-card teal">
      <div class="dc-icon" style="background:var(--orange-bg);"><svg viewBox="0 0 24 24" fill="none" stroke="var(--orange2)" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
      <div class="dc-label">Motoristas</div>
      <div class="dc-value">${fmtN(motoristas)}</div>
      <div class="dc-sub">em ${MF[mi]}</div>
    </div>
    <div class="dash-card teal">
      <div class="dc-icon" style="background:var(--orange-bg);"><svg viewBox="0 0 24 24" fill="none" stroke="var(--orange2)" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
      <div class="dc-label">Valor orçado</div>
      <div class="dc-value" style="font-size:16px;color:var(--orange2);">${orc>0?'R$ '+fmt(orc):'—'}</div>
      <div class="dc-sub">campanha de ${MF[mi]}</div>
    </div>
    <div class="dash-card ${pctDiff===null?'':diff>0?'red':'green'}">
      <div class="dc-icon" style="background:${pctDiff===null?'var(--bg3)':diff>0?'rgba(224,85,85,0.15)':'var(--green-bg)'};"><svg viewBox="0 0 24 24" fill="none" stroke="${pctCor}" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></div>
      <div class="dc-label">Valor realizado</div>
      <div class="dc-value" style="font-size:16px;color:${pctCor};">${real>0?'R$ '+fmt(real):'—'}</div>
      <div class="dc-badge" style="background:${pctBadgeBg};color:${pctBadgeColor};">${pctTxt}</div>
    </div>
    <div class="dash-card" style="border-color:var(--green-border);background:var(--green-bg);">
      <div class="dc-icon" style="background:rgba(24,184,122,0.15);"><svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
      <div class="dc-label">Total realizado no ano</div>
      <div class="dc-value" style="font-size:16px;color:var(--green);">${totalReal>0?'R$ '+fmt(totalReal):'—'}</div>
      <div class="dc-sub">${CI.filter(m=>calcReal(m)>0).length} de ${CI.length} campanhas</div>
    </div>
  </div>`;

  // Card próxima campanha + resumo
  h+=`<div style="display:grid;grid-template-columns:1fr 2fr;gap:14px;margin-bottom:20px;">
    <div class="dash-card">
      <div class="dc-icon" style="background:var(--bg3);"><svg viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div class="dc-label">Próxima campanha</div>
      <div style="margin-top:4px;"><span class="m-badge" style="margin-bottom:6px;display:inline-block;">${MS[nextMi]}</span></div>
      <div style="font-size:13px;font-weight:500;color:${nextCamp.theme?'var(--text)':'var(--text3)'};font-style:${nextCamp.theme?'normal':'italic'};">${nextCamp.theme||'Tema não definido'}</div>
    </div>
    <div class="dash-card" style="${camp.resumo?'border-color:var(--orange-border);':''}">
      <div class="dc-label" style="margin-bottom:8px;">Resumo da campanha — ${MF[mi]}</div>
      <div style="font-size:13px;color:${camp.resumo?'var(--text2)':'var(--text3)'};font-style:${camp.resumo?'normal':'italic'};line-height:1.65;">${camp.resumo||'Nenhum resumo definido para esta campanha.'}</div>
    </div>
  </div>`;

  // Artes
  const artes=camp.artes;
  h+=`<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:14px;display:flex;align-items:center;gap:8px;">
    <span style="width:3px;height:14px;background:var(--orange);border-radius:2px;display:inline-block;"></span>
    Artes da campanha
  </div>`;

  function arteSlot(src,label){
    return `<div class="dash-arte-block">
      <div class="dash-arte-label"><span class="dot-teal"></span>${label}</div>
      ${src
        ?`<div class="dash-arte-img"><img src="${src}" onclick="event.stopPropagation();openLightbox('${src}','${label}')" title="Clique para ampliar"></div>`
        :`<div class="dash-arte-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Sem arte cadastrada para esta campanha</span></div>`
      }
    </div>`;
  }

  // Folder frente + verso lado a lado
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
    ${arteSlot(artes.folder_frente,'FOLDER — Frente')}
    ${arteSlot(artes.folder_verso,'FOLDER — Verso')}
  </div>`;
  // Banner + Faixa lado a lado
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;">
    ${arteSlot(artes.banner,'BANNER')}
    ${arteSlot(artes.faixa,'FAIXA')}
  </div>`;

  // Rodapé logos
  h+=`<div style="border-top:1px solid var(--border);padding-top:24px;margin-top:8px;">
    <div style="display:flex;justify-content:center;margin-bottom:20px;">
      <img src="https://res.cloudinary.com/dxnruvmgu/image/upload/v1770865291/GRUPOJCA_branco_r0nvw0.png"
        alt="Grupo JCA" style="height:${LOGO_GRUPO_H}px;object-fit:contain;opacity:0.85;">
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:32px;flex-wrap:wrap;">
      <img src="https://res.cloudinary.com/dxnruvmgu/image/upload/v1770901958/1001_qisjtr.png"
        alt="1001" style="height:${LOGO_1001_H}px;object-fit:contain;opacity:0.7;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">
      <img src="https://res.cloudinary.com/dxnruvmgu/image/upload/v1770901966/Catarinense_BrancoHD_nodz19.png"
        alt="Catarinense" style="height:${LOGO_CAT_H}px;object-fit:contain;opacity:0.7;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">
      <img src="https://res.cloudinary.com/dxnruvmgu/image/upload/v1770901986/Cometa_brancoHD_x09jcs.png"
        alt="Cometa" style="height:${LOGO_COMETA_H}px;object-fit:contain;opacity:0.7;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">
      <img src="https://res.cloudinary.com/dxnruvmgu/image/upload/v1770902190/EXP_Branco2_f6sov0.png"
        alt="Expresso do Sul" style="height:${LOGO_EXP_H}px;object-fit:contain;opacity:0.7;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">
      <img src="https://res.cloudinary.com/dxnruvmgu/image/upload/v1770902068/RRP_np50b0.png"
        alt="Rápido Ribeirão" style="height:${LOGO_RRP_H}px;object-fit:contain;opacity:0.7;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">
    </div>
  </div>`;

  pnl.innerHTML=h;
}

function getCurrentCampIdx(){
  const m=new Date().getMonth();
  let best=0;
  for(let i=0;i<CI.length;i++){if(CI[i]<=m)best=i;}
  return best;
}

function openLightbox(src,label){
  const lb=document.getElementById('lightbox');
  const img=document.getElementById('lightbox-img');
  const lbl=document.getElementById('lightbox-label');
  if(!lb||!img)return;
  img.src=src;
  if(lbl)lbl.textContent=label||'';
  lb.className='lightbox active';
  document.body.style.overflow='hidden';
}
function closeLightbox(){
  const lb=document.getElementById('lightbox');
  if(lb)lb.className='lightbox';
  document.body.style.overflow='';
}
// Fechar com ESC
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLightbox();});

/* ── GERENCIAL ── */
function renderGerencial(){
  const pnl=document.getElementById('pnl-gerencial');

  const rows=CI.map(mi=>{
    const camp=camps[mi];
    const orc=calcOrc(mi);
    const real=calcReal(mi);
    const diff=real-orc;
    const pct=(orc>0&&real>0)?((diff/orc)*100):null;
    return {badge:MS[mi],theme:camp.theme,orc,real,diff,pct,isExtra:false,ativa:true};
  });

  extras.forEach((ex,ei)=>{
    const orc=calcExtraOrc(ei);
    const real=calcExtraReal(ei);
    const diff=real-orc;
    const pct=(orc>0&&real>0)?((diff/orc)*100):null;
    const mesLabel=ex.mes!==null?MF[ex.mes]:'';
    const theme=ex.theme||(ex.mes!==null?'Extra '+(ei+1)+' — '+mesLabel:'');
    rows.push({badge:'EXTRA '+(ei+1),theme,orc,real,diff,pct,isExtra:true,ativa:ex.ativa,mes:ex.mes,ei});
  });

  const totalOrcado=rows.reduce((s,r)=>s+r.orc,0);
  const totalRealizado=rows.reduce((s,r)=>s+r.real,0);
  const totalDiff=totalRealizado-totalOrcado;
  const totalPct=totalOrcado>0&&totalRealizado>0?((totalDiff/totalOrcado)*100):null;
  const numCamps=CI.length+extras.filter(ex=>ex.orc.some(s=>s)).length;

  let h='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px;">';
  h+='<div class="mc orange"><div class="mc-l">Total orçado</div>';
  h+='<div class="mc-v" style="color:var(--orange2);">'+(totalOrcado>0?'R$ '+fmt(totalOrcado):'—')+'</div>';
  h+='<div class="mc-s">'+numCamps+' campanha'+(numCamps!==1?'s':'')+' no ano</div></div>';
  h+='<div class="mc green"><div class="mc-l">Total realizado</div>';
  h+='<div class="mc-v" style="color:var(--green);">'+(totalRealizado>0?'R$ '+fmt(totalRealizado):'—')+'</div>';
  h+='<div class="mc-s">registrado até agora</div></div>';
  const difBorder=totalDiff>0?'rgba(217,85,85,0.3)':totalDiff<0?'var(--green-border)':'var(--border)';
  const difBg=totalDiff>0?'rgba(217,85,85,0.1)':totalDiff<0?'var(--green-bg)':'var(--card)';
  const difCor=totalDiff>0?'#e05555':totalDiff<0?'var(--green)':'var(--text3)';
  h+='<div class="mc" style="border-color:'+difBorder+';background:'+difBg+';">';
  h+='<div class="mc-l">Diferença total</div>';
  h+='<div class="mc-v" style="color:'+difCor+';">'+(totalPct!==null?(totalDiff>0?'+':'')+fmt(totalDiff):'—')+'</div>';
  h+='<div class="mc-s">'+(totalPct!==null?(totalDiff>0?'Acima':'Abaixo')+' do orçado em '+(totalDiff>0?'+':'')+totalPct.toFixed(1)+'%':'sem dados ainda')+'</div></div>';
  h+='</div>';

  h+='<div class="tbl-wrap"><table><thead><tr>';
  h+='<th style="width:80px;">Mês</th><th>Tema</th>';
  h+='<th class="r">Orçado</th><th class="r">Realizado</th>';
  h+='<th class="r" style="min-width:160px;">% Diferença</th>';
  h+='</tr></thead><tbody>';

  rows.forEach(function(r,idx){
    const semReal=r.real===0;
    const semOrc=r.orc===0;
    const acima=r.diff>0;
    const cor=semReal?'var(--text3)':acima?'#e05555':'var(--green)';
    const pctTxt=r.pct!==null?(r.diff>0?'+':'')+r.pct.toFixed(1)+'%':null;
    const lbl=semReal?'Sem registro':semOrc?'Sem orçamento':acima?'Acima do Orçado':'Abaixo do Orçado';
    const barPct=r.pct!==null?Math.min(Math.abs(r.pct),100):0;

    if(r.isExtra&&(idx===0||!rows[idx-1].isExtra)){
      h+='<tr><td colspan="5" style="padding:6px 10px;background:var(--bg3);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);">Campanhas extras</td></tr>';
    }

    const bgRow=r.isExtra?'background:rgba(77,191,186,0.04);opacity:'+(r.ativa?'1':'0.6')+';':'';
    const badgeStyle=r.isExtra?'background:var(--orange-bg);color:var(--orange2);border-color:var(--orange-border);white-space:nowrap;':'';
    const temaColor=r.theme?'var(--text)':'var(--text3)';
    const temaStyle=r.theme?'normal':'italic';
    const temaText=r.theme||(r.isExtra&&!r.ativa?'Inativa — ative na aba Campanhas':'Tema não definido');
    const mesSpan=(r.isExtra&&r.mes!==null)?'<span style="font-size:10px;color:var(--text3);margin-left:4px;">'+MS[r.mes]+'</span>':'';
    const orcCell=r.orc>0?'R$ '+fmt(r.orc):'<span style="color:var(--text3)">—</span>';
    const realCell=(r.isExtra&&!r.ativa)?'<span style="color:var(--text3)">—</span>':(r.real>0?'R$ '+fmt(r.real):'<span style="color:var(--text3)">—</span>');

    h+='<tr style="'+bgRow+'">';
    h+='<td><span class="m-badge" style="'+badgeStyle+'">'+r.badge+'</span>'+mesSpan+'</td>';
    h+='<td style="color:'+temaColor+';font-style:'+temaStyle+';">'+temaText+'</td>';
    h+='<td class="r" style="font-weight:600;color:var(--orange2);">'+orcCell+'</td>';
    h+='<td class="r" style="font-weight:600;color:var(--green);">'+realCell+'</td>';
    h+='<td class="r">';
    if(r.isExtra&&!r.ativa){
      h+='<span style="font-size:11px;color:var(--text3);font-style:italic;">Inativa</span>';
    } else {
      h+='<div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;">';
      h+='<div style="text-align:right;">';
      h+='<div style="font-size:12px;font-weight:700;color:'+cor+';">'+(pctTxt||'—')+'</div>';
      h+='<div style="font-size:10px;color:'+cor+';opacity:0.8;">'+lbl+'</div>';
      h+='</div>';
      h+='<div style="width:80px;height:6px;background:var(--border2);border-radius:3px;overflow:hidden;flex-shrink:0;">';
      h+='<div style="width:'+barPct+'%;height:100%;background:'+(semReal?'var(--border2)':acima?'#e05555':'var(--green)')+';border-radius:3px;"></div>';
      h+='</div></div>';
    }
    h+='</td></tr>';
  });

  const corTot=totalDiff>0?'#e05555':totalDiff<0?'var(--green)':'var(--text3)';
  h+='<tr class="total-row">';
  h+='<td colspan="2">TOTAL</td>';
  h+='<td class="r" style="color:var(--orange2);">'+(totalOrcado>0?'R$ '+fmt(totalOrcado):'—')+'</td>';
  h+='<td class="r" style="color:var(--green);">'+(totalRealizado>0?'R$ '+fmt(totalRealizado):'—')+'</td>';
  h+='<td class="r"><div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;">';
  h+='<div style="text-align:right;">';
  h+='<div style="font-size:12px;font-weight:700;color:'+corTot+';">'+(totalPct!==null?(totalDiff>0?'+':'')+totalPct.toFixed(1)+'%':'—')+'</div>';
  h+='<div style="font-size:10px;color:'+corTot+';opacity:0.8;">'+(totalPct!==null?(totalDiff>0?'Acima':'Abaixo')+' do orçado':'—')+'</div>';
  h+='</div><div style="width:80px;height:6px;background:var(--border2);border-radius:3px;overflow:hidden;flex-shrink:0;">';
  h+='<div style="width:'+(totalPct!==null?Math.min(Math.abs(totalPct),100):0)+'%;height:100%;background:'+(totalDiff>0?'#e05555':'var(--green)')+';border-radius:3px;"></div>';
  h+='</div></div></td></tr>';
  h+='</tbody></table></div>';
  h+='<p style="font-size:11px;color:var(--text3);margin-top:10px;">Vermelho = acima do orçado · Verde = abaixo do orçado (economia). Campanhas sem realizado registrado aparecem como "Sem registro".</p>';
  pnl.innerHTML=h;
}

/* ── GARAGENS ── */
function renderGaragens(data, tipo){
  const isTeal = tipo==='faixa';
  const accentClass = isTeal ? 'teal' : 'coral';
  const accentColor = isTeal ? 'var(--orange2)' : 'var(--blue)';

  if(!data||Object.keys(data).length===0){
    return `<div class="loader-screen"><div class="spinner"></div><span style="font-size:13px;color:var(--text3);">Carregando garagens...</span></div>`;
  }

  // Resumo total
  let totalGaragens=0;
  EMPRESAS.forEach(emp=>{if(data[emp])totalGaragens+=data[emp].length;});

  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">`;
  h+=`<div class="sec-title">Garagens por empresa</div>`;
  h+=`<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:10px 18px;display:flex;align-items:center;gap:10px;">
    <span style="font-size:11px;color:var(--text3);">Total de garagens</span>
    <span style="font-size:20px;font-weight:700;font-family:'Syne',sans-serif;color:${accentColor};">${totalGaragens}</span>
  </div></div>`;

  h+=`<div class="garagens-grid">`;
  EMPRESAS.forEach(emp=>{
    const garagens=data[emp]||[];
    h+=`<div class="garagem-card">
      <div class="garagem-card-header">
        <div class="garagem-empresa">${emp}</div>
        <span class="garagem-count ${accentClass}">${garagens.length} garagem${garagens.length!==1?'s':''}</span>
      </div>
      <div class="garagem-list">`;
    if(garagens.length===0){
      h+=`<div class="garagem-empty">Nenhuma garagem cadastrada</div>`;
    } else {
      // Conta duplicatas para mostrar quantidade
      const countMap={};
      garagens.forEach(g=>{countMap[g]=(countMap[g]||0)+1;});
      const unique=Object.keys(countMap);
      unique.forEach(nome=>{
        const qtd=countMap[nome];
        h+=`<div class="garagem-item">
          <span class="garagem-nome">${nome}</span>
          ${qtd>1?`<span class="garagem-qtd">${qtd}x</span>`:''}
        </div>`;
      });
    }
    h+=`</div></div>`;
  });
  h+=`</div>`;
  return h;
}

/* ── EVENTOS ── */
function addFoto(mi,input){const file=input.files[0];if(!file)return;if(camps[mi].fotos.length>=3)return;const reader=new FileReader();reader.onload=e=>{camps[mi].fotos.push(e.target.result);if(camps[mi].open)document.getElementById('body-'+mi).innerHTML=renderBody(mi);};reader.readAsDataURL(file);}
function rmFoto(mi,fi){camps[mi].fotos.splice(fi,1);if(camps[mi].open)document.getElementById('body-'+mi).innerHTML=renderBody(mi);}
function dropFoto(mi,ev){const file=ev.dataTransfer.files[0];if(!file||!file.type.startsWith('image/'))return;if(camps[mi].fotos.length>=3)return;const reader=new FileReader();reader.onload=e=>{camps[mi].fotos.push(e.target.result);if(camps[mi].open)document.getElementById('body-'+mi).innerHTML=renderBody(mi);};reader.readAsDataURL(file);}
function addArte(mi,key,input){const file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=e=>{camps[mi].artes[key]=e.target.result;if(camps[mi].open)document.getElementById('body-'+mi).innerHTML=renderBody(mi);};reader.readAsDataURL(file);}
function rmArte(mi,key){camps[mi].artes[key]=null;if(camps[mi].open)document.getElementById('body-'+mi).innerHTML=renderBody(mi);}
function dropArte(mi,key,ev){const file=ev.dataTransfer.files[0];if(!file||!file.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=e=>{camps[mi].artes[key]=e.target.result;if(camps[mi].open)document.getElementById('body-'+mi).innerHTML=renderBody(mi);};reader.readAsDataURL(file);}
function toggleCard(mi){
  camps[mi].open=!camps[mi].open;
  const body=document.getElementById('body-'+mi);const card=document.getElementById('card-'+mi);
  if(body){if(camps[mi].open){body.style.display='block';body.innerHTML=renderBody(mi);}else body.style.display='none';}
  if(card){card.className=camps[mi].open?'camp-card open':'camp-card';const ch=card.querySelector('.chevron');if(ch)ch.className=camps[mi].open?'chevron open':'chevron';}
}
function toggleOrc(mi,ri){camps[mi].orc[ri]=!camps[mi].orc[ri];if(camps[mi].open)document.getElementById('body-'+mi).innerHTML=renderBody(mi);refreshHeader(mi);updMetrics();}
function toggleReal(mi,ri){camps[mi].real[ri].sel=!camps[mi].real[ri].sel;if(camps[mi].open)document.getElementById('body-'+mi).innerHTML=renderBody(mi);refreshHeader(mi);updMetrics();}
function updateRealRow(mi,ri){
  const r=camps[mi].real[ri];
  const p=r.price!==null?r.price:(resources[ri].price||0);
  const q=r.qty!==null?r.qty:0;
  const sub=p*q;
  const subEl=document.getElementById('real-sub-'+mi+'-'+ri);
  if(subEl)subEl.textContent=sub>0?'R$ '+fmt(sub):'—';
  const totEl=document.getElementById('real-total-row-'+mi);
  if(totEl)totEl.textContent='R$ '+fmt(calcReal(mi));
}
function refreshHeader(mi){
  const ot=calcOrc(mi),rt=calcReal(mi);
  const ho=document.getElementById('hdr-orc-'+mi);const hr=document.getElementById('hdr-real-'+mi);
  if(ho){ho.textContent='R$ '+fmt(ot);ho.style.color=ot>0?'var(--orange2)':'var(--text3)';}
  if(hr){hr.textContent='R$ '+fmt(rt);hr.style.color=rt>0?'var(--green)':'var(--text3)';}
}
function refreshAllHeaders(){CI.forEach(mi=>refreshHeader(mi));updMetrics();}
function updateResTotal(ri){
  const total=(resources[ri].price||0)*(resources[ri].qty||0);
  const el=document.getElementById('res-total-'+ri);
  if(el){el.textContent=total>0?'R$ '+fmt(total):'—';el.style.color=total>0?'var(--orange2)':'var(--text3)';}
}

/* ── LOAD ── */

// Comprime imagem base64 para reduzir tamanho antes de salvar no Firestore
function comprimirImagem(base64,maxW,maxH,quality){
  return new Promise(resolve=>{
    if(!base64){resolve(null);return;}
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      let w=img.width,h=img.height;
      if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
      if(h>maxH){w=Math.round(w*maxH/h);h=maxH;}
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL('image/jpeg',quality||0.7));
    };
    img.onerror=()=>resolve(base64);
    img.src=base64;
  });
}

async function comprimirArtes(artes){
  const result={};
  for(const key of Object.keys(artes)){
    result[key]=artes[key]?await comprimirImagem(artes[key],1200,900,0.75):null;
  }
  return result;
}

async function comprimirFotos(fotos){
  const result=[];
  for(const f of fotos){
    result.push(f?await comprimirImagem(f,1200,900,0.75):f);
  }
  return result;
}
const FETCH_TIMEOUT=8000; // 8 segundos — ajuste se necessário

function fetchComTimeout(url,opts={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),FETCH_TIMEOUT);
  return fetch(url,{...opts,signal:controller.signal}).finally(()=>clearTimeout(timer));
}

async function reloadAll(){
  const btn=document.querySelector('.btn-reload');
  if(btn){btn.textContent='Atualizando...';btn.disabled=true;}
  await Promise.allSettled([loadMot(),loadFaixa(),loadBanner()]);
  if(activeTab==='quadro')document.getElementById('mrow').style.display='grid';
  if(btn){btn.textContent='↻ Atualizar dados';btn.disabled=false;}
}

async function loadMot(){
  try{
    const r=await fetchComTimeout(CSV_MOT,{cache:'no-store'});
    const t=await r.text();parseMot(t);
  }catch(e){
    document.getElementById('pnl-quadro').innerHTML=errMsg('Quadro de motoristas indisponível','Firewall ou conexão bloqueou o acesso ao Google Sheets.');
  }
}

async function loadFaixa(){
  try{
    const r=await fetchComTimeout(CSV_FAIXA,{cache:'no-store'});
    const t=await r.text();
    garaFaixa=parseGaragens(t,EMPRESAS);
    document.getElementById('pnl-gfaixa').innerHTML=renderGaragens(garaFaixa,'faixa');
  }catch(e){
    document.getElementById('pnl-gfaixa').innerHTML=errMsg('Garagens Faixa indisponível','Não foi possível carregar os dados.');
  }
}

async function loadBanner(){
  try{
    const r=await fetchComTimeout(CSV_BANNER,{cache:'no-store'});
    const t=await r.text();
    garaBanner=parseGaragens(t,EMPRESAS);
    document.getElementById('pnl-gbanner').innerHTML=renderGaragens(garaBanner,'banner');
  }catch(e){
    document.getElementById('pnl-gbanner').innerHTML=errMsg('Garagens Banner indisponível','Não foi possível carregar os dados.');
  }
}

function errMsg(titulo,sub){
  return `<div style="text-align:center;padding:48px 24px;">
    <div style="font-size:32px;margin-bottom:10px;">📡</div>
    <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px;">${titulo}</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:16px;max-width:320px;margin-left:auto;margin-right:auto;line-height:1.6;">${sub}<br>Verifique a conexão ou use uma rede sem restrições corporativas.</div>
    <button onclick="reloadAll()" class="btn-reload" style="width:auto;padding:8px 20px;">↻ Tentar novamente</button>
  </div>`;
}

/* ── INIT ── */
renderRecursos();
renderCampanhas();
document.getElementById('pnl-quadro').innerHTML=`<div class="loader-screen"><div class="spinner"></div><span style="font-size:13px;color:var(--text3);">Conectando ao Google Sheets...</span></div>`;
document.getElementById('pnl-gfaixa').innerHTML=`<div class="loader-screen"><div class="spinner"></div><span style="font-size:13px;color:var(--text3);">Carregando garagens...</span></div>`;
document.getElementById('pnl-gbanner').innerHTML=`<div class="loader-screen"><div class="spinner"></div><span style="font-size:13px;color:var(--text3);">Carregando garagens...</span></div>`;

// Carrega cada fonte independentemente — se uma falhar não trava as outras
loadMot();
loadFaixa();
loadBanner();
/* ── MOBILE DRAWER ── */
function openMoreDrawer(){
  document.getElementById('more-drawer').classList.add('open');
  document.getElementById('more-overlay').classList.add('open');
}
function closeMoreDrawer(){
  document.getElementById('more-drawer').classList.remove('open');
  document.getElementById('more-overlay').classList.remove('open');
}

/* Sincroniza dot do Firebase no header mobile */
const _fbStatus_orig = window.fbStatus;
const origSwitchTab = window.switchTab;

// Override switchTab para atualizar bottom nav
const _origSwitch = switchTab;
window.switchTabMobile = function(tab){
  // Bottom nav — só as 4 principais
  const bnTabs = ['dashboard','quadro','campanhas','gerencial'];
  bnTabs.forEach(t=>{
    const b = document.getElementById('bn-'+t);
    if(b) b.className = t===tab ? 'bottom-nav-item active' : 'bottom-nav-item';
  });
  // More drawer items
  ['recursos','gfaixa','gbanner','envio','gerencial'].forEach(t=>{
    const b = document.getElementById('md-'+t);
    if(b) b.className = t===tab ? 'more-drawer-item active' : 'more-drawer-item';
  });
  // Sync fb-dot mobile
  const dotM = document.getElementById('fb-dot-m');
  const dot = document.getElementById('fb-dot');
  if(dotM && dot) dotM.style.background = dot.style.background;
};

// Patch switchTab
const _st = switchTab;
switchTab = function(tab){
  _st(tab);
  window.switchTabMobile(tab);
};
