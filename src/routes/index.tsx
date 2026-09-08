import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QrCode,
  Boxes,
  Download,
  Search,
  Camera,
  CameraOff,
  PackageOpen,
  Trash2,
  Plus,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Asset Ledger — Scan & Track Equipment" },
      {
        name: "description",
        content:
          "Scan asset QR codes, record location, owner and condition, then export the full ledger to a spreadsheet.",
      },
      { property: "og:title", content: "Asset Ledger — Scan & Track Equipment" },
      {
        property: "og:description",
        content:
          "Scan asset QR codes, record location, owner and condition, then export the full ledger to a spreadsheet.",
      },
    ],
  }),
  component: AssetLedger,
});

type Status = "active" | "repair" | "storage" | "retired";

type Asset = {
  tag: string;
  name: string;
  location: string;
  owner: string;
  notes: string;
  status: Status;
  updatedAt: string;
};

const STATUSES: { id: Status; label: string; cls: string; dot: string }[] = [
  { id: "active", label: "Active", cls: "text-st-active bg-st-active/12", dot: "bg-st-active" },
  { id: "repair", label: "In repair", cls: "text-st-repair bg-st-repair/12", dot: "bg-st-repair" },
  { id: "storage", label: "Storage", cls: "text-st-storage bg-st-storage/12", dot: "bg-st-storage" },
  { id: "retired", label: "Retired", cls: "text-st-retired bg-st-retired/12", dot: "bg-st-retired" },
];

const statusMeta = (s: Status) => STATUSES.find((x) => x.id === s)!;
const STORAGE_KEY = "asset-ledger:v1";

function StatusBadge({ status }: { status: Status }) {
  const m = statusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${m.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function AssetLedger() {
  const [tab, setTab] = useState<"scan" | "inventory" | "export">("scan");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAssets(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  }, [assets, loaded]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const openTag = useCallback(
    (tag: string) => {
      const existing = assets.find((a) => a.tag === tag);
      setEditing(
        existing ?? {
          tag,
          name: "",
          location: "",
          owner: "",
          notes: "",
          status: "active",
          updatedAt: new Date().toISOString(),
        },
      );
    },
    [assets],
  );

  const saveAsset = (a: Asset) => {
    const record = { ...a, updatedAt: new Date().toISOString() };
    setAssets((prev) => {
      const i = prev.findIndex((x) => x.tag === record.tag);
      if (i === -1) return [record, ...prev];
      const next = [...prev];
      next[i] = record;
      return next;
    });
    setEditing(null);
    showToast("Asset saved");
  };

  const removeAsset = (tag: string) => {
    setAssets((prev) => prev.filter((a) => a.tag !== tag));
    setEditing(null);
    showToast("Asset removed");
  };

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[520px] flex-col overflow-hidden">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-border px-[18px] pb-3.5 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="accent-dim flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-accent">
            <Boxes className="h-4 w-4" />
          </div>
          <h1 className="text-[16.5px] font-semibold tracking-tight">Asset Ledger</h1>
        </div>
        <span className="rounded-full border border-border bg-surface px-2.5 py-[5px] font-mono text-[12.5px] text-muted-foreground">
          {assets.length} {assets.length === 1 ? "asset" : "assets"}
        </span>
      </header>

      <main className="flex-1 overflow-y-auto px-[18px] pb-[90px] pt-[18px]">
        {tab === "scan" && <ScanTab onTag={openTag} />}
        {tab === "inventory" && <InventoryTab assets={assets} onOpen={(a) => setEditing(a)} />}
        {tab === "export" && <ExportTab assets={assets} onToast={showToast} />}
      </main>

      <nav className="absolute inset-x-0 bottom-0 flex flex-shrink-0 border-t border-border bg-surface px-2.5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2">
        {(
          [
            { id: "scan", label: "Scan", Icon: QrCode },
            { id: "inventory", label: "Inventory", Icon: Boxes },
            { id: "export", label: "Export", Icon: Download },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-[10px] px-0 pb-1 pt-1.5 text-[11.5px] ${
              tab === id ? "text-accent" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-[22px] w-[22px]" />
            {label}
          </button>
        ))}
      </nav>

      {editing && (
        <AssetSheet
          asset={editing}
          existing={assets.some((a) => a.tag === editing.tag)}
          onClose={() => setEditing(null)}
          onSave={saveAsset}
          onDelete={removeAsset}
        />
      )}

      <div
        className={`pointer-events-none absolute bottom-[100px] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-surface-raised px-[18px] py-[11px] text-[13.5px] transition-all duration-200 ${
          toast ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
        }`}
      >
        {toast}
      </div>
    </div>
  );
}

function ScanTab({ onTag }: { onTag: (tag: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState("Point the camera at an asset QR code.");
  const [found, setFound] = useState(false);
  const [manual, setManual] = useState("");

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    try {
      setStatus("Starting camera…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setLive(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus("Scanning…");

      const jsQR = (await import("jsqr")).default;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      const tick = () => {
        if (!streamRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (code?.data) {
            setFound(true);
            setStatus(`Found ${code.data}`);
            stop();
            onTag(code.data.trim());
            setTimeout(() => setFound(false), 1500);
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setStatus("Camera unavailable — enter the asset tag manually below.");
      stop();
    }
  };

  return (
    <div>
      <div
        className={`relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-[#05070A] ${live ? "" : ""}`}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${live ? "block" : "hidden"}`}
        />
        {live ? (
          <div className="pointer-events-none absolute inset-[14%] rounded-[14px] border-2 border-accent opacity-90" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 p-8 text-center">
            <Camera className="h-[46px] w-[46px] text-muted-foreground" />
            <p className="max-w-[220px] text-[13.5px] text-muted-foreground">
              Scan an asset QR code to look it up or add it to the ledger.
            </p>
          </div>
        )}
      </div>

      <p
        className={`mt-3.5 min-h-5 text-center text-[13.5px] ${found ? "font-semibold text-accent" : "text-muted-foreground"}`}
      >
        {status}
      </p>

      <div className="mt-3 flex gap-2.5">
        {live ? (
          <button
            onClick={() => {
              stop();
              setStatus("Camera stopped.");
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-[11px] border border-border bg-surface px-4 py-3 text-[14.5px] font-medium"
          >
            <CameraOff className="h-4 w-4" /> Stop
          </button>
        ) : (
          <button
            onClick={start}
            className="flex flex-1 items-center justify-center gap-2 rounded-[11px] border border-accent bg-accent px-4 py-3 text-[14.5px] font-semibold text-accent-foreground"
          >
            <Camera className="h-4 w-4" /> Start camera
          </button>
        )}
      </div>

      <h2 className="mb-2.5 mt-[22px] text-[13px] font-medium text-muted-foreground">
        Or enter a tag manually
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!manual.trim()) return;
          onTag(manual.trim());
          setManual("");
        }}
        className="flex gap-2.5"
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="e.g. AST-00421"
          className="w-full rounded-[11px] border border-border bg-surface px-3.5 py-3 font-mono text-[14px] outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="flex items-center justify-center rounded-[11px] border border-border bg-surface px-4"
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}

function InventoryTab({ assets, onOpen }: { assets: Asset[]; onOpen: (a: Asset) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assets.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (!needle) return true;
      return [a.tag, a.name, a.location, a.owner].join(" ").toLowerCase().includes(needle);
    });
  }, [assets, q, filter]);

  return (
    <div>
      <div className="mb-3.5 flex items-center gap-2 rounded-[11px] border border-border bg-surface px-3.5 py-2.5">
        <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tag, name, location, owner"
          className="w-full bg-transparent text-[14px] outline-none"
        />
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-0.5">
        {([{ id: "all", label: "All" }, ...STATUSES] as const).map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id as Status | "all")}
            className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] ${
              filter === s.id
                ? "accent-dim border-transparent text-accent"
                : "border-border bg-surface text-muted-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="px-5 py-12 text-center text-muted-foreground">
          <PackageOpen className="mx-auto mb-3.5 h-9 w-9 opacity-60" />
          <p className="text-[13.5px]">
            {assets.length === 0
              ? "No assets yet. Scan a code to add your first one."
              : "No assets match this search."}
          </p>
        </div>
      ) : (
        list.map((a) => (
          <button
            key={a.tag}
            onClick={() => onOpen(a)}
            className="mb-2.5 w-full rounded-[13px] border border-border bg-surface px-[15px] py-3.5 text-left"
          >
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <span className="font-mono text-[13px] text-muted-foreground">{a.tag}</span>
              <StatusBadge status={a.status} />
            </div>
            <div className="mb-0.5 text-[15px] font-semibold">{a.name || "Unnamed asset"}</div>
            <div className="text-[13px] text-muted-foreground">
              {[a.location, a.owner].filter(Boolean).join(" · ") || "No location set"}
            </div>
          </button>
        ))
      )}
    </div>
  );
}

function ExportTab({ assets, onToast }: { assets: Asset[]; onToast: (m: string) => void }) {
  const counts = useMemo(
    () =>
      STATUSES.map((s) => ({ ...s, n: assets.filter((a) => a.status === s.id).length })),
    [assets],
  );

  const exportFile = async (type: "xlsx" | "csv") => {
    if (assets.length === 0) return onToast("Nothing to export yet");
    const XLSX = await import("xlsx");
    const rows = assets.map((a) => ({
      Tag: a.tag,
      Name: a.name,
      Status: statusMeta(a.status).label,
      Location: a.location,
      Owner: a.owner,
      Notes: a.notes,
      "Last updated": new Date(a.updatedAt).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assets");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `asset-ledger-${stamp}.${type}`, { bookType: type });
    onToast("Export downloaded");
  };

  return (
    <div>
      <h2 className="mb-2.5 text-[13px] font-medium text-muted-foreground">Overview</h2>
      <div className="mb-[22px] flex flex-wrap gap-2.5">
        <div className="min-w-[100px] flex-1 rounded-[13px] border border-border bg-surface p-3.5">
          <div className="font-mono text-2xl font-semibold">{assets.length}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Total</div>
        </div>
        {counts.map((c) => (
          <div
            key={c.id}
            className="min-w-[100px] flex-1 rounded-[13px] border border-border bg-surface p-3.5"
          >
            <div className="font-mono text-2xl font-semibold">{c.n}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-2.5 text-[13px] font-medium text-muted-foreground">Download</h2>
      <button
        onClick={() => exportFile("xlsx")}
        className="flex w-full items-center justify-center gap-2 rounded-[11px] border border-accent bg-accent px-4 py-3 text-[14.5px] font-semibold text-accent-foreground"
      >
        <Download className="h-4 w-4" /> Export spreadsheet (.xlsx)
      </button>
      <button
        onClick={() => exportFile("csv")}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[11px] border border-border bg-surface px-4 py-3 text-[14.5px] font-medium"
      >
        <Download className="h-4 w-4" /> Export CSV
      </button>
    </div>
  );
}

function AssetSheet({
  asset,
  existing,
  onClose,
  onSave,
  onDelete,
}: {
  asset: Asset;
  existing: boolean;
  onClose: () => void;
  onSave: (a: Asset) => void;
  onDelete: (tag: string) => void;
}) {
  const [draft, setDraft] = useState<Asset>(asset);
  useEffect(() => setDraft(asset), [asset]);

  const set = (k: keyof Asset, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <>
      <div className="absolute inset-0 z-20 bg-black/55" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 z-30 max-h-[88%] overflow-y-auto rounded-t-[20px] border border-b-0 border-border bg-surface-raised px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-2.5">
        <div className="mx-auto mb-4 mt-2 h-1 w-9 rounded-[3px] bg-border" />
        <div className="font-mono text-xl font-semibold text-accent">{draft.tag}</div>
        <p className="mb-5 text-[12.5px] text-muted-foreground">
          {existing ? "Editing existing asset" : "New asset — fill in the details"}
        </p>

        <div className="mb-3.5">
          <label className="mb-1.5 block text-[12.5px] text-muted-foreground">Asset name</label>
          <input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Dell Latitude 5540"
            className="w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-[14.5px] outline-none focus:border-accent"
          />
        </div>

        <div className="mb-3.5">
          <label className="mb-1.5 block text-[12.5px] text-muted-foreground">Status</label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => {
              const on = draft.status === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => set("status", s.id)}
                  className={`min-w-[44%] flex-1 rounded-[10px] border px-2 py-2.5 text-center text-[13.5px] ${
                    on ? `${s.cls} border-current` : "border-border text-muted-foreground"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3.5">
          <label className="mb-1.5 block text-[12.5px] text-muted-foreground">Location</label>
          <input
            value={draft.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Floor 3 — Lab B"
            className="w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-[14.5px] outline-none focus:border-accent"
          />
        </div>

        <div className="mb-3.5">
          <label className="mb-1.5 block text-[12.5px] text-muted-foreground">Assigned to</label>
          <input
            value={draft.owner}
            onChange={(e) => set("owner", e.target.value)}
            placeholder="Name or team"
            className="w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-[14.5px] outline-none focus:border-accent"
          />
        </div>

        <div className="mb-3.5">
          <label className="mb-1.5 block text-[12.5px] text-muted-foreground">Notes</label>
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Condition, service history, anything else"
            className="min-h-[60px] w-full resize-none rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-[14.5px] outline-none focus:border-accent"
          />
        </div>

        <button
          onClick={() => onSave(draft)}
          className="mt-1 w-full rounded-[11px] border border-accent bg-accent px-4 py-3 text-[14.5px] font-semibold text-accent-foreground"
        >
          {existing ? "Save changes" : "Add to ledger"}
        </button>
        {existing && (
          <button
            onClick={() => onDelete(draft.tag)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-[11px] px-4 py-3 text-[14px] text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Remove asset
          </button>
        )}
        <button
          onClick={onClose}
          className="mt-1 w-full rounded-[11px] px-4 py-3 text-[14px] text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </>
  );
}
