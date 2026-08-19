export const STATIONS = [
  "BHP SN","JQJ 7512","JKQ 7233","JGU 6981","WKD 3987","JVY 7512","JJR 8098",
  "JYH 7512","JDM 6294","JYK 7512","PETRON KM","SHELL PINJAM","PETRON BNT","BHP SR"
];
export const QUOTA_START_MONTH = "2026-06";

export const SHELL_CARDS = ["JQJ 7512","JKQ 7233","JGU 6981","WKD 3987","JVY 7512","JJR 8098","JYH 7512","JDM 6294","JYK 7512"];

export const SUBSIDY_GROUPS = [
  { id: "BHP_COMBINED", label: "BHP (SN & SR combined)", type: "BHP", stations: ["BHP SN","BHP SR"] },
  { id: "SHELL_COMBINED", label: "SHELL (9 lorry cards combined)", type: "SHELL", stations: SHELL_CARDS },
  ...STATIONS
    .filter(s => !["BHP SN","BHP SR",...SHELL_CARDS].includes(s))
    .map(s => ({ id: s, label: s, type: (s === "SHELL PINJAM" ? "SHELL" : (s.startsWith("PETRON") ? "PETRON" : "OTHER")), stations: [s] }))
];

export function currentMonthStr(){
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
}

export function computeSubsidySplits(entries, quotas){
  const splits = {};
  const buckets = {};

  entries.forEach((e, idx) => {
    const group = SUBSIDY_GROUPS.find(g => g.stations.includes(e.station));
    if(!group){ splits[e.id] = { subsidyUsage: 0, extraUsage: e.litre }; return; }
    const key = group.id + "|" + e.date.slice(0,7);
    if(!buckets[key]) buckets[key] = [];
    buckets[key].push({ e, idx, groupId: group.id });
  });

  Object.values(buckets).forEach(list => {
    list.sort((a,b) => a.e.date === b.e.date ? a.idx - b.idx : a.e.date.localeCompare(b.e.date));
    const quota = quotas[list[0].groupId] || 0;
    let running = 0;
    list.forEach(item => {
      const litre = item.e.litre;
      const remaining = quota - running;
      let subsidyUsage, extraUsage;
      if(remaining <= 0){ subsidyUsage = 0; extraUsage = litre; }
      else if(litre <= remaining){ subsidyUsage = litre; extraUsage = 0; }
      else { subsidyUsage = remaining; extraUsage = litre - remaining; }
      running += litre;
      splits[item.e.id] = { subsidyUsage, extraUsage };
    });
  });

  return splits;
}
