import React, { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "../../context/ContextProvider";
import "./TableData.css";

function TableData() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [agentName, setAgentName] = useState("");
  const [extension, setExtension] = useState("");

  const { fetchAllCDRs, fetchAgentStausData } = useContext(UserContext);
  const firstRun = useRef(true);

  function toDubaiUnix(dateString) {
    if (!dateString) return null;
    const [datePart, timePart = "00:00:00"] = dateString.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, second = 0] = timePart.split(":").map(Number);

    const dubaiDate = new Date(
      Date.UTC(year, month - 1, day, hour - 4, minute, second)
    );
    return Math.floor(dubaiDate.getTime() / 1000);
  }

  // Load filters from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cdrFilters") || "null");
      if (saved) {
        setAgentName(saved.agentName || "");
        setExtension(saved.extension || "");
      }
    } catch { }
  }, []);

  // Save filters to localStorage + dispatch event
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const filters = { agentName: agentName.trim(), extension: extension.trim() };
    localStorage.setItem("cdrFilters", JSON.stringify(filters));
    window.dispatchEvent(new CustomEvent("cdrFiltersChanged", { detail: filters }));
  }, [agentName, extension]);

  const handleFilterDates = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }
    const startUnix = toDubaiUnix(startDate);
    const endUnix = toDubaiUnix(endDate);
    if (startUnix > endUnix) {
      alert("Start date must be earlier than end date.");
      return;
    }

    localStorage.setItem("dates", JSON.stringify({ startUnix, endUnix }));
    window.dispatchEvent(
      new CustomEvent("cdrDatesChanged", { detail: { startUnix, endUnix } })
    );
    await fetchAgentStausData(startUnix, endUnix);
    await fetchAllCDRs(startUnix, endUnix);
  };

  const handleClearInstant = () => {
    setAgentName("");
    setExtension("");
    const cleared = { agentName: "", extension: "" };
    localStorage.setItem("cdrFilters", JSON.stringify(cleared));
    window.dispatchEvent(new CustomEvent("cdrFiltersChanged", { detail: cleared }));
  };

  const onDateKeyDown = (e) => {
    if (e.key === "Enter") handleFilterDates();
  };

  return (
    <div className="flt-wrap">
      {/* First row: Date inputs */}
      <div className="flt-row">
        <input
          className="inp inp-date"
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          onKeyDown={onDateKeyDown}
          title="Start (Dubai)"
        />
        <input
          className="inp inp-date"
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          onKeyDown={onDateKeyDown}
          title="End (Dubai)"
        />
      </div>

      {/* Second row: Filters */}


      <div className="flt-row">

        <input
          className="inp sm"
          type="text"
          placeholder="Extension"
          value={extension}
          onInput={(e) => setExtension(e.target.value)}
          autoComplete="off"
          inputMode="numeric"
          spellCheck={false}
        />
        <input
          className="inp sm"
          type="text"
          placeholder="Agent Name"
          value={agentName}
          onInput={(e) => setAgentName(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />

      </div>

      {/* Centered buttons */}
      <div className="btns">
        <button className="btn primary" onClick={handleFilterDates}>
          Fetch
        </button>

      </div>
    </div>
  );
}

export default TableData;
