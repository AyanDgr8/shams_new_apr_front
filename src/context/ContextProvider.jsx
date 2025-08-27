import React, { createContext, useState } from "react";
import axios from "axios";


export const UserContext = createContext();

const HOUR_S = 3600;
 const BASE_URL=import.meta.env.VITE_API_BASE

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isTransient = (status) => [429, 500, 502, 503, 504].includes(status);

function normalizeToArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.records)) return payload.records;
  return [payload];
}

function dedupeRows(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const k = r?.id ?? r?.call_id ?? JSON.stringify(r);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}

async function fetchChunkWithRetry(startSec, endSec, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    try {
      const res = await axios.get(`${BASE_URL}/api/apr`, {
        params: { startDate: startSec, endDate: endSec },
        timeout: 30_000,
      });
      return normalizeToArray(res?.data);
    } catch (err) {
      attempt++;
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err.message || "Request failed";
      if (attempt <= maxRetries && (isTransient(status) || !status)) {
        const backoff = Math.min(2000, 500 * 2 ** (attempt - 1)) + Math.random() * 200;
        await sleep(backoff);
        continue;
      }
      throw new Error(`Chunk ${startSec}-${endSec} failed: ${msg}`);
    }
  }
}

function ContextProvider({ children }) {
  const [cdrData, setCdrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [agentStatusData,setAgentStatusData]=useState([])
  const [agentStatusloading,setAgentStatusloading]=useState(true)


  async function fetchAllCDRs(startDate, endDate) {
    const toSec = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return 0;
      return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n);
    };

    let startSec = toSec(startDate);
    const endSec = toSec(endDate);

    if (!startSec || !endSec || endSec <= startSec) {
      const msg = "Invalid time range: ensure startDate < endDate (UNIX seconds).";
      setError(msg);
      return [];x``
    }

    setLoading(true);
    setError(null);
    setCdrData(null);

    const allRows = [];
    const chunkErrors = [];

    try {
      while (startSec < endSec) {
        const nextSec = Math.min(startSec + HOUR_S, endSec);
        try {
          const rows = await fetchChunkWithRetry(startSec, nextSec);
          if (rows?.length) allRows.push(...rows);
        } catch (e) {
          chunkErrors.push(e.message);
        }
        startSec = nextSec;

        await sleep(50);
      }

      const merged = dedupeRows(allRows);
      setCdrData(merged);

      if (chunkErrors.length) {
        setError(
          `Fetched with partial errors (${chunkErrors.length} chunk${chunkErrors.length > 1 ? "s" : ""} failed).`
        );
      }

      return merged;
    } catch (e) {
      const msg = e?.message || "Failed to fetch CDRs";
      setError(msg);
      setCdrData([]);
      return [];
    } finally {
      setLoading(false);
    }
  }



async function fetchAgentStausData(startDate, endDate) {
  setLoading(true);
  setError(null);
  try {
    const res = await axios.get(
      `${BASE_URL}/api/agent_status?startDate=${startDate}&endDate=${endDate}`
    );

    setAgentStatusData(res?.data);
  } catch (err) {
    const msg =
      err.response?.data?.message || err.message || "Failed to fetch agent status";
    console.error("Error fetching agent status:", msg);
    setError(msg);
  } finally {
    setLoading(false);
  }
}


  return (
    <UserContext.Provider
      value={{
        cdrData,
        fetchAllCDRs,
        fetchAgentStausData,
        setAgentStatusData,
        agentStatusData,
        agentStatusloading,
        loading,
        error,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export default ContextProvider;
