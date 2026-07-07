import { useState } from "react";
import { useApp } from "../hooks/app-context.js";
import { Modal } from "./Modal.jsx";
import { Ic } from "./ui.jsx";

// Horizontal portfolio switcher, shown only when there's more than one portfolio
// (or the user is Pro). Reads the portfolio list + active id from context.
// Styled with the .ci-app design system (dark-safe pills) and placed directly
// under the header, above the value card (see Portfolio.jsx).
//
// R9-3: the "+" pill opens a centered "New portfolio" dialog (an additive fast path
// for Pro/Premium — it only shows below the plan cap) instead of jumping to Settings.
// Save reuses the existing addPortfolio handler (name validation + plan-limit toast
// already wired); Account → Portfolios management is unchanged.
export function PortfolioBar() {
  const { portfolios, isPro, setActivePortId, activePortId, maxPortfolios,
    newPortName, setNewPortName, addPortfolio, startRename } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  if (!(portfolios.length > 1 || isPro)) return null;

  const openAdd = () => { setNewPortName(""); setShowAdd(true); };
  const closeAdd = () => { setNewPortName(""); setShowAdd(false); };
  const save = async () => { if (await addPortfolio()) closeAdd(); };

  return (
    <>
      <div className="port-pills">
        {portfolios.map((p) => (
          <button key={p.id} onClick={() => setActivePortId(p.id)} className={"port-pill" + (p.id === activePortId ? " active" : "")}>{p.name}</button>
        ))}
        {portfolios.length < maxPortfolios && <button onClick={openAdd} className="port-pill-add" aria-label="Add portfolio">+</button>}
        {/* R19-2: rename the ACTIVE portfolio via the shared dialog. */}
        <button onClick={() => startRename(activePortId)} className="port-pill-edit" aria-label="Rename active portfolio">{Ic.edit}</button>
      </div>

      {showAdd && (
        // R15-4: the shared Modal (a text-entry form → no scrim-tap-close, so a typed name isn't lost).
        <Modal title="New portfolio" onClose={closeAdd} size="sm" dismissOnScrim={false}>
          <input
            className="field-input" value={newPortName} autoFocus maxLength={50}
            onChange={(e) => setNewPortName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            placeholder="Portfolio name"
          />
          <button className="btn-primary" style={{ marginTop: 14 }} onClick={save}>Save</button>
        </Modal>
      )}
    </>
  );
}
