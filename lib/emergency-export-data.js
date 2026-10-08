import { getOutageDivisions } from "./outage-config.js";
import {
  getLatestOutageSnapshot,
  normalizeOutageSourceLabel
} from "./outage-data.js";

export async function getEmergencyExportDataset(config) {
  const [divisions, sourceState] = await Promise.all([
    getOutageDivisions(),
    getLatestOutageSnapshot()
  ]);

  const snapshot = sourceState.snapshot;
  const selectedIds = new Set(
    Array.isArray(config?.includeDivisionIds)
      ? config.includeDivisionIds.map((value) => String(value || "").toLowerCase())
      : []
  );
  const selectedDivisions = selectedIds.size
    ? divisions.filter((division) => selectedIds.has(String(division.id || "").toLowerCase()))
    : divisions;

  const rows = [];
  const seen = new Set();

  for (const division of selectedDivisions) {
    const sources = Array.isArray(division?.sources) ? division.sources : [];
    for (const source of sources) {
      const sourceRow = snapshot?.rows?.[normalizeOutageSourceLabel(source)];
      if (!sourceRow) continue;

      const outages = Array.isArray(sourceRow.outages) ? sourceRow.outages : [];
      for (const outage of outages) {
        const identity = [
          String(division.id || ""),
          normalizeOutageSourceLabel(sourceRow.label || source),
          String(outage?.id || ""),
          String(outage?.createdAt || "")
        ].join("|");
        if (seen.has(identity)) continue;
        seen.add(identity);

        rows.push({
          divisionId: String(division.id || ""),
          divisionName: String(division.name || ""),
          sourceLabel: String(sourceRow.label || source || ""),
          outageId: String(outage?.id || ""),
          createdAt: String(outage?.createdAt || ""),
          createdBy: String(outage?.createdBy || ""),
          equipment: String(outage?.equipment || ""),
          energyObject: String(outage?.energyObject || ""),
          disconnectedObjects: Array.isArray(outage?.disconnectedObjects)
            ? outage.disconnectedObjects.map((item) => String(item || "").trim()).filter(Boolean)
            : [],
          appeals: Number(outage?.appeals || 0)
        });
      }
    }
  }

  return {
    rows,
    divisions,
    sourceState: {
      configured: Boolean(sourceState.configured),
      status: sourceState.status,
      message: sourceState.message || "",
      stale: Boolean(sourceState.stale),
      sourceUpdatedAt: snapshot?.sourceUpdatedAt || "",
      total: snapshot?.reportedTotal ?? snapshot?.emergencyTotal ?? null,
      totalAppeals: snapshot?.totalAppeals ?? 0
    }
  };
}
