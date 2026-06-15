import { useApp } from "../hooks/app-context.js";
import { c } from "../utils/theme.js";
import { Ic, hdr } from "./ui.jsx";

// Premium-inquiry screen. State (contactMsg/contactSent, user) comes from context.
export function Contact() {
  const { contactMsg, setContactMsg, contactSent, setContactSent, user, setScreen } = useApp();
  if (contactSent) return (<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"80vh",justifyContent:"center"}}>
    <div style={{width:56,height:56,borderRadius:28,background:c.acd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:20}}>✓</div>
    <div style={{fontSize:22,fontWeight:700,marginBottom:8,textAlign:"center"}}>Message sent</div>
    <div style={{fontSize:14,color:c.dim,textAlign:"center",lineHeight:1.55,maxWidth:300,marginBottom:32}}>We'll review your account needs and get back to you within 24 hours.</div>
    <button onClick={()=>{setContactSent(false);setScreen("portfolio")}} style={{padding:"14px 36px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Back to Portfolio</button>
  </div>);
  return (<div>
    {hdr(<button onClick={()=>setScreen("portfolio")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>,"Premium Plan",null)}
    <div style={{padding:"20px 18px"}}>
      <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>Need higher limits?</div>
      <div style={{fontSize:13,color:c.dim,lineHeight:1.6,marginBottom:20}}>Tell us what you need and we'll create a custom Premium plan for your account. Higher portfolios, more coins, more transactions — tailored to you.</div>
      <div style={{fontSize:12,fontWeight:600,color:c.dim,marginBottom:6}}>Your message</div>
      <textarea value={contactMsg} onChange={e=>setContactMsg(e.target.value)} placeholder={"I need more portfolios / coins / transactions..."} style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid #E8E8ED",fontSize:14,outline:"none",resize:"vertical",minHeight:100,fontFamily:"inherit",boxSizing:"border-box"}}/>
      <div style={{fontSize:11,color:c.dim,marginTop:6,marginBottom:16}}>Account: {user?.email}</div>
      <button onClick={()=>{if(contactMsg.trim())setContactSent(true)}} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Send Request</button>
    </div>
  </div>);
}
