"use client";

import { useEffect, useState } from "react";

const translations = {
  en: {
    eyebrowMain: "Fleet Fuel Log",
    eyebrowViewer: "Fleet Fuel Log — Viewer",
    appTitle: "Lorry Fuel Tracker",
    subMain: "Log fuel fill-ups by station/card, lorry, and date. Filter records, track daily usage, and monitor each card & station's monthly subsidy balance. Data is stored in a shared cloud database, so it's the same on every device.",
    subViewer: "Read-only overview of fuel usage, daily totals, and monthly subsidy balances.",
    loading: "Loading…",
    dbError: "Could not reach the database: {msg}",

    dieselTitle: "⛽ Diesel Price Today",
    dieselSource: "— source: setel.com",
    dieselLoading: "Loading fuel prices…",
    dieselErrorPrefix: "Could not load fuel prices: {msg}",
    dieselLabel: "Diesel B10 / B20",
    dieselEffective: "Effective {from} to {to}. Pump price only (excludes Setel \"harga budi\" rewards price).",

    addEntryTitle: "Add Entry",
    companyStation: "Company Station (Card)",
    noLorry: "No Lorry",
    date: "Date",
    litre: "Litre",
    addEntryBtn: "+ Add Entry",

    filterTitle: "Filter",
    stationCard: "Station / Card",
    allStations: "All stations",
    lorry: "Lorry",
    allLorries: "All lorries",
    fromDate: "From date",
    toDate: "To date",
    clearFilters: "Clear filters",

    summaryTitle: "Summary",
    allRecords: "— all records",
    summaryThisMonth: "this month ({month})",
    totalLitre: "Total Litre",
    entries: "Entries",
    avgPerEntry: "Average / Entry",
    lorriesInvolved: "Lorries Involved",
    byStationCard: "By Station / Card",
    byLorry: "By Lorry",

    dailyUsageTitle: "Daily Usage & Subsidy Balance",
    renewsMonthly: "— renews every month, per card/station",
    month: "Month",
    lorryForDaily: "Lorry (for daily table)",
    allLorriesCombined: "All lorries (combined)",
    usedThisMonth: "Used This Month",
    daysWithUsage: "Days With Usage",
    avgPerDay: "Avg / Day Used",
    dailyCountTitle: "Daily Count (Litre per Day)",
    litreUsed: "Litre Used",
    noUsageThisMonth: "No usage recorded for this month.",
    monthlySubsidyTitle: "Monthly Subsidy Balance — by Company Station (Card)",
    subsidyDescMain: "BHP SN & BHP SR are combined into one shared BHP line, and the 9 plate-numbered cards are combined into one shared Shell line. Usage is deducted strictly by which card was selected on each entry, regardless of which lorry used it. Quotas renew automatically every month — set once and they carry forward.",
    subsidyDescCards: "Cards combined into BHP: BHP SN, BHP SR. Cards combined into Shell: {shellCards}.",
    subsidyDescViewer: "BHP SN & BHP SR are combined into one shared BHP line, and the 9 plate-numbered cards are combined into one shared Shell line.",
    beforeStartNote: "Note: quotas shown are the June 2026 starting values — this selected month is before June 2026.",
    typeCol: "Type",
    quotaCol: "Quota (L/month)",
    balanceCol: "Balance",
    statusCol: "Status",
    overLimit: "OVER LIMIT",
    ok: "OK",
    totalLiter: "TOTAL LITER",

    recordsTitle: "Records",
    jumpToDate: "Jump to date",
    jumpToMonth: "Jump to month",
    clearDateMonth: "Clear date/month",
    ofEntries: "{filtered} of {total} entries",
    exportExcel: "Export Excel ↓",
    exportCSV: "Export CSV ↓",
    clearAllData: "Clear all data",
    noLorryCol: "No Lorry",
    stationCol: "Station",
    litreCol: "Litre",
    subsidyUsageCol: "Subsidy Usage (L)",
    extraUsageCol: "Extra Usage After Subsidy (L)",
    total: "TOTAL",
    noRecordsMatch: "No records match your filters.",
    delete: "Delete",

    backupTitle: "Backup & Restore",
    backupDesc: "Data lives in the shared cloud database, so it's already safe across devices and browsers. Use this to keep an offline copy, or to bring in entries from an older backup file.",
    downloadBackup: "⬇ Download Backup (JSON)",
    importLabel: "Import Entries from a Backup File (.json)",
    importHint: "Entries from the file are added to the current cloud data — nothing existing is deleted or overwritten.",

    footerMain: "All figures are self-reported entries stored in a shared Supabase database. \"Export Excel\" produces a workbook with Records, Daily Usage, and Subsidy Balance as separate sheets, for the currently selected filters/month. Subsidy quotas are set per card/station and renew automatically every month.",
    footerViewer: "All figures are self-reported entries stored in a shared Supabase database. This is a read-only view.",

    alertNoLorry: "Please enter the lorry number.",
    alertNoDate: "Please select a date.",
    alertInvalidLitre: "Please enter a valid litre amount.",
    alertSaveEntryError: "Could not save entry: {msg}",
    alertDeleteEntryError: "Could not delete entry: {msg}",
    confirmClearAll: "Delete all fuel log entries? This cannot be undone.",
    alertClearAllError: "Could not clear entries: {msg}",
    alertSaveQuotaError: "Could not save quota: {msg}",
    alertNoRecordsExport: "No records to export.",
    alertInvalidBackupFile: "Could not read this file — it doesn't look like a valid backup (.json) file.",
    alertInvalidBackupContent: "This file doesn't look like a valid fuel tracker backup.",
    confirmImportBackup: "This backup has {count} entries. They will be added to your current cloud data (existing entries are kept; nothing is deleted). Continue?",
    alertImportPartialFail: "Import failed partway through: {msg}",
    alertImportSuccess: "Imported {count} entries.",
    alertReadFileError: "Could not read this file. Please try again.",

    langToggle: "中文",
    themeToggleToPro: "💼 Professional",
    themeToggleToCute: "🎨 Cute",
  },
  zh: {
    eyebrowMain: "车队油量记录",
    eyebrowViewer: "车队油量记录 — 查看版",
    appTitle: "货车燃油追踪器",
    subMain: "按站点/卡、车辆和日期记录加油。筛选记录，追踪每日用量，监控每张卡与站点的每月补贴余额。数据储存在共享云端数据库，所有设备同步显示。",
    subViewer: "只读版本，查看燃油使用情况、每日总量和每月补贴余额。",
    loading: "加载中…",
    dbError: "无法连接数据库：{msg}",

    dieselTitle: "⛽ 今日柴油价格",
    dieselSource: "— 数据来源：setel.com",
    dieselLoading: "正在加载油价…",
    dieselErrorPrefix: "无法加载油价：{msg}",
    dieselLabel: "柴油 B10 / B20",
    dieselEffective: "生效日期 {from} 至 {to}。仅为泵价（不含 Setel「harga budi」会员优惠价）。",

    addEntryTitle: "新增记录",
    companyStation: "公司站点（卡）",
    noLorry: "车辆编号",
    date: "日期",
    litre: "公升数",
    addEntryBtn: "+ 新增记录",

    filterTitle: "筛选",
    stationCard: "站点 / 卡",
    allStations: "所有站点",
    lorry: "车辆",
    allLorries: "所有车辆",
    fromDate: "起始日期",
    toDate: "结束日期",
    clearFilters: "清除筛选",

    summaryTitle: "总览",
    allRecords: "— 所有记录",
    summaryThisMonth: "本月（{month}）",
    totalLitre: "总公升数",
    entries: "记录数",
    avgPerEntry: "平均每笔",
    lorriesInvolved: "涉及车辆数",
    byStationCard: "按站点 / 卡",
    byLorry: "按车辆",

    dailyUsageTitle: "每日用量与补贴余额",
    renewsMonthly: "— 每月按卡/站点自动更新",
    month: "月份",
    lorryForDaily: "车辆（用于每日表）",
    allLorriesCombined: "所有车辆（合并）",
    usedThisMonth: "本月已用",
    daysWithUsage: "有用量天数",
    avgPerDay: "平均每日用量",
    dailyCountTitle: "每日用量（公升/天）",
    litreUsed: "使用公升数",
    noUsageThisMonth: "本月无用量记录。",
    monthlySubsidyTitle: "每月补贴余额 — 按公司站点（卡）",
    subsidyDescMain: "BHP SN 与 BHP SR 合并为同一条 BHP 额度线，9 张车牌卡合并为同一条 Shell 额度线。用量严格依据每笔记录所选的卡扣除，与实际使用车辆无关。配额每月自动更新 — 只需设定一次即可持续沿用。",
    subsidyDescCards: "并入 BHP 的卡：BHP SN、BHP SR。并入 Shell 的卡：{shellCards}。",
    subsidyDescViewer: "BHP SN 与 BHP SR 合并为同一条 BHP 额度线，9 张车牌卡合并为同一条 Shell 额度线。",
    beforeStartNote: "注意：所示配额为 2026 年 6 月的起始数值 — 所选月份早于 2026 年 6 月。",
    typeCol: "类型",
    quotaCol: "配额（公升/月）",
    balanceCol: "余额",
    statusCol: "状态",
    overLimit: "超额",
    ok: "正常",
    totalLiter: "总公升数",

    recordsTitle: "记录",
    jumpToDate: "跳转至日期",
    jumpToMonth: "跳转至月份",
    clearDateMonth: "清除日期/月份",
    ofEntries: "{filtered} / {total} 笔记录",
    exportExcel: "导出 Excel ↓",
    exportCSV: "导出 CSV ↓",
    clearAllData: "清除所有数据",
    noLorryCol: "车辆编号",
    stationCol: "站点",
    litreCol: "公升数",
    subsidyUsageCol: "补贴用量（公升）",
    extraUsageCol: "超额用量（公升）",
    total: "总计",
    noRecordsMatch: "没有符合筛选条件的记录。",
    delete: "删除",

    backupTitle: "备份与还原",
    backupDesc: "数据储存在共享云端数据库中，已在各设备与浏览器间同步安全保存。此功能可用于保留离线备份，或从旧备份文件中导入记录。",
    downloadBackup: "⬇ 下载备份（JSON）",
    importLabel: "从备份文件导入记录（.json）",
    importHint: "文件中的记录将加入现有云端数据 — 不会删除或覆盖任何现有记录。",

    footerMain: "所有数据均为储存在共享 Supabase 数据库中的自行填报记录。「导出 Excel」会依据当前筛选条件/月份，生成包含记录、每日用量与补贴余额三个工作表的文件。补贴配额按卡/站点设定，并每月自动更新。",
    footerViewer: "所有数据均为储存在共享 Supabase 数据库中的自行填报记录。此为只读版本。",

    alertNoLorry: "请输入车辆编号。",
    alertNoDate: "请选择日期。",
    alertInvalidLitre: "请输入有效的公升数。",
    alertSaveEntryError: "无法保存记录：{msg}",
    alertDeleteEntryError: "无法删除记录：{msg}",
    confirmClearAll: "删除所有燃油记录？此操作无法撤销。",
    alertClearAllError: "无法清除记录：{msg}",
    alertSaveQuotaError: "无法保存配额：{msg}",
    alertNoRecordsExport: "没有可导出的记录。",
    alertInvalidBackupFile: "无法读取此文件 — 该文件似乎不是有效的备份（.json）文件。",
    alertInvalidBackupContent: "此文件似乎不是有效的燃油追踪器备份。",
    confirmImportBackup: "此备份包含 {count} 笔记录，将加入您目前的云端数据（保留现有记录，不会删除任何内容）。是否继续？",
    alertImportPartialFail: "导入过程中失败：{msg}",
    alertImportSuccess: "已导入 {count} 笔记录。",
    alertReadFileError: "无法读取此文件，请重试。",

    langToggle: "EN",
    themeToggleToPro: "💼 专业版",
    themeToggleToCute: "🎨 可爱版",
  },
};

export function useLanguage(){
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("fuelTrackerLang") : null;
    if(saved === "en" || saved === "zh") setLang(saved);
  }, []);

  function toggleLang(){
    setLang(prev => {
      const next = prev === "en" ? "zh" : "en";
      if(typeof window !== "undefined") window.localStorage.setItem("fuelTrackerLang", next);
      return next;
    });
  }

  function t(key, vars){
    let str = (translations[lang] && translations[lang][key]) || translations.en[key] || key;
    if(vars){
      Object.entries(vars).forEach(([k, v]) => {
        str = str.split("{" + k + "}").join(v);
      });
    }
    return str;
  }

  return { lang, toggleLang, t };
}
