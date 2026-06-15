import { useApp } from "../hooks/app-context.js";
import { c, inp_s, sb } from "../utils/theme.js";
import { fmtP } from "../utils/format.js";
import { Ic, CI, hdr } from "./ui.jsx";

// Add-coin search screen. Live search results, the active portfolio, and the
// addCoin handler come from context.
export function Search() {
  const { sq, setSq, searchResults, portfolio, addCoin, setScreen } = useApp();
  return (<>
    {hdr(<button onClick={()=>{setScreen("portfolio");setSq("")}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>,"Add Coin")}
    <div style={{padding:"6px 18px 10px"}}><input type="text" value={sq} onChange={e=>setSq(e.target.value)} placeholder="Search coins... (Bitcoin, ETH, SOL...)" style={inp_s} autoFocus/></div>
    {searchResults.length>0?searchResults.map(coin=>{const ad=portfolio.find(x=>x.id===coin.id);return(<div key={coin.id} style={{display:"flex",alignItems:"center",padding:"10px 18px",gap:11,opacity:ad?0.4:1}}><CI thumb={coin.thumb} symbol={coin.symbol} size={36}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{coin.name}</div><div style={{fontSize:11,color:c.dim}}>{coin.symbol}{coin.rank?" · #"+coin.rank:""}</div></div>{coin.mockPrice!=null&&<span style={{fontSize:12,fontWeight:600,marginRight:6}}>{fmtP(coin.mockPrice)}</span>}<button onClick={()=>!ad&&addCoin(coin)} disabled={ad} style={sb(ad?c.inp:c.ac,ad?c.dim:c.bg)}>{ad?"Added":"+ Add"}</button></div>)}):sq.length>=1?(<div style={{textAlign:"center",padding:"36px",color:c.dim,fontSize:13}}>No results for "{sq}"</div>):(<div style={{textAlign:"center",padding:"44px 36px",color:c.dim}}><div style={{fontSize:38,marginBottom:10}}>🔍</div><div style={{fontSize:14,fontWeight:500,color:c.txt,marginBottom:5}}>Search any coin</div><div style={{fontSize:12,lineHeight:1.5}}>Type to find any coin, live</div></div>)}
  </>);
}
