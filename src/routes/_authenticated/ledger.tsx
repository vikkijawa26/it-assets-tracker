import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
  Shield,
  LogOut,
  Tag,
  Upload,
  Printer,
  ClipboardCheck,
  History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ledger")({
  head: () => ({
    meta: [
      { title: "My assets — Asset Ledger" },
      {
        name: "description",
        content:
          "Scan asset QR codes, record location, owner and condition, then export your ledger to a spreadsheet.",
      },
      { property: "og:title", content: "My assets — Asset Ledger" },
      {
        property: "og:description",
        content:
          "Scan asset QR codes, record location, owner and condition, then export your ledger to a spreadsheet.",
      },
    ],
  }),
  component: AssetLedger,
});

type Status = "active" | "repair" | "storage" | "retired";

type Asset = {
  id?: string;
  tag: string;
  name: string;
  location: string;
  owner: string;
  notes: string;
  status: Status;
  updated_at: string;
};

type Checkout = {
  id: string;
  asset_id: string;
  user_id: string;
  checked_out_to: string;
  checked_out_at: string;
  returned_at: string | null;
  notes: string;
};

const STATUSES: { id: Status; label: string; cls: string; dot: string; bar: string }[] = [
  { id: "active", label: "Active", cls: "text-st-active bg-st-active/12", dot: "bg-st-active", bar: "bg-st-active" },
  { id: "repair", label: "In repair", cls: "text-st-repair bg-st-repair/12", dot: "bg-st-repair", bar: "bg-st-repair" },
  { id: "storage", label: "Storage", cls: "text-st-storage bg-st-storage/12", dot: "bg-st-storage", bar: "bg-st-storage" },
  { id: "retired", label: "Retired", cls: "text-st-retired bg-st-retired/12", dot: "bg-st-retired", bar: "bg-st-retired" },
];

const VALID_STATUS = new Set(STATUSES.map((s) => s.id));

const statusMeta = (s: Status) => STATUSES.find((x) => x.id === s)!;

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
  const navigate = useNavigate();
  const [tab, setTab] = useState<"scan" | "inventory" | "labels" | "reports">("scan");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [toast, setToast] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("assets")
      .select("id, tag, name, location, owner, notes, status, updated_at")
      .order("updated_at", { ascending: false });
    setAssets((data ?? []) as Asset[]);
  }, []);

  useEffect(() => {
    reload();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", u.user.id)
        .maybeSingle();
      if (prof) setUsername(prof.username);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
    })();
  }, [reload]);

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
          updated_at: new Date().toISOString(),
        },
      );
    },
    [assets],
  );

  const saveAsset = async (a: Asset) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const row = {
      user_id: u.user.id,
      tag: a.tag,
      name: a.name,
      location: a.location,
      owner: a.owner,
      notes: a.notes,
      status: a.status,
    };
    const { error } = await supabase.from("assets").upsert(row, { onConflict: "user_id,tag" });
    setEditing(null);
    if (error) return showToast("Could not save");
    await reload();
    showToast("Asset saved");
  };

  const removeAsset = async (asset: Asset) => {
    setEditing(null);
    if (asset.id) await supabase.from("assets").delete().eq("id", asset.id);
    await reload();
    showToast("Asset removed");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[520px] flex-col overflow-hidden">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-border px-[18px] pb-3.5 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="accent-dim flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-accent">
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-[16.5px] font-semibold leading-tight tracking-tight">
              Asset Ledger
            </h1>
            <p className="font-mono text-[11.5px] text-muted-foreground">{username}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-[9px] border border-border bg-surface px-2.5 py-2 text-muted-foreground"
            >
              <Shield className="h-4 w-4" />
            </Link>
          )}
          <button
            onClick={signOut}
            className="rounded-[9px] border border-border bg-surface px-2.5 py-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-[18px] pb-[90px] pt-[18px]">
        {tab === "scan" && <ScanTab onTag={openTag} />}
        {tab === "inventory" && <InventoryTab assets={assets} onOpen={(a) => setEditing(a)} />}
        {tab === "labels" && <LabelsTab assets={assets} onToast={showToast} />}
        {tab === "reports" && (
          <ReportsTab assets={assets} isAdmin={isAdmin} onToast={showToast} onReload={reload} />
        )}
      </main>

      <nav className="absolute inset-x-0 bottom-0 flex flex-shrink-0 border-t border-border bg-surface px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2">
        {(
          [
            { id: "scan", label: "Scan", Icon: QrCode },
            { id: "inventory", label: "Inventory", Icon: Boxes },
            { id: "labels", label: "Labels", Icon: Tag },
            { id: "reports", label: "Reports", Icon: Download },
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
          existing={Boolean(editing.id)}
          onClose={() => setEditing(null)}
          onSave={saveAsset}
          onDelete={removeAsset}
          onReload={reload}
          onToast={showToast}
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
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-[#05070A]">
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

function LabelsTab({ assets, onToast }: { assets: Asset[]; onToast: (m: string) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (tag: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });

  const allSelected = assets.length > 0 && selected.size === assets.length;
  const chosen = assets.filter((a) => selected.has(a.tag));

  if (assets.length === 0)
    return (
      <div className="px-5 py-12 text-center text-muted-foreground">
        <Tag className="mx-auto mb-3.5 h-9 w-9 opacity-60" />
        <p className="text-[13.5px]">No assets yet. Add some before printing labels.</p>
      </div>
    );

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <button
          onClick={() => setSelected(allSelected ? new Set() : new Set(assets.map((a) => a.tag)))}
          className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-muted-foreground"
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
        <span className="text-[13px] text-muted-foreground">{chosen.length} selected</span>
      </div>

      <div className="mb-5 max-h-[260px] overflow-y-auto rounded-[13px] border border-border bg-surface p-2">
        {assets.map((a) => (
          <label
            key={a.tag}
            className="flex cursor-pointer items-center gap-3 rounded-[9px] px-2.5 py-2 hover:bg-background"
          >
            <input
              type="checkbox"
              checked={selected.has(a.tag)}
              onChange={() => toggle(a.tag)}
              className="h-4 w-4 accent-[color:var(--accent)]"
            />
            <span className="font-mono text-[13px] text-muted-foreground">{a.tag}</span>
            <span className="flex-1 truncate text-[14px]">{a.name || "Unnamed asset"}</span>
          </label>
        ))}
      </div>

      <button
        onClick={() => {
          if (chosen.length === 0) return onToast("Select at least one asset");
          window.print();
        }}
        className="flex w-full items-center justify-center gap-2 rounded-[11px] border border-accent bg-accent px-4 py-3 text-[14.5px] font-semibold text-accent-foreground"
      >
        <Printer className="h-4 w-4" /> Print {chosen.length} label{chosen.length === 1 ? "" : "s"}
      </button>

      {/* Print area: shown only when printing */}
      <div className="print-area">
        {chosen.map((a) => (
          <div key={a.tag} className="label-card">
            <QRCodeSVG value={a.tag} size={120} level="M" />
            <div className="label-tag">{a.tag}</div>
            <div className="label-name">{a.name || "Unnamed asset"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bars({ items }: { items: { label: string; n: number; bar: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  if (items.length === 0)
    return <p className="text-[13px] text-muted-foreground">No data yet.</p>;
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span className="truncate text-muted-foreground">{i.label || "—"}</span>
            <span className="font-mono">{i.n}</span>
          </div>
          <div className="bar-track">
            <div className={`bar-fill ${i.bar}`} style={{ width: `${(i.n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsTab({
  assets,
  isAdmin,
  onToast,
  onReload,
}: {
  assets: Asset[];
  isAdmin: boolean;
  onToast: (m: string) => void;
  onReload: () => Promise<void>;
}) {
  const counts = useMemo(
    () => STATUSES.map((s) => ({ ...s, n: assets.filter((a) => a.status === s.id).length })),
    [assets],
  );

  const byStatus = useMemo(
    () => STATUSES.map((s) => ({ label: s.label, n: assets.filter((a) => a.status === s.id).length, bar: s.bar })),
    [assets],
  );
  const byLocation = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assets) m.set(a.location || "Unset", (m.get(a.location || "Unset") ?? 0) + 1);
    return [...m.entries()]
      .map(([label, n]) => ({ label, n, bar: "bg-accent" }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
  }, [assets]);
  const byOwner = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assets) m.set(a.owner || "Unassigned", (m.get(a.owner || "Unassigned") ?? 0) + 1);
    return [...m.entries()]
      .map(([label, n]) => ({ label, n, bar: "bg-accent" }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
  }, [assets]);

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
      "Last updated": new Date(a.updated_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assets");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `asset-ledger-${stamp}.${type}`, { bookType: type });
    onToast("Export downloaded");
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet([
      { Tag: "AST-00001", Name: "Dell Latitude 5540", Status: "active", Location: "Floor 3 — Lab B", Owner: "IT Team", Notes: "New" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "asset-import-template.xlsx");
  };

  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const mapped = rows
        .map((r) => {
          const get = (k: string) => String((r as Record<string, unknown>)[k] ?? "").trim();
          let status = get("Status").toLowerCase();
          if (!VALID_STATUS.has(status as Status)) status = "active";
          return {
            user_id: u.user!.id,
            tag: get("Tag") || get("tag"),
            name: get("Name") || get("name"),
            status,
            location: get("Location") || get("location"),
            owner: get("Owner") || get("owner"),
            notes: get("Notes") || get("notes"),
          };
        })
        .filter((r) => r.tag);
      if (mapped.length === 0) throw new Error("No rows with a Tag column found");
      const { error } = await supabase.from("assets").upsert(mapped, { onConflict: "user_id,tag" });
      if (error) throw new Error(error.message);
      await onReload();
      onToast(`Imported ${mapped.length} asset${mapped.length === 1 ? "" : "s"}`);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Import failed");
    }
    setImporting(false);
  };

  return (
    <div>
      <h2 className="mb-2.5 text-[13px] font-medium text-muted-foreground">Overview</h2>
      <div className="mb-6 flex flex-wrap gap-2.5">
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

      <h2 className="mb-2.5 text-[13px] font-medium text-muted-foreground">By status</h2>
      <div className="mb-6 rounded-[13px] border border-border bg-surface p-3.5">
        <Bars items={byStatus} />
      </div>

      <h2 className="mb-2.5 text-[13px] font-medium text-muted-foreground">By location</h2>
      <div className="mb-6 rounded-[13px] border border-border bg-surface p-3.5">
        <Bars items={byLocation} />
      </div>

      <h2 className="mb-2.5 text-[13px] font-medium text-muted-foreground">By owner</h2>
      <div className="mb-6 rounded-[13px] border border-border bg-surface p-3.5">
        <Bars items={byOwner} />
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
      <button
        onClick={() => window.print()}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[11px] border border-border bg-surface px-4 py-3 text-[14.5px] font-medium"
      >
        <Printer className="h-4 w-4" /> Print report (PDF)
      </button>

      {isAdmin && (
        <>
          <h2 className="mb-2.5 mt-7 text-[13px] font-medium text-muted-foreground">
            Bulk import (admin)
          </h2>
          <div className="rounded-[13px] border border-border bg-surface p-3.5">
            <p className="mb-3 text-[13px] text-muted-foreground">
              Upload a CSV or XLSX with columns: Tag, Name, Status, Location, Owner, Notes.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={importing}
                className="flex flex-1 items-center justify-center gap-2 rounded-[11px] border border-border bg-background px-4 py-3 text-[14px] font-medium disabled:opacity-60"
              >
                <Upload className="h-4 w-4" /> {importing ? "Importing…" : "Choose file"}
              </button>
              <button
                onClick={downloadTemplate}
                className="flex items-center justify-center rounded-[11px] border border-border bg-background px-4 py-3 text-[14px] text-muted-foreground"
              >
                Template
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
          </div>
        </>
      )}

      {/* Print-only report sheet */}
      <div className="print-report">
        <h1>Asset Ledger Report</h1>
        <p>Total assets: {assets.length}</p>
        <h2>By status</h2>
        {byStatus.map((s) => (
          <div key={s.label} className="rp-row">
            <span>{s.label}</span>
            <span>{s.n}</span>
          </div>
        ))}
        <h2>By location</h2>
        {byLocation.map((s) => (
          <div key={s.label} className="rp-row">
            <span>{s.label}</span>
            <span>{s.n}</span>
          </div>
        ))}
        <h2>By owner</h2>
        {byOwner.map((s) => (
          <div key={s.label} className="rp-row">
            <span>{s.label}</span>
            <span>{s.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetSheet({
  asset,
  existing,
  onClose,
  onSave,
  onDelete,
  onReload,
  onToast,
}: {
  asset: Asset;
  existing: boolean;
  onClose: () => void;
  onSave: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onReload: () => Promise<void>;
  onToast: (m: string) => void;
}) {
  const [draft, setDraft] = useState<Asset>(asset);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [coName, setCoName] = useState("");
  useEffect(() => setDraft(asset), [asset]);

  const loadCheckouts = useCallback(async () => {
    if (!asset.id) return setCheckouts([]);
    const { data } = await supabase
      .from("checkouts")
      .select("*")
      .eq("asset_id", asset.id)
      .order("checked_out_at", { ascending: false });
    setCheckouts((data ?? []) as Checkout[]);
  }, [asset.id]);

  useEffect(() => {
    loadCheckouts();
  }, [loadCheckouts]);

  const set = (k: keyof Asset, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const current = checkouts.find((c) => !c.returned_at);

  const doCheckout = async () => {
    if (!asset.id || !coName.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("checkouts").insert({
      asset_id: asset.id,
      user_id: u.user.id,
      checked_out_to: coName.trim(),
    });
    if (error) return onToast("Could not check out");
    await supabase.from("assets").update({ owner: coName.trim() }).eq("id", asset.id);
    setDraft((d) => ({ ...d, owner: coName.trim() }));
    setCoName("");
    await loadCheckouts();
    await onReload();
    onToast("Checked out");
  };

  const doReturn = async () => {
    if (!current) return;
    const { error } = await supabase
      .from("checkouts")
      .update({ returned_at: new Date().toISOString() })
      .eq("id", current.id);
    if (error) return onToast("Could not return");
    await supabase.from("assets").update({ owner: "" }).eq("id", asset.id!);
    setDraft((d) => ({ ...d, owner: "" }));
    await loadCheckouts();
    await onReload();
    onToast("Returned");
  };

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

        {existing && (
          <div className="mb-4 rounded-[12px] border border-border bg-surface p-3.5">
            <div className="mb-2.5 flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <ClipboardCheck className="h-4 w-4" /> Checkout
            </div>
            {current ? (
              <div>
                <p className="mb-2.5 text-[13.5px]">
                  Checked out to{" "}
                  <span className="font-semibold">{current.checked_out_to || "—"}</span>
                </p>
                <p className="mb-3 text-[12px] text-muted-foreground">
                  Since {new Date(current.checked_out_at).toLocaleString()}
                </p>
                <button
                  onClick={doReturn}
                  className="w-full rounded-[11px] border border-border bg-background px-4 py-2.5 text-[14px] font-medium"
                >
                  Mark returned
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={coName}
                  onChange={(e) => setCoName(e.target.value)}
                  placeholder="Check out to (name)"
                  className="w-full rounded-[10px] border border-border bg-background px-3 py-2.5 text-[14px] outline-none focus:border-accent"
                />
                <button
                  onClick={doCheckout}
                  className="rounded-[10px] border border-accent bg-accent px-4 text-[14px] font-semibold text-accent-foreground"
                >
                  Out
                </button>
              </div>
            )}

            {checkouts.length > 0 && (
              <div className="mt-3.5 border-t border-border pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <History className="h-3.5 w-3.5" /> History
                </div>
                <div className="space-y-2">
                  {checkouts.slice(0, 6).map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-[12.5px]">
                      <span>{c.checked_out_to || "—"}</span>
                      <span className="text-muted-foreground">
                        {c.returned_at
                          ? `Returned ${new Date(c.returned_at).toLocaleDateString()}`
                          : "Active"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onSave(draft)}
          className="mt-1 w-full rounded-[11px] border border-accent bg-accent px-4 py-3 text-[14.5px] font-semibold text-accent-foreground"
        >
          {existing ? "Save changes" : "Add to ledger"}
        </button>
        {existing && (
          <button
            onClick={() => onDelete(draft)}
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
