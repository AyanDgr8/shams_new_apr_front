import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { formatDuration, formatTs } from "../../utils/Util";

function buildSpansFromEvents(events) {
  const filtered = (events || []).filter(
    (e) => e && e.username && ONLY_EVENTS.has(e.event)
  );
  if (!filtered.length) return { spans: [] };

  const sorted = filtered.slice().sort((a, b) => numTs(a, 0) - numTs(b, 0));

  const spansIdle = computeSpansForType(sorted, "agent_idle");
  const spansNA = computeSpansForType(sorted, "agent_not_avail_state");
  const spans = [...spansIdle, ...spansNA].sort((a, b) => a.startTs - b.startTs);

  return { spans };
}

function safe(val) {
  return val ? `"${String(val)}"` : '""';
}

function DownloadButton({ rows, filename = "cdr_report.csv" }) {
  const handleDownload = () => {
    if (!rows?.length) return;

    const headers = [
      "RowType",
      "Ext",
      "Name",
      "Total Calls",
      "Answered Calls",
      "Failed Calls",
      "AHT",
      "Talked Time",
      "Idle Time",
      "Wrap Up Time",
      "Hold Time",
      "From",
      "To",
      "Duration",
      "Status",
    ];

    const csvRows = [headers.join(",")];

    rows.forEach((r) => {
      const spans = r.spans && r.spans.length
        ? r.spans
        : buildSpansFromEvents(r.events || []).spans;

      // Summary row
      csvRows.push([
        "Summary",
        safe(r.ext),
        safe(r.name),
        safe(r.totalCalls),
        safe(r.answeredCalls),
        safe(r.failedCalls),
        safe(r.ath),
        safe(formatDuration(r.talkedTime)),
        safe(formatDuration(r.idleTime)),
        safe(formatDuration(r.wrapUpTime)),
        safe(formatDuration(r.holdTime)),
        '""','""','""','""' // placeholders
      ].join(","));

      // Interval rows
      if (spans.length) {
        spans.forEach((s) => {
            console.log(s)
          csvRows.push([
            "Interval",
            safe(r.ext),
            safe(r.name),
            '""','""','""','""','""','""','""','""',
            safe(formatTs(s.startTs)),
            safe(formatTs(s.endTs)),
            safe(formatDuration(s.durationSec)),
            safe(s?.start?.state||s?.end?.state),
          ].join(","));
        });
      } else {
        csvRows.push([
          "Interval",
          safe(r.ext),
          safe(r.name),
          '""','""','""','""','""','""','""','""',
          safe("No intervals"),
          '""','""','""'
        ].join(","));
      }
    });

    const csv = csvRows.join("\n");

    // download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Tooltip title="Download Report">
      <IconButton
        onClick={handleDownload}
        sx={{
          color: "#1976d2",
          bgcolor: "rgba(25,118,210,0.08)",
          "&:hover": { bgcolor: "rgba(25,118,210,0.15)" },
        }}
      >
        <DownloadIcon />
      </IconButton>
    </Tooltip>
  );
}

export default DownloadButton;
