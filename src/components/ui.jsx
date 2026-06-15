import { useState } from "react";
import { c } from "../utils/theme.js";

// Shared presentational UI primitives for the user app. No business logic; these
// only render. Moved verbatim out of CryptoIdea.jsx.

// Inline SVG icon set. `port`/`srch` are functions taking an `active` flag.
export const Ic={
    back:<svg width="22" height="22" fill="none" stroke={c.txt} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
    plus:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash:<svg width="14" height="14" fill="none" stroke={c.red} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    clock:<svg width="12" height="12" fill="none" stroke={c.dim} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    port:(a)=><svg width="21" height="21" fill="none" stroke={a?c.ac:c.dim} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    srch:(a)=><svg width="21" height="21" fill="none" stroke={a?c.ac:c.dim} strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  };

// Coin icon: shows the coin thumbnail, falling back to a colored monogram.
export const CI=({thumb,symbol,size=38})=>{const[e,setE]=useState(false);const colors={"BTC":"#F7931A","ETH":"#627EEA","BNB":"#F3BA2F","SOL":"#9945FF","XRP":"#23292F","ADA":"#0D1E30","DOGE":"#C2A633","USDT":"#26A17B","USDC":"#2775CA","DOT":"#E6007A","AVAX":"#E84142","LINK":"#2A5ADA","UNI":"#FF007A","MATIC":"#8247E5","SHIB":"#FFA409","LTC":"#BFBBBB","ATOM":"#2E3148","NEAR":"#00C08B","TRX":"#FF0013","FTM":"#1969FF","INJ":"#00F2FE","SUI":"#4DA2FF","ARB":"#28A0F0","OP":"#FF0420","AAVE":"#B6509E","MKR":"#1AAB9B","TAO":"#000","PEPE":"#479F51"};const bg=colors[symbol]||"#"+((symbol||"XX").charCodeAt(0)*123456).toString(16).slice(0,6);return(<div style={{width:size,height:size,borderRadius:size/2,background:thumb&&!e?c.inp:bg+"30",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.32,fontWeight:700,flexShrink:0,color:thumb&&!e?c.dim:bg,border:thumb&&!e?"none":`1.5px solid ${bg}30`}}>{thumb&&!e?<img src={thumb} alt="" style={{width:size,height:size}} onError={()=>setE(true)}/>:(symbol||"?").slice(0,2)}</div>)};

// Screen header row: (left, title, right) -> JSX.
export const hdr=(left,title,right)=>(<div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>{left}<span style={{fontSize:17,fontWeight:600}}>{title}</span>{right||<div style={{width:24}}/>}</div>);
