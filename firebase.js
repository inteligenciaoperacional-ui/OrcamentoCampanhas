import{initializeApp}from'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import{getFirestore,doc,setDoc,getDoc,collection}from'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig={
  apiKey:"AIzaSyAzW9MVMXjZAgkxy-hnTmJBvrC8aF2UJZQ",
  authDomain:"orcamentocampanhas.firebaseapp.com",
  projectId:"orcamentocampanhas",
  storageBucket:"orcamentocampanhas.firebasestorage.app",
  messagingSenderId:"692386376660",
  appId:"1:692386376660:web:98ef376d8673ecaee7c441",
  measurementId:"G-RBRP6MNQ59"
};

const app=initializeApp(firebaseConfig);
const db=getFirestore(app);

function fbStatus(msg,cor){
  const dot=document.getElementById('fb-dot');
  const st=document.getElementById('fb-status');
  if(dot)dot.style.background=cor;
  if(st)st.textContent=msg;
}

/* ── SALVAR ── */
window.salvarFirebase=async function(){
  fbStatus('Salvando...','#f0a947');
  try{
    // Recursos
    const resData={};
    resources.forEach((r,i)=>resData[i]={name:r.name,price:r.price,qty:r.qty||0});
    await setDoc(doc(db,'orcamento','recursos'),{data:resData,ts:Date.now()});

    // Campanhas — texto e seleções sem imagens
    const campsData={};
    CI.forEach(mi=>{
      const c=camps[mi];
      campsData[mi]={
        theme:c.theme||'',
        resumo:c.resumo||'',
        orc:c.orc,
        orcEdit:c.orcEdit||false,
        orcCustom:c.orcCustom,
        real:c.real.map(r=>({sel:r.sel,price:r.price,qty:r.qty}))
      };
    });
    await setDoc(doc(db,'orcamento','campanhas'),{data:campsData,ts:Date.now()});

    // Extras
    const extrasData=extras.map(ex=>({
      ativa:ex.ativa,mes:ex.mes,theme:ex.theme||'',resumo:ex.resumo||'',
      orc:ex.orc,
      real:ex.real.map(r=>({sel:r.sel,price:r.price,qty:r.qty}))
    }));
    await setDoc(doc(db,'orcamento','extras'),{data:extrasData,ts:Date.now()});

    // Artes por mês (comprimidas para caber no limite do Firestore)
    for(const mi of CI){
      const a=await comprimirArtes(camps[mi].artes);
      const f=await comprimirFotos(camps[mi].fotos);
      await setDoc(doc(db,'orcamento','artes_'+mi),{artes:a,fotos:f,ts:Date.now()});
    }

    // Artes extras (comprimidas)
    for(let ei=0;ei<extras.length;ei++){
      const a=await comprimirArtes(extras[ei].artes);
      const f=await comprimirFotos(extras[ei].fotos);
      await setDoc(doc(db,'orcamento','xartes_'+ei),{artes:a,fotos:f,ts:Date.now()});
    }

    fbStatus('Salvo ✓','#18b87a');
    setTimeout(()=>fbStatus('Firebase conectado','#18b87a'),3000);
  }catch(e){
    console.error(e);
    fbStatus('Erro ao salvar','#e05555');
  }
};

/* ── CARREGAR ── */
async function carregarFirebase(){
  fbStatus('Carregando...','#f0a947');
  try{
    // Recursos
    const resSnap=await getDoc(doc(db,'orcamento','recursos'));
    if(resSnap.exists()){
      const d=resSnap.data().data;
      Object.keys(d).forEach(i=>{if(resources[i]){resources[i].price=d[i].price||0;resources[i].qty=d[i].qty||0;}});
      renderRecursos();
    }

    // Campanhas
    const campSnap=await getDoc(doc(db,'orcamento','campanhas'));
    if(campSnap.exists()){
      const d=campSnap.data().data;
      Object.keys(d).forEach(mi=>{
        const m=parseInt(mi);
        if(camps[m]){
          camps[m].theme=d[mi].theme||'';
          camps[m].resumo=d[mi].resumo||'';
          camps[m].orc=d[mi].orc||RES.map(()=>false);
          camps[m].orcEdit=d[mi].orcEdit||false;
          camps[m].orcCustom=d[mi].orcCustom||RES.map(()=>({price:null,qty:null}));
          camps[m].real=(d[mi].real||[]).map(r=>({sel:r.sel||false,price:r.price??null,qty:r.qty??null}));
        }
      });
      renderCampanhas();
    }

    // Extras
    const extSnap=await getDoc(doc(db,'orcamento','extras'));
    if(extSnap.exists()){
      const d=extSnap.data().data;
      d.forEach((ex,ei)=>{
        if(extras[ei]){
          extras[ei].ativa=ex.ativa||false;
          extras[ei].mes=ex.mes??null;
          extras[ei].theme=ex.theme||'';
          extras[ei].resumo=ex.resumo||'';
          extras[ei].orc=ex.orc||RES.map(()=>false);
          extras[ei].real=(ex.real||[]).map(r=>({sel:r.sel||false,price:r.price??null,qty:r.qty??null}));
        }
      });
    }

    // Artes por mês
    for(const mi of CI){
      const aSnap=await getDoc(doc(db,'orcamento','artes_'+mi));
      if(aSnap.exists()){
        const d=aSnap.data();
        if(d.artes)camps[mi].artes=d.artes;
        if(d.fotos)camps[mi].fotos=d.fotos;
      }
    }

    // Artes extras
    for(let ei=0;ei<extras.length;ei++){
      const xSnap=await getDoc(doc(db,'orcamento','xartes_'+ei));
      if(xSnap.exists()){
        const d=xSnap.data();
        if(d.artes)extras[ei].artes=d.artes;
        if(d.fotos)extras[ei].fotos=d.fotos;
      }
    }

    renderCampanhas();
    refreshAllHeaders();
    updMetrics();
    fbStatus('Firebase conectado ✓','#18b87a');
  }catch(e){
    console.error(e);
    fbStatus('Erro ao carregar','#e05555');
  }
}

// Auto-save com debounce de 3 segundos
let fbTimer=null;
window.autoSave=function(){
  clearTimeout(fbTimer);
  fbStatus('Modificado...','#f0a947');
  fbTimer=setTimeout(()=>window.salvarFirebase(),3000);
};

// Inicia carregamento
carregarFirebase();