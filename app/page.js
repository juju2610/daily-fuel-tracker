"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { STATIONS, SHELL_CARDS, QUOTA_START_MONTH, SUBSIDY_GROUPS, currentMonthStr, computeSubsidySplits } from "../lib/fuelData";

export default function Page(){
  const [entries, setEntries] = useState([]);
  const [quotas, setQuotas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [inStation, setInStation] = useState(STATIONS[0]);
  const [inLorry, setInLorry] = useState("");
  const [inDate, setInDate] = useState("");
  const [inLitre, setInLitre] = useState("");

  const [fStation, setFStation] = useState("");
  const [fLorry, setFLorry] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const [mMonth, setMMonth] = useState(currentMonthStr());
  const [mLorry, setMLorry] = useState("");

  const [rDate, setRDate] = useState("");
  const [rMonth, setRMonth] = useState("");

  const [fuelPrice, setFuelPrice] = useState(null);
  const [fuelPriceError, setFuelPriceError] = useState("");
  const [fuelPriceLoading, setFuelPriceLoading] = useState(true);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch("/api/fuel-price")
      .then(res => res.json())
      .then(data => {
        if(data.error){ setFuelPriceError(data.message || "Could not load fuel prices."); }
        else { setFuelPrice(data); }
        setFuelPriceLoading(false);
      })
      .catch(() => { setFuelPriceError("Could not load fuel prices."); setFuelPriceLoading(false); });
  }, []);

  async function loadAll(){
    setLoading(true);
    setError("");
    const [entriesRes, quotasRes] = await Promise.all([
      supabase.from("entries").select("id,station,lorry,date,litre").order("date", { ascending: false }),
      supabase.from("quotas").select("group_id,quota"),
    ]);
    if(entriesRes.error){ setError(entriesRes.error.message); setLoading(false); return; }
    if(quotasRes.error){ setError(quotasRes.error.message); setLoading(false); return; }
    setEntries(entriesRes.data.map(e => ({ ...e, litre: Number(e.litre) })));
    const qMap = {};
    quotasRes.data.forEach(q => { qMap[q.group_id] = Number(q.quota); });
    setQuotas(qMap);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const allLorries = useMemo(() => Array.from(new Set(entries.map(e => e.lorry))).sort(), [entries]);

  async function addEntry(){
    const lorry = inLorry.trim();
    const litre = parseFloat(inLitre);
    if(!lorry){ alert("Please enter the lorry number."); return; }
    if(!inDate){ alert("Please select a date."); return; }
    if(!litre || litre <= 0){ alert("Please enter a valid litre amount."); return; }

    setBusy(true);
    const { error: insErr } = await supabase.from("entries").insert({ station: inStation, lorry, date: inDate, litre });
    setBusy(false);
    if(insErr){ alert("Could not save entry: " + insErr.message); return; }

    setInLorry("");
    setInLitre("");
    loadAll();
  }

  async function deleteEntry(id){
    setBusy(true);
    const { error: delErr } = await supabase.from("entries").delete().eq("id", id);
    setBusy(false);
    if(delErr){ alert("Could not delete entry: " + delErr.message); return; }
    loadAll();
  }

  async function clearAllData(){
    if(entries.length === 0) return;
    if(!confirm("Delete all fuel log entries? This cannot be undone.")) return;
    setBusy(true);
    const { error: delErr } = await supabase.from("entries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setBusy(false);
    if(delErr){ alert("Could not clear entries: " + delErr.message); return; }
    loadAll();
  }

  function clearFilters(){
    setFStation(""); setFLorry(""); setFFrom(""); setFTo("");
  }

  function clearRecordQuickFilter(){
    setRDate(""); setRMonth("");
  }

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if(fStation && e.station !== fStation) return false;
      if(fLorry && e.lorry !== fLorry) return false;
      if(fFrom && e.date < fFrom) return false;
      if(fTo && e.date > fTo) return false;
      if(rDate && e.date !== rDate) return false;
      if(rMonth && e.date.slice(0,7) !== rMonth) return false;
      return true;
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [entries, fStation, fLorry, fFrom, fTo, rDate, rMonth]);

  const splits = useMemo(() => computeSubsidySplits(entries, quotas), [entries, quotas]);

  const totals = useMemo(() => {
    let sumLitre = 0, sumSubsidy = 0, sumExtra = 0;
    filtered.forEach(e => {
      const sp = splits[e.id] || { subsidyUsage: 0, extraUsage: e.litre };
      sumLitre += e.litre; sumSubsidy += sp.subsidyUsage; sumExtra += sp.extraUsage;
    });
    return { sumLitre, sumSubsidy, sumExtra };
  }, [filtered, splits]);

  const summary = useMemo(() => {
    const total = filtered.reduce((s,e) => s + e.litre, 0);
    const count = filtered.length;
    const avg = count ? total / count : 0;
    const lorrySet = new Set(filtered.map(e => e.lorry));
    return { total, count, avg, lorryCount: lorrySet.size };
  }, [filtered]);

  function breakdown(key){
    const map = {};
    filtered.forEach(e => { map[e[key]] = (map[e[key]] || 0) + e.litre; });
    const rows = Object.entries(map).sort((a,b) => b[1]-a[1]);
    const maxVal = rows.length ? rows[0][1] : 0;
    return { rows, maxVal };
  }
  const byStation = useMemo(() => breakdown("station"), [filtered]);
  const byLorry = useMemo(() => breakdown("lorry"), [filtered]);

  const monthData = useMemo(() => {
    const inMonth = entries.filter(e => e.date.slice(0,7) === mMonth && (!mLorry || e.lorry === mLorry));
    const byDay = {};
    inMonth.forEach(e => { byDay[e.date] = (byDay[e.date] || 0) + e.litre; });
    const days = Object.keys(byDay).sort();
    const monthTotal = inMonth.reduce((s,e) => s + e.litre, 0);
    return { inMonth, byDay, days, monthTotal };
  }, [entries, mMonth, mLorry]);

  const subsidyData = useMemo(() => {
    const monthEntries = entries.filter(e => e.date.slice(0,7) === mMonth);
    return SUBSIDY_GROUPS.map(g => {
      const quota = quotas[g.id] || 0;
      const used = monthEntries.filter(e => g.stations.includes(e.station)).reduce((s,e) => s + e.litre, 0);
      return { id: g.id, station: g.label, type: g.type, quota, used, balance: quota - used };
    });
  }, [entries, quotas, mMonth]);

  const subsidyTotals = useMemo(() => {
    const totalQuota = subsidyData.reduce((s,r)=>s+r.quota,0);
    const totalUsed = subsidyData.reduce((s,r)=>s+r.used,0);
    return { totalQuota, totalUsed };
  }, [subsidyData]);

  async function setQuota(groupId, value){
    const v = parseFloat(value);
    const quota = (isNaN(v) || v < 0) ? 0 : v;
    setQuotas(prev => ({ ...prev, [groupId]: quota }));
    const { error: upErr } = await supabase.from("quotas").upsert({ group_id: groupId, quota, updated_at: new Date().toISOString() });
    if(upErr){ alert("Could not save quota: " + upErr.message); loadAll(); }
  }

  const scopeParts = [];
  if(fStation) scopeParts.push(fStation);
  if(fLorry) scopeParts.push(fLorry);
  if(fFrom || fTo) scopeParts.push(`${fFrom||"…"} → ${fTo||"…"}`);
  const summaryScope = scopeParts.length ? "— " + scopeParts.join(" · ") : "— all records";

  const beforeStart = mMonth < QUOTA_START_MONTH;

  function exportCSV(){
    if(filtered.length === 0){ alert("No records to export."); return; }
    const header = "Date,No Lorry,Station,Litre,Subsidy Usage,Extra Usage After Subsidy";
    const rows = filtered.map(e => {
      const sp = splits[e.id] || { subsidyUsage: 0, extraUsage: e.litre };
      return [e.date, e.lorry, e.station, e.litre.toFixed(2), sp.subsidyUsage.toFixed(2), sp.extraUsage.toFixed(2)]
        .map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuel-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportExcel(){
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const recordsAoa = [["Date","No Lorry","Station","Litre","Subsidy Usage","Extra Usage After Subsidy"]];
    filtered.forEach(e => {
      const sp = splits[e.id] || { subsidyUsage: 0, extraUsage: e.litre };
      recordsAoa.push([e.date, e.lorry, e.station, Number(e.litre.toFixed(2)), Number(sp.subsidyUsage.toFixed(2)), Number(sp.extraUsage.toFixed(2))]);
    });
    recordsAoa.push([]);
    recordsAoa.push(["TOTAL","","", Number(totals.sumLitre.toFixed(2)), Number(totals.sumSubsidy.toFixed(2)), Number(totals.sumExtra.toFixed(2))]);
    const wsRecords = XLSX.utils.aoa_to_sheet(recordsAoa);
    wsRecords["!cols"] = [{wch:12},{wch:14},{wch:16},{wch:10},{wch:14},{wch:22}];
    XLSX.utils.book_append_sheet(wb, wsRecords, "Records");

    const dailyAoa = [["Date","Litre Used"]];
    monthData.days.forEach(d => dailyAoa.push([d, Number(monthData.byDay[d].toFixed(2))]));
    dailyAoa.push([]);
    dailyAoa.push(["Total", Number(monthData.days.reduce((s,d)=>s+monthData.byDay[d],0).toFixed(2))]);
    const wsDaily = XLSX.utils.aoa_to_sheet(dailyAoa);
    wsDaily["!cols"] = [{wch:14},{wch:12}];
    XLSX.utils.book_append_sheet(wb, wsDaily, `Daily ${mMonth}`);

    const subsidyAoa = [["Station / Card","Type","Quota (L)","Used (L)","Balance (L)","Status"]];
    subsidyData.forEach(row => {
      subsidyAoa.push([row.station, row.type, Number(row.quota.toFixed(2)), Number(row.used.toFixed(2)), Number(row.balance.toFixed(2)), row.balance < 0 ? "OVER LIMIT" : "OK"]);
    });
    subsidyAoa.push([]);
    subsidyAoa.push(["TOTAL LITER","", Number(subsidyTotals.totalQuota.toFixed(2)), Number(subsidyTotals.totalUsed.toFixed(2)), Number((subsidyTotals.totalQuota-subsidyTotals.totalUsed).toFixed(2)), ""]);
    const wsSubsidy = XLSX.utils.aoa_to_sheet(subsidyAoa);
    wsSubsidy["!cols"] = [{wch:16},{wch:10},{wch:12},{wch:12},{wch:12},{wch:12}];
    XLSX.utils.book_append_sheet(wb, wsSubsidy, `Subsidy ${mMonth}`);

    XLSX.writeFile(wb, `fuel-log-${mMonth}.xlsx`);
  }

  function exportBackup(){
    const backup = {
      app: "lorry-fuel-tracker",
      version: 2,
      exportedAt: new Date().toISOString(),
      entries,
      quotas,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuel-tracker-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(event){
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async function(e){
      let data;
      try{ data = JSON.parse(e.target.result); }
      catch(err){ alert("Could not read this file — it doesn't look like a valid backup (.json) file."); event.target.value = ""; return; }
      if(!data || !Array.isArray(data.entries)){ alert("This file doesn't look like a valid fuel tracker backup."); event.target.value = ""; return; }

      if(!confirm(`This backup has ${data.entries.length} entries. They will be added to your current cloud data (existing entries are kept; nothing is deleted). Continue?`)){
        event.target.value = "";
        return;
      }

      setBusy(true);
      const toInsert = data.entries
        .filter(x => x && x.station && x.lorry && x.date && x.litre)
        .map(x => ({ station: x.station, lorry: x.lorry, date: x.date, litre: Number(x.litre) }));

      for(let i = 0; i < toInsert.length; i += 500){
        const chunk = toInsert.slice(i, i + 500);
        const { error: insErr } = await supabase.from("entries").insert(chunk);
        if(insErr){ alert("Import failed partway through: " + insErr.message); setBusy(false); event.target.value = ""; loadAll(); return; }
      }

      if(data.quotas){
        const rows = Object.entries(data.quotas).map(([group_id, quota]) => ({ group_id, quota: Number(quota) || 0, updated_at: new Date().toISOString() }));
        if(rows.length) await supabase.from("quotas").upsert(rows);
      }

      setBusy(false);
      await loadAll();
      alert(`Imported ${toInsert.length} entries.`);
      event.target.value = "";
    };
    reader.onerror = function(){ alert("Could not read this file. Please try again."); event.target.value = ""; };
    reader.readAsText(file);
  }

  return (
    <div className="wrap">
      <header>
        <div className="brand-row">
          <img src="https://cdn1.npcdn.net/images/np_24894_1690338503.png" alt="Tek Wee logo" className="brand-logo" />
          <div className="brand-name">TEK WEE HARDWARE &amp; LOGISTIC SDN BHD</div>
        </div>
        <div className="eyebrow">Fleet Fuel Log</div>
        <h1>Lorry Fuel Tracker</h1>
        <p className="sub">Log fuel fill-ups by station/card, lorry, and date. Filter records, track daily usage, and monitor each card &amp; station&apos;s monthly subsidy balance. Data is stored in a shared cloud database, so it&apos;s the same on every device.</p>
      </header>

      {error && <div className="banner error">Could not reach the database: {error}</div>}
      {loading && <div className="banner info">Loading…</div>}

      <div className="card">
        <h2>⛽ Diesel Price Today <span className="tag">— source: setel.com</span></h2>
        {fuelPriceLoading && <div className="banner info">Loading fuel prices…</div>}
        {fuelPriceError && !fuelPriceLoading && <div className="banner error">Could not load fuel prices: {fuelPriceError}</div>}
        {fuelPrice && !fuelPriceLoading && (
          <>
            <div className="summary-grid">
              <div className="stat">
                <div className="label">Diesel B10 / B20</div>
                <div className="value">{fuelPrice.dieselB10B20 != null ? `RM ${fuelPrice.dieselB10B20.toFixed(2)}` : "—"}</div>
              </div>
            </div>
            {fuelPrice.effectiveFrom && fuelPrice.effectiveTo && (
              <p className="sub" style={{marginTop:10}}>Effective {fuelPrice.effectiveFrom} to {fuelPrice.effectiveTo}. Pump price only (excludes Setel "harga budi" rewards price).</p>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2><span className="n">1</span> Add Entry</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="in-station">Company Station (Card)</label>
            <select id="in-station" value={inStation} onChange={e => setInStation(e.target.value)}>
              {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="in-lorry">No Lorry</label>
            <input type="text" id="in-lorry" placeholder="e.g. JQJ 7512" list="lorryList" value={inLorry} onChange={e => setInLorry(e.target.value)} />
            <datalist id="lorryList">
              {allLorries.map(l => <option key={l} value={l} />)}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="in-date">Date</label>
            <input type="date" id="in-date" value={inDate} onChange={e => setInDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="in-litre">Litre</label>
            <input type="number" id="in-litre" placeholder="e.g. 120" step="0.01" min="0" value={inLitre} onChange={e => setInLitre(e.target.value)} />
          </div>
          <div className="field">
            <button className="btn-primary" onClick={addEntry} disabled={busy}>+ Add Entry</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2><span className="n">2</span> Filter</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="f-station">Station / Card</label>
            <select id="f-station" value={fStation} onChange={e => setFStation(e.target.value)}>
              <option value="">All stations</option>
              {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-lorry">Lorry</label>
            <select id="f-lorry" value={fLorry} onChange={e => setFLorry(e.target.value)}>
              <option value="">All lorries</option>
              {allLorries.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-from">From date</label>
            <input type="date" id="f-from" value={fFrom} onChange={e => setFFrom(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-to">To date</label>
            <input type="date" id="f-to" value={fTo} onChange={e => setFTo(e.target.value)} />
          </div>
          <div className="field">
            <button className="btn-ghost" style={{width:"100%"}} onClick={clearFilters}>Clear filters</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2><span className="n">3</span> Summary <span className="tag">{summaryScope}</span></h2>
        <div className="summary-grid">
          <div className="stat"><div className="label">Total Litre</div><div className="value">{summary.total.toFixed(2)} L</div></div>
          <div className="stat"><div className="label">Entries</div><div className="value">{summary.count}</div></div>
          <div className="stat"><div className="label">Average / Entry</div><div className="value">{summary.avg.toFixed(2)} L</div></div>
          <div className="stat"><div className="label">Lorries Involved</div><div className="value">{summary.lorryCount}</div></div>
        </div>

        {byStation.rows.length > 0 && (
          <div className="breakdown">
            <div className="breakdown-title">By Station / Card</div>
            {byStation.rows.map(([label, val]) => (
              <div className="bar-row" key={label}>
                <div className="bar-label" title={label}>{label}</div>
                <div className="bar-track"><div className="bar-fill" style={{width: (byStation.maxVal ? val/byStation.maxVal*100 : 0) + "%"}} /></div>
                <div className="bar-val">{val.toFixed(2)} L</div>
              </div>
            ))}
          </div>
        )}
        {byLorry.rows.length > 0 && (
          <div className="breakdown">
            <div className="breakdown-title">By Lorry</div>
            {byLorry.rows.map(([label, val]) => (
              <div className="bar-row" key={label}>
                <div className="bar-label" title={label}>{label}</div>
                <div className="bar-track"><div className="bar-fill" style={{width: (byLorry.maxVal ? val/byLorry.maxVal*100 : 0) + "%"}} /></div>
                <div className="bar-val">{val.toFixed(2)} L</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2><span className="n">4</span> Daily Usage &amp; Subsidy Balance <span className="tag">— renews every month, per card/station</span></h2>
        <div className="form-grid" style={{marginBottom:16}}>
          <div className="field">
            <label htmlFor="m-month">Month</label>
            <input type="month" id="m-month" value={mMonth} onChange={e => setMMonth(e.target.value || currentMonthStr())} />
          </div>
          <div className="field">
            <label htmlFor="m-lorry">Lorry (for daily table)</label>
            <select id="m-lorry" value={mLorry} onChange={e => setMLorry(e.target.value)}>
              <option value="">All lorries (combined)</option>
              {allLorries.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="summary-grid" style={{marginBottom:16}}>
          <div className="stat"><div className="label">Used This Month</div><div className="value">{monthData.monthTotal.toFixed(2)} L</div></div>
          <div className="stat"><div className="label">Days With Usage</div><div className="value">{monthData.days.length}</div></div>
          <div className="stat"><div className="label">Avg / Day Used</div><div className="value">{(monthData.days.length ? monthData.monthTotal/monthData.days.length : 0).toFixed(2)} L</div></div>
        </div>

        <div className="breakdown-title">Daily Count (Litre per Day)</div>
        <table style={{marginBottom:20}}>
          <thead><tr><th>Date</th><th>Litre Used</th></tr></thead>
          <tbody>
            {monthData.days.map(d => (
              <tr key={d}><td>{d}</td><td className="num">{monthData.byDay[d].toFixed(2)} L</td></tr>
            ))}
          </tbody>
        </table>
        {monthData.days.length === 0 && <div className="empty-state">No usage recorded for this month.</div>}

        <div className="breakdown-title">Monthly Subsidy Balance — by Company Station (Card)</div>
        <p className="sub" style={{marginBottom:4}}>BHP SN &amp; BHP SR are combined into one shared BHP line, and the 9 plate-numbered cards are combined into one shared Shell line. Usage is deducted strictly by which card was selected on each entry, regardless of which lorry used it. Quotas renew automatically every month — set once and they carry forward.</p>
        <p className="sub" style={{marginBottom:4}}>Cards combined into BHP: BHP SN, BHP SR. Cards combined into Shell: {SHELL_CARDS.join(", ")}.</p>
        {beforeStart && <p className="sub" style={{marginBottom:12,color:"var(--clay-dark)"}}>Note: quotas shown are the June 2026 starting values — this selected month is before June 2026.</p>}
        <table>
          <thead><tr><th>Station / Card</th><th>Type</th><th>Quota (L/month)</th><th>Used This Month</th><th>Balance</th><th>Status</th></tr></thead>
          <tbody>
            {subsidyData.map(row => {
              const over = row.balance < 0;
              return (
                <tr key={row.id}>
                  <td>{row.station}</td>
                  <td>{row.type}</td>
                  <td className="qty-input">
                    <input type="number" min="0" step="0.01" defaultValue={row.quota} key={row.id + "-" + row.quota}
                      onBlur={e => setQuota(row.id, e.target.value)} />
                  </td>
                  <td className="num">{row.used.toFixed(2)} L</td>
                  <td className={"num" + (over ? " over" : "")}>{row.balance.toFixed(2)} L</td>
                  <td><span className={"status-pill" + (over ? " over" : "")}>{over ? "OVER LIMIT" : "OK"}</span></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{fontWeight:700, background:"#efece2"}}>
              <td>TOTAL LITER</td>
              <td></td>
              <td className="num">{subsidyTotals.totalQuota.toFixed(2)} L</td>
              <td className="num">{subsidyTotals.totalUsed.toFixed(2)} L</td>
              <td className="num">{(subsidyTotals.totalQuota-subsidyTotals.totalUsed).toFixed(2)} L</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card">
        <h2><span className="n">5</span> Records</h2>
        <div className="form-grid" style={{marginBottom:14}}>
          <div className="field">
            <label htmlFor="r-date">Jump to date</label>
            <input type="date" id="r-date" value={rDate} onChange={e => { setRDate(e.target.value); if(e.target.value) setRMonth(""); }} />
          </div>
          <div className="field">
            <label htmlFor="r-month">Jump to month</label>
            <input type="month" id="r-month" value={rMonth} onChange={e => { setRMonth(e.target.value); if(e.target.value) setRDate(""); }} />
          </div>
          <div className="field">
            <button className="btn-ghost" style={{width:"100%"}} onClick={clearRecordQuickFilter} disabled={!rDate && !rMonth}>Clear date/month</button>
          </div>
        </div>
        <div className="toolbar">
          <div className="count">{filtered.length} of {entries.length} entries</div>
          <div className="toolbar-actions">
            <button className="btn-excel" onClick={exportExcel}>Export Excel ↓</button>
            <button className="btn-ghost" onClick={exportCSV}>Export CSV ↓</button>
            <button className="btn-ghost" onClick={clearAllData} disabled={busy}>Clear all data</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>No Lorry</th><th>Station</th><th>Litre</th>
              <th>Subsidy Usage (L)</th><th>Extra Usage After Subsidy (L)</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => {
              const sp = splits[e.id] || { subsidyUsage: 0, extraUsage: e.litre };
              return (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.lorry}</td>
                  <td>{e.station}</td>
                  <td className="num">{e.litre.toFixed(2)} L</td>
                  <td className="num">{sp.subsidyUsage.toFixed(2)} L</td>
                  <td className={"num" + (sp.extraUsage > 0 ? " over" : "")}>{sp.extraUsage.toFixed(2)} L</td>
                  <td><button className="btn-danger" onClick={() => deleteEntry(e.id)} disabled={busy}>Delete</button></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{fontWeight:700, background:"#efece2"}}>
              <td colSpan={3}>TOTAL</td>
              <td className="num">{totals.sumLitre.toFixed(2)} L</td>
              <td className="num">{totals.sumSubsidy.toFixed(2)} L</td>
              <td className="num">{totals.sumExtra.toFixed(2)} L</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        {filtered.length === 0 && <div className="empty-state">No records match your filters.</div>}
      </div>

      <div className="card">
        <h2><span className="n">6</span> Backup &amp; Restore</h2>
        <p className="sub" style={{marginBottom:14}}>Data lives in the shared cloud database, so it&apos;s already safe across devices and browsers. Use this to keep an offline copy, or to bring in entries from an older backup file.</p>
        <div className="toolbar-actions" style={{marginBottom:16}}>
          <button className="btn-ghost" onClick={exportBackup}>⬇ Download Backup (JSON)</button>
        </div>
        <div className="form-grid">
          <div className="field" style={{flex:"1 1 100%"}}>
            <label htmlFor="importFile">Import Entries from a Backup File (.json)</label>
            <input type="file" id="importFile" accept=".json,application/json" ref={fileInputRef} onChange={importBackup} />
            <div className="hint">Entries from the file are added to the current cloud data — nothing existing is deleted or overwritten.</div>
          </div>
        </div>
      </div>

      <footer>
        All figures are self-reported entries stored in a shared Supabase database.
        &quot;Export Excel&quot; produces a workbook with Records, Daily Usage, and Subsidy Balance as separate sheets, for the currently selected filters/month.
        Subsidy quotas are set per card/station and renew automatically every month.
      </footer>
    </div>
  );
}
