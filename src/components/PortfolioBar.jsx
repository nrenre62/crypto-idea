import { useApp } from "../hooks/app-context.js";
import { c } from "../utils/theme.js";

// Horizontal portfolio switcher, shown only when there's more than one portfolio
// (or the user is Pro). Reads the portfolio list + active id from context.
export function PortfolioBar() {
  const { portfolios, isPro, setActivePortId, activePortId, maxPortfolios, setScreen } = useApp();
  if(!(portfolios.length>1||isPro))return null;
  return (
    <div style={{padding:"6px 18px 2px",display:"flex",gap:6,overflowX:"auto"}}>
      {portfolios.map(p=>(
        <button key={p.id} onClick={()=>setActivePortId(p.id)} style={{padding:"6px 14px",borderRadius:20,border:p.id===activePortId?"1.5px solid "+c.ac:"1.5px solid #E8E8ED",background:p.id===activePortId?c.acd:"#fff",fontSize:11,fontWeight:600,color:p.id===activePortId?c.ac:c.dim,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{p.name}</button>
      ))}
      {portfolios.length<maxPortfolios&&<button onClick={()=>setScreen("account")} style={{padding:"6px 10px",borderRadius:20,border:"1.5px dashed #E8E8ED",background:"none",fontSize:11,color:c.dim,cursor:"pointer",flexShrink:0}}>+</button>}
    </div>
  );
}
