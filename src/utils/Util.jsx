// src/utils/time.js
export function formatTs(ts) {
  const n = Number(ts);
  if (!n) return "-";
  return new Date(n * 1000).toLocaleString("en-GB", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDuration(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function inputToDubaiIso(val) {
  if (!val) return "";
  const [datePart, timePart = "00:00"] = val.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, hour - 4, minute);
  return new Date(utcMillis).toISOString();
}


export function mergeAgentData(cdrData = [], agentStatusData = {}) {
  if (!cdrData || !agentStatusData) return [];

  const filteredCdr = cdrData.filter(
    (item) =>
      item.event === "agent_idle" || item.event === "agent_not_avail_state"
  );

  const statusMap = new Map(
    Object.entries(agentStatusData).map(([ext, data]) => [
      ext,
      { ext, name: data.name || ext, ...data },
    ])
  );

  const merged = Array.from(statusMap.values()).map((status) => {
    const cdrMatches = filteredCdr.filter((cdr) => cdr.ext === status.ext);
    return {
      ext: status.ext,
      name: status.name,
      statusData: status,
      cdrEvents: cdrMatches,
    };
  });

  filteredCdr.forEach((cdr) => {
    if (!statusMap.has(cdr.ext)) {
      merged.push({
        ext: cdr.ext,
        name: cdr.username || cdr.ext,
        statusData: {},
        cdrEvents: [cdr],
      });
    }
  });

  return merged;
}
