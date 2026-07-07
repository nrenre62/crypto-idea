import { useState } from "react";
import { c } from "../utils/theme.js";
import { THESIS_MAX } from "../utils/journal.js";

// Shared presentational UI primitives for the user app. No business logic; these
// only render. Moved verbatim out of CryptoIdea.jsx.

// DI-1: a live "1,980 / 2,000" character counter for the journal textareas. Renders
// only as you approach the cap (keeps the form quiet until it matters) and turns red
// AT the cap. Pairs with maxLength={THESIS_MAX} on the textarea (the hard stop).
export function CharCount({ value, max = THESIS_MAX }) {
  const n = (value || "").length;
  if (n < max - 100) return null;
  return (
    <div style={{ fontSize: 11, textAlign: "right", marginTop: 2, color: n >= max ? c.red : c.dim }}>
      {n.toLocaleString()} / {max.toLocaleString()}
    </div>
  );
}

// Inline SVG icon set. `port`/`srch` are functions taking an `active` flag.
export const Ic={
    back:<svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
    close:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>,
    plus:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash:<svg width="14" height="14" fill="none" stroke={c.red} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    clock:<svg width="12" height="12" fill="none" stroke={c.dim} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    port:(a)=><svg width="21" height="21" fill="none" stroke={a?c.ac:c.dim} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    srch:(a)=><svg width="21" height="21" fill="none" stroke={a?c.ac:c.dim} strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    rsch:(a)=><svg width="21" height="21" fill="none" stroke={a?c.ac:c.dim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>,
    eye:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    // Account drill-in row icons (stroke=currentColor → inherit the row text color, dark-safe).
    chevR:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
    user:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    card:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
    folder:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
    shield:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></svg>,
    bell:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
    palette:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/></svg>,
    lock:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="4.5" y="11" width="15" height="9.5" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>,
    edit:<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>,
  };

// Brand colors for the token monogram circles. ALL 6-digit hex so the "+30" alpha
// tint (background + border) is always valid. Keyed by uppercase symbol.
const COIN_COLORS={BTC:"#F7931A",ETH:"#627EEA",BNB:"#F3BA2F",SOL:"#9945FF",XRP:"#23292F",ADA:"#0D1E30",DOGE:"#C2A633",USDT:"#26A17B",USDC:"#2775CA",DOT:"#E6007A",AVAX:"#E84142",LINK:"#2A5ADA",UNI:"#FF007A",MATIC:"#8247E5",SHIB:"#FFA409",LTC:"#9F9F9F",ATOM:"#2E3148",NEAR:"#00C08B",TRX:"#E50914",FTM:"#1969FF",INJ:"#0AC2D6",SUI:"#4DA2FF",ARB:"#28A0F0",OP:"#FF0420",AAVE:"#B6509E",MKR:"#1AAB9B",TAO:"#1A1A1A",PEPE:"#479F51",XLM:"#1B1B1B",ETC:"#329C45",FIL:"#0090FF",HBAR:"#2A2A2A",VET:"#15BDFF",ALGO:"#1A1A1A",GRT:"#6F4CFF",RNDR:"#CF1E1E",IMX:"#0D9DE0",STX:"#5546FF"};
// Curated fallback palette for long-tail coins — picked deterministically by a hash
// of the FULL symbol, so a given coin always gets the same legible, distinct color
// (the old fallback hashed only the first letter and could yield broken/duplicate hex).
const COIN_FALLBACK=["#E8833A","#3F7DF0","#11B886","#8B5CF6","#E0467E","#0EA5A0","#D6A21E","#5B86C4","#C2553A","#7C6CF0","#2A9D8F","#C44569"];

// Pure, testable: symbol -> 6-digit brand/fallback hex (case-insensitive).
export function coinColor(symbol){
  const s=(symbol||"").toUpperCase();
  if(COIN_COLORS[s])return COIN_COLORS[s];
  let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;
  return COIN_FALLBACK[Math.abs(h)%COIN_FALLBACK.length];
}

// Coin icon: shows the coin thumbnail, falling back to a colored uppercase monogram.
// The monogram passes its brand color via the --ci custom property and styles itself
// through .ci-mono, so dark mode can lighten dark brand colors (ADA/XLM/TAO…) for
// contrast (see app.css). The thumbnail path stays inline.
export const CI=({thumb,symbol,size=38})=>{
  const[e,setE]=useState(false);
  const sym=(symbol||"").toUpperCase();
  const px={width:size,height:size,borderRadius:size/2,fontSize:Math.round(size*0.32)};
  if(thumb&&!e)return(<div style={{...px,background:c.inp,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><img src={thumb} alt="" style={{width:size,height:size}} onError={()=>setE(true)}/></div>);
  return(<div className="ci-mono" style={{...px,"--ci":coinColor(symbol)}}>{(sym||"?").slice(0,2)}</div>);
};

// Screen header row: (left, title, right) -> JSX.
export const hdr=(left,title,right)=>(<div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>{left}<span style={{fontSize:17,fontWeight:600}}>{title}</span>{right||<div style={{width:24}}/>}</div>);
