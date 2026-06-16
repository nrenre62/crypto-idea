import { useApp } from "../hooks/app-context.js";
import { c, inp_s } from "../utils/theme.js";

// Password reset screen — presentation only. State (fp* fields, resetSent) and
// the handleReset handler come from context (handler defined in CryptoIdea.jsx).
export function ForgotPass() {
  const { fpEmail, setFpEmail, fpErr, resetSent, setResetSent, setScreen, handleReset } = useApp();
  if (resetSent) return (<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
    <div style={{width:56,height:56,borderRadius:28,background:c.acd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:20}}>✓</div>
    <div style={{fontSize:22,fontWeight:700,marginBottom:8,textAlign:"center"}}>Check your email</div>
    <div style={{fontSize:14,color:c.dim,textAlign:"center",lineHeight:1.55,maxWidth:300,marginBottom:32}}>We've sent password reset instructions to <strong>{fpEmail}</strong></div>
    <button onClick={()=>{setResetSent(false);setScreen("login")}} style={{padding:"14px 36px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Back to Login</button>
  </div>);
  return (<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
    <div style={{fontSize:32,fontWeight:200,letterSpacing:"-1px",marginBottom:4}}>Crypto <span style={{fontWeight:700}}>Idea</span></div>
    <div style={{fontSize:13,color:c.dim,marginBottom:36}}>Reset your password</div>
    <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{fontSize:14,color:c.dim,lineHeight:1.5,textAlign:"center"}}>Enter your email and we'll send you a link to reset your password.</div>
      <input type="email" value={fpEmail} onChange={e=>setFpEmail(e.target.value)} placeholder="name@email.com" autoComplete="email" inputMode="email" style={inp_s}/>
      {fpErr&&<div style={{padding:"10px",background:"#FFF0F0",color:c.red,borderRadius:10,fontSize:12,textAlign:"center"}}>{fpErr}</div>}
      <button onClick={handleReset} style={{padding:"14px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Send Reset Link</button>
      <div style={{textAlign:"center",marginTop:4}}><span onClick={()=>setScreen("login")} style={{fontSize:12,color:c.ac,cursor:"pointer",fontWeight:500}}>Back to Login</span></div>
    </div>
  </div>);
}
