import React, { useContext, useMemo, useRef, useState, useEffect } from "react";
import { UserContext } from "../../context/ContextProvider";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Box, Chip, Tooltip
} from "@mui/material";
import { formatTs, formatDuration, inputToDubaiIso, mergeAgentData } from "../../utils/Util";
import Loader from "../Loader/Loder";
import DownloadButton from "../download/DownloadButton";

/* ---------- span logic ---------- */
const ONLY_EVENTS = new Set(["agent_idle", "agent_not_avail_state"]);

function numTs(x, fallback = 0) {
  return Number(x?.Timestamp ?? x?.timestamp ?? x?.ts ?? fallback) || fallback;
}
function computeSpansForType(eventsSorted, type) {
  const list = eventsSorted.filter((e) => e.event === type);
  const spans = [];
  let open = null;
  for (const e of list) {
    if (e.enabled === true) {
      open = e;
    } else if (e.enabled === false && open) {
      const sTs = numTs(open, 0);
      const eTs = numTs(e, sTs);
      spans.push({
        event: type,
        startTs: sTs,
        endTs: eTs,
        durationSec: Math.max(0, eTs - sTs),
        start: open,
        end: e,
        ext: open.ext ?? e.ext ?? null,
      });
      open = null;
    }
  }
  return spans;
}
function buildSpansFromEvents(events) {
  const filtered = (events || []).filter(
    (e) => e && e.username && ONLY_EVENTS.has(e.event)
  );
  if (!filtered.length) return { spans: [], counts: {}, first: null, last: null };

  const sorted = filtered
    .slice()
    .sort((a, b) => numTs(a, 0) - numTs(b, 0));

  const spansIdle = computeSpansForType(sorted, "agent_idle");
  const spansNA = computeSpansForType(sorted, "agent_not_avail_state");
  const spans = [...spansIdle, ...spansNA].sort((a, b) => a.startTs - b.startTs);

  const counts = sorted
    .filter((x) => x.enabled === true && ONLY_EVENTS.has(x.event))
    .reduce((c, x) => {
      c[x.event] = (c[x.event] || 0) + 1;
      return c;
    }, {});
  return { spans, counts, first: sorted[0], last: sorted[sorted.length - 1] };
}



function GridExample() {
  const { cdrData, agentStatusData, loading, error } = useContext(UserContext);

  const mergedData = useMemo(
    () => mergeAgentData(cdrData, agentStatusData) ?? [],
    [cdrData, agentStatusData]
  );

  console.log("mergedData",mergedData)

  const [filters, setFilters] = useState({ agentName: "", extension: "" });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cdrFilters") || "null");
      if (saved) {
        setFilters({
          agentName: saved.agentName || "",
          extension: saved.extension || "",
        });
      }
    } catch { }
    const handleUpdate = (e) => {
      setFilters({
        agentName: e.detail?.agentName || "",
        extension: e.detail?.extension || "",
      });
    };
    window.addEventListener("cdrFiltersChanged", handleUpdate);
    return () => window.removeEventListener("cdrFiltersChanged", handleUpdate);
  }, []);

  const tableRows = useMemo(() => {
    return (mergedData || []).map((row) => {
      const { spans, first, last } = buildSpansFromEvents(row?.cdrEvents || []);
      return {
        ext: row.ext || "-",
        name: row.name || "-",
        totalCalls: row?.statusData?.total_calls ?? 0,
        answeredCalls: row?.statusData?.answered_calls ?? 0,
        failedCalls: Math.floor(row?.statusData?.total_calls - row?.statusData?.answered_calls) ?? 0,
        ath: Math.floor((row?.statusData?.talked_time + row?.statusData?.wrap_up_time - row?.statusData?.hold_time) / (row?.statusData?.total_calls)) || 0,
        talkedTime: row?.statusData?.talked_time ?? 0,
        idleTime: row?.statusData?.idle_time ?? 0,
        wrapUpTime: row?.statusData?.wrap_up_time ?? 0,
        holdTime: row?.statusData?.hold_time ?? 0,
        firstSeen: first ? numTs(first) : null,
        lastSeen: last ? numTs(last) : null,
        spans,
      };
    });
  }, [mergedData]);

  const filteredRows = useMemo(() => {
    const nameQ = (filters.agentName || "").trim().toLowerCase();
    const extQ = (filters.extension || "").trim().toLowerCase();
    if (!nameQ && !extQ) return tableRows;

    return tableRows.filter((r) => {
      const nm = String(r.name || "").toLowerCase();
      const ex = String(r.ext || "").toLowerCase();
      const okName = nameQ ? nm.includes(nameQ) : true;
      const okExt = extQ ? ex.includes(extQ) : true;
      return okName && okExt;
    });
  }, [tableRows, filters]);

  if (error) return <Box sx={{ p: 2, color: "red" }}>Error: {String(error)}</Box>;

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <DownloadButton rows={filteredRows} filename="cdr_report.csv" />
      </Box>
      <TableContainer
        component={Paper}
        sx={{
          mt: 2,
          maxHeight: "75vh",
          borderRadius: 2,
          display: "flex",
          justifyContent: "center",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}
      >

        <Table
          stickyHeader
          size="small"
          sx={{
            tableLayout: "auto",
            width: "100%",
            borderCollapse: "collapse",
            "& .MuiTableCell-root": {
              border: "1px solid #ddd",
            },
          }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}> {/* light grey */}
              <TableCell sx={{ fontWeight: 700, color: "#fff", backgroundColor: "#666363f5",paddingLeft:15 }}>
                Ext
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#fff", backgroundColor: "#666363f5" }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#fff", backgroundColor: "#666363f5" }}>Total Calls</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#fff", backgroundColor: "#666363f5" }}>Answered</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#fff", backgroundColor: "#666363f5" }}>Failed Calls</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#fff", backgroundColor: "#666363f5" }}>AHT</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#fff", backgroundColor: "#666363f5" }}>Talked Time</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#fff", backgroundColor: "#666363f5" }}>Idle Time</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#fff", backgroundColor: "#666363f5" }}>Wrap Up</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#fff", backgroundColor: "#666363f5" }}>Hold Time</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 100, color: "#fff", backgroundColor: "#666363f5" }}>
                Intervals
              </TableCell>
            </TableRow>
          </TableHead>


          <TableBody>
            {loading && <Loader />} {filteredRows
              .slice()
              .sort((a, b) => String(a.name).localeCompare(String(b.name)))
              .map((row, i) => (
                <TableRow
                  key={`${row.ext}-${row.name}`}
                  sx={{
                    "&:nth-of-type(odd)": { bgcolor: "#fafafa" },
                    "&:hover": { bgcolor: "#f0f5ff" },
                  }}
                >
                  <TableCell sx={{ textAlign: "right" }}>
                    <Box sx={{ pl: 13 }}>{row.ext}</Box>
                  </TableCell>
                  <TableCell>
                    {row.name}
                    {/* <Box sx={{ fontSize: 11, color: "#777", mt: 0.5 }}>
                    Seen:&nbsp;
                    <b>{row.firstSeen ? formatTs(row.firstSeen) : "-"}</b>
                    &nbsp;→&nbsp;
                    <b>{row.lastSeen ? formatTs(row.lastSeen) : "-"}</b>
                  </Box> */}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>{row.totalCalls}</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>{row.answeredCalls}</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>{row.failedCalls}</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>{row.ath}</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>{formatDuration(row.talkedTime)}</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>{formatDuration(row.idleTime)}</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>{formatDuration(row.wrapUpTime)}</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>{formatDuration(row.holdTime)}</TableCell>

                  <TableCell sx={{ maxWidth: 400, p: 1 }}>
                    {row.spans?.length ? (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1.5,
                          overflowX: "auto", 
                          overflowY: "hidden",
                          whiteSpace: "nowrap",
                          p: 1,
                          borderRadius: 2,
                          bgcolor: "#ffffffff",
                        }}
                      >
                        {row.spans.map((s, idx) => (
                          <Box
                            key={`${row.ext}-${idx}`}
                            sx={{
                              flex: "0 0 auto",
                              minWidth: 260,
                              border: "1px solid #38cb6eff",
                              borderRadius: 2,
                              p: 1.25,
                              bgcolor: "#fff",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mb: 0.75,
                              }}
                            >
                              <Chip
                                size="small"
                                label={s?.start?.state || s?.end?.state || s.event}
                                sx={{
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  bgcolor:
                                    s.event === "agent_idle" ? "#e9f5ff" : "#fff2e8",
                                  border:
                                    s.event === "agent_idle"
                                      ? "1px solid #b4ddff"
                                      : "1px solid #ffd2b8",
                                }}
                              />
                              {/* <Box sx={{ fontSize: 11, color: "#555" }}>
                                {s.ext || row.ext || "-"}
                              </Box> */}
                            </Box>

                            <Tooltip
                              arrow
                              placement="top"
                              title={`${formatTs(s.startTs)} → ${formatTs(
                                s.endTs
                              )} (${formatDuration(s.durationSec)})`}
                            >
                              <Box sx={{ fontSize: 12, color: "#444" }}>
                                {formatTs(s.startTs)} → {formatTs(s.endTs)}
                                <br />
                                ({formatDuration(s.durationSec)})
                              </Box>
                            </Tooltip>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: "inline-block",
                          border: "1px dashed #dcdcdc",
                          borderRadius: 2,
                          px: 1.5,
                          py: 1,
                          color: "#777",
                          fontSize: 12,
                          bgcolor: "#fff",
                        }}
                      >
                        No intervals
                      </Box>
                    )}
                  </TableCell>

                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

export default GridExample;
