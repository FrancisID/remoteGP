import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════════════
   remoteGP v6 — Complete Integrated System with Nursing Station
   ─────────────────────────────────────────────────────────────────────────────
   NEW in v6:
   ✓ Nursing Station — nurse manages patients in their assigned RAH
   ✓ Patients grouped under RAH centres on registration
   ✓ Nurse opens patient portal, records vitals, manages queue
   ✓ Nurse approves doctor↔patient connections (replaces admin for this role)
   ✓ Nurse updates EHR for patients in their RAH only
   ✓ Admin can disconnect patient / doctor / nurse from the platform
   ✓ Admin transfers patient files on referral
   ✓ All records in centralised cloud EHR — access controlled by approval
   ✓ Medical record requests by patient → admin approves → print or email
   ✓ "A Product of ClearFlow Systems" branding on landing page
═══════════════════════════════════════════════════════════════════════════════ */

const GF = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');`;

const T = {
  b0:"#04080F",b1:"#080F1A",b2:"#0C1622",b3:"#111E2C",b4:"#172538",
  p0:"#F5F9FC",p1:"#EBF2F7",p2:"#D8E8F0",pt:"#1A3045",ptt:"#6A8EA8",
  teal:"#00C8A8",tealDk:"#009880",tealLt:"#E0F8F4",tealMid:"#4DD9C8",
  amber:"#F0A020",amberLt:"#FDF5E0",amberDk:"#B87815",
  red:"#E04848",redLt:"#FEF0F0",redDk:"#B02828",
  green:"#18A864",greenLt:"#E5F7EE",greenDk:"#0F7845",
  purple:"#8B68F0",purpleLt:"#F0ECFF",purpleDk:"#5C3DC8",
  rose:"#E8487A",roseLt:"#FEF0F5",roseDk:"#B0304F",
  ph:"#00FF88",
  tx:"#B8CCD8",txDim:"#486070",txBr:"#E0EEF8",
  bdr:"rgba(0,200,168,0.09)",bdrMd:"rgba(0,200,168,0.18)",
  serif:"'Syne',sans-serif",sans:"'DM Sans',sans-serif",mono:"'JetBrains Mono',monospace",
};

/* ── RAH CENTRES ─────────────────────────────────────────────────────────────── */
const RAH_CENTRES = [
  { id:"RAH-TH", name:"RAH Thiès North",    region:"Thiès",    country:"Senegal",  nurses:["N-001"] },
  { id:"RAH-SG", name:"RAH Ségou Central",  region:"Ségou",    country:"Mali",     nurses:["N-002"] },
  { id:"RAH-KN", name:"RAH Kindia Est",     region:"Kindia",   country:"Guinea",   nurses:["N-003"] },
  { id:"RAH-KK", name:"RAH Kankan",         region:"Kankan",   country:"Guinea",   nurses:["N-003"] },
];

/* ── DISEASE DB ──────────────────────────────────────────────────────────────── */
const DISEASES = [
  { id:"D01",name:"URTI",full:"Upper Respiratory Tract Infection",symptoms:["sore throat","cough","runny nose","fatigue","mild fever"],lab:false,conf:0.94,cases:1842,drugs:[{name:"Amoxicillin 500mg",dose:"500mg TDS × 5d"},{name:"Paracetamol 500mg",dose:"1g QDS PRN"}]},
  { id:"D02",name:"Malaria",full:"Malaria (P. falciparum)",symptoms:["high fever","chills","sweating","headache","myalgia"],lab:true,labTest:"Malaria RDT + FBC",conf:0.96,cases:2341,drugs:[{name:"Artemether-Lumefantrine",dose:"4 tabs BD × 3d"},{name:"Artesunate IV",dose:"2.4 mg/kg IV (severe)"}]},
  { id:"D03",name:"Hypertension",full:"Essential Hypertension",symptoms:["headache","dizziness","blurred vision","palpitations"],lab:false,conf:0.91,cases:1567,drugs:[{name:"Amlodipine 5mg",dose:"5–10mg OD"},{name:"Lisinopril 10mg",dose:"10–40mg OD"}]},
  { id:"D04",name:"Anaemia",full:"Iron Deficiency Anaemia",symptoms:["fatigue","pallor","dizziness","palpitations","dyspnoea"],lab:true,labTest:"FBC + Blood Film",conf:0.88,cases:987,drugs:[{name:"Ferrous Sulphate 200mg",dose:"200mg TDS"},{name:"Folic Acid 5mg",dose:"5mg OD"}]},
  { id:"D05",name:"T2DM",full:"Type 2 Diabetes Mellitus",symptoms:["polyuria","polydipsia","weight loss","blurred vision"],lab:true,labTest:"FBG + HbA1c",conf:0.89,cases:1123,drugs:[{name:"Metformin 500mg",dose:"500mg BD–TDS"},{name:"Glibenclamide 5mg",dose:"2.5–20mg OD"}]},
  { id:"D06",name:"TB",full:"Pulmonary Tuberculosis",symptoms:["productive cough","haemoptysis","night sweats","weight loss"],lab:true,labTest:"Sputum AFB × 2 + CXR",conf:0.92,cases:743,drugs:[{name:"RHZE Regimen",dose:"2RHZE / 4RH"}]},
  { id:"D07",name:"UTI",full:"Urinary Tract Infection",symptoms:["dysuria","frequency","urgency","suprapubic pain"],lab:true,labTest:"Urine M/C/S",conf:0.87,cases:1205,drugs:[{name:"Nitrofurantoin 100mg",dose:"100mg BD × 5d"},{name:"Trimethoprim 200mg",dose:"200mg BD × 7d"}]},
  { id:"D08",name:"Gastro",full:"Gastroenteritis",symptoms:["diarrhoea","vomiting","nausea","abdominal cramps"],lab:false,conf:0.90,cases:1634,drugs:[{name:"ORS Sachet",dose:"200–400ml after each loose stool"},{name:"Metronidazole 400mg",dose:"400mg TDS × 5d (amoebic)"}]},
];

function runAI(symptoms,vitals){
  if(!symptoms?.length)return null;
  const sl=symptoms.map(s=>s.toLowerCase());
  let best=null,top=0;
  for(const d of DISEASES){
    const m=d.symptoms.filter(s=>sl.some(p=>p.includes(s.split(" ")[0])||s.includes(p.split(" ")[0]))).length;
    let sc=(m/d.symptoms.length)*d.conf;
    if(vitals?.temp&&parseFloat(vitals.temp)>37.5)sc+=0.05;
    if(sc>top){top=sc;best=d;}
  }
  if(!best||top<0.12)return null;
  return{...best,displayConf:`${Math.min(99,Math.round(top*100))}%`};
}

/* ── PHARMACY DB ──────────────────────────────────────────────────────────────── */
const ALL_PHARMACIES=[
  {id:"PH-001",name:"CityPharm Thiès",locality:"Thiès North",dist:"0.8 km",rating:4.8,delivery:"Same-day",stock:[{drug:"Amoxicillin 500mg",family:"Antibiotic",price:4.20,qty:240,allergy:"Penicillin"},{drug:"Paracetamol 500mg",family:"Analgesic",price:1.20,qty:580,allergy:"None"},{drug:"Artemether-Lumefantrine",family:"Antimalarial",price:8.50,qty:120,allergy:"None"},{drug:"Amlodipine 5mg",family:"CCB",price:6.40,qty:160,allergy:"None"},{drug:"Metformin 500mg",family:"Biguanide",price:5.80,qty:200,allergy:"None"}]},
  {id:"PH-002",name:"MediPlus Thiès",locality:"Thiès North",dist:"1.4 km",rating:4.6,delivery:"2–4 hrs",stock:[{drug:"Ferrous Sulphate 200mg",family:"Iron",price:2.90,qty:340,allergy:"None"},{drug:"Folic Acid 5mg",family:"Vitamin",price:1.50,qty:400,allergy:"None"},{drug:"Lisinopril 10mg",family:"ACE Inhibitor",price:7.20,qty:110,allergy:"None"},{drug:"Nitrofurantoin 100mg",family:"Antibiotic",price:8.00,qty:60,allergy:"None"}]},
  {id:"PH-003",name:"Pharmacie Centrale Ségou",locality:"Ségou Central",dist:"0.5 km",rating:4.7,delivery:"4–6 hrs",stock:[{drug:"Artemether-Lumefantrine",family:"Antimalarial",price:9.00,qty:95,allergy:"None"},{drug:"ORS Sachet",family:"Rehydration",price:0.80,qty:500,allergy:"None"},{drug:"Metronidazole 400mg",family:"Antibiotic",price:3.50,qty:200,allergy:"None"}]},
  {id:"PH-004",name:"Pharmacie du Peuple Kindia",locality:"Kindia Est",dist:"0.3 km",rating:4.3,delivery:"Next-day",stock:[{drug:"Amoxicillin 500mg",family:"Antibiotic",price:4.80,qty:100,allergy:"Penicillin"},{drug:"Paracetamol 500mg",family:"Analgesic",price:1.30,qty:300,allergy:"None"}]},
  {id:"PH-005",name:"Grand Pharmacie Kankan",locality:"Kankan",dist:"1.0 km",rating:4.6,delivery:"Same-day",stock:[{drug:"Amlodipine 5mg",family:"CCB",price:6.60,qty:100,allergy:"None"},{drug:"Furosemide 40mg",family:"Diuretic",price:4.20,qty:120,allergy:"None"},{drug:"Spironolactone 25mg",family:"Aldosterone Ant.",price:5.90,qty:60,allergy:"None"}]},
];

/* ── LAB DB ───────────────────────────────────────────────────────────────────── */
const ALL_LABS=[
  {id:"LB-001",name:"QuickTest Lab",locality:"Thiès North",dist:"1.1 km",tat:"2–4 hrs",rating:4.9,transport:["Drone","Taxi"],tests:["Malaria RDT","FBC","Blood Glucose","HIV Test","Urine M/C/S","Widal Test"]},
  {id:"LB-002",name:"BioLab Thiès",locality:"Thiès North",dist:"2.3 km",tat:"4–8 hrs",rating:4.6,transport:["Taxi"],tests:["FBC","LFT","TSH/T4","Chest X-Ray","Sputum AFB","HbA1c","ECG"]},
  {id:"LB-003",name:"Central Diagnostic Ségou",locality:"Ségou Central",dist:"0.7 km",tat:"3–6 hrs",rating:4.8,transport:["Drone","Taxi"],tests:["FBC","Malaria RDT","Blood Culture","Urine M/C/S"]},
  {id:"LB-004",name:"MediScan Lab Kindia",locality:"Kindia Est",dist:"0.4 km",tat:"1–3 hrs",rating:4.4,transport:["Taxi"],tests:["Malaria RDT","FBC","Blood Glucose","HIV Test"]},
  {id:"LB-005",name:"LabDiag Kankan",locality:"Kankan",dist:"1.5 km",tat:"4–6 hrs",rating:4.5,transport:["Drone","Taxi"],tests:["FBC","Malaria RDT","Sputum AFB","HIV Test","ECG"]},
];

const DEFAULT_AI_CFG={trainingCycleSize:100,trainingDurationMonths:12,shadowingThreshold:100,aiLoadPercent:30,reversionThreshold:90,autoAdvance:true};
const INIT_AI={stage:1,totalInteractions:847,cycles:[{cycle:1,month:"Jan 2025",cases:100,accuracy:78.0,delta:null},{cycle:2,month:"Feb 2025",cases:100,accuracy:81.4,delta:3.4},{cycle:3,month:"Mar 2025",cases:100,accuracy:83.9,delta:2.5},{cycle:4,month:"Apr 2025",cases:100,accuracy:86.2,delta:2.3},{cycle:5,month:"May 2025",cases:100,accuracy:88.0,delta:1.8},{cycle:6,month:"Jun 2025",cases:100,accuracy:89.5,delta:1.5},{cycle:7,month:"Jul 2025",cases:100,accuracy:90.8,delta:1.3},{cycle:8,month:"Aug 2025",cases:100,accuracy:91.7,delta:0.9}],cycleProgress:47,monthsElapsed:8,shadowDiagnoses:0,shadowStreak:0,shadowHistory:[],sharedTotal:0,aiCases:0,drCases:0,aiCorrect:0,aiQueue:[],drQueue:[]};

/* ════════════════════════════════════════════════════════════════════════════════
   GLOBAL CSS
════════════════════════════════════════════════════════════════════════════════ */
const CSS=`
${GF}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{font-family:'DM Sans',sans-serif;min-height:100vh;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.2);border-radius:2px;}

/* LAUNCHER */
.lnch{min-height:100vh;background:${T.b0};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;gap:1.25rem;position:relative;}
.lnch::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 25% 40%,rgba(0,200,168,0.05),transparent 55%),radial-gradient(ellipse at 75% 60%,rgba(139,104,240,0.04),transparent 55%);pointer-events:none;}
.lnch-logo{font-family:'Syne',sans-serif;font-size:3rem;font-weight:800;color:${T.txBr};letter-spacing:-2px;}
.lnch-logo span{color:${T.teal};}
.lnch-sub{font-size:11px;color:${T.txDim};font-family:'JetBrains Mono',monospace;letter-spacing:3px;text-transform:uppercase;}
.lnch-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;max-width:1080px;width:100%;}
.lnch-card{background:${T.b2};border:1px solid ${T.bdr};border-radius:14px;padding:1.4rem 1.1rem;cursor:pointer;transition:all 0.2s;text-align:center;}
.lnch-card:hover{transform:translateY(-4px);}
.lnch-ic{width:50px;height:50px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 10px;}
.lnch-lbl{font-family:'Syne',sans-serif;font-size:.95rem;font-weight:700;color:${T.txBr};margin-bottom:4px;}
.lnch-desc{font-size:10px;color:${T.txDim};line-height:1.6;}
.srv-row{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;}
.srv-chip{background:rgba(0,200,168,0.06);border:1px solid rgba(0,200,168,0.14);border-radius:20px;padding:3px 11px;font-size:10px;color:${T.teal};font-family:'JetBrains Mono',monospace;}

/* SHELL */
.shell{display:flex;flex-direction:column;min-height:100vh;}
.tbar{height:52px;display:flex;align-items:center;padding:0 1.5rem;gap:10px;position:sticky;top:0;z-index:80;border-bottom:1px solid;}
.tbar-logo{font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;letter-spacing:-.5px;}
.tbar-logo span{color:${T.teal};}
.tbar-tag{font-size:10px;font-family:'JetBrains Mono',monospace;letter-spacing:1.5px;text-transform:uppercase;padding:2px 9px;border-radius:20px;}
.tbar-nav{display:flex;gap:2px;flex:1;overflow-x:auto;scrollbar-width:none;}
.tnav{padding:5px 12px;border-radius:7px;font-size:12px;font-weight:500;cursor:pointer;border:none;background:transparent;transition:all .14s;font-family:'DM Sans',sans-serif;white-space:nowrap;}
.page{flex:1;padding:1.5rem;width:100%;max-width:1380px;margin:0 auto;padding-bottom:80px;}

/* LAYOUT */
.card{border-radius:12px;padding:1.25rem;border:1px solid;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;}
.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:1rem;}
.fcol{display:flex;flex-direction:column;gap:1rem;}
.fbet{display:flex;align-items:center;justify-content:space-between;}
.fctr{display:flex;align-items:center;gap:8px;}

/* BUTTONS */
.btn{padding:7px 15px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .14s;font-family:'DM Sans',sans-serif;}
.btn-t{background:${T.tealLt};color:${T.tealDk};border:1px solid rgba(0,200,168,.25);}
.btn-t:hover{background:rgba(0,200,168,.2);}
.btn-a{background:${T.amberLt};color:${T.amberDk};border:1px solid rgba(240,160,32,.25);}
.btn-g{background:${T.greenLt};color:${T.greenDk};border:1px solid rgba(24,168,100,.25);}
.btn-r{background:${T.redLt};color:${T.redDk};border:1px solid rgba(224,72,72,.2);}
.btn-p{background:${T.purpleLt};color:${T.purpleDk};border:1px solid rgba(139,104,240,.25);}
.btn-rose{background:${T.roseLt};color:${T.roseDk};border:1px solid rgba(232,72,122,.2);}
.btn-ph{background:rgba(0,255,136,.1);color:#00FF88;border:1px solid rgba(0,255,136,.2);}
.btn-ghost{background:transparent;border:1px solid rgba(255,255,255,.08);color:${T.txDim};}
.btn-sm{padding:4px 11px;font-size:11px;}
.btn-xs{padding:3px 8px;font-size:10px;border-radius:6px;}

/* BADGES */
.bx{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;}
.bt{background:${T.tealLt};color:${T.tealDk};border:1px solid rgba(0,200,168,.25);}
.ba{background:${T.amberLt};color:${T.amberDk};border:1px solid rgba(240,160,32,.25);}
.bg{background:${T.greenLt};color:${T.greenDk};border:1px solid rgba(24,168,100,.25);}
.br{background:${T.redLt};color:${T.redDk};border:1px solid rgba(224,72,72,.2);}
.bp{background:${T.purpleLt};color:${T.purpleDk};border:1px solid rgba(139,104,240,.25);}
.brose{background:${T.roseLt};color:${T.roseDk};border:1px solid rgba(232,72,122,.2);}
.bgr{background:rgba(255,255,255,.04);color:${T.txDim};border:1px solid rgba(255,255,255,.08);}

/* FORMS */
.fg{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;}
.flbl{font-size:10px;font-weight:500;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.8px;}
.fi{border-radius:8px;padding:8px 11px;font-size:12px;font-family:'DM Sans',sans-serif;outline:none;width:100%;border:1px solid;transition:border-color .14s;}
.fi:focus{border-color:rgba(0,200,168,.4)!important;}

/* VITALS */
.vbox{border-radius:9px;padding:10px;text-align:center;border:1px solid;}
.vval{font-size:16px;font-weight:700;line-height:1.1;}
.vlbl{font-size:10px;margin-top:3px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.6px;}

/* ALERTS */
.al{padding:9px 12px;border-radius:8px;font-size:12px;display:flex;gap:7px;align-items:flex-start;line-height:1.5;}
.al-t{background:${T.tealLt};border:1px solid rgba(0,200,168,.2);color:${T.tealDk};}
.al-a{background:${T.amberLt};border:1px solid rgba(240,160,32,.25);color:${T.amberDk};}
.al-r{background:${T.redLt};border:1px solid rgba(224,72,72,.2);color:${T.redDk};}
.al-g{background:${T.greenLt};border:1px solid rgba(24,168,100,.25);color:${T.greenDk};}
.al-p{background:${T.purpleLt};border:1px solid rgba(139,104,240,.25);color:${T.purpleDk};}
.al-rose{background:${T.roseLt};border:1px solid rgba(232,72,122,.2);color:${T.roseDk};}
.al-ph{background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.18);color:#00C866;}

/* TABLE */
.tw{overflow-x:auto;border-radius:9px;border:1px solid;}
table{width:100%;border-collapse:collapse;font-size:12px;}
thead tr{border-bottom:1px solid;}
thead th{padding:8px 12px;text-align:left;font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.8px;white-space:nowrap;}
tbody td{padding:8px 12px;border-bottom:1px solid;vertical-align:middle;}
tbody tr:last-child td{border-bottom:none;}

/* SIDEBAR */
.dr-side{width:210px;background:${T.b1};border-right:1px solid rgba(255,255,255,.05);display:flex;flex-direction:column;height:100vh;position:fixed;top:0;left:0;z-index:10;}
.sn{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:12px;margin-bottom:1px;border-left:2px solid transparent;transition:all .12s;color:${T.txDim};}
.sn:hover{background:rgba(0,200,168,.04);}
.sn.act{background:rgba(0,200,168,.07);color:${T.teal};border-left-color:${T.teal};}

/* TIMELINE */
.tl{padding-left:16px;position:relative;}
.tl::before{content:'';position:absolute;left:4px;top:8px;bottom:8px;width:1px;background:rgba(255,255,255,.07);}
.tl-it{position:relative;padding:0 0 1rem 14px;}
.tl-dot{position:absolute;left:-12px;top:4px;width:8px;height:8px;border-radius:50%;background:${T.teal};border:2px solid ${T.b2};}

/* VIDEO */
.vid-main{border-radius:11px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:#03060D;}
.vid-self{position:absolute;bottom:10px;right:10px;width:100px;aspect-ratio:3/4;border-radius:8px;border:2px solid rgba(0,200,168,.35);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;background:${T.b2};}
.vid-lbl{position:absolute;top:10px;left:12px;background:rgba(0,0,0,.55);padding:3px 10px;border-radius:20px;font-size:10px;color:#fff;display:flex;align-items:center;gap:5px;}
.rec-d{width:6px;height:6px;border-radius:50%;background:#EF4444;animation:blink 1s infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.ctrls{display:flex;gap:8px;justify-content:center;padding:10px;background:${T.b1};}
.ctrl{width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .14s;}
.ctrl-on{background:rgba(0,200,168,.12);color:${T.teal};}
.ctrl-off{background:rgba(224,72,72,.12);color:${T.red};}
.ctrl-end{background:${T.red};color:#fff;width:46px;height:46px;}

/* CHAT */
.chat{height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:4px;}
.msg{max-width:82%;padding:7px 11px;border-radius:10px;font-size:12px;line-height:1.5;}
.msg-d{background:rgba(0,200,168,.1);color:${T.tealMid};align-self:flex-start;border-radius:3px 10px 10px 10px;}
.msg-p{background:rgba(255,255,255,.05);color:#C0D0DC;align-self:flex-end;border-radius:10px 3px 10px 10px;}
.msg-s{background:rgba(139,104,240,.1);color:#B0A4F0;align-self:center;font-size:10px;padding:3px 10px;border-radius:20px;}

/* MODAL */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:400;display:flex;align-items:center;justify-content:center;padding:1rem;}
.modal{background:${T.b2};border:1px solid ${T.bdrMd};border-radius:16px;padding:1.5rem;width:560px;max-width:100%;max-height:85vh;overflow-y:auto;}

/* SWITCH BAR */
.swbar{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:${T.b0};border:1px solid rgba(0,200,168,.15);border-radius:50px;padding:4px;display:flex;gap:2px;z-index:300;box-shadow:0 6px 28px rgba(0,0,0,.5);}
.swbtn{padding:7px 16px;border-radius:50px;font-size:11px;font-weight:600;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;color:rgba(255,255,255,.3);background:transparent;transition:all .18s;}

/* TOAST */
.toast{position:fixed;top:14px;right:14px;z-index:999;border-radius:10px;padding:10px 16px;font-size:12px;font-weight:500;border:1px solid;max-width:380px;line-height:1.5;animation:fadeup .3s ease;}
@keyframes fadeup{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}

/* STATUS CHIP */
.online-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:${T.teal};animation:blink 2s infinite;margin-right:4px;}
.offline-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:${T.txDim};margin-right:4px;}

/* BAR */
.bar-bg{background:rgba(255,255,255,.05);border-radius:4px;overflow:hidden;}
.bar-fill{height:100%;border-radius:4px;transition:width .5s ease;}

/* NURSE RAH BADGE */
.rah-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600;background:${T.roseLt};color:${T.roseDk};border:1px solid rgba(232,72,122,.2);}

/* DISCONNECT BUTTON */
.disc-btn{padding:3px 8px;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid rgba(224,72,72,.25);background:${T.redLt};color:${T.redDk};transition:all .14s;}
.disc-btn:hover{background:${T.red};color:#fff;}

/* RECORD REQUEST */
.req-card{border-radius:10px;padding:12px;border:1px solid;margin-bottom:8px;}
.req-card-pending{background:rgba(240,160,32,.04);border-color:rgba(240,160,32,.2);}
.req-card-approved{background:rgba(24,168,100,.04);border-color:rgba(24,168,100,.2);}
.req-card-rejected{background:rgba(224,72,72,.04);border-color:rgba(224,72,72,.15);}
`;

/* ── SHARED ATOMS ─────────────────────────────────────────────────────────────── */
function Badge({cls,children}){return <span className={`bx ${cls}`}>{children}</span>;}
function VBox({label,val,status,dark}){
  const c=status==="danger"?T.red:status==="warn"?T.amber:T.teal;
  return(<div className="vbox" style={{background:dark?T.b3:T.p1,borderColor:dark?"rgba(255,255,255,.05)":T.p2}}>
    <div className="vval" style={{color:c}}>{val}</div>
    <div className="vlbl" style={{color:dark?T.txDim:T.ptt}}>{label}</div>
  </div>);
}
function Stat({label,val,sub,icon,bg,dark}){
  return(<div style={{background:dark?T.b3:T.p1,borderRadius:10,padding:"1rem",border:`1px solid ${dark?"rgba(255,255,255,.05)":T.p2}`}}>
    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
      <div style={{width:33,height:33,borderRadius:8,background:bg||"rgba(0,200,168,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{icon}</div>
      <div>
        <div style={{fontSize:10,color:dark?T.txDim:T.ptt,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".8px",marginBottom:4}}>{label}</div>
        <div style={{fontSize:20,fontWeight:700,color:dark?T.txBr:T.pt,fontFamily:T.mono}}>{val}</div>
        {sub&&<div style={{fontSize:11,color:T.teal,marginTop:2}}>{sub}</div>}
      </div>
    </div>
  </div>);
}
function FI({label,val,onChange,type="text",opts,dark,placeholder,required}){
  const base={background:dark?"rgba(255,255,255,.03)":T.p0,border:`1px solid ${dark?"rgba(255,255,255,.08)":T.p2}`,color:dark?T.txBr:T.pt};
  return(<div className="fg">
    <label className="flbl" style={{color:dark?T.txDim:T.ptt}}>{label}{required&&<span style={{color:T.red}}> *</span>}</label>
    {opts?<select className="fi" style={base} value={val} onChange={e=>onChange(e.target.value)}>{opts.map(o=><option key={o}>{o}</option>)}</select>
    :type==="textarea"?<textarea className="fi" style={{...base,minHeight:68,resize:"vertical"}} value={val} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
    :<input type={type} className="fi" style={base} value={val} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>}
  </div>);
}
function TL({records,dark}){
  if(!records?.length)return <div style={{fontSize:12,color:dark?T.txDim:T.ptt,padding:"8px 0"}}>No records yet.</div>;
  return(<div className="tl">
    {records.map((r,i)=>(
      <div key={i} className="tl-it">
        <div className="tl-dot"/>
        <div style={{fontSize:10,color:dark?T.txDim:T.ptt,fontFamily:T.mono,marginBottom:2}}>{r.date} · {r.doctor}</div>
        <div style={{fontSize:12,fontWeight:600,color:dark?T.txBr:T.pt,margin:"2px 0"}}>{r.dx}</div>
        <div style={{fontSize:12,color:dark?"#9AB0C0":T.ptt}}>{r.rx}</div>
        {r.lab&&r.lab!=="None"&&<div style={{marginTop:4}}><Badge cls="ba">Lab: {r.lab}</Badge></div>}
        {r.notes&&<div style={{fontSize:10,color:dark?T.txDim:T.ptt,marginTop:3,fontStyle:"italic"}}>{r.notes}</div>}
      </div>
    ))}
  </div>);
}

/* ── VITALS FORM ─────────────────────────────────────────────────────────────── */
function VitalsForm({initial,onSave,dark,onCancel}){
  const[v,setV]=useState(initial||{bp:"",temp:"",weight:"",height:"",wtLoss:"",complaint:"",symptoms:""});
  const set=k=>val=>setV(p=>({...p,[k]:val}));
  return(<div>
    <div className="g2">
      <FI dark={dark} label="Blood Pressure (mmHg)" val={v.bp} onChange={set("bp")} placeholder="e.g. 120/80" required/>
      <FI dark={dark} label="Temperature (°C)" val={v.temp} onChange={set("temp")} placeholder="e.g. 36.8" required/>
      <FI dark={dark} label="Weight (kg)" val={v.weight} onChange={set("weight")} placeholder="e.g. 65"/>
      <FI dark={dark} label="Height" val={v.height} onChange={set("height")} placeholder="e.g. 165cm"/>
      <FI dark={dark} label="% Weight Loss" val={v.wtLoss} onChange={set("wtLoss")} placeholder="e.g. 0"/>
    </div>
    <FI dark={dark} label="Presenting Complaint" type="textarea" val={v.complaint} onChange={set("complaint")} placeholder="Patient's presenting complaint…" required/>
    <FI dark={dark} label="Symptoms (comma-separated)" val={v.symptoms} onChange={set("symptoms")} placeholder="e.g. Sore throat, Fever, Fatigue"/>
    <div style={{display:"flex",gap:8,marginTop:4}}>
      <button className="btn btn-t" style={{flex:1}} onClick={()=>onSave(v)}>💾 Save Vital Signs</button>
      {onCancel&&<button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
    </div>
  </div>);
}

/* ══════════════════════════════════════════════════════════════════════════════
   PATIENT APP
══════════════════════════════════════════════════════════════════════════════ */
function PatientApp({patients,ehrRecords,approvals,recordRequests,onRecordRequest}){
  const pat=patients[0];
  const[view,setView]=useState("home");
  const[callState,setCallState]=useState("awaiting");
  const[timer,setTimer]=useState(0);
  const[muted,setMuted]=useState(false);
  const[msgs,setMsgs]=useState([
    {t:"s",x:"Nurse approved · Connecting to doctor…"},
    {t:"d",x:"Good afternoon! I can see your records. Tell me about today's symptoms."},
    {t:"p",x:"My throat is very sore and I've had a runny nose for 3 days."},
  ]);
  const[inp,setInp]=useState("");
  const[reqReason,setReqReason]=useState("");
  const[reqType,setReqType]=useState("Print");
  const[reqSent,setReqSent]=useState(false);
  const chatRef=useRef(null);
  const timerRef=useRef(null);

  const isNurseApproved=approvals.some(a=>a.patId===pat.id&&a.status==="nurse_approved");

  useEffect(()=>{
    if(callState==="awaiting"&&isNurseApproved){const t=setTimeout(()=>setCallState("incoming"),2000);return()=>clearTimeout(t);}
  },[callState,isNurseApproved]);
  useEffect(()=>{
    if(callState==="in-call")timerRef.current=setInterval(()=>setTimer(t=>t+1),1000);
    else clearInterval(timerRef.current);
    return()=>clearInterval(timerRef.current);
  },[callState]);
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[msgs]);

  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const sendMsg=()=>{if(!inp.trim())return;setMsgs(m=>[...m,{t:"p",x:inp}]);setInp("");setTimeout(()=>setMsgs(m=>[...m,{t:"d",x:"Thank you. Could you describe the severity on a scale of 1 to 10?"}]),1200);};
  const rah=RAH_CENTRES.find(r=>r.id===pat.rahId)||RAH_CENTRES[0];
  const myRecReqs=recordRequests.filter(r=>r.patId===pat.id);

  return(<div className="shell" style={{background:T.p0}}>
    <div className="tbar" style={{background:"#fff",borderColor:T.p2}}>
      <div className="tbar-logo" style={{color:T.pt}}>remote<span>GP</span></div>
      <span className="tbar-tag" style={{background:T.tealLt,color:T.tealDk}}>Patient</span>
      <nav className="tbar-nav" style={{marginLeft:12}}>
        {[["home","My Profile"],["consult","Consultation"],["history","Visit History"],["records","Request Records"]].map(([v,l])=>(
          <button key={v} className="tnav" onClick={()=>setView(v)} style={{background:view===v?T.tealLt:"transparent",color:view===v?T.tealDk:T.ptt}}>{l}</button>
        ))}
      </nav>
      <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
        <span className="rah-badge">🏥 {rah.name}</span>
        <span style={{fontSize:11,color:T.teal,fontFamily:T.mono}}>{isNurseApproved?"✓ Nurse Connected":"Awaiting Nurse"}</span>
      </div>
    </div>
    <div className="page" style={{maxWidth:560}}>

      {view==="home"&&(
        <div className="fcol">
          <div style={{fontFamily:T.serif,fontSize:"1.6rem",fontWeight:700,color:T.pt}}>My Profile</div>
          <div style={{background:"#fff",border:`1px solid ${T.p2}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{display:"flex",gap:14,marginBottom:14,alignItems:"center"}}>
              <div style={{width:54,height:54,borderRadius:"50%",background:`linear-gradient(135deg,${pat.color},${T.purpleDk})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff"}}>{pat.name.split(" ").map(n=>n[0]).join("")}</div>
              <div>
                <div style={{fontFamily:T.serif,fontSize:"1.25rem",fontWeight:600,color:T.pt}}>{pat.name}</div>
                <div style={{fontSize:12,color:T.ptt}}>Age {pat.age} · {pat.gender==="F"?"Female":"Male"} · {pat.village}</div>
                <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
                  <Badge cls="bt">ID: {pat.id}</Badge>
                  <Badge cls="bt">File: {pat.fileNo}</Badge>
                  {pat.allergy!=="None"&&<Badge cls="ba">⚠ {pat.allergy}</Badge>}
                  <span className="rah-badge">🏥 {rah.name}</span>
                </div>
              </div>
            </div>
            <div className="g4" style={{marginBottom:12}}>
              {[{l:"BP",v:pat.bp,s:parseFloat(pat.bp)>=140?"warn":"ok"},{l:"Temp",v:`${pat.temp}°C`,s:parseFloat(pat.temp)>=37.5?"warn":"ok"},{l:"Weight",v:`${pat.weight}kg`,s:"ok"},{l:"Height",v:pat.height,s:"ok"}].map((x,i)=><VBox key={i} label={x.l} val={x.v} status={x.s}/>)}
            </div>
            <div style={{fontSize:11,color:T.ptt,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".7px",marginBottom:5}}>Complaint</div>
            <div style={{fontSize:13,color:T.pt,background:T.p1,borderRadius:8,padding:"8px 12px",marginBottom:10}}>{pat.complaint}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{pat.symptoms.map((s,i)=><Badge key={i} cls="bt">S{i+1}: {s}</Badge>)}</div>
          </div>
          {!isNurseApproved&&<div className="al al-a">⏳ Waiting for nurse at {rah.name} to open your portal and approve the connection…</div>}
          {callState==="incoming"&&(
            <div style={{background:`linear-gradient(135deg,${T.b2},${T.b3})`,borderRadius:14,padding:"2rem",textAlign:"center"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontFamily:T.mono,letterSpacing:"2px",marginBottom:8}}>INCOMING CALL · NURSE APPROVED ✓</div>
              <div style={{width:56,height:56,borderRadius:"50%",background:T.b3,border:`2px solid ${T.teal}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:T.teal,margin:"0 auto 10px"}}>SC</div>
              <div style={{fontFamily:T.serif,fontSize:"1.2rem",color:"#fff",marginBottom:2}}>Dr. Sarah Chen</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:18}}>General Physician · London, UK</div>
              <button style={{background:T.teal,color:"#fff",border:"none",borderRadius:50,padding:"12px 28px",fontSize:14,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8}} onClick={()=>{setCallState("in-call");setView("consult");}}>📹 Accept Video Call</button>
              <button style={{background:"transparent",color:"rgba(255,255,255,.35)",border:"1px solid rgba(255,255,255,.12)",borderRadius:50,padding:"8px 18px",fontSize:12,cursor:"pointer",marginLeft:10}} onClick={()=>setCallState("awaiting")}>Decline</button>
            </div>
          )}
        </div>
      )}

      {view==="consult"&&(
        <div className="fcol">
          <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.pt}}>Video Consultation</div>
          {callState==="in-call"?(
            <>
              <div className="vid-main">
                <div style={{textAlign:"center"}}>
                  <div style={{width:58,height:58,borderRadius:"50%",background:T.b3,border:`2px solid ${T.teal}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:T.teal,margin:"0 auto 8px"}}>SC</div>
                  <div style={{color:T.tealMid,fontFamily:T.serif}}>Dr. Sarah Chen</div>
                </div>
                <div className="vid-lbl"><div className="rec-d"/>LIVE · {fmt(timer)}</div>
                <div className="vid-self"><span style={{fontSize:20}}>👤</span></div>
              </div>
              <div className="ctrls" style={{borderRadius:10}}>
                <button className={`ctrl ${muted?"ctrl-off":"ctrl-on"}`} onClick={()=>setMuted(!muted)}>{muted?"🔇":"🎙️"}</button>
                <button className="ctrl ctrl-on">📹</button>
                <button className="ctrl ctrl-end" onClick={()=>{setCallState("ended");setTimer(0);}}>📵</button>
              </div>
              <div style={{background:"#fff",border:`1px solid ${T.p2}`,borderRadius:10,padding:"1rem"}}>
                <div className="chat" ref={chatRef} style={{background:T.b1,borderRadius:8}}>{msgs.map((m,i)=><div key={i} className={`msg msg-${m.t}`}>{m.x}</div>)}</div>
                <div style={{display:"flex",gap:7,marginTop:8}}>
                  <input className="fi" style={{background:T.p0,border:`1px solid ${T.p2}`,color:T.pt,flex:1,padding:"6px 10px",fontSize:12}} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder="Type message…"/>
                  <button className="btn btn-t btn-sm" onClick={sendMsg}>Send</button>
                </div>
              </div>
            </>
          ):(
            <div className="al al-a">{callState==="ended"?"Consultation complete. Records saved to your EHR.":isNurseApproved?"Waiting for doctor to connect…":"Awaiting nurse approval at "+rah.name}</div>
          )}
        </div>
      )}

      {view==="history"&&(
        <div className="fcol">
          <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.pt}}>Visit History</div>
          <div style={{background:"#fff",border:`1px solid ${T.p2}`,borderRadius:12,padding:"1.25rem"}}>
            <TL records={ehrRecords[pat.id]||[]}/>
          </div>
        </div>
      )}

      {view==="records"&&(
        <div className="fcol">
          <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.pt}}>Request Medical Records</div>
          <div style={{background:"#fff",border:`1px solid ${T.p2}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,color:T.ptt,marginBottom:12}}>Submit a request to Admin for a copy of your medical records. You will be notified when approved.</div>
            {!reqSent?(
              <>
                <FI label="Reason for request" type="textarea" val={reqReason} onChange={setReqReason} placeholder="e.g. Referral to specialist, travel, insurance…"/>
                <FI label="Delivery method" opts={["Print","Email attachment","Both"]} val={reqType} onChange={setReqType}/>
                <button className="btn btn-t" style={{width:"100%"}} onClick={()=>{if(!reqReason.trim())return;onRecordRequest({patId:pat.id,patName:pat.name,reason:reqReason,method:reqType,rahId:pat.rahId});setReqSent(true);}}>📋 Submit Request</button>
              </>
            ):(
              <div className="al al-g">✅ Request submitted. Admin will review and notify you when approved.</div>
            )}
          </div>
          {myRecReqs.length>0&&(
            <div style={{background:"#fff",border:`1px solid ${T.p2}`,borderRadius:12,padding:"1.25rem"}}>
              <div style={{fontSize:12,fontWeight:600,color:T.pt,marginBottom:8}}>My Record Requests</div>
              {myRecReqs.map((r,i)=>(
                <div key={i} className={`req-card req-card-${r.status}`}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{fontSize:12,fontWeight:500,color:T.pt}}>{r.method}</div>
                    <Badge cls={r.status==="approved"?"bg":r.status==="rejected"?"br":"ba"}>{r.status==="approved"?"✓ Approved":r.status==="rejected"?"✗ Rejected":"⏳ Pending"}</Badge>
                  </div>
                  <div style={{fontSize:11,color:T.ptt}}>{r.reason}</div>
                  {r.adminNote&&<div style={{fontSize:11,color:T.pt,marginTop:4,fontStyle:"italic"}}>Admin: {r.adminNote}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  </div>);
}

/* ══════════════════════════════════════════════════════════════════════════════
   NURSING STATION — manages patients in assigned RAH
══════════════════════════════════════════════════════════════════════════════ */
function NursingStation({nurse,patients,setPatients,ehrRecords,setEhrRecords,approvals,setApprovals,doctors}){
  const[view,setView]=useState("queue");
  const[selPat,setSelPat]=useState(null);
  const[showVitals,setShowVitals]=useState(false);
  const[showEHR,setShowEHR]=useState(false);
  const[ehrNote,setEhrNote]=useState({dx:"",rx:"",lab:"",notes:""});
  const[toast,setToast]=useState(null);

  const showToast=(msg,type="g")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  // Nurse sees only patients in their RAH
  const myPatients=patients.filter(p=>nurse.rahIds.includes(p.rahId)&&p.status!=="disconnected");
  const rah=RAH_CENTRES.find(r=>nurse.rahIds.includes(r.id));

  const approveConnection=(pat,drId)=>{
    const drName=doctors.find(d=>d.id===drId)?.name||"Doctor";
    const existing=approvals.find(a=>a.patId===pat.id&&a.drId===drId);
    if(existing){
      setApprovals(prev=>prev.map(a=>a.id===existing.id?{...a,status:"nurse_approved",approvedAt:new Date().toTimeString().slice(0,5),approvedBy:nurse.name}:a));
    }else{
      setApprovals(prev=>[...prev,{id:`CR-${Date.now().toString().slice(-4)}`,patId:pat.id,drId,drName,patName:pat.name,rahId:pat.rahId,status:"nurse_approved",at:new Date().toTimeString().slice(0,5),approvedBy:nurse.name}]);
    }
    showToast(`✅ Connection approved: ${pat.name} ↔ ${drName}`);
  };

  const revokeConnection=(pat)=>{
    setApprovals(prev=>prev.map(a=>a.patId===pat.id?{...a,status:"revoked"}:a));
    showToast(`Connection revoked for ${pat.name}`,"r");
  };

  const saveVitals=(patId,v)=>{
    setPatients(prev=>prev.map(p=>p.id!==patId?p:{...p,bp:v.bp||p.bp,temp:v.temp||p.temp,weight:v.weight||p.weight,height:v.height||p.height,wtLoss:v.wtLoss||p.wtLoss,complaint:v.complaint||p.complaint,symptoms:v.symptoms?v.symptoms.split(",").map(s=>s.trim()):p.symptoms}));
    setShowVitals(false);
    showToast(`✅ Vitals updated for ${patients.find(p=>p.id===patId)?.name}`);
  };

  const addEHREntry=()=>{
    if(!ehrNote.dx)return;
    const record={date:new Date().toISOString().slice(0,10),doctor:`Nurse: ${nurse.name}`,dx:ehrNote.dx,rx:ehrNote.rx,lab:ehrNote.lab||"None",notes:ehrNote.notes};
    setEhrRecords(prev=>({...prev,[selPat.id]:[record,...(prev[selPat.id]||[])]}));
    setEhrNote({dx:"",rx:"",lab:"",notes:""});
    setShowEHR(false);
    showToast("✅ EHR record added");
  };

  const navs=[
    {id:"queue",label:"Patient Queue",icon:"👥"},
    {id:"vitals",label:"Record Vitals",icon:"🩺"},
    {id:"connections",label:"Manage Connections",icon:"🔗"},
    {id:"ehr",label:"Update EHR",icon:"📋"},
    {id:"interactions",label:"Interactions Log",icon:"📊"},
  ];

  return(<div style={{display:"flex",minHeight:"100vh",background:T.b0}}>
    {toast&&<div className="toast" style={{background:toast.type==="r"?T.redLt:T.greenLt,borderColor:toast.type==="r"?"rgba(224,72,72,.25)":"rgba(24,168,100,.25)",color:toast.type==="r"?T.redDk:T.greenDk}}>{toast.msg}</div>}

    <div className="dr-side">
      <div style={{padding:"1rem .9rem .8rem",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{fontFamily:T.serif,fontSize:"1.1rem",fontWeight:800,color:T.txBr}}>remote<span style={{color:T.teal}}>GP</span></div>
        <div style={{fontSize:10,color:T.txDim,fontFamily:T.mono,letterSpacing:"1.5px",marginTop:2}}>NURSING STATION</div>
      </div>
      <div style={{padding:".8rem",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{display:"flex",gap:9,alignItems:"center"}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${T.rose},${T.roseDk})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{nurse.initials}</div>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:T.txBr}}>{nurse.name}</div>
            <div style={{fontSize:10,color:T.txDim}}>Registered Nurse</div>
            <div style={{marginTop:3}}><span className="rah-badge" style={{fontSize:9}}>🏥 {rah?.name}</span></div>
          </div>
        </div>
      </div>
      <nav style={{flex:1,padding:".4rem .5rem",overflowY:"auto"}}>
        {navs.map(n=>(
          <div key={n.id} className={`sn ${view===n.id?"act":""}`} onClick={()=>setView(n.id)}>
            <span style={{fontSize:14}}>{n.icon}</span><span>{n.label}</span>
          </div>
        ))}
      </nav>
      <div style={{padding:".8rem",borderTop:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{fontSize:10,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".8px",marginBottom:3}}>RAH Patients</div>
        <div style={{fontSize:18,fontWeight:700,color:T.txBr,fontFamily:T.mono}}>{myPatients.length}</div>
      </div>
    </div>

    <div style={{marginLeft:210,flex:1,padding:"1.25rem",paddingBottom:76,overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
        <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr}}>{navs.find(n=>n.id===view)?.label}</div>
        <span className="rah-badge">🏥 {rah?.name} · {myPatients.length} patients</span>
      </div>

      {/* QUEUE */}
      {view==="queue"&&(
        <div className="fcol">
          <div className="g4">
            <Stat dark label="In Queue" val={myPatients.length} icon="👥" bg="rgba(232,72,122,.1)"/>
            <Stat dark label="Connected" val={approvals.filter(a=>nurse.rahIds.includes(a.rahId)&&a.status==="nurse_approved").length} icon="🔗" bg="rgba(24,168,100,.1)"/>
            <Stat dark label="Today's Visits" val="7" icon="📊" bg="rgba(0,200,168,.1)"/>
            <Stat dark label="EHR Updates" val="12" icon="📋" bg="rgba(139,104,240,.1)"/>
          </div>
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px"}}>Patients in {rah?.name}</div>
              <Badge cls="brose">{myPatients.length} registered</Badge>
            </div>
            {myPatients.map(p=>{
              const appr=approvals.find(a=>a.patId===p.id&&a.status==="nurse_approved");
              return(
                <div key={p.id} onClick={()=>setSelPat(p)} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",borderRadius:9,marginBottom:5,background:selPat?.id===p.id?"rgba(0,200,168,.06)":"rgba(255,255,255,.02)",border:`1px solid ${selPat?.id===p.id?"rgba(0,200,168,.2)":"rgba(255,255,255,.04)"}`,cursor:"pointer",transition:"all .12s"}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{p.name.split(" ").map(n=>n[0]).join("")}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:T.txBr}}>{p.name}</div>
                    <div style={{fontSize:11,color:T.txDim}}>{p.id} · {p.village} · Age {p.age}</div>
                  </div>
                  <div style={{textAlign:"right",marginRight:8}}>
                    <div style={{fontSize:12,fontWeight:600,color:parseFloat(p.bp)>=140?T.amber:T.teal}}>{p.bp}</div>
                    <div style={{fontSize:11,color:T.txDim}}>{p.temp}°C</div>
                  </div>
                  {appr?<Badge cls="bg">🔗 Connected</Badge>:<Badge cls="bgr">Not connected</Badge>}
                </div>
              );
            })}
          </div>
          {selPat&&(
            <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
              <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:12}}>Selected: {selPat.name}</div>
              <div className="g2" style={{marginBottom:10}}>
                <VBox dark label="BP" val={selPat.bp} status={parseFloat(selPat.bp)>=140?"warn":"ok"}/>
                <VBox dark label="Temp" val={`${selPat.temp}°C`} status={parseFloat(selPat.temp)>=37.5?"warn":"ok"}/>
                <VBox dark label="Weight" val={`${selPat.weight}kg`} status="ok"/>
                <VBox dark label="Wt Loss" val={`${selPat.wtLoss}%`} status={parseFloat(selPat.wtLoss)>5?"warn":"ok"}/>
              </div>
              <div style={{fontSize:12,color:"#9AB0C0",marginBottom:10}}>{selPat.complaint}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button className="btn btn-rose btn-sm" onClick={()=>{setView("vitals");}}>🩺 Record Vitals</button>
                <button className="btn btn-t btn-sm" onClick={()=>setView("connections")}>🔗 Connect to Doctor</button>
                <button className="btn btn-p btn-sm" onClick={()=>{setView("ehr");}}>📋 Update EHR</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECORD VITALS */}
      {view==="vitals"&&(
        <div className="fcol">
          {!selPat?(
            <>
              <div className="al al-a">Select a patient from the Queue tab first.</div>
              <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
                <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>Select Patient</div>
                {myPatients.map(p=>(
                  <div key={p.id} onClick={()=>setSelPat(p)} style={{display:"flex",gap:10,alignItems:"center",padding:"9px 12px",borderRadius:8,marginBottom:4,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.04)",cursor:"pointer"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff"}}>{p.name.split(" ").map(n=>n[0]).join("")}</div>
                    <div style={{fontSize:12,color:T.txBr}}>{p.name}</div>
                    <div style={{marginLeft:"auto",fontSize:11,color:T.txDim}}>{p.bp} · {p.temp}°C</div>
                  </div>
                ))}
              </div>
            </>
          ):(
            <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px"}}>Record Vitals — {selPat.name}</div>
                <button className="btn btn-ghost btn-xs" onClick={()=>setSelPat(null)}>Change patient</button>
              </div>
              <VitalsForm dark initial={{bp:selPat.bp,temp:selPat.temp,weight:selPat.weight,height:selPat.height,wtLoss:selPat.wtLoss,complaint:selPat.complaint,symptoms:selPat.symptoms.join(", ")}}
                onSave={v=>saveVitals(selPat.id,v)} onCancel={()=>setSelPat(null)}/>
            </div>
          )}
        </div>
      )}

      {/* MANAGE CONNECTIONS */}
      {view==="connections"&&(
        <div className="fcol">
          <div className="al al-rose">🔗 As the nurse, you control which doctor a patient in your RAH connects to. Only nurse-approved connections can proceed to consultation.</div>
          {myPatients.map(p=>{
            const appr=approvals.find(a=>a.patId===p.id&&a.status==="nurse_approved");
            return(
              <div key={p.id} style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
                <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{p.name.split(" ").map(n=>n[0]).join("")}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:T.txBr}}>{p.name}</div>
                    <div style={{fontSize:11,color:T.txDim}}>{p.id} · {p.village}</div>
                  </div>
                  {appr?(
                    <div style={{textAlign:"right"}}>
                      <Badge cls="bg">🔗 Connected to {appr.drName}</Badge>
                      <div style={{marginTop:5}}><button className="disc-btn" onClick={()=>revokeConnection(p)}>Revoke</button></div>
                    </div>
                  ):(
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <select className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.08)",color:T.txBr,width:220,fontSize:11,padding:"5px 8px"}}
                        defaultValue="" id={`dr-sel-${p.id}`}>
                        <option value="">Select doctor…</option>
                        {doctors.filter(d=>d.online&&d.status==="active").map(d=><option key={d.id} value={d.id}>{d.name} — {d.spec}</option>)}
                      </select>
                      <button className="btn btn-g btn-xs" onClick={()=>{const sel=document.getElementById(`dr-sel-${p.id}`);if(sel?.value)approveConnection(p,sel.value);}}>Approve →</button>
                    </div>
                  )}
                </div>
                {p.allergy!=="None"&&<div className="al al-a" style={{fontSize:11}}>⚠ Allergy: {p.allergy}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* UPDATE EHR */}
      {view==="ehr"&&(
        <div className="g2">
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>Add EHR Record</div>
            <div className="fg">
              <label className="flbl" style={{color:T.txDim}}>Select Patient</label>
              <select className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.08)",color:T.txBr}} value={selPat?.id||""} onChange={e=>setSelPat(myPatients.find(p=>p.id===e.target.value)||null)}>
                <option value="">Select patient…</option>
                {myPatients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {selPat&&(
              <>
                <FI dark label="Assessment / Diagnosis" val={ehrNote.dx} onChange={v=>setEhrNote(n=>({...n,dx:v}))} placeholder="Nurse assessment…" required/>
                <FI dark label="Treatment / Action Taken" val={ehrNote.rx} onChange={v=>setEhrNote(n=>({...n,rx:v}))} placeholder="First aid, triage, medication given…"/>
                <FI dark label="Lab / Investigations" val={ehrNote.lab} onChange={v=>setEhrNote(n=>({...n,lab:v}))} placeholder="Any tests ordered or results…"/>
                <FI dark label="Clinical Notes" type="textarea" val={ehrNote.notes} onChange={v=>setEhrNote(n=>({...n,notes:v}))} placeholder="Additional observations…"/>
                <button className="btn btn-t" style={{width:"100%"}} onClick={addEHREntry}>📋 Save to EHR</button>
              </>
            )}
          </div>
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>
              {selPat?`EHR — ${selPat.name}`:"Select a patient"}
            </div>
            <TL records={selPat?(ehrRecords[selPat.id]||[]):[]} dark/>
          </div>
        </div>
      )}

      {/* INTERACTIONS LOG */}
      {view==="interactions"&&(
        <div className="fcol">
          <div className="tw" style={{borderColor:T.bdr}}>
            <table>
              <thead><tr style={{borderColor:T.bdr}}>{["Patient","Doctor","Date","Status","Duration","Connection By"].map(h=><th key={h} style={{color:T.txDim}}>{h}</th>)}</tr></thead>
              <tbody>
                {approvals.filter(a=>nurse.rahIds.includes(a.rahId)).map((a,i)=>(
                  <tr key={i} style={{borderColor:"rgba(255,255,255,.04)"}}>
                    <td style={{color:T.txBr,fontWeight:500}}>{a.patName}</td>
                    <td style={{color:T.tx,fontSize:11}}>{a.drName||"—"}</td>
                    <td style={{fontFamily:T.mono,fontSize:10}}>{a.at}</td>
                    <td><Badge cls={a.status==="nurse_approved"?"bg":a.status==="revoked"?"br":"ba"}>{a.status==="nurse_approved"?"✓ Active":a.status==="revoked"?"Revoked":"Pending"}</Badge></td>
                    <td style={{fontFamily:T.mono,fontSize:10,color:T.txDim}}>—</td>
                    <td style={{fontSize:11,color:T.txDim}}>{a.approvedBy||"—"}</td>
                  </tr>
                ))}
                {approvals.filter(a=>nurse.rahIds.includes(a.rahId)).length===0&&<tr><td colSpan={6} style={{textAlign:"center",color:T.txDim,padding:"2rem"}}>No interactions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  </div>);
}

/* ══════════════════════════════════════════════════════════════════════════════
   DOCTOR PORTAL
══════════════════════════════════════════════════════════════════════════════ */
function DoctorPortal({patients,ehrRecords,approvals,ai,cfg,onSaveConsultation}){
  const doc={id:"D-001",name:"Dr. Sarah Chen",spec:"General Physician",loc:"London, UK"};
  const[view,setView]=useState("queue");
  const[selPat,setSelPat]=useState(null);
  const[callActive,setCallActive]=useState(false);
  const[callTimer,setCallTimer]=useState(0);
  const[muted,setMuted]=useState(false);
  const[msgs,setMsgs]=useState([{t:"s",x:"Nurse approved · Session active"},{t:"d",x:"Good afternoon! I've reviewed your records. Tell me about today's symptoms."}]);
  const[msgInp,setMsgInp]=useState("");
  const[docNotes,setDocNotes]=useState("");
  const[confirmedDx,setConfirmedDx]=useState("");
  const[prescription,setPrescription]=useState("");
  const[labReqs,setLabReqs]=useState([]);
  const[phOrders,setPhOrders]=useState([]);
  const[pharmSearch,setPharmSearch]=useState("");
  const[pharmFamily,setPharmFamily]=useState("All");
  const[selLab,setSelLab]=useState(null);
  const[selTest,setSelTest]=useState("");
  const[savedConsult,setSavedConsult]=useState(false);
  const chatRef=useRef(null);
  const timerRef=useRef(null);

  useEffect(()=>{if(callActive)timerRef.current=setInterval(()=>setCallTimer(t=>t+1),1000);else clearInterval(timerRef.current);return()=>clearInterval(timerRef.current);},[callActive]);
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[msgs]);

  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const isApproved=selPat&&approvals.some(a=>a.patId===selPat.id&&a.drId===doc.id&&a.status==="nurse_approved");
  const aiResult=selPat?runAI(selPat.symptoms,{temp:selPat.temp}):null;
  const patHistory=selPat?(ehrRecords[selPat.id]||[]):[];

  const allDrugs=[];const seen={};
  ALL_PHARMACIES.forEach(ph=>ph.stock.forEach(s=>{
    if(!seen[s.drug]){seen[s.drug]={...s,pharmacies:[]};allDrugs.push(seen[s.drug]);}
    seen[s.drug].pharmacies.push({name:ph.name,locality:ph.locality,price:s.price,qty:s.qty,delivery:ph.delivery});
  }));
  allDrugs.sort((a,b)=>a.drug.localeCompare(b.drug));
  const drugFamilies=["All",...new Set(allDrugs.map(d=>d.family))];
  const filteredDrugs=allDrugs.filter(d=>(pharmFamily==="All"||d.family===pharmFamily)&&(!pharmSearch||d.drug.toLowerCase().includes(pharmSearch.toLowerCase())));

  const sendPhOrder=(drug)=>{
    const cheapest=drug.pharmacies.reduce((a,b)=>a.price<=b.price?a:b);
    setPhOrders(o=>[{id:`PO-${Date.now().toString().slice(-4)}`,drug:drug.drug,pharmacy:cheapest.name,price:cheapest.price,patName:selPat?.name,status:"Sent",sentAt:new Date().toTimeString().slice(0,5)},...o]);
    setPrescription(prev=>prev?`${prev}, ${drug.drug}`:drug.drug);
  };
  const sendLabReq=()=>{
    if(!selLab||!selTest)return;
    setLabReqs(r=>[{id:`LR-${Date.now().toString().slice(-4)}`,lab:selLab.name,test:selTest,patName:selPat?.name,status:"Requested",sentAt:new Date().toTimeString().slice(0,5)},...r]);
    setSelTest("");
  };
  const saveConsultation=()=>{
    if(!confirmedDx||!prescription)return;
    onSaveConsultation(selPat.id,{date:new Date().toISOString().slice(0,10),doctor:doc.name,dx:confirmedDx,rx:prescription,lab:labReqs.filter(r=>r.patName===selPat.name).map(r=>r.test).join(", ")||"None",notes:docNotes});
    setSavedConsult(true);setCallActive(false);setCallTimer(0);
  };

  const navs=[{id:"queue",label:"Patient Queue",icon:"👥"},{id:"consult",label:"Consultation",icon:"📹"},{id:"history",label:"Patient History",icon:"📋"},{id:"pharmacy",label:"Pharmacy DB",icon:"💊"},{id:"lab",label:"Lab Requests",icon:"🔬"},{id:"ai",label:"AI Status",icon:"🧠"}];

  return(<div style={{display:"flex",minHeight:"100vh",background:T.b0}}>
    <div className="dr-side">
      <div style={{padding:"1rem .9rem .8rem",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{fontFamily:T.serif,fontSize:"1.1rem",fontWeight:800,color:T.txBr}}>remote<span style={{color:T.teal}}>GP</span></div>
        <div style={{fontSize:10,color:T.txDim,fontFamily:T.mono,letterSpacing:"1.5px",marginTop:2}}>DOCTOR PORTAL</div>
      </div>
      <div style={{padding:".8rem",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{display:"flex",gap:9,alignItems:"center"}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${T.teal},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>SC</div>
          <div><div style={{fontSize:12,fontWeight:600,color:T.txBr}}>{doc.name}</div><div style={{fontSize:10,color:T.txDim}}>{doc.spec}</div><div style={{display:"flex",gap:4,marginTop:2}}><span className="online-dot"/><span style={{fontSize:9,color:T.teal}}>Online</span></div></div>
        </div>
      </div>
      <nav style={{flex:1,padding:".4rem .5rem",overflowY:"auto"}}>
        {navs.map(n=><div key={n.id} className={`sn ${view===n.id?"act":""}`} onClick={()=>setView(n.id)}><span style={{fontSize:14}}>{n.icon}</span><span>{n.label}</span></div>)}
      </nav>
      <div style={{padding:".8rem",borderTop:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{fontSize:9,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".8px",marginBottom:3}}>AI · Stage {ai.stage}</div>
        <div style={{fontSize:11,color:T.teal,fontWeight:500}}>{["","Training","Shadowing","Shared Load"][ai.stage]}</div>
        <div style={{background:"rgba(255,255,255,.06)",borderRadius:4,height:4,marginTop:5,overflow:"hidden"}}><div style={{width:`${ai.cycles.length>0?ai.cycles[ai.cycles.length-1].accuracy:78}%`,height:"100%",background:T.teal,borderRadius:4}}/></div>
      </div>
    </div>

    <div style={{marginLeft:210,flex:1,padding:"1.25rem",paddingBottom:76,overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
        <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr}}>{navs.find(n=>n.id===view)?.label}</div>
        <div style={{display:"flex",gap:6}}>
          {callActive&&<Badge cls="br">● LIVE {fmt(callTimer)}</Badge>}
          {isApproved&&selPat&&<Badge cls="bg">✓ Nurse Approved — {selPat.name}</Badge>}
          <Badge cls="bt">● Connected</Badge>
        </div>
      </div>

      {view==="queue"&&(
        <div className="fcol">
          <div className="g3"><Stat dark label="Approved Queue" val={approvals.filter(a=>a.drId===doc.id&&a.status==="nurse_approved").length} icon="✅" bg="rgba(24,168,100,.1)"/><Stat dark label="Today" val="9" icon="📊" bg="rgba(0,200,168,.1)"/><Stat dark label="RAH Centres" val={[...new Set(approvals.filter(a=>a.drId===doc.id&&a.status==="nurse_approved").map(a=>a.rahId))].length} icon="🏥" bg="rgba(232,72,122,.1)"/></div>
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px"}}>Nurse-Approved Patients</div>
              <Badge cls="brose">Nurse approval required</Badge>
            </div>
            {approvals.filter(a=>a.drId===doc.id&&a.status==="nurse_approved").map(appr=>{
              const p=patients.find(pt=>pt.id===appr.patId);
              if(!p)return null;
              const rah=RAH_CENTRES.find(r=>r.id===p.rahId);
              return(<div key={appr.id} onClick={()=>{setSelPat(p);setSavedConsult(false);setDocNotes("");setConfirmedDx("");setPrescription("");}} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",borderRadius:9,marginBottom:5,background:selPat?.id===p.id?"rgba(0,200,168,.06)":"rgba(255,255,255,.02)",border:`1px solid ${selPat?.id===p.id?"rgba(0,200,168,.2)":"rgba(255,255,255,.04)"}`,cursor:"pointer",transition:"all .12s"}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{p.name.split(" ").map(n=>n[0]).join("")}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:T.txBr}}>{p.name}</div><div style={{fontSize:11,color:T.txDim}}>{p.id} · {rah?.name} · Age {p.age}</div></div>
                <div style={{textAlign:"right",marginRight:8}}><div style={{fontSize:12,fontWeight:600,color:parseFloat(p.bp)>=140?T.amber:T.teal}}>{p.bp}</div><div style={{fontSize:11,color:T.txDim}}>{p.temp}°C</div></div>
                <Badge cls="bg">✓ Nurse Approved</Badge>
              </div>);
            })}
            {approvals.filter(a=>a.drId===doc.id&&a.status==="nurse_approved").length===0&&(
              <div className="al al-a">No nurse-approved patients yet. Nurses at RAH centres approve connections before consultation can begin.</div>
            )}
          </div>
          {selPat&&isApproved&&(
            <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
              <div className="al al-g" style={{marginBottom:10}}>✅ Nurse approved this connection. You may now consult with {selPat.name}.</div>
              <button className="btn btn-t" style={{width:"100%"}} onClick={()=>{setCallActive(true);setView("consult");}}>📹 Start Consultation</button>
            </div>
          )}
        </div>
      )}

      {view==="consult"&&(
        <div className="g2">
          <div className="fcol">
            <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,overflow:"hidden"}}>
              {!selPat?(<div style={{padding:"2.5rem",textAlign:"center"}}><div style={{fontSize:13,color:T.txDim}}>Select an approved patient from the Queue.</div><button className="btn btn-t" style={{marginTop:12}} onClick={()=>setView("queue")}>Go to Queue →</button></div>)
              :!isApproved?(<div style={{padding:"1.5rem"}}><div className="al al-a">Nurse approval required. The RAH nurse must approve this connection first.</div></div>)
              :callActive?(<>
                <div className="vid-main" style={{minHeight:220}}>
                  <div style={{textAlign:"center"}}><div style={{width:58,height:58,borderRadius:"50%",background:selPat.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#fff",margin:"0 auto 8px"}}>{selPat.name.split(" ").map(n=>n[0]).join("")}</div><div style={{color:T.tealMid,fontFamily:T.serif}}>{selPat.name}</div></div>
                  <div className="vid-lbl"><div className="rec-d"/>REC · {fmt(callTimer)}</div>
                  <div className="vid-self"><span style={{fontSize:18}}>👨‍⚕️</span></div>
                </div>
                <div className="ctrls">
                  <button className={`ctrl ${muted?"ctrl-off":"ctrl-on"}`} onClick={()=>setMuted(!muted)}>{muted?"🔇":"🎙️"}</button>
                  <button className="ctrl ctrl-on">📹</button>
                  <button className="ctrl ctrl-end" onClick={()=>{setCallActive(false);setCallTimer(0);}}>📵</button>
                </div>
                <div style={{padding:12}}>
                  <div className="chat" ref={chatRef} style={{background:T.b0,borderRadius:8}}>{msgs.map((m,i)=><div key={i} className={`msg msg-${m.t}`}>{m.x}</div>)}</div>
                  <div style={{display:"flex",gap:7,marginTop:8}}><input className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.07)",color:T.txBr,flex:1,padding:"6px 10px",fontSize:12}} value={msgInp} onChange={e=>setMsgInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&msgInp.trim()){setMsgs(m=>[...m,{t:"d",x:msgInp}]);setMsgInp("");}}} placeholder="Message…"/><button className="btn btn-t btn-sm" onClick={()=>{if(msgInp.trim()){setMsgs(m=>[...m,{t:"d",x:msgInp}]);setMsgInp("");}}}>Send</button></div>
                </div>
              </>):(<div style={{padding:"1.5rem"}}>{savedConsult?<div className="al al-g">✅ Consultation saved to EHR.</div>:<><div className="al al-t" style={{marginBottom:12}}>✓ Nurse approved. Ready to start with {selPat.name}.</div><button className="btn btn-t" style={{width:"100%",fontSize:14,padding:"12px"}} onClick={()=>setCallActive(true)}>📹 Start Consultation</button></>}</div>)}
            </div>
            {selPat&&isApproved&&!savedConsult&&(
              <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"1rem"}}>
                {aiResult&&(<div style={{background:"rgba(139,104,240,.08)",border:"1px solid rgba(139,104,240,.18)",borderRadius:8,padding:"10px 12px",marginBottom:10}}><div style={{fontSize:10,color:T.purpleDk,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>🧠 AI Suggestion · Stage {ai.stage}</div><div style={{fontSize:13,fontWeight:600,color:T.txBr}}>{aiResult.full}</div><div style={{fontSize:11,color:T.txDim,marginTop:2}}>Confidence: {aiResult.displayConf}</div></div>)}
                <FI dark label="Doctor Notes" type="textarea" val={docNotes} onChange={setDocNotes} placeholder="Examination findings…"/>
                <FI dark label="Confirmed Diagnosis *" val={confirmedDx} onChange={setConfirmedDx} placeholder="Your confirmed diagnosis…"/>
                <FI dark label="Prescription *" val={prescription} onChange={setPrescription} placeholder="Drug, dose, frequency, duration…"/>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-t btn-sm" onClick={()=>setView("pharmacy")}>💊 Pharmacy DB</button>
                  <button className="btn btn-a btn-sm" onClick={()=>setView("lab")}>🔬 Lab Request</button>
                  <button className="btn btn-g btn-sm" style={{marginLeft:"auto"}} onClick={saveConsultation} disabled={!confirmedDx||!prescription}>💾 Save EHR</button>
                </div>
              </div>
            )}
          </div>
          <div className="fcol">
            {selPat?(<>
              <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"1rem"}}>
                <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:8}}>📋 {selPat.name}</div>
                <div className="g2" style={{marginBottom:10}}>
                  <VBox dark label="BP" val={selPat.bp} status={parseFloat(selPat.bp)>=140?"warn":"ok"}/>
                  <VBox dark label="Temp" val={`${selPat.temp}°C`} status={parseFloat(selPat.temp)>=38?"warn":"ok"}/>
                  <VBox dark label="Weight" val={`${selPat.weight}kg`} status="ok"/>
                  <VBox dark label="Wt Loss" val={`${selPat.wtLoss}%`} status={parseFloat(selPat.wtLoss)>5?"warn":"ok"}/>
                </div>
                {selPat.allergy!=="None"&&<div className="al al-a" style={{fontSize:11,marginBottom:6}}>⚠ Allergy: {selPat.allergy}</div>}
                <div style={{fontSize:11,color:T.txDim}}>{selPat.complaint}</div>
              </div>
              <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"1rem"}}>
                <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:8}}>Consultation History ({patHistory.length})</div>
                <TL records={patHistory} dark/>
              </div>
            </>):(<div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"2rem",textAlign:"center"}}><div style={{fontSize:13,color:T.txDim}}>Select an approved patient</div></div>)}
          </div>
        </div>
      )}

      {view==="history"&&(<div className="fcol">
        {!selPat&&<div className="al al-a">Select a patient from the Queue first.</div>}
        {selPat&&(
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>Full History — {selPat.name}</div>
            <div className="g4" style={{marginBottom:12}}><VBox dark label="BP" val={selPat.bp} status="ok"/><VBox dark label="Temp" val={`${selPat.temp}°C`} status="ok"/><VBox dark label="Weight" val={`${selPat.weight}kg`} status="ok"/><VBox dark label="Height" val={selPat.height} status="ok"/></div>
            <TL records={patHistory} dark/>
          </div>
        )}
      </div>)}

      {view==="pharmacy"&&(
        <div className="fcol">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.08)",color:T.txBr,flex:1,minWidth:200,padding:"7px 11px",fontSize:12}} value={pharmSearch} onChange={e=>setPharmSearch(e.target.value)} placeholder="🔍 Search drug…"/>
            <select className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.08)",color:T.txBr,width:180}} value={pharmFamily} onChange={e=>setPharmFamily(e.target.value)}>{drugFamilies.map(f=><option key={f}>{f}</option>)}</select>
            <span style={{fontSize:11,color:T.txDim,fontFamily:T.mono,alignSelf:"center"}}>{filteredDrugs.length} drugs across {ALL_PHARMACIES.length} pharmacies</span>
          </div>
          <div className="tw" style={{borderColor:T.bdr}}>
            <table><thead><tr style={{borderColor:T.bdr}}>{["Drug","Family","Allergy","Best Price","Total Stock","Pharmacies","Send"].map(h=><th key={h} style={{color:T.txDim}}>{h}</th>)}</tr></thead>
              <tbody>{filteredDrugs.map((drug,i)=>{
                const cheapest=drug.pharmacies.reduce((a,b)=>a.price<=b.price?a:b);
                const sent=phOrders.find(o=>o.drug===drug.drug&&o.patName===selPat?.name);
                return(<tr key={i} style={{borderColor:"rgba(255,255,255,.04)"}}>
                  <td style={{color:T.txBr,fontWeight:500}}>{drug.drug}</td>
                  <td><Badge cls="bt">{drug.family}</Badge></td>
                  <td>{drug.allergy!=="None"?<Badge cls="ba">⚠ {drug.allergy}</Badge>:<span style={{fontSize:11,color:T.txDim}}>None</span>}</td>
                  <td style={{color:T.teal,fontWeight:700,fontFamily:T.mono}}>${cheapest.price.toFixed(2)}<br/><span style={{fontSize:9,color:T.txDim}}>{cheapest.name}</span></td>
                  <td style={{color:T.txDim,fontSize:11}}>{drug.pharmacies.reduce((s,p)=>s+p.qty,0)}</td>
                  <td style={{fontSize:10,color:T.txDim}}>{drug.pharmacies.slice(0,2).map(p=>p.name).join(", ")}</td>
                  <td>{sent?<Badge cls="bg">✓ Sent</Badge>:<button className="btn btn-t btn-xs" onClick={()=>sendPhOrder(drug)} disabled={!selPat}>{selPat?"Send →":"Select patient"}</button>}</td>
                </tr>);
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {view==="lab"&&(
        <div className="g2">
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:12}}>Request Lab Test</div>
            {!selPat&&<div className="al al-a" style={{marginBottom:10}}>Select a patient from the Queue first.</div>}
            {selPat&&<div className="al al-t" style={{marginBottom:10}}>Patient: <strong>{selPat.name}</strong></div>}
            <div className="fg"><label className="flbl" style={{color:T.txDim}}>Laboratory</label>
              <select className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.08)",color:T.txBr}} value={selLab?.id||""} onChange={e=>{setSelLab(ALL_LABS.find(l=>l.id===e.target.value));setSelTest("");}}>
                <option value="">Choose lab…</option>{ALL_LABS.map(l=><option key={l.id} value={l.id}>{l.name} — TAT: {l.tat} ★{l.rating}</option>)}
              </select>
            </div>
            {selLab&&(<>
              <div className="fg"><label className="flbl" style={{color:T.txDim}}>Test Type</label>
                <select className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.08)",color:T.txBr}} value={selTest} onChange={e=>setSelTest(e.target.value)}>
                  <option value="">Choose test…</option>{selLab.tests.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              {aiResult?.lab&&<div style={{background:"rgba(139,104,240,.08)",border:"1px solid rgba(139,104,240,.18)",borderRadius:8,padding:"8px 12px",marginBottom:10}}><div style={{fontSize:10,color:T.purpleDk,fontFamily:T.mono,marginBottom:3}}>🧠 AI Suggests: {aiResult.labTest}</div></div>}
              <button className="btn btn-a" style={{width:"100%"}} onClick={sendLabReq} disabled={!selTest||!selPat}>🔬 Send Request</button>
            </>)}
          </div>
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>Lab Request Log</div>
            {labReqs.length===0&&<div style={{fontSize:12,color:T.txDim}}>No requests yet.</div>}
            {labReqs.map((r,i)=>(<div key={i} style={{padding:"9px 12px",background:T.b3,border:"1px solid rgba(240,160,32,.12)",borderRadius:8,marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontSize:12,fontWeight:600,color:T.txBr}}>{r.test}</div><Badge cls="ba">⏳ {r.status}</Badge></div>
              <div style={{fontSize:11,color:T.txDim,marginTop:2}}>Lab: {r.lab} · Patient: {r.patName||"—"} · {r.sentAt}</div>
            </div>))}
          </div>
        </div>
      )}

      {view==="ai"&&(<div className="fcol">
        <div className="al al-ph">AI status is read-only for doctors. Configuration controlled by Admin.</div>
        <div style={{background:"#040810",border:"1px solid rgba(0,255,136,.12)",borderRadius:12,padding:"1.25rem"}}>
          <div style={{fontFamily:T.serif,fontSize:"1.1rem",fontWeight:700,color:"#00FF88",marginBottom:12}}>AI Engine · Stage {ai.stage}</div>
          <div className="g3"><Stat dark label="Stage" val={["","Training","Shadowing","Shared Load"][ai.stage]} icon="🔬" bg="rgba(0,255,136,.08)"/><Stat dark label="Accuracy" val={`${ai.cycles.length>0?ai.cycles[ai.cycles.length-1].accuracy.toFixed(1):78}%`} icon="🎯" bg="rgba(0,255,136,.08)"/><Stat dark label="Interactions" val={ai.totalInteractions.toLocaleString()} icon="📊" bg="rgba(0,255,136,.08)"/></div>
          <div style={{fontSize:12,color:T.txDim,marginTop:10}}>Cycle: <strong style={{color:"#00FF88"}}>{cfg.trainingCycleSize} cases</strong> · Duration: <strong style={{color:"#00FF88"}}>{cfg.trainingDurationMonths}mo</strong> · Stage 3 split: <strong style={{color:"#00FF88"}}>AI {cfg.aiLoadPercent}% / Dr {100-cfg.aiLoadPercent}%</strong></div>
        </div>
      </div>)}
    </div>
  </div>);
}

/* ══════════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
function AdminDashboard({patients,setPatients,ehrRecords,setEhrRecords,approvals,setApprovals,nurses,setNurses,doctors,setDoctors,ai,cfg,onAiCfgChange,onForceStage,recordRequests,setRecordRequests,newRegs,simSpeed,onSimSpeed,newCase,onShadowVerdict,onGenCase}){
  const[view,setView]=useState("overview");
  const[regs,setRegs]=useState([{id:"DR-2025-001",name:"Dr. Amara Sow",email:"a.sow@clinic.sn",spec:"General Physician",country:"Senegal",council:"CNOM",licNo:"SN-GP-2019-0441",status:"pending",submitted:"2025-05-10",type:"doctor"},{id:"DR-2025-002",name:"Dr. Kofi Mensah",email:"k.mensah@ghana.org",spec:"Internal Medicine",country:"Ghana",council:"GCMP",licNo:"GH-IM-2018-0887",status:"approved",submitted:"2025-05-08",type:"doctor",reviewedAt:"2025-05-09"},{id:"PH-2025-001",name:"MediCare Pharmacy",email:"info@medicare.sn",owner:"Moussa Thiaw",city:"Dakar",country:"Senegal",regNo:"PHARM-SN-0881",status:"pending",submitted:"2025-05-11",type:"pharmacy"},{id:"LB-2025-001",name:"BioMed Diagnostic Lab",email:"biomed@labs.sn",director:"Dr. Cheikh Diallo",city:"Dakar",country:"Senegal",accreditation:"ISO 15189",status:"pending",submitted:"2025-05-10",type:"lab"},...newRegs]);
  const[referrals,setReferrals]=useState([]);
  const[selPat,setSelPat]=useState(null);
  const[selReg,setSelReg]=useState(null);
  const[regNotes,setRegNotes]=useState("");
  const[refModal,setRefModal]=useState(null);
  const[refTarget,setRefTarget]=useState("");
  const[refReason,setRefReason]=useState("");
  const[toast,setToast]=useState(null);
  const[search,setSearch]=useState("");
  const[discModal,setDiscModal]=useState(null); // {type,item}
  const[cfgDraft,setCfgDraft]=useState({...cfg});
  const[vitalsModal,setVitalsModal]=useState(null);

  useEffect(()=>{
    setRegs(prev=>{const ids=prev.map(r=>r.id);const toAdd=newRegs.filter(r=>!ids.includes(r.id));return toAdd.length>0?[...toAdd,...prev]:prev;});
  },[newRegs]);

  const showToast=(msg,type="g")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);};

  const approveRecordRequest=(req,note,method)=>{
    setRecordRequests(prev=>prev.map(r=>r.id===req.id?{...r,status:"approved",adminNote:note,deliveryMethod:method,approvedAt:new Date().toLocaleString()}:r));
    showToast(`✅ Record request approved for ${req.patName}`);
  };
  const rejectRecordRequest=(req,note)=>{
    setRecordRequests(prev=>prev.map(r=>r.id===req.id?{...r,status:"rejected",adminNote:note}:r));
    showToast(`Record request rejected`,"r");
  };

  const disconnectUser=(type,item)=>{
    if(type==="patient")setPatients(prev=>prev.map(p=>p.id===item.id?{...p,status:"disconnected"}:p));
    if(type==="doctor")setDoctors(prev=>prev.map(d=>d.id===item.id?{...d,status:"disconnected",online:false}:d));
    if(type==="nurse")setNurses(prev=>prev.map(n=>n.id===item.id?{...n,status:"disconnected",online:false}:n));
    setDiscModal(null);
    showToast(`${item.name} has been disconnected from the platform`,"r");
  };

  const sendReferral=()=>{
    if(!refTarget||!refReason||!refModal)return;
    setReferrals(prev=>[{id:`REF-${String(prev.length+1).padStart(3,"0")}`,patientId:refModal.id,patientName:refModal.name,fromDoctor:"Admin-initiated",toDoctor:refTarget,reason:refReason,sentAt:new Date().toLocaleString(),status:"pending"},...prev]);
    setRefModal(null);setRefTarget("");setRefReason("");
    showToast(`📤 ${refModal.name} referred to ${refTarget}`);
  };

  const saveVitals=(patId,v)=>{
    setPatients(prev=>prev.map(p=>p.id!==patId?p:{...p,bp:v.bp||p.bp,temp:v.temp||p.temp,weight:v.weight||p.weight,height:v.height||p.height,wtLoss:v.wtLoss||p.wtLoss,complaint:v.complaint||p.complaint,symptoms:v.symptoms?v.symptoms.split(",").map(s=>s.trim()):p.symptoms}));
    setVitalsModal(null);
    showToast(`✅ Vitals updated`);
  };

  const addAdminEHR=(patId,record)=>{
    setEhrRecords(prev=>({...prev,[patId]:[record,...(prev[patId]||[])]}));
    showToast("✅ EHR record added by Admin");
  };

  const latestAcc=ai.cycles.length>0?ai.cycles[ai.cycles.length-1].accuracy:78;
  const pendingRegs=regs.filter(r=>r.status==="pending");
  const pendingRecordReqs=recordRequests.filter(r=>r.status==="pending");

  const navs=[
    {id:"overview",label:"Overview"},
    {id:"approvals",label:"Connections",badge:approvals.filter(a=>a.status==="pending").length},
    {id:"patients",label:"Patient Database"},
    {id:"vitals",label:"Record Vitals"},
    {id:"personnel",label:"Personnel",badge:doctors.filter(d=>d.status==="disconnected").length+nurses.filter(n=>n.status==="disconnected").length>0?null:null},
    {id:"record_requests",label:"Record Requests",badge:pendingRecordReqs.length},
    {id:"referrals",label:"Referrals & Transfers"},
    {id:"registrations",label:"Registrations",badge:pendingRegs.length},
    {id:"ai_engine",label:"AI Engine"},
    {id:"ai_config",label:"AI Config 🔧"},
    {id:"interactions",label:"Interactions"},
  ];

  return(<div className="shell" style={{background:"#050910"}}>
    {toast&&<div className="toast" style={{background:toast.type==="r"?T.redLt:T.greenLt,borderColor:toast.type==="r"?"rgba(224,72,72,.25)":"rgba(24,168,100,.25)",color:toast.type==="r"?T.redDk:T.greenDk}}>{toast.msg}</div>}

    {/* Disconnect confirm modal */}
    {discModal&&(<div className="modal-bg" onClick={()=>setDiscModal(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:T.serif,fontSize:"1.1rem",fontWeight:700,color:T.txBr,marginBottom:8}}>⚠ Disconnect {discModal.item.name}?</div>
        <div className="al al-r" style={{marginBottom:12}}>This will immediately remove their access to the remoteGP platform. Patient records are retained in the cloud EHR.</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-r" style={{flex:1}} onClick={()=>disconnectUser(discModal.type,discModal.item)}>Disconnect</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setDiscModal(null)}>Cancel</button>
        </div>
      </div>
    </div>)}

    {/* Referral modal */}
    {refModal&&(<div className="modal-bg" onClick={()=>setRefModal(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{fontFamily:T.serif,fontSize:"1.1rem",fontWeight:700,color:T.txBr}}>↗ Transfer: {refModal.name}</div><button onClick={()=>setRefModal(null)} style={{background:"transparent",border:"1px solid rgba(255,255,255,.08)",borderRadius:6,padding:"3px 8px",color:T.txDim,cursor:"pointer"}}>✕</button></div>
        <div className="al al-p" style={{marginBottom:12}}>Transferring will share this patient's EHR with the receiving doctor and auto-create a nurse approval request at their RAH.</div>
        <div className="fg"><label className="flbl" style={{color:T.txDim}}>Refer to Doctor</label>
          <select className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.07)",color:T.txBr}} value={refTarget} onChange={e=>setRefTarget(e.target.value)}>
            <option>Select doctor…</option>{doctors.filter(d=>d.status==="active").map(d=><option key={d.id}>{d.name} — {d.spec}</option>)}
          </select>
        </div>
        <div className="fg"><label className="flbl" style={{color:T.txDim}}>Clinical Reason</label>
          <textarea className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.07)",color:T.txBr,minHeight:70,resize:"vertical"}} value={refReason} onChange={e=>setRefReason(e.target.value)}/>
        </div>
        <button className="btn btn-p" style={{width:"100%",marginTop:8}} onClick={sendReferral}>↗ Transfer Patient Files & Initiate Referral</button>
      </div>
    </div>)}

    {/* Vitals modal */}
    {vitalsModal&&(<div className="modal-bg" onClick={()=>setVitalsModal(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div style={{fontFamily:T.serif,fontSize:"1.1rem",fontWeight:700,color:T.txBr}}>🩺 Update Vitals — {vitalsModal.name}</div><button onClick={()=>setVitalsModal(null)} style={{background:"transparent",border:"1px solid rgba(255,255,255,.08)",borderRadius:6,padding:"3px 8px",color:T.txDim,cursor:"pointer"}}>✕</button></div>
        <VitalsForm dark initial={{bp:vitalsModal.bp,temp:vitalsModal.temp,weight:vitalsModal.weight,height:vitalsModal.height,wtLoss:vitalsModal.wtLoss,complaint:vitalsModal.complaint,symptoms:vitalsModal.symptoms.join(", ")}} onSave={v=>saveVitals(vitalsModal.id,v)} onCancel={()=>setVitalsModal(null)}/>
      </div>
    </div>)}

    <div className="tbar" style={{background:"#070D18",borderColor:"rgba(255,255,255,.06)"}}>
      <div className="tbar-logo" style={{color:T.txBr}}>remote<span>GP</span></div>
      <span className="tbar-tag" style={{background:"rgba(139,104,240,.1)",color:T.purple,border:"1px solid rgba(139,104,240,.2)"}}>Admin</span>
      <nav className="tbar-nav" style={{marginLeft:12}}>
        {navs.map(n=>(
          <button key={n.id} className="tnav" onClick={()=>setView(n.id)} style={{background:view===n.id?"rgba(0,200,168,.07)":"transparent",color:view===n.id?T.teal:T.txDim,position:"relative"}}>
            {n.label}{n.badge>0&&<span style={{position:"absolute",top:2,right:2,width:7,height:7,borderRadius:"50%",background:T.amber}}/>}
          </button>
        ))}
      </nav>
      <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
        {pendingRecordReqs.length>0&&<Badge cls="brose">📋 {pendingRecordReqs.length} record req</Badge>}
        <Badge cls="bt">Admin · Full Access</Badge>
      </div>
    </div>

    <div className="page" style={{paddingBottom:80}}>

      {/* OVERVIEW */}
      {view==="overview"&&(<div className="fcol">
        <div style={{fontFamily:T.serif,fontSize:"1.6rem",fontWeight:700,color:T.txBr}}>System Overview</div>
        <div className="g5">
          <Stat dark label="Patients" val={patients.filter(p=>p.status!=="disconnected").length} icon="🗄️" bg="rgba(0,200,168,.1)"/>
          <Stat dark label="Active Doctors" val={doctors.filter(d=>d.status==="active").length} icon="👨‍⚕️" bg="rgba(0,200,168,.1)"/>
          <Stat dark label="Nurses" val={nurses.filter(n=>n.status==="active").length} sub={`${RAH_CENTRES.length} RAH centres`} icon="👩‍⚕️" bg="rgba(232,72,122,.1)"/>
          <Stat dark label="Record Requests" val={pendingRecordReqs.length} sub="Pending review" icon="📋" bg="rgba(240,160,32,.1)"/>
          <Stat dark label="AI Accuracy" val={`${latestAcc.toFixed(1)}%`} sub={`Stage ${ai.stage}`} icon="🧠" bg="rgba(0,255,136,.08)"/>
        </div>
        <div className="g2">
          {/* Record requests card */}
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px"}}>📋 Pending Record Requests</div>
              <Badge cls="ba">{pendingRecordReqs.length}</Badge>
            </div>
            {pendingRecordReqs.length===0&&<div style={{fontSize:12,color:T.txDim}}>No pending record requests.</div>}
            {pendingRecordReqs.slice(0,3).map(req=>(
              <div key={req.id} className="req-card req-card-pending">
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{fontSize:12,fontWeight:500,color:T.txBr}}>{req.patName}</div><Badge cls="ba">⏳ {req.method}</Badge></div>
                <div style={{fontSize:11,color:T.txDim,marginBottom:6}}>{req.reason}</div>
                <div style={{display:"flex",gap:6}}>
                  <button className="btn btn-g btn-xs" onClick={()=>approveRecordRequest(req,"Approved by Admin",req.method)}>✓ Approve</button>
                  <button className="btn btn-r btn-xs" onClick={()=>rejectRecordRequest(req,"Rejected by Admin")}>✗ Reject</button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost btn-xs" style={{width:"100%",marginTop:6}} onClick={()=>setView("record_requests")}>View All →</button>
          </div>
          {/* AI overview */}
          <div style={{background:"#040810",border:"1px solid rgba(0,255,136,.12)",borderRadius:12,padding:"1.25rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{fontFamily:T.serif,fontSize:"1rem",fontWeight:700,color:"#00FF88"}}>🧠 AI Engine</div><span style={{fontSize:11,color:T.teal,fontFamily:T.mono}}>Stage {ai.stage}</span></div>
            <div className="g2" style={{marginBottom:10}}>
              {[{l:"Accuracy",v:`${latestAcc.toFixed(1)}%`},{l:"Cycle Size",v:`${cfg.trainingCycleSize}`},{l:"AI Load",v:`${ai.stage===3?cfg.aiLoadPercent:0}%`},{l:"Shadow",v:`${ai.shadowStreak}/${cfg.shadowingThreshold}`}].map((s,i)=>(
                <div key={i} style={{textAlign:"center",padding:"7px",background:"rgba(255,255,255,.02)",borderRadius:7}}>
                  <div style={{fontSize:16,fontWeight:700,color:"#00FF88",fontFamily:T.mono}}>{s.v}</div>
                  <div style={{fontSize:9,color:T.txDim,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-ph btn-xs" style={{width:"100%"}} onClick={()=>setView("ai_config")}>🔧 Configure AI →</button>
          </div>
        </div>
        {/* RAH overview */}
        <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
          <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>RAH Centres</div>
          <div className="g4">
            {RAH_CENTRES.map(rah=>{
              const rahPats=patients.filter(p=>p.rahId===rah.id&&p.status!=="disconnected");
              const rahNurse=nurses.find(n=>n.rahIds.includes(rah.id)&&n.status==="active");
              return(<div key={rah.id} style={{background:T.b3,borderRadius:9,padding:"10px 12px",border:"1px solid rgba(255,255,255,.04)"}}>
                <div style={{fontSize:12,fontWeight:600,color:T.txBr,marginBottom:4}}>{rah.name}</div>
                <div style={{fontSize:10,color:T.txDim,marginBottom:6}}>{rah.region}, {rah.country}</div>
                <div style={{fontSize:11,color:T.teal,marginBottom:3}}>👥 {rahPats.length} patients</div>
                <div style={{fontSize:11,color:rahNurse?T.rose:T.txDim}}>👩‍⚕️ {rahNurse?.name||"No nurse assigned"}</div>
              </div>);
            })}
          </div>
        </div>
      </div>)}

      {/* CONNECTIONS (admin oversight of all nurse-approved connections) */}
      {view==="approvals"&&(<div className="fcol">
        <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr,marginBottom:".5rem"}}>Connection Oversight</div>
        <div className="al al-p">🔐 Connections are now approved by nurses at each RAH. Admin can override, revoke, or monitor all connections across the platform.</div>
        <div className="tw" style={{borderColor:T.bdr}}>
          <table>
            <thead><tr style={{borderColor:T.bdr}}>{["ID","Patient","Doctor","RAH","Status","Time","Approved By","Actions"].map(h=><th key={h} style={{color:T.txDim}}>{h}</th>)}</tr></thead>
            <tbody>
              {approvals.length===0&&<tr><td colSpan={8} style={{textAlign:"center",color:T.txDim,padding:"2rem"}}>No connection requests yet.</td></tr>}
              {approvals.map(req=>{
                const rah=RAH_CENTRES.find(r=>r.id===req.rahId);
                return(<tr key={req.id} style={{borderColor:"rgba(255,255,255,.04)"}}>
                  <td style={{fontFamily:T.mono,color:T.teal,fontSize:10}}>{req.id}</td>
                  <td style={{color:T.txBr,fontWeight:500}}>{req.patName}</td>
                  <td style={{color:T.tx,fontSize:11}}>{req.drName||"—"}</td>
                  <td style={{fontSize:10}}><span className="rah-badge" style={{fontSize:9}}>{rah?.name||req.rahId}</span></td>
                  <td><Badge cls={req.status==="nurse_approved"?"bg":req.status==="revoked"?"br":"ba"}>{req.status==="nurse_approved"?"✓ Active":req.status==="revoked"?"Revoked":"Pending"}</Badge></td>
                  <td style={{fontFamily:T.mono,fontSize:10,color:T.txDim}}>{req.at}</td>
                  <td style={{fontSize:11,color:T.txDim}}>{req.approvedBy||"—"}</td>
                  <td>{req.status==="nurse_approved"&&<button className="disc-btn" onClick={()=>setApprovals(prev=>prev.map(a=>a.id===req.id?{...a,status:"revoked_admin"}:a))}>Revoke</button>}</td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>)}

      {/* PATIENT DATABASE */}
      {view==="patients"&&(<div className="fcol">
        <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr,marginBottom:".5rem"}}>Patient Database</div>
        <div className="al al-r" style={{marginBottom:"1rem"}}>🔒 All patient EHR stored in central cloud. Access controlled by approval level. Nurses see RAH-scoped records; Doctors see approved-patient records only.</div>
        <div className="g2">
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…" style={{background:T.b3,border:"1px solid rgba(255,255,255,.07)",borderRadius:8,padding:"6px 10px",fontSize:12,color:T.txBr,outline:"none",flex:1}}/>
              <Badge cls="bt">{patients.length} total</Badge>
            </div>
            {patients.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||p.id.toLowerCase().includes(search.toLowerCase())).map(p=>{
              const rah=RAH_CENTRES.find(r=>r.id===p.rahId);
              return(<div key={p.id} onClick={()=>setSelPat(p)} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",borderRadius:9,marginBottom:5,background:selPat?.id===p.id?"rgba(0,200,168,.05)":"rgba(255,255,255,.02)",border:`1px solid ${selPat?.id===p.id?"rgba(0,200,168,.2)":"rgba(255,255,255,.04)"}`,cursor:"pointer",opacity:p.status==="disconnected"?0.4:1}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{p.name.split(" ").map(n=>n[0]).join("")}</div>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:T.txBr}}>{p.name}</div><div style={{fontSize:10,color:T.txDim}}>{p.id} · {rah?.name} · {p.village}</div></div>
                <div style={{display:"flex",gap:5}}>
                  {p.status==="disconnected"?<Badge cls="br">Disconnected</Badge>:<Badge cls="bt">Active</Badge>}
                  <button className="btn btn-t btn-xs" onClick={e=>{e.stopPropagation();setVitalsModal(p);}}>🩺</button>
                  <button className="btn btn-p btn-xs" onClick={e=>{e.stopPropagation();setRefModal(p);}}>↗</button>
                  {p.status!=="disconnected"&&<button className="disc-btn" onClick={e=>{e.stopPropagation();setDiscModal({type:"patient",item:p});}}>Disconnect</button>}
                </div>
              </div>);
            })}
          </div>
          {selPat?(<div className="fcol">
            <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"1rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div><div style={{fontFamily:T.serif,fontSize:"1.1rem",fontWeight:700,color:T.txBr}}>{selPat.name}</div><div style={{fontSize:11,color:T.txDim}}>{selPat.fileNo} · {selPat.bloodType}</div></div><button className="btn btn-t btn-sm" onClick={()=>setVitalsModal(selPat)}>🩺 Update Vitals</button></div>
              <div className="g4" style={{marginBottom:10}}><VBox dark label="BP" val={selPat.bp} status={parseFloat(selPat.bp)>=140?"warn":"ok"}/><VBox dark label="Temp" val={`${selPat.temp}°C`} status="ok"/><VBox dark label="Weight" val={`${selPat.weight}kg`} status="ok"/><VBox dark label="Wt Loss" val={`${selPat.wtLoss}%`} status={parseFloat(selPat.wtLoss)>5?"warn":"ok"}/></div>
              {selPat.allergy!=="None"&&<div className="al al-a" style={{fontSize:11,marginBottom:6}}>⚠ Allergy: {selPat.allergy}</div>}
              <div style={{fontSize:12,color:T.tx}}>{selPat.complaint}</div>
            </div>
            <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"1rem"}}>
              <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:8}}>Cloud EHR — Full History</div>
              <TL records={ehrRecords[selPat.id]||[]} dark/>
            </div>
          </div>):(<div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"2.5rem",textAlign:"center"}}><div style={{fontSize:13,color:T.txDim}}>Select a patient to view their full cloud EHR</div></div>)}
        </div>
      </div>)}

      {/* RECORD VITALS */}
      {view==="vitals"&&(<div className="fcol">
        <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr}}>Record Patient Vitals</div>
        <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
          <div className="fg" style={{marginBottom:14}}>
            <label className="flbl" style={{color:T.txDim}}>Select Patient</label>
            <select className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.08)",color:T.txBr}} onChange={e=>setVitalsModal(patients.find(p=>p.id===e.target.value))}>
              <option value="">Select patient…</option>{patients.filter(p=>p.status!=="disconnected").map(p=><option key={p.id} value={p.id}>{p.name} — {RAH_CENTRES.find(r=>r.id===p.rahId)?.name}</option>)}
            </select>
          </div>
          {vitalsModal&&<VitalsForm dark initial={{bp:vitalsModal.bp,temp:vitalsModal.temp,weight:vitalsModal.weight,height:vitalsModal.height,wtLoss:vitalsModal.wtLoss,complaint:vitalsModal.complaint,symptoms:vitalsModal.symptoms.join(", ")}} onSave={v=>saveVitals(vitalsModal.id,v)} onCancel={()=>setVitalsModal(null)}/>}
        </div>
      </div>)}

      {/* PERSONNEL MANAGEMENT */}
      {view==="personnel"&&(<div className="fcol">
        <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr,marginBottom:".5rem"}}>Personnel Management</div>
        <div className="al al-a">Use the Disconnect button to remove a doctor or nurse from the platform. Their records remain. Disconnected users cannot log in or manage patients.</div>
        <div className="g2">
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>Doctors</div>
            {doctors.map(d=>(
              <div key={d.id} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",borderRadius:9,marginBottom:5,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.04)",opacity:d.status==="disconnected"?0.4:1}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${T.teal},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{d.initials}</div>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:T.txBr}}>{d.name}</div><div style={{fontSize:10,color:T.txDim}}>{d.spec} · {d.loc}</div></div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {d.status==="disconnected"?<Badge cls="br">Disconnected</Badge>:<Badge cls="bg">Active</Badge>}
                  {d.status!=="disconnected"&&<button className="disc-btn" onClick={()=>setDiscModal({type:"doctor",item:d})}>Disconnect</button>}
                </div>
              </div>
            ))}
          </div>
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>Nurses</div>
            {nurses.map(n=>{
              const rahs=RAH_CENTRES.filter(r=>n.rahIds.includes(r.id));
              return(<div key={n.id} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",borderRadius:9,marginBottom:5,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.04)",opacity:n.status==="disconnected"?0.4:1}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${T.rose},${T.roseDk})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{n.initials}</div>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:T.txBr}}>{n.name}</div><div style={{fontSize:10,color:T.txDim}}>{rahs.map(r=>r.name).join(", ")}</div></div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {n.status==="disconnected"?<Badge cls="br">Disconnected</Badge>:<span className="rah-badge" style={{fontSize:9}}>Active</span>}
                  {n.status!=="disconnected"&&<button className="disc-btn" onClick={()=>setDiscModal({type:"nurse",item:n})}>Disconnect</button>}
                </div>
              </div>);
            })}
          </div>
        </div>
      </div>)}

      {/* MEDICAL RECORD REQUESTS */}
      {view==="record_requests"&&(<div className="fcol">
        <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr,marginBottom:".5rem"}}>Medical Record Requests</div>
        <div className="al al-p" style={{marginBottom:"1rem"}}>📋 Patients submit requests for copies of their medical records. Admin reviews each request and approves for printing or email delivery. All access is logged.</div>
        <div className="g2">
          <div className="fcol">
            {recordRequests.length===0&&<div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"2rem",textAlign:"center"}}><div style={{fontSize:13,color:T.txDim}}>No record requests yet.</div></div>}
            {recordRequests.map((req,i)=>(
              <div key={i} className={`req-card req-card-${req.status}`} style={{background:T.b2}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div><div style={{fontSize:13,fontWeight:500,color:T.txBr}}>{req.patName}</div><div style={{fontSize:10,color:T.txDim,fontFamily:T.mono}}>{req.id} · {RAH_CENTRES.find(r=>r.id===req.rahId)?.name}</div></div>
                  <Badge cls={req.status==="approved"?"bg":req.status==="rejected"?"br":"ba"}>{req.status==="approved"?"✓ Approved":req.status==="rejected"?"✗ Rejected":"⏳ Pending"}</Badge>
                </div>
                <div style={{fontSize:12,color:T.tx,marginBottom:4}}><strong>Reason:</strong> {req.reason}</div>
                <div style={{fontSize:11,color:T.txDim,marginBottom:8}}>Requested method: <strong>{req.method}</strong></div>
                {req.adminNote&&<div style={{fontSize:11,color:T.teal,marginBottom:6,fontStyle:"italic"}}>Admin note: {req.adminNote}</div>}
                {req.status==="pending"&&(
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button className="btn btn-g btn-xs" onClick={()=>approveRecordRequest(req,"Approved — records released",req.method)}>✓ Approve {req.method}</button>
                    {req.method!=="Both"&&<button className="btn btn-t btn-xs" onClick={()=>approveRecordRequest(req,"Approved — alternate method",req.method==="Print"?"Email":"Print")}>✓ Approve as {req.method==="Print"?"Email":"Print"}</button>}
                    <button className="btn btn-r btn-xs" onClick={()=>rejectRecordRequest(req,"Request rejected by Admin")}>✗ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>Access Policy</div>
            {[["Patient-initiated","Patient submits request with reason and preferred delivery method."],["Admin-reviewed","Admin verifies identity and clinical justification before approving."],["Approved — Print","A sealed physical copy is prepared at the RAH and handed to the patient."],["Approved — Email","A secure encrypted PDF is emailed to the requesting doctor or institution."],["All access logged","Every record access event is stored with timestamp, admin ID, and method."]].map(([title,desc],i)=>(
              <div key={i} style={{padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <div style={{fontSize:12,fontWeight:500,color:T.txBr,marginBottom:2}}>{title}</div>
                <div style={{fontSize:11,color:T.txDim,lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>)}

      {/* REFERRALS & TRANSFERS */}
      {view==="referrals"&&(<div className="fcol">
        <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr}}>Referrals & Patient Transfers</div>
        <div className="g2">
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>Initiate Transfer</div>
            <div className="fg"><label className="flbl" style={{color:T.txDim}}>Patient</label>
              <select className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.08)",color:T.txBr}} onChange={e=>setRefModal(patients.find(p=>p.name===e.target.value))}>
                <option>Select patient…</option>{patients.filter(p=>p.status!=="disconnected").map(p=><option key={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="fg"><label className="flbl" style={{color:T.txDim}}>Refer To</label>
              <select className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.08)",color:T.txBr}} value={refTarget} onChange={e=>setRefTarget(e.target.value)}>
                <option>Select doctor…</option>{doctors.filter(d=>d.status==="active").map(d=><option key={d.id}>{d.name} — {d.spec}</option>)}
              </select>
            </div>
            <div className="fg"><label className="flbl" style={{color:T.txDim}}>Clinical Reason</label>
              <textarea className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.08)",color:T.txBr,minHeight:70,resize:"vertical"}} value={refReason} onChange={e=>setRefReason(e.target.value)}/>
            </div>
            <button className="btn btn-p" style={{width:"100%"}} onClick={()=>refModal&&sendReferral()}>↗ Transfer Patient Files & Initiate Referral</button>
          </div>
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>Transfer Log</div>
            {referrals.length===0&&<div style={{fontSize:12,color:T.txDim}}>No transfers yet.</div>}
            {referrals.map((r,i)=>(<div key={i} style={{padding:"10px 12px",background:T.b3,border:"1px solid rgba(139,104,240,.12)",borderRadius:8,marginBottom:6}}>
              <div style={{fontSize:12,fontWeight:600,color:T.txBr,marginBottom:3}}>{r.patientName}</div>
              <div style={{fontSize:11,color:T.txDim}}>→ {r.toDoctor}</div>
              <div style={{fontSize:11,color:T.tx,marginTop:3}}>{r.reason}</div>
              <div style={{fontSize:10,color:T.txDim,marginTop:4,fontFamily:T.mono}}>{r.sentAt}</div>
            </div>))}
          </div>
        </div>
      </div>)}

      {/* REGISTRATIONS */}
      {view==="registrations"&&(<div className="fcol">
        <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr}}>Registration Approvals</div>
        <div className="g2">
          <div className="fcol">
            {["doctor","pharmacy","lab"].map(type=>{
              const typeRegs=regs.filter(r=>r.type===type);
              return(<div key={type} style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px"}}>{type==="doctor"?"🩺 Doctors":type==="pharmacy"?"💊 Pharmacies":"🔬 Labs"}</div>
                  {typeRegs.filter(r=>r.status==="pending").length>0&&<Badge cls="ba">{typeRegs.filter(r=>r.status==="pending").length} pending</Badge>}
                </div>
                {typeRegs.map(reg=>(
                  <div key={reg.id} onClick={()=>setSelReg(reg)} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 10px",borderRadius:8,marginBottom:3,background:selReg?.id===reg.id?"rgba(0,200,168,.04)":"rgba(255,255,255,.02)",border:`1px solid ${selReg?.id===reg.id?"rgba(0,200,168,.15)":"rgba(255,255,255,.03)"}`,cursor:"pointer"}}>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:T.txBr}}>{reg.name}</div><div style={{fontSize:10,color:T.txDim}}>{reg.id} · {reg.country} · {reg.submitted}</div></div>
                    <Badge cls={reg.status==="approved"?"bg":reg.status==="rejected"?"br":"ba"}>{reg.status==="approved"?"✓":reg.status==="rejected"?"✗":"⏳"} {reg.status}</Badge>
                  </div>
                ))}
              </div>);
            })}
          </div>
          {selReg&&(<div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem",height:"fit-content",position:"sticky",top:60}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div><div style={{fontSize:10,color:T.txDim,fontFamily:T.mono,marginBottom:2}}>{selReg.id}</div><div style={{fontSize:14,fontWeight:600,color:T.txBr}}>{selReg.name}</div></div><button onClick={()=>setSelReg(null)} style={{background:"transparent",border:"1px solid rgba(255,255,255,.08)",borderRadius:6,padding:"3px 8px",color:T.txDim,cursor:"pointer",fontSize:11}}>✕</button></div>
            {[["Email",selReg.email],["Country",selReg.country],...(selReg.type==="doctor"?[["Specialty",selReg.spec],["Council",selReg.council],["License",selReg.licNo]]:selReg.type==="pharmacy"?[["Owner",selReg.owner],["Reg. No",selReg.regNo],["City",selReg.city]]:selReg.type==="lab"?[["Director",selReg.director],["Accreditation",selReg.accreditation],["City",selReg.city]]:[])].filter(([,v])=>v).map(([l,v])=>(
              <div key={l} style={{padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}><div style={{fontSize:10,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".7px",marginBottom:1}}>{l}</div><div style={{fontSize:12,color:T.tx}}>{v}</div></div>
            ))}
            {selReg.status==="pending"&&(<>
              <div className="fg" style={{marginTop:10}}><label className="flbl" style={{color:T.txDim}}>Review Notes</label><textarea className="fi" style={{background:T.b3,border:"1px solid rgba(255,255,255,.07)",color:T.txBr,minHeight:60,resize:"vertical"}} value={regNotes} onChange={e=>setRegNotes(e.target.value)}/></div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn btn-g" style={{flex:1}} onClick={()=>{setRegs(prev=>prev.map(r=>r.id===selReg.id?{...r,status:"approved",reviewedAt:new Date().toISOString().slice(0,10),notes:regNotes||"Approved"}:r));setSelReg(null);setRegNotes("");}}>✓ Approve</button>
                <button className="btn btn-r" style={{flex:1}} onClick={()=>{setRegs(prev=>prev.map(r=>r.id===selReg.id?{...r,status:"rejected",reviewedAt:new Date().toISOString().slice(0,10),notes:regNotes||"Rejected"}:r));setSelReg(null);setRegNotes("");}}>✗ Reject</button>
              </div>
            </>)}
          </div>)}
        </div>
      </div>)}

      {/* AI ENGINE */}
      {view==="ai_engine"&&(<div className="fcol">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
          <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr}}>AI Engine — Live Monitor</div>
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            <span style={{fontSize:11,color:T.txDim,fontFamily:T.mono}}>Sim:</span>
            {[{l:"⏸",v:0},{l:"▶",v:1},{l:"▶▶",v:5},{l:"▶▶▶",v:15}].map(s=><button key={s.v} className={`btn btn-xs ${simSpeed===s.v?"btn-ph":"btn-ghost"}`} onClick={()=>onSimSpeed(s.v)}>{s.l}</button>)}
          </div>
        </div>
        <div style={{background:"#040810",border:"1px solid rgba(0,255,136,.12)",borderRadius:12,padding:"1.25rem"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 24px 1fr 24px 1fr",gap:0,alignItems:"center",marginBottom:14}}>
            {[{n:1,label:"Training",sub:`${cfg.trainingDurationMonths}mo · ${cfg.trainingCycleSize}-case batches`,color:"#00FF88"},{},{n:2,label:"Shadowing",sub:`${cfg.shadowingThreshold} consecutive perfect`,color:"#00C8F0"},{},{n:3,label:"Shared Load",sub:`AI ${cfg.aiLoadPercent}% / Dr ${100-cfg.aiLoadPercent}%`,color:"#8B68F0"}].map((item,idx)=>{
              if(!item.n)return<div key={idx} style={{textAlign:"center",color:"rgba(255,255,255,.12)",fontSize:12}}>▶</div>;
              const active=ai.stage===item.n,done=ai.stage>item.n;
              return(<div key={idx} style={{background:active?`${item.color}08`:"rgba(255,255,255,.02)",border:`1px solid ${active?item.color+"30":done?"rgba(255,255,255,.08)":"rgba(255,255,255,.04)"}`,borderRadius:9,padding:"12px 14px",textAlign:"center"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${item.color}12`,border:`1.5px solid ${done||active?item.color+"40":"rgba(255,255,255,.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",fontSize:11,fontWeight:800,color:done?item.color:active?item.color:T.txDim,fontFamily:T.mono}}>{done?"✓":item.n}</div>
                <div style={{fontSize:12,fontWeight:700,color:active?item.color:done?T.tx:T.txDim,fontFamily:T.serif}}>{item.label}</div>
                <div style={{fontSize:9,color:T.txDim,marginTop:3}}>{item.sub}</div>
                {active&&<div style={{marginTop:5,fontSize:9,color:item.color,fontFamily:T.mono}}>● ACTIVE</div>}
              </div>);
            })}
          </div>
          {ai.stage===1&&(<div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.txDim,marginBottom:5}}><span>Cycle {ai.cycles.length+1} · {ai.cycleProgress}/{cfg.trainingCycleSize} cases</span><span style={{color:"#00FF88",fontFamily:T.mono}}>Month {ai.monthsElapsed}/{cfg.trainingDurationMonths}</span></div><div className="bar-bg" style={{height:6}}><div className="bar-fill" style={{width:`${(ai.cycleProgress/cfg.trainingCycleSize)*100}%`,background:"linear-gradient(90deg,#00C866,#00FF88)"}}/></div></div>)}
          {ai.stage===2&&(<div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.txDim,marginBottom:5}}><span>Consecutive perfect: <strong style={{color:"#00C8F0"}}>{ai.shadowStreak}/{cfg.shadowingThreshold}</strong></span></div><div className="bar-bg" style={{height:6}}><div className="bar-fill" style={{width:`${(ai.shadowStreak/cfg.shadowingThreshold)*100}%`,background:"#00C8F0"}}/></div>
            {newCase&&(<div style={{marginTop:12,background:T.b3,border:"1px solid rgba(0,200,240,.18)",borderRadius:10,padding:"12px"}}>
              <div style={{fontSize:10,color:"#00C8F0",fontFamily:T.mono,marginBottom:6}}>SHADOW CASE</div>
              <div style={{fontSize:13,fontWeight:600,color:T.txBr,marginBottom:8}}>{newCase.aiDiagnosis} ({newCase.conf}%)</div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn btn-t" style={{flex:1}} onClick={()=>onShadowVerdict(newCase,"confirm")}>✓ Confirm</button>
                <button className="btn btn-r" style={{flex:1}} onClick={()=>onShadowVerdict(newCase,"override")}>✗ Override</button>
              </div>
            </div>)}
            {!newCase&&<button className="btn btn-ph btn-sm" style={{marginTop:10}} onClick={onGenCase}>Generate Case</button>}
          </div>)}
          {ai.stage===3&&(<div>
            <div style={{height:40,borderRadius:8,overflow:"hidden",display:"flex",marginBottom:10}}>
              <div style={{width:`${cfg.aiLoadPercent}%`,background:"rgba(139,104,240,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#8B68F0",fontFamily:T.mono}}>AI {cfg.aiLoadPercent}%</div>
              <div style={{flex:1,background:"rgba(0,200,240,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#00C8F0",fontFamily:T.mono}}>Dr {100-cfg.aiLoadPercent}%</div>
            </div>
          </div>)}
          <div style={{display:"flex",gap:8,marginTop:14}}>
            {ai.stage<3&&<button className="btn btn-ph btn-sm" onClick={()=>onForceStage(ai.stage+1)}>⏩ Skip to Stage {ai.stage+1}</button>}
            {ai.stage===3&&<button className="btn btn-ghost btn-sm" onClick={()=>onForceStage(1)}>↺ Reset</button>}
          </div>
        </div>
      </div>)}

      {/* AI CONFIG */}
      {view==="ai_config"&&(<div className="fcol">
        <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr}}>AI Engine Configuration</div>
        <div className="g2">
          <div style={{background:"#040810",border:"1px solid rgba(0,255,136,.12)",borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontFamily:T.serif,fontSize:"1rem",fontWeight:700,color:"#00FF88",marginBottom:4}}>🔧 Configure Parameters</div>
            <div style={{fontSize:11,color:T.txDim,marginBottom:14}}>Changes take effect from next training cycle.</div>
            {[{key:"trainingCycleSize",label:"Training Cycle Size",desc:"Cases per retraining batch",unit:"cases",min:20,max:500,step:10},{key:"trainingDurationMonths",label:"Training Duration",desc:"Total months before Shadowing",unit:"months",min:3,max:36,step:1},{key:"shadowingThreshold",label:"Shadowing Threshold",desc:"Consecutive perfect diagnoses to advance",unit:"diagnoses",min:10,max:500,step:10},{key:"aiLoadPercent",label:"AI Load Share (Stage 3)",desc:"% of cases handled autonomously by AI",unit:"%",min:5,max:75,step:5},{key:"reversionThreshold",label:"Reversion Threshold",desc:"Accuracy floor before reverting to Shadowing",unit:"%",min:60,max:99,step:1}].map(def=>(
              <div key={def.key} style={{padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                  <div><div style={{fontSize:12,color:T.txBr,fontWeight:500}}>{def.label}</div><div style={{fontSize:11,color:T.txDim,margin:"2px 0 6px"}}>{def.desc}</div></div>
                  <div style={{fontSize:16,fontWeight:700,fontFamily:T.mono,color:"#00FF88"}}>{cfgDraft[def.key]}{def.unit==="%"?"%":` ${def.unit}`}</div>
                </div>
                <input type="range" style={{WebkitAppearance:"none",width:"100%",height:5,borderRadius:3,outline:"none",cursor:"pointer",background:"rgba(255,255,255,.07)"}} min={def.min} max={def.max} step={def.step} value={cfgDraft[def.key]} onChange={e=>setCfgDraft(d=>({...d,[def.key]:Number(e.target.value)}))}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:T.txDim,fontFamily:T.mono,marginTop:2}}><span>{def.min}{def.unit==="%"?"%":""}</span><span>{def.max}{def.unit==="%"?"%":""}</span></div>
              </div>
            ))}
            <div style={{background:"rgba(0,255,136,.04)",border:"1px solid rgba(0,255,136,.12)",borderRadius:8,padding:"10px 12px",margin:"12px 0",fontSize:11,color:"#00C866"}}>
              Preview: Retrain every <strong>{cfgDraft.trainingCycleSize}</strong> cases for <strong>{cfgDraft.trainingDurationMonths}</strong>mo · Shadow: <strong>{cfgDraft.shadowingThreshold}</strong> perfect · Stage 3: AI <strong>{cfgDraft.aiLoadPercent}%</strong> / Dr <strong>{100-cfgDraft.aiLoadPercent}%</strong>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-ph" style={{flex:1}} onClick={()=>{onAiCfgChange(cfgDraft);showToast("✅ AI configuration applied");}}>Apply Configuration</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setCfgDraft({...cfg})}>Reset</button>
            </div>
          </div>
          <div style={{background:T.b2,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.txDim,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".3px",marginBottom:12}}>Active Configuration</div>
            {[["Training Cycle Size",`${cfg.trainingCycleSize} cases`,"🔄"],["Training Duration",`${cfg.trainingDurationMonths} months`,"📅"],["Shadowing Threshold",`${cfg.shadowingThreshold} consecutive`,"🎯"],["AI Load (Stage 3)",`${cfg.aiLoadPercent}% AI / ${100-cfg.aiLoadPercent}% Doctor`,"⚖️"],["Reversion Floor",`${cfg.reversionThreshold}% accuracy`,"⚠️"]].map(([l,v,ic],i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <span style={{fontSize:15}}>{ic}</span>
                <div><div style={{fontSize:11,color:T.txDim}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:T.ph,fontFamily:T.mono,marginTop:2}}>{v}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>)}

      {/* INTERACTIONS */}
      {view==="interactions"&&(<div className="fcol">
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:"1rem"}}>
          <div style={{fontFamily:T.serif,fontSize:"1.5rem",fontWeight:700,color:T.txBr}}>All Interactions</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…" style={{background:T.b3,border:"1px solid rgba(255,255,255,.07)",borderRadius:8,padding:"6px 12px",fontSize:12,color:T.txBr,outline:"none",marginLeft:"auto",width:220}}/>
        </div>
        <div className="tw" style={{borderColor:T.bdr}}>
          <table>
            <thead><tr style={{borderColor:T.bdr}}>{["ID","Patient","RAH","Doctor","Date","Dur.","Diagnosis","AI Match"].map(h=><th key={h} style={{color:T.txDim}}>{h}</th>)}</tr></thead>
            <tbody>
              {[{id:"INT-001",patient:"Amara Diallo",rahId:"RAH-TH",doctor:"Dr. Sarah Chen",date:"2025-05-12",dur:"24 min",dx:"URTI",aiMatch:true,aiConf:"94%"},{id:"INT-002",patient:"Ibrahim Koné",rahId:"RAH-SG",doctor:"Dr. Kwame Asante",date:"2025-05-12",dur:"36 min",dx:"Malaria + HTN",aiMatch:true,aiConf:"96%"},{id:"INT-003",patient:"Fatou Balde",rahId:"RAH-KN",doctor:"Dr. Sarah Chen",date:"2025-05-11",dur:"23 min",dx:"Iron Deficiency Anaemia",aiMatch:true,aiConf:"88%"},{id:"INT-004",patient:"Moussa Touré",rahId:"RAH-KK",doctor:"Dr. Priya Sharma",date:"2025-05-11",dur:"52 min",dx:"HTN III + CCF",aiMatch:false,aiConf:"74%"}].filter(r=>!search||r.patient.toLowerCase().includes(search.toLowerCase())).map((r,i)=>(
                <tr key={i} style={{borderColor:"rgba(255,255,255,.04)"}}>
                  <td style={{color:T.teal,fontFamily:T.mono,fontSize:10}}>{r.id}</td>
                  <td style={{color:T.txBr,fontWeight:500}}>{r.patient}</td>
                  <td><span className="rah-badge" style={{fontSize:9}}>{RAH_CENTRES.find(rah=>rah.id===r.rahId)?.name}</span></td>
                  <td style={{color:T.tx,fontSize:11}}>{r.doctor}</td>
                  <td style={{fontFamily:T.mono,fontSize:10}}>{r.date}</td>
                  <td><Badge cls="bt">{r.dur}</Badge></td>
                  <td style={{fontSize:11,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.dx}</td>
                  <td><Badge cls={r.aiMatch?"bg":"br"}>{r.aiMatch?`✓ ${r.aiConf}`:`✗ ${r.aiConf}`}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>)}
    </div>
  </div>);
}

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════════ */
export default function App(){
  const[mode,setMode]=useState("launcher");
const [adminUnlocked, setAdminUnlocked] = useState(false);
const [adminInput, setAdminInput] = useState("");

  /* ── SHARED STATE ──────────────────────────────────────────────────────────── */
  const[patients,setPatients]=useState([
    {id:"P-001",fileNo:"RAH-TH-2025-041",name:"Amara Diallo",age:34,gender:"F",village:"Thiès North",rahId:"RAH-TH",height:"162cm",weight:"62",bp:"118/78",temp:"36.7",wtLoss:"0",allergy:"None",bloodType:"O+",complaint:"Sore throat, runny nose and fatigue for 3 days",symptoms:["Sore throat","Runny nose","Fatigue","Mild headache"],color:T.teal,status:"active"},
    {id:"P-002",fileNo:"RAH-SG-2025-042",name:"Ibrahim Koné",age:52,gender:"M",village:"Ségou Central",rahId:"RAH-SG",height:"175cm",weight:"78",bp:"148/94",temp:"38.1",wtLoss:"8",allergy:"Penicillin",bloodType:"A+",complaint:"High fever for 4 days with chills and night sweats",symptoms:["High fever","Chills","Headache","Night sweats","Nausea"],color:T.amber,status:"active"},
    {id:"P-003",fileNo:"RAH-KN-2025-043",name:"Fatou Balde",age:28,gender:"F",village:"Kindia Est",rahId:"RAH-KN",height:"158cm",weight:"54",bp:"108/68",temp:"36.4",wtLoss:"3",allergy:"Sulfa drugs",bloodType:"B-",complaint:"Progressive tiredness and pallor for 2 weeks",symptoms:["Fatigue","Pallor","Dizziness","Palpitations","SOB"],color:T.purple,status:"active"},
    {id:"P-004",fileNo:"RAH-KK-2025-044",name:"Moussa Touré",age:67,gender:"M",village:"Kankan",rahId:"RAH-KK",height:"168cm",weight:"70",bp:"164/100",temp:"38.6",wtLoss:"12",allergy:"NSAIDs",bloodType:"AB+",complaint:"Chest tightness and swollen legs for 1 week",symptoms:["Chest tightness","Leg oedema","Dyspnoea","Orthopnoea"],color:T.red,status:"active"},
  ]);

  const[ehrRecords,setEhrRecords]=useState({
    "P-001":[{date:"2025-05-10",doctor:"Dr. Kwame Asante",dx:"URTI follow-up",rx:"Paracetamol 500mg QDS PRN",lab:"None",notes:"Improving."},{date:"2025-03-18",doctor:"Dr. Priya Sharma",dx:"Iron Deficiency Anaemia",rx:"Ferrous Sulphate 200mg TDS ×30d",lab:"FBC: Hb 10.2g/dL",notes:"Low haemoglobin."}],
    "P-002":[{date:"2025-04-20",doctor:"Dr. Kwame Asante",dx:"Hypertension Stage 1",rx:"Amlodipine 5mg OD",lab:"None",notes:"BP 142/90."},{date:"2024-12-10",doctor:"Dr. Priya Sharma",dx:"Malaria (uncomplicated)",rx:"Artemether-Lumefantrine BD ×3d",lab:"Malaria RDT+",notes:"Weight 80kg."}],
    "P-003":[{date:"2025-02-14",doctor:"Dr. Sarah Chen",dx:"Iron Deficiency Anaemia",rx:"Ferrous Sulphate 200mg BD ×30d",lab:"FBC: Hb 9.8g/dL",notes:"Ongoing supplementation."}],
    "P-004":[{date:"2025-04-05",doctor:"Dr. Priya Sharma",dx:"Hypertension Grade II",rx:"Amlodipine 10mg + Furosemide 40mg",lab:"FBC, LFT, ECG",notes:"BP 158/98."},{date:"2024-09-18",doctor:"Dr. Kwame Asante",dx:"Hypertension Grade I",rx:"Amlodipine 5mg OD",lab:"None",notes:"Initial diagnosis."}],
  });

  const[doctors,setDoctors]=useState([
    {id:"D-001",name:"Dr. Sarah Chen",spec:"General Physician",loc:"London, UK",initials:"SC",online:true,status:"active",rating:4.9},
    {id:"D-002",name:"Dr. Kwame Asante",spec:"Internal Medicine",loc:"Toronto, CA",initials:"KA",online:true,status:"active",rating:4.8},
    {id:"D-003",name:"Dr. Priya Sharma",spec:"Family Medicine",loc:"Mumbai, IN",initials:"PS",online:true,status:"active",rating:4.7},
  ]);

  const[nurses,setNurses]=useState([
    {id:"N-001",name:"Nurse Aminata Diop",initials:"AD",rahIds:["RAH-TH"],online:true,status:"active"},
    {id:"N-002",name:"Nurse Boubacar Traoré",initials:"BT",rahIds:["RAH-SG"],online:true,status:"active"},
    {id:"N-003",name:"Nurse Kadiatou Bah",initials:"KB",rahIds:["RAH-KN","RAH-KK"],online:true,status:"active"},
  ]);

  const[approvals,setApprovals]=useState([]);
  const[recordRequests,setRecordRequests]=useState([]);
  const[newRegs,setNewRegs]=useState([]);
  const[ai,setAi]=useState(INIT_AI);
  const[cfg,setCfg]=useState(DEFAULT_AI_CFG);
  const[simSpeed,setSimSpeed]=useState(0);
  const[newCase,setNewCase]=useState(null);
  const[caseCounter,setCaseCounter]=useState(5000);
  const[toast,setToast]=useState(null);
  const simRef=useRef({ai,cfg});
  const intervalRef=useRef(null);
  simRef.current={ai,cfg};

  const showGlobalToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),4000);};

  const onSaveConsultation=useCallback((patId,record)=>{
    setEhrRecords(prev=>({...prev,[patId]:[record,...(prev[patId]||[])]}));
    showGlobalToast("✅ Consultation saved to cloud EHR");
  },[]);

  const onRecordRequest=useCallback((req)=>{
    setRecordRequests(prev=>[{id:`RR-${Date.now().toString().slice(-4)}`,...req,status:"pending",submittedAt:new Date().toLocaleString()},...prev]);
  },[]);

  // AI simulation
  const genCaseFn=useCallback(()=>{
    const d=DISEASES[Math.floor(Math.random()*DISEASES.length)];
    const correct=Math.random()>0.07;
    const c={id:`CASE-${caseCounter}`,disease:d,aiDiagnosis:correct?d.full:DISEASES[(DISEASES.indexOf(d)+1)%DISEASES.length].full,correct,conf:Math.round((0.72+Math.random()*0.26)*100)};
    setCaseCounter(n=>n+1);
    return c;
  },[caseCounter]);

  const tick=useCallback(()=>{
    const{ai:a,cfg:c}=simRef.current;
    if(a.stage===1){const np=a.cycleProgress+1;if(np>=c.trainingCycleSize){const prev=a.cycles.length>0?a.cycles[a.cycles.length-1].accuracy:78;const nAcc=Math.min(99.5,prev+(Math.random()*2.8+0.4));const nc={cycle:a.cycles.length+1,month:`Month ${a.cycles.length+1}`,cases:c.trainingCycleSize,accuracy:parseFloat(nAcc.toFixed(1)),delta:parseFloat((nAcc-prev).toFixed(1))};const nm=a.monthsElapsed+1;setAi(prev=>({...prev,totalInteractions:prev.totalInteractions+1,cycles:[...prev.cycles,nc],cycleProgress:0,monthsElapsed:nm,stage:c.autoAdvance&&nm>=c.trainingDurationMonths?2:1}));}else{setAi(prev=>({...prev,totalInteractions:prev.totalInteractions+1,cycleProgress:np}));}}
    if(a.stage===2&&!newCase){setNewCase(genCaseFn());}
    if(a.stage===3){const c3=genCaseFn();const total=a.sharedTotal+1;const slot=total%10;const toAI=slot===1||slot===4||slot===7;setAi(prev=>toAI?{...prev,sharedTotal:total,aiCases:prev.aiCases+1,aiCorrect:prev.aiCorrect+(c3.correct?1:0),aiQueue:[{...c3,assignedTo:"AI"},...prev.aiQueue].slice(0,15)}:{...prev,sharedTotal:total,drCases:prev.drCases+1,drQueue:[{...c3,assignedTo:"Doctor"},...prev.drQueue].slice(0,15)});}
  },[genCaseFn,newCase]);

  useEffect(()=>{clearInterval(intervalRef.current);if(simSpeed>0)intervalRef.current=setInterval(tick,Math.max(180,1400/simSpeed));return()=>clearInterval(intervalRef.current);},[simSpeed,tick]);

  const onShadowVerdict=(caseData,verdict)=>{
    const ok=verdict==="confirm";const streak=ok?ai.shadowStreak+1:0;const advance=ok&&streak>=cfg.shadowingThreshold;
    setAi(prev=>({...prev,shadowDiagnoses:prev.shadowDiagnoses+1,shadowStreak:streak,shadowHistory:[{...caseData,correct:ok},...prev.shadowHistory].slice(0,50),stage:advance?3:2}));
    setNewCase(null);
    if(advance)showGlobalToast(`🚀 ${cfg.shadowingThreshold} consecutive perfect! → Shared Load (AI ${cfg.aiLoadPercent}%)`);
    else if(!ok)showGlobalToast("⚠ Override — streak reset to 0");
  };

  const onForceStage=s=>{
    setAi(prev=>({...prev,stage:s,...(s===1?{cycles:[],cycleProgress:0,monthsElapsed:0,shadowStreak:0,shadowDiagnoses:0,sharedTotal:0,aiCases:0,drCases:0,aiCorrect:0}:{}),...(s===2?{cycles:[...Array(cfg.trainingDurationMonths)].map((_,i)=>({cycle:i+1,month:`Month ${i+1}`,cases:cfg.trainingCycleSize,accuracy:parseFloat((78+i*2).toFixed(1)),delta:i===0?null:2.0})),cycleProgress:0,monthsElapsed:cfg.trainingDurationMonths,shadowStreak:0}:{}),...(s===3?{shadowStreak:cfg.shadowingThreshold,shadowDiagnoses:cfg.shadowingThreshold}:{})}));
    setNewCase(null);showGlobalToast(`⏩ Advanced to Stage ${s}`);
  };

  // Current nurse — Nurse Aminata Diop at RAH Thiès North
  const activeNurse=nurses[0];

  const swBtns=[{m:"launcher",l:"🏠"},{m:"patient",l:"🏥 Patient"},{m:"nurse",l:"👩‍⚕️ Nurse"},{m:"doctor",l:"👨‍⚕️ Doctor"},{m:"admin",l:"⚙️ Admin"},{m:"register",l:"📝 Register"}];
  const swColor={patient:T.teal,nurse:T.rose,doctor:T.amber,admin:T.purple,register:T.green};

  return(<>
    <style>{CSS}</style>
    {toast&&<div style={{position:"fixed",top:14,right:14,zIndex:999,background:T.b3,border:`1px solid ${T.bdrMd}`,borderRadius:10,padding:"10px 16px",fontSize:12,color:T.tx,animation:"fadeup .3s ease",maxWidth:360,lineHeight:1.5,boxShadow:"0 4px 20px rgba(0,0,0,.5)"}}>{toast}</div>}

    {mode==="launcher"&&(
      <div className="lnch" style={{position:"relative"}}>
        <div style={{textAlign:"center"}}>
          <img src="/logo.png" alt="remoteGP" style={{width:260,marginBottom:16,borderRadius:20,padding:16,background:"#ffffff"}}/>
          <div className="lnch-sub">Integrated eHealth Platform · AI-Powered Telemedicine</div>
        </div>
        <div className="lnch-grid">
          {[
            {m:"patient",icon:"🏥",label:"Patient App",desc:"Visit RAH, view vitals, connect to doctor, request records",color:T.teal},
            {m:"nurse",icon:"👩‍⚕️",label:"Nursing Station",desc:"RAH nurse manages patients, records vitals, approves doctor connections",color:T.rose},
            {m:"doctor",icon:"👨‍⚕️",label:"Doctor Portal",desc:"See nurse-approved patients, consult, prescribe, lab requests",color:T.amber},
            {m:"admin",icon:"⚙️",label:"Admin Dashboard",desc:"Full platform control — EHR, connections, personnel, AI, record requests",color:T.purple},
            {m:"register",icon:"📝",label:"Registration Portal",desc:"Doctors, nurses, pharmacies, labs apply to join the network",color:T.green},
          ].map(c=>(
            <div key={c.m} className="lnch-card" onClick={()=>setMode(c.m)}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=`${c.color}40`;e.currentTarget.style.boxShadow=`0 0 20px ${c.color}10`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.bdr;e.currentTarget.style.boxShadow="none";}}>
              <div className="lnch-ic" style={{background:`${c.color}12`}}><span style={{color:c.color,fontSize:24}}>{c.icon}</span></div>
              <div className="lnch-lbl">{c.label}</div>
              <div className="lnch-desc">{c.desc}</div>
            </div>
          ))}
        </div>

        {/* RAH centres strip */}
        <div style={{background:"rgba(232,72,122,0.05)",border:"1px solid rgba(232,72,122,0.15)",borderRadius:10,padding:"10px 18px",maxWidth:920,width:"100%",display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
          {RAH_CENTRES.map(r=>{
            const n=nurses.find(n=>n.rahIds.includes(r.id)&&n.status==="active");
            const p=patients.filter(pt=>pt.rahId===r.id&&pt.status!=="disconnected").length;
            return(<div key={r.id} style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:T.rose,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:".5px",marginBottom:2}}>{r.name}</div>
              <div style={{fontSize:11,color:T.txDim}}>👩‍⚕️ {n?.name||"Unassigned"} · 👥 {p} patients</div>
            </div>);
          })}
        </div>

        <div className="srv-row">
          {["Cloud EHR (centralised)","RAH Nursing Station","Approval Gateway","Patient Record Requests","AI Engine (configurable)","Pharmacy DB","Lab Network","Video Archive","Personnel Control"].map(s=><div key={s} className="srv-chip">{s}</div>)}
        </div>

        {/* Footer */}
        <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid rgba(0,200,168,0.1)",width:"100%",maxWidth:920,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:30,height:30,borderRadius:7,background:"rgba(0,200,168,0.1)",border:"1px solid rgba(0,200,168,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="7.5" stroke="#00C8A8" strokeWidth="1"/><text x="9" y="13" textAnchor="middle" style={{fontFamily:"'Syne',sans-serif",fontSize:"6px",fontWeight:800,fill:"#00C8A8"}}>CFS</text></svg>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:T.txBr,fontFamily:T.serif,letterSpacing:"-0.3px"}}>ClearFlow Systems</div>
              <div style={{fontSize:10,color:T.txDim,fontFamily:T.mono,letterSpacing:"0.8px",textTransform:"uppercase",marginTop:1}}>Healthcare Technology</div>
            </div>
          </div>
          <div style={{fontSize:11,color:T.txDim,fontFamily:T.mono,textAlign:"center"}}><span style={{color:T.teal}}>remoteGP</span> · Telemedicine · AI Diagnostics · EHR · Nursing</div>
          <div style={{fontSize:10,color:T.txDim,fontFamily:T.mono,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"3px 12px",letterSpacing:"0.8px"}}>v6.0 · {new Date().getFullYear()}</div>
        </div>
      </div>
    )}

    {mode==="patient"&&<PatientApp patients={patients} ehrRecords={ehrRecords} approvals={approvals} recordRequests={recordRequests} onRecordRequest={onRecordRequest}/>}
    {mode==="nurse"&&<NursingStation nurse={activeNurse} patients={patients} setPatients={setPatients} ehrRecords={ehrRecords} setEhrRecords={setEhrRecords} approvals={approvals} setApprovals={setApprovals} doctors={doctors}/>}
    {mode==="doctor"&&<DoctorPortal patients={patients} ehrRecords={ehrRecords} approvals={approvals} ai={ai} cfg={cfg} onSaveConsultation={onSaveConsultation}/>}
  {mode === "admin" && !adminUnlocked && (
  <div style={{minHeight:"100vh",background:"#04080F",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:"#0C1622",border:"1px solid rgba(0,200,168,0.18)",borderRadius:14,padding:"2rem",width:360,textAlign:"center"}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.5rem",fontWeight:700,color:"#E0EEF8",marginBottom:4}}>remote<span style={{color:"#00C8A8"}}>GP</span></div>
      <div style={{fontSize:12,color:"#486070",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:24}}>Admin Access</div>
      <input
        type="password"
        placeholder="Enter admin password"
        value={adminInput}
        onChange={e => setAdminInput(e.target.value)}
        onKeyDown={e => {
          if(e.key === "Enter"){
            if(adminInput === import.meta.env.VITE_ADMIN_PASSWORD){
              setAdminUnlocked(true);
            } else {
              alert("Incorrect password");
              setAdminInput("");
            }
          }
        }}
        style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#E0EEF8",outline:"none",marginBottom:12,fontFamily:"'DM Sans',sans-serif"}}
      />
      <button
        onClick={() => {
          if(adminInput === import.meta.env.VITE_ADMIN_PASSWORD){
            setAdminUnlocked(true);
          } else {
            alert("Incorrect password");
            setAdminInput("");
          }
        }}
        style={{width:"100%",background:"#00C8A8",color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
        Enter Dashboard
      </button>
      <div style={{marginTop:16}}>
        <button onClick={() => setMode("launcher")} style={{background:"transparent",border:"none",color:"#486070",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>← Back to launcher</button>
      </div>
    </div>
  </div>
)}
    {mode === "admin" && adminUnlocked && <AdminDashboard patients={patients} setPatients={setPatients} ehrRecords={ehrRecords} setEhrRecords={setEhrRecords} approvals={approvals} setApprovals={setApprovals} nurses={nurses} setNurses={setNurses} doctors={doctors} setDoctors={setDoctors} ai={ai} cfg={cfg} onAiCfgChange={setCfg} onForceStage={onForceStage} recordRequests={recordRequests} setRecordRequests={setRecordRequests} newRegs={newRegs} simSpeed={simSpeed} onSimSpeed={setSimSpeed} newCase={newCase} onShadowVerdict={onShadowVerdict} onGenCase={()=>setNewCase(genCaseFn())}/>}

    {mode==="register"&&(
      <div style={{minHeight:"100vh",background:T.p0,fontFamily:T.sans}}>
        <div style={{background:"#fff",borderBottom:`1px solid ${T.p2}`,padding:"0 1.5rem",height:52,display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontFamily:T.serif,fontSize:"1.15rem",fontWeight:800,color:T.pt}}>remote<span style={{color:T.teal}}>GP</span></div>
          <span style={{fontSize:10,fontFamily:T.mono,letterSpacing:"1.5px",background:T.tealLt,color:T.tealDk,padding:"2px 9px",borderRadius:20}}>REGISTRATION PORTAL</span>
        </div>
        <div style={{maxWidth:640,margin:"0 auto",padding:"2rem 1.5rem 5rem"}}>
          <div style={{textAlign:"center",marginBottom:"2rem"}}>
            <div style={{fontFamily:T.serif,fontSize:"2rem",fontWeight:700,color:T.pt,marginBottom:6}}>Join remoteGP</div>
            <div style={{fontSize:13,color:T.ptt}}>All registrations reviewed by Admin before access is granted.</div>
          </div>
          {[{t:"doctor",icon:"🩺",label:"Doctor / Physician"},{t:"nurse",icon:"👩‍⚕️",label:"Nurse / RAH Clinical Officer"},{t:"pharmacy",icon:"💊",label:"Pharmacy"},{t:"lab",icon:"🔬",label:"Medical Laboratory"}].map(({t,icon,label})=>(
            <div key={t} style={{background:"#fff",border:`1.5px solid ${T.p2}`,borderRadius:12,padding:"1.25rem",marginBottom:"1rem",cursor:"pointer",transition:"all .18s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.teal;e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.p2;e.currentTarget.style.transform="translateY(0)";}}
              onClick={()=>{const id=`${t.slice(0,2).toUpperCase()}-${Date.now().toString().slice(-4)}`;setNewRegs(prev=>[...prev,{id,name:`${label} Registration (Demo)`,type:t,status:"pending",submitted:new Date().toISOString().slice(0,10),email:`${t}${id}@example.com`,country:"Demo"}]);showGlobalToast(`✅ ${label} registration submitted — check Admin → Registrations`);}}>
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                <div style={{width:44,height:44,borderRadius:11,background:T.tealLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{icon}</div>
                <div style={{flex:1}}><div style={{fontFamily:T.serif,fontSize:"1.05rem",fontWeight:600,color:T.pt}}>Register as {label}</div><div style={{fontSize:12,color:T.ptt,marginTop:2}}>Submit application — reviewed by Admin</div></div>
                <div style={{color:T.teal,fontSize:18}}>→</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="swbar">
      {swBtns.map(b=>(
        <button key={b.m} className="swbtn" onClick={()=>setMode(b.m)}
          style={{color:mode===b.m?(b.m==="doctor"||b.m==="nurse"?T.b0:"#fff"):"rgba(255,255,255,.3)",background:mode===b.m?(swColor[b.m]||T.teal):"transparent"}}>
          {b.l}
        </button>
      ))}
    </div>
  </>);
}
