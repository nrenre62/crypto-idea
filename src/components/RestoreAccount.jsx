import { useApp } from "../hooks/app-context.js";
import { c } from "../utils/theme.js";
import { trashDaysLeft, TRASH_GRACE_DAYS } from "../utils/trash.js";

// Shown instead of the app when the signed-in user's account is soft-deleted (trashed).
// They can restore it within the grace window, or log out and let it be purged.
export function RestoreAccount() {
  const { user, restoreAccount, logout, acctBusy, acctMsg } = useApp();
  const daysLeft = trashDaysLeft(user?.deletedAt);
  const expired = daysLeft === 0;

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",padding:"24px 20px"}}>
      <div style={{background:c.card,borderRadius:18,padding:"24px 20px",border:"1px solid #E8E8ED",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🗑️</div>
        <div style={{fontSize:20,fontWeight:700,marginBottom:8}}>Your account is scheduled for deletion</div>
        {expired ? (
          <div style={{fontSize:13,color:c.dim,lineHeight:1.6,marginBottom:20}}>
            The {TRASH_GRACE_DAYS}-day window to restore this account has passed, so it can no longer
            be recovered. Log out and create a new account to start again.
          </div>
        ) : (
          <div style={{fontSize:13,color:c.dim,lineHeight:1.6,marginBottom:20}}>
            You deleted this account. We're keeping your data for <strong>{TRASH_GRACE_DAYS} days</strong> so
            you can change your mind — <strong>{daysLeft} day{daysLeft===1?"":"s"} left</strong> to restore it.
            After that it's permanently erased and <strong>lost forever</strong>.
          </div>
        )}

        {!expired && (
          <button onClick={restoreAccount} disabled={acctBusy} style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:c.ac,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:10}}>
            {acctBusy ? "…" : "Restore my account"}
          </button>
        )}
        <button onClick={logout} disabled={acctBusy} style={{width:"100%",padding:"12px",borderRadius:14,border:"1px solid #E8E8ED",background:"#fff",color:c.txt,fontSize:14,fontWeight:600,cursor:"pointer"}}>
          Log out
        </button>
        {acctMsg && <div style={{textAlign:"center",marginTop:12,fontSize:12,color:c.dim,fontWeight:600}}>{acctMsg}</div>}
      </div>
    </div>
  );
}
