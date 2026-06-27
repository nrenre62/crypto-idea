import { useApp } from "../hooks/app-context.js";

// Horizontal portfolio switcher, shown only when there's more than one portfolio
// (or the user is Pro). Reads the portfolio list + active id from context.
// Styled with the .ci-app design system (dark-safe pills) and placed directly
// under the header, above the value card (see Portfolio.jsx).
export function PortfolioBar() {
  const { portfolios, isPro, setActivePortId, activePortId, maxPortfolios, setScreen } = useApp();
  if(!(portfolios.length>1||isPro))return null;
  return (
    <div className="port-pills">
      {portfolios.map(p=>(
        <button key={p.id} onClick={()=>setActivePortId(p.id)} className={"port-pill"+(p.id===activePortId?" active":"")}>{p.name}</button>
      ))}
      {portfolios.length<maxPortfolios&&<button onClick={()=>setScreen("account")} className="port-pill-add" aria-label="Add portfolio">+</button>}
    </div>
  );
}
