import { useState, useEffect, useMemo } from "react";
import {
  Anchor, Ship, Phone, User, Clock, MapPin, Plus, X, Edit2, Trash2,
  CheckCircle2, Circle, Wallet, ChevronRight, Compass
} from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 10);

const emptyBoat = { name: "", pricePerHour: "", notes: "" };
const emptyRental = {
  boatId: "", renterName: "", renterPhone: "", captain: "",
  marina: "", startTime: "", endTime: "", included: "",
  totalPrice: "", amountPaid: "", status: "programada",
};

function fmtMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

function fmtDateHeader(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

function fmtTime(iso) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function dateKey(iso) {
  if (!iso) return "sin-fecha";
  return iso.slice(0, 10);
}

export default function App() {
  const [boats, setBoats] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");

  const [boatModal, setBoatModal] = useState(null); // {mode:'new'|'edit', data}
  const [rentalModal, setRentalModal] = useState(null);
  const [filter, setFilter] = useState("todas");

  useEffect(() => {
    (async () => {
      try {
        let b = [];
        let r = [];
        try {
          const res = await window.storage.get("boats", false);
          if (res && res.value) b = JSON.parse(res.value);
        } catch (e) { /* no boats yet */ }
        try {
          const res = await window.storage.get("rentals", false);
          if (res && res.value) r = JSON.parse(res.value);
        } catch (e) { /* no rentals yet */ }
        setBoats(b);
        setRentals(r);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(key, value, setter) {
    setter(value);
    try {
      const res = await window.storage.set(key, JSON.stringify(value), false);
      if (!res) setSaveError("No se pudo guardar el cambio. Intenta de nuevo.");
      else setSaveError("");
    } catch (e) {
      setSaveError("No se pudo guardar el cambio. Intenta de nuevo.");
    }
  }

  const saveBoats = (next) => persist("boats", next, setBoats);
  const saveRentals = (next) => persist("rentals", next, setRentals);

  // ---- Boats ----
  function openNewBoat() { setBoatModal({ mode: "new", data: { ...emptyBoat } }); }
  function openEditBoat(b) { setBoatModal({ mode: "edit", data: { ...b } }); }
  function submitBoat(data) {
    if (!data.name.trim()) return;
    if (boatModal.mode === "new") {
      saveBoats([...boats, { ...data, id: uid() }]);
    } else {
      saveBoats(boats.map((b) => (b.id === data.id ? data : b)));
    }
    setBoatModal(null);
  }
  function deleteBoat(id) {
    saveBoats(boats.filter((b) => b.id !== id));
  }

  // ---- Rentals ----
  function openNewRental(boatId) {
    setRentalModal({ mode: "new", data: { ...emptyRental, boatId: boatId || (boats[0] && boats[0].id) || "" } });
  }
  function openEditRental(r) { setRentalModal({ mode: "edit", data: { ...r } }); }
  function submitRental(data) {
    if (!data.boatId || !data.renterName.trim() || !data.startTime) return;
    if (rentalModal.mode === "new") {
      saveRentals([...rentals, { ...data, id: uid() }]);
    } else {
      saveRentals(rentals.map((r) => (r.id === data.id ? data : r)));
    }
    setRentalModal(null);
  }
  function deleteRental(id) {
    saveRentals(rentals.filter((r) => r.id !== id));
  }
  function finalizeRental(id) {
    saveRentals(rentals.map((r) => (r.id === id ? { ...r, status: "finalizada" } : r)));
  }
  function reopenRental(id) {
    saveRentals(rentals.map((r) => (r.id === id ? { ...r, status: "programada" } : r)));
  }
  function markPaid(id) {
    saveRentals(rentals.map((r) => (r.id === id ? { ...r, amountPaid: r.totalPrice } : r)));
  }

  const boatById = useMemo(() => Object.fromEntries(boats.map((b) => [b.id, b])), [boats]);

  const stats = useMemo(() => {
    const activas = rentals.filter((r) => r.status !== "finalizada").length;
    const pendiente = rentals.reduce((sum, r) => {
      const bal = (Number(r.totalPrice) || 0) - (Number(r.amountPaid) || 0);
      return sum + (bal > 0 ? bal : 0);
    }, 0);
    return { activas, pendiente, flota: boats.length };
  }, [rentals, boats]);

  const filteredRentals = useMemo(() => {
    let list = [...rentals];
    if (filter === "programadas") list = list.filter((r) => r.status !== "finalizada");
    if (filter === "finalizadas") list = list.filter((r) => r.status === "finalizada");
    if (filter === "saldo") list = list.filter((r) => (Number(r.totalPrice) || 0) - (Number(r.amountPaid) || 0) > 0);
    list.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    return list;
  }, [rentals, filter]);

  const grouped = useMemo(() => {
    const groups = {};
    filteredRentals.forEach((r) => {
      const k = dateKey(r.startTime);
      if (!groups[k]) groups[k] = [];
      groups[k].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRentals]);

  if (loading) {
    return (
      <div className="crb-root crb-loading">
        <Compass className="crb-spin" size={28} />
        <span>Cargando bitácora…</span>
        <Styles />
      </div>
    );
  }

  return (
    <div className="crb-root">
      <Styles />

      <header className="crb-header">
        <div className="crb-brand">
          <Anchor size={22} />
          <div>
            <h1>Bitácora de Rentas</h1>
            <p>Control de flota, reservas y cobros</p>
          </div>
        </div>
        <div className="crb-stats">
          <div className="crb-stat">
            <span className="crb-stat-num">{stats.flota}</span>
            <span className="crb-stat-label">Barcos en flota</span>
          </div>
          <div className="crb-stat">
            <span className="crb-stat-num">{stats.activas}</span>
            <span className="crb-stat-label">Rentas activas</span>
          </div>
          <div className="crb-stat crb-stat-warn">
            <span className="crb-stat-num">{fmtMoney(stats.pendiente)}</span>
            <span className="crb-stat-label">Saldo pendiente total</span>
          </div>
        </div>
      </header>

      {saveError && <div className="crb-error">{saveError}</div>}

      <div className="crb-body">
        <aside className="crb-fleet">
          <div className="crb-fleet-head">
            <h2><Ship size={16} /> Flota</h2>
            <button className="crb-icon-btn" onClick={openNewBoat} title="Agregar barco">
              <Plus size={16} />
            </button>
          </div>

          {boats.length === 0 && (
            <p className="crb-empty">Aún no agregas barcos. Empieza dando de alta el primero.</p>
          )}

          <div className="crb-boat-list">
            {boats.map((b) => (
              <div className="crb-boat-card" key={b.id}>
                <div className="crb-boat-main">
                  <strong>{b.name}</strong>
                  <span>{fmtMoney(b.pricePerHour)} / hora</span>
                  {b.notes && <p className="crb-boat-notes">{b.notes}</p>}
                </div>
                <div className="crb-boat-actions">
                  <button className="crb-icon-btn" onClick={() => openEditBoat(b)} title="Editar">
                    <Edit2 size={14} />
                  </button>
                  <button className="crb-icon-btn crb-icon-danger" onClick={() => deleteBoat(b.id)} title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
                <button className="crb-mini-cta" onClick={() => openNewRental(b.id)}>
                  Agendar renta <ChevronRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <main className="crb-log">
          <div className="crb-log-head">
            <div className="crb-filters">
              {[
                ["todas", "Todas"],
                ["programadas", "En curso"],
                ["finalizadas", "Finalizadas"],
                ["saldo", "Con saldo"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  className={"crb-filter" + (filter === k ? " crb-filter-on" : "")}
                  onClick={() => setFilter(k)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button className="crb-cta" onClick={() => openNewRental()} disabled={boats.length === 0}>
              <Plus size={16} /> Nueva renta
            </button>
          </div>

          {boats.length === 0 && (
            <p className="crb-empty crb-empty-pad">Agrega un barco a la flota antes de agendar una renta.</p>
          )}

          {boats.length > 0 && grouped.length === 0 && (
            <p className="crb-empty crb-empty-pad">No hay rentas en este filtro.</p>
          )}

          <div className="crb-groups">
            {grouped.map(([day, items]) => (
              <div className="crb-day-group" key={day}>
                <div className="crb-day-rule">
                  <span>{day === "sin-fecha" ? "Sin fecha" : fmtDateHeader(day)}</span>
                </div>
                {items.map((r) => {
                  const boat = boatById[r.boatId];
                  const balance = (Number(r.totalPrice) || 0) - (Number(r.amountPaid) || 0);
                  const finished = r.status === "finalizada";
                  return (
                    <div className={"crb-entry" + (finished ? " crb-entry-done" : "")} key={r.id}>
                      <div className="crb-entry-status">
                        {finished ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </div>
                      <div className="crb-entry-body">
                        <div className="crb-entry-top">
                          <strong>{boat ? boat.name : "Barco eliminado"}</strong>
                          <span className="crb-entry-time">
                            <Clock size={13} /> {fmtTime(r.startTime)} – {fmtTime(r.endTime)}
                          </span>
                        </div>
                        <div className="crb-entry-grid">
                          <span><User size={13} /> {r.renterName}</span>
                          <span><Phone size={13} /> {r.renterPhone || "—"}</span>
                          <span><Compass size={13} /> Capitán: {r.captain || "—"}</span>
                          <span><MapPin size={13} /> {r.marina || "—"}</span>
                        </div>
                        {r.included && <p className="crb-entry-included">Incluye: {r.included}</p>}
                        <div className="crb-entry-bottom">
                          <span className="crb-price">{fmtMoney(r.totalPrice)} total</span>
                          {balance > 0 ? (
                            <span className="crb-balance-due">
                              <Wallet size={13} /> Saldo: {fmtMoney(balance)}
                            </span>
                          ) : (
                            <span className="crb-balance-ok"><Wallet size={13} /> Pagado</span>
                          )}
                        </div>
                      </div>
                      <div className="crb-entry-actions">
                        {balance > 0 && (
                          <button className="crb-link-btn" onClick={() => markPaid(r.id)}>Marcar pagado</button>
                        )}
                        {!finished ? (
                          <button className="crb-link-btn crb-link-strong" onClick={() => finalizeRental(r.id)}>Finalizar renta</button>
                        ) : (
                          <button className="crb-link-btn" onClick={() => reopenRental(r.id)}>Reabrir</button>
                        )}
                        <button className="crb-icon-btn" onClick={() => openEditRental(r)} title="Editar"><Edit2 size={14} /></button>
                        <button className="crb-icon-btn crb-icon-danger" onClick={() => deleteRental(r.id)} title="Eliminar"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </main>
      </div>

      {boatModal && (
        <BoatModal
          mode={boatModal.mode}
          initial={boatModal.data}
          onCancel={() => setBoatModal(null)}
          onSubmit={submitBoat}
        />
      )}

      {rentalModal && (
        <RentalModal
          mode={rentalModal.mode}
          initial={rentalModal.data}
          boats={boats}
          onCancel={() => setRentalModal(null)}
          onSubmit={submitRental}
        />
      )}
    </div>
  );
}

function BoatModal({ mode, initial, onCancel, onSubmit }) {
  const [data, setData] = useState(initial);
  return (
    <div className="crb-overlay" onClick={onCancel}>
      <div className="crb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crb-modal-head">
          <h3>{mode === "new" ? "Agregar barco" : "Editar barco"}</h3>
          <button className="crb-icon-btn" onClick={onCancel}><X size={16} /></button>
        </div>
        <label>Nombre del barco
          <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Ej. Marlin Azul" />
        </label>
        <label>Precio por hora (MXN)
          <input type="number" min="0" value={data.pricePerHour} onChange={(e) => setData({ ...data, pricePerHour: e.target.value })} placeholder="0" />
        </label>
        <label>Notas (opcional)
          <textarea rows={2} value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} placeholder="Capacidad, características, etc." />
        </label>
        <div className="crb-modal-actions">
          <button className="crb-link-btn" onClick={onCancel}>Cancelar</button>
          <button className="crb-cta" onClick={() => onSubmit(data)} disabled={!data.name.trim()}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function RentalModal({ mode, initial, boats, onCancel, onSubmit }) {
  const [data, setData] = useState(initial);
  const set = (field) => (e) => setData({ ...data, [field]: e.target.value });
  return (
    <div className="crb-overlay" onClick={onCancel}>
      <div className="crb-modal crb-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="crb-modal-head">
          <h3>{mode === "new" ? "Nueva renta" : "Editar renta"}</h3>
          <button className="crb-icon-btn" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="crb-form-grid">
          <label>Barco
            <select value={data.boatId} onChange={set("boatId")}>
              {boats.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label>Marina de salida
            <input value={data.marina} onChange={set("marina")} placeholder="Ej. Marina Cabo San Lucas" />
          </label>
          <label>Nombre de quien renta
            <input value={data.renterName} onChange={set("renterName")} placeholder="Nombre completo" />
          </label>
          <label>Celular
            <input value={data.renterPhone} onChange={set("renterPhone")} placeholder="10 dígitos" />
          </label>
          <label>Capitán
            <input value={data.captain} onChange={set("captain")} placeholder="Nombre del capitán" />
          </label>
          <label>&nbsp;</label>
          <label>Inicio de la renta
            <input type="datetime-local" value={data.startTime} onChange={set("startTime")} />
          </label>
          <label>Fin de la renta
            <input type="datetime-local" value={data.endTime} onChange={set("endTime")} />
          </label>
          <label className="crb-span-2">Cosas incluidas
            <input value={data.included} onChange={set("included")} placeholder="Hielera, snorkel, música, bebidas…" />
          </label>
          <label>Precio total (MXN)
            <input type="number" min="0" value={data.totalPrice} onChange={set("totalPrice")} placeholder="0" />
          </label>
          <label>Anticipo / pagado (MXN)
            <input type="number" min="0" value={data.amountPaid} onChange={set("amountPaid")} placeholder="0" />
          </label>
        </div>
        <div className="crb-modal-actions">
          <button className="crb-link-btn" onClick={onCancel}>Cancelar</button>
          <button
            className="crb-cta"
            onClick={() => onSubmit(data)}
            disabled={!data.boatId || !data.renterName.trim() || !data.startTime}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

      .crb-root {
        --navy: #0E2233;
        --panel: #142C40;
        --panel-2: #17324A;
        --line: #2A4A5E;
        --ink: #EAF1F2;
        --ink-dim: #8FAAB8;
        --brass: #C99A4E;
        --brass-dim: #9C7A3E;
        --success: #5FA88A;
        --warn: #D97D4A;
        --danger: #C15C4E;
        background: var(--navy);
        color: var(--ink);
        font-family: 'Space Grotesk', sans-serif;
        min-height: 100%;
        padding: 28px;
        box-sizing: border-box;
      }
      .crb-root * { box-sizing: border-box; }

      .crb-loading {
        display: flex; align-items: center; justify-content: center; gap: 10px;
        min-height: 300px; color: var(--ink-dim);
      }
      .crb-spin { animation: crb-rotate 1.6s linear infinite; }
      @keyframes crb-rotate { to { transform: rotate(360deg); } }

      .crb-header {
        display: flex; flex-wrap: wrap; gap: 20px;
        justify-content: space-between; align-items: flex-end;
        border-bottom: 1px solid var(--line);
        padding-bottom: 20px; margin-bottom: 20px;
      }
      .crb-brand { display: flex; gap: 12px; align-items: center; color: var(--brass); }
      .crb-brand h1 {
        font-family: 'Fraunces', serif; font-weight: 600; font-size: 26px;
        color: var(--ink); margin: 0;
      }
      .crb-brand p { margin: 2px 0 0; color: var(--ink-dim); font-size: 13px; }

      .crb-stats { display: flex; gap: 24px; }
      .crb-stat { display: flex; flex-direction: column; align-items: flex-end; }
      .crb-stat-num { font-size: 20px; font-weight: 600; }
      .crb-stat-label { font-size: 11px; color: var(--ink-dim); }
      .crb-stat-warn .crb-stat-num { color: var(--warn); }

      .crb-error {
        background: rgba(193,92,78,0.15); border: 1px solid var(--danger);
        color: #F0B8AF; padding: 8px 14px; border-radius: 6px; font-size: 13px;
        margin-bottom: 16px;
      }

      .crb-body { display: grid; grid-template-columns: 260px 1fr; gap: 24px; }
      @media (max-width: 800px) { .crb-body { grid-template-columns: 1fr; } }

      .crb-fleet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .crb-fleet-head h2 {
        font-size: 13px; text-transform: none; letter-spacing: 0.02em;
        display: flex; gap: 6px; align-items: center; margin: 0; color: var(--ink-dim);
      }

      .crb-boat-list { display: flex; flex-direction: column; gap: 10px; }
      .crb-boat-card {
        background: var(--panel); border: 1px solid var(--line); border-radius: 8px;
        padding: 12px; position: relative;
      }
      .crb-boat-main strong { display: block; font-size: 14px; }
      .crb-boat-main span { color: var(--brass); font-size: 12px; }
      .crb-boat-notes { color: var(--ink-dim); font-size: 11px; margin: 4px 0 0; }
      .crb-boat-actions { position: absolute; top: 10px; right: 10px; display: flex; gap: 4px; }
      .crb-mini-cta {
        margin-top: 8px; background: none; border: none; color: var(--ink-dim);
        font-size: 12px; display: flex; align-items: center; gap: 2px; cursor: pointer;
        padding: 0; font-family: inherit;
      }
      .crb-mini-cta:hover { color: var(--brass); }

      .crb-empty { color: var(--ink-dim); font-size: 13px; line-height: 1.5; }
      .crb-empty-pad { padding: 24px 0; text-align: center; }

      .crb-log-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
      .crb-filters { display: flex; gap: 6px; }
      .crb-filter {
        background: none; border: 1px solid var(--line); color: var(--ink-dim);
        padding: 6px 12px; border-radius: 20px; font-size: 12px; cursor: pointer;
        font-family: inherit;
      }
      .crb-filter-on { background: var(--brass); border-color: var(--brass); color: #1A1204; font-weight: 600; }

      .crb-cta {
        background: var(--brass); color: #1A1204; border: none; border-radius: 6px;
        padding: 9px 16px; font-weight: 600; font-size: 13px; cursor: pointer;
        display: flex; align-items: center; gap: 6px; font-family: inherit;
      }
      .crb-cta:disabled { opacity: 0.4; cursor: not-allowed; }

      .crb-day-group { margin-bottom: 22px; }
      .crb-day-rule {
        display: flex; align-items: center; gap: 10px; color: var(--ink-dim);
        font-size: 12px; margin-bottom: 10px; text-transform: capitalize;
      }
      .crb-day-rule::after { content: ""; flex: 1; height: 1px; background: var(--line); }

      .crb-entry {
        display: grid; grid-template-columns: 24px 1fr auto; gap: 14px;
        background: var(--panel); border: 1px solid var(--line); border-radius: 8px;
        padding: 14px; margin-bottom: 10px; align-items: start;
      }
      .crb-entry-done { opacity: 0.6; }
      .crb-entry-status { color: var(--success); padding-top: 2px; }
      .crb-entry-done .crb-entry-status { color: var(--ink-dim); }

      .crb-entry-top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
      .crb-entry-top strong { font-size: 15px; }
      .crb-entry-time { color: var(--ink-dim); font-size: 12px; display: flex; align-items: center; gap: 4px; }

      .crb-entry-grid {
        display: grid; grid-template-columns: repeat(2, minmax(140px,1fr));
        gap: 4px 16px; margin-top: 8px; font-size: 12.5px; color: var(--ink-dim);
      }
      .crb-entry-grid span { display: flex; align-items: center; gap: 5px; }

      .crb-entry-included { font-size: 12px; color: var(--ink-dim); margin: 8px 0 0; font-style: italic; }

      .crb-entry-bottom { display: flex; gap: 16px; margin-top: 10px; align-items: center; font-size: 13px; }
      .crb-price { font-weight: 600; }
      .crb-balance-due { color: var(--warn); display: flex; align-items: center; gap: 4px; font-weight: 600; }
      .crb-balance-ok { color: var(--success); display: flex; align-items: center; gap: 4px; }

      .crb-entry-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
      .crb-link-btn {
        background: none; border: none; color: var(--ink-dim); font-size: 12px;
        cursor: pointer; padding: 2px 0; font-family: inherit; text-align: right;
      }
      .crb-link-btn:hover { color: var(--ink); }
      .crb-link-strong { color: var(--brass); font-weight: 600; }

      .crb-icon-btn {
        background: none; border: 1px solid var(--line); color: var(--ink-dim);
        border-radius: 5px; padding: 5px; cursor: pointer; display: inline-flex;
      }
      .crb-icon-btn:hover { color: var(--ink); border-color: var(--ink-dim); }
      .crb-icon-danger:hover { color: var(--danger); border-color: var(--danger); }

      .crb-overlay {
        position: fixed; inset: 0; background: rgba(4,12,20,0.65);
        display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px;
      }
      .crb-modal {
        background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px;
        padding: 22px; width: 100%; max-width: 380px; max-height: 90vh; overflow-y: auto;
      }
      .crb-modal-wide { max-width: 560px; }
      .crb-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .crb-modal-head h3 { font-family: 'Fraunces', serif; margin: 0; font-weight: 600; font-size: 18px; }

      .crb-modal label {
        display: block; font-size: 12px; color: var(--ink-dim); margin-bottom: 12px;
      }
      .crb-modal input, .crb-modal select, .crb-modal textarea {
        display: block; width: 100%; margin-top: 5px; background: var(--navy);
        border: 1px solid var(--line); color: var(--ink); border-radius: 5px;
        padding: 8px 10px; font-family: inherit; font-size: 13px;
      }
      .crb-modal input:focus, .crb-modal select:focus, .crb-modal textarea:focus {
        outline: 2px solid var(--brass); outline-offset: 1px;
      }

      .crb-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
      @media (max-width: 500px) { .crb-form-grid { grid-template-columns: 1fr; } }
      .crb-span-2 { grid-column: 1 / -1; }

      .crb-modal-actions { display: flex; justify-content: flex-end; gap: 14px; margin-top: 8px; align-items: center; }
    `}</style>
  );
}
