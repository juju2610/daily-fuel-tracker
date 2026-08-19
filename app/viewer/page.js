"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { QUOTA_START_MONTH, SUBSIDY_GROUPS, SHELL_CARDS, currentMonthStr, computeSubsidySplits } from "../../lib/fuelData";

export default function ViewerPage(){
  const [entries, setEntries] = useState([]);
  const [quotas, setQuotas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mMonth, setMMonth] = useState(currentMonthStr());
  const [mLorry, setMLorry] = useState("");

  const [rDate, setRDate] = useState("");
  const [rMonth, setRMonth] = useState("");

  useEffect(() => {
    async function load(){
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
    load();
  }, []);

  const allLorries = useMemo(() => Array.from(new Set(entries.map(e => e.lorry))).sort(), [entries]);

  function clearRecordQuickFilter(){
    setRDate(""); setRMonth("");
  }

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if(rDate && e.date !== rDate) return false;
      if(rMonth && e.date.slice(0,7) !== rMonth) return false;
      return true;
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [entries, rDate, rMonth]);

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
    const total = entries.reduce((s,e) => s + e.litre, 0);
    const count = entries.length;
    const avg = count ? total / count : 0;
    const lorrySet = new Set(entries.map(e => e.lorry));
    return { total, count, avg, lorryCount: lorrySet.size };
  }, [entries]);

  function breakdown(key){
    const map = {};
    entries.forEach(e => { map[e[key]] = (map[e[key]] || 0) + e.litre; });
    const rows = Object.entries(map).sort((a,b) => b[1]-a[1]);
    const maxVal = rows.length ? rows[0][1] : 0;
    return { rows, maxVal };
  }
  const byStation = useMemo(() => breakdown("station"), [entries]);
  const byLorry = useMemo(() => breakdown("lorry"), [entries]);

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

  return (
    <div className="wrap">
      <header>
        <div className="brand-row">
          <img src="https://cdn1.npcdn.net/images/np_24894_1690338503.png" alt="Tek Wee logo" className="brand-logo" />
          <div className="brand-name">TEK WEE HARDWARE &amp; LOGISTIC SDN BHD</div>
        </div>
        <div className="eyebrow">Fleet Fuel Log — Viewer</div>
        <h1>Lorry Fuel Tracker</h1>
        <p className="sub">Read-only overview of fuel usage, daily totals, and monthly subsidy balances.</p>
      </header>

      {error && <div className="banner error">Could not reach the database: {error}</div>}
      {loading && <div className="banner info">Loading…</div>}

      <div className="card">
        <h2><span className="n">1</span> Summary <span className="tag">— all records</span></h2>
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
        <h2><span className="n">2</span> Daily Usage &amp; Subsidy Balance <span className="tag">— renews every month, per card/station</span></h2>
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
        <p className="sub" style={{marginBottom:4}}>BHP SN &amp; BHP SR are combined into one shared BHP line, and the 9 plate-numbered cards are combined into one shared Shell line.</p>
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
                  <td className="num">{row.quota.toFixed(2)} L</td>
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
        <h2><span className="n">3</span> Records</h2>
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
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>No Lorry</th><th>Station</th><th>Litre</th>
              <th>Subsidy Usage (L)</th><th>Extra Usage After Subsidy (L)</th>
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
            </tr>
          </tfoot>
        </table>
        {filtered.length === 0 && <div className="empty-state">No records match your filters.</div>}
      </div>

      <footer>
        All figures are self-reported entries stored in a shared Supabase database. This is a read-only view.
      </footer>
    </div>
  );
}
