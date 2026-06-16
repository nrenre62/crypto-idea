// Pure formatting + small helper functions. No React, no I/O — same input
// always yields the same output, so these are trivially unit-testable.

// Price -> display string, with precision that grows as the price shrinks.
export function fmtP(p){if(p==null)return"—";if(p>=1)return"$"+p.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});if(p>=0.01)return"$"+p.toFixed(4);if(p>=0.0001)return"$"+p.toFixed(6);return"$"+p.toFixed(10)}

// Price -> a bare numeric string for a number INPUT (no "$", precision grows as
// the price shrinks). Empty string for a non-positive/missing price. Used to
// auto-fill the transaction price field. Shared by AddEntry + Detail.
export function fmtPriceInput(p){if(!p||p<=0)return"";if(p>=1)return p.toFixed(2);if(p>=0.0001)return p.toFixed(6);if(p>=0.0000001)return p.toFixed(10);return p.toFixed(12)}

// Market cap -> short string ($1.23T / $4.56B / $7.89M).
export function fmtMc(m){if(!m)return"—";if(m>=1e12)return"$"+(m/1e12).toFixed(2)+"T";if(m>=1e9)return"$"+(m/1e9).toFixed(2)+"B";if(m>=1e6)return"$"+(m/1e6).toFixed(2)+"M";return"$"+m.toLocaleString()}

// Percent change -> signed string (+1.23% / -4.56%).
export function fmtPct(v){if(v==null)return"—";return(v>=0?"+":"")+v.toFixed(2)+"%"}

// Short unique id for client-side rows (not security-sensitive).
export function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

// Date(-ish) -> "Mon D, YYYY HH:MM:SS".
export function fmtDT(d){if(!d)return"";const x=new Date(d);return x.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})+" "+x.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}

// Calendar gap between two dates -> {years, months, days, totalDays}.
export function timeBetween(s,e){const a=new Date(s),b=new Date(e);let y=b.getFullYear()-a.getFullYear(),m=b.getMonth()-a.getMonth(),d=b.getDate()-a.getDate();if(d<0){m--;d+=new Date(b.getFullYear(),b.getMonth(),0).getDate()}if(m<0){y--;m+=12}const td=Math.floor((b-a)/(864e5));return{years:y,months:m,days:d,totalDays:td}}
