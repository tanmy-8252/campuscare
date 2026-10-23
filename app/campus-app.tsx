"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  Cloud,
  Droplets,
  Filter,
  HardHat,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  MapPin,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Users,
  Wrench,
  X,
  Zap,
  AlertCircle,
  ChartNoAxesCombined,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import {
  categories,
  zones,
  statuses,
  closed,
  type Category,
  type Issue,
  type Role,
  type Workspace,
} from "./domain";
type Data = Workspace & { cloudinaryReady: boolean };
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const categoryIcons: Record<Category, LucideIcon> = {
  Electrical: Zap,
  Plumbing: Droplets,
  Sanitation: Trash2,
  Infrastructure: Wrench,
  Other: ClipboardList,
};
const date = (
  v: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    ...options,
  }).format(new Date(v));
const initials = (s: string) =>
  s
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
const statusClass = (s: string) => s.toLowerCase().replaceAll(" ", "-");
const todayKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const d = ref.current;
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Badge({ status }: { status: string }) {
  return (
    <span className={"badge " + statusClass(status)}>
      <i />
      {status}
    </span>
  );
}
function CategoryIcon({ category }: { category: Category }) {
  const Icon = categoryIcons[category];
  return (
    <span className={"category-icon " + category.toLowerCase()}>
      <Icon size={18} />
    </span>
  );
}
function PhotoField({
  target,
  photo,
  ready,
  uploading,
  onRemove,
  onUpload,
}: {
  target: "report" | "completion";
  photo: string | null;
  ready: boolean;
  uploading: boolean;
  onRemove: () => void;
  onUpload: (file: File | undefined) => void;
}) {
  return (
    <div className="photo-field">
      {photo ? (
        <div className="photo-preview">
          <img
            src={photo.replace("/upload/", "/upload/f_auto,q_auto,w_800/")}
            alt={target === "report" ? "Issue photo" : "Repair completion photo"}
          />
          <button type="button" className="small-button" onClick={onRemove}>
            Remove photo
          </button>
        </div>
      ) : (
        <label className={"upload-zone " + (!ready ? "unavailable" : "")}>
          <Camera size={24} />
          <strong>{uploading ? "Uploading photo…" : "Add a photo"}</strong>
          <span>
            {ready
              ? "Take a photo or choose an image · up to 10 MB"
              : "Cloudinary setup pending · photos are optional"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            disabled={!ready || uploading}
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}

export default function CampusApp() {
  const [data, setData] = useState<Data | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [role, setRole] = useState<Role>("admin"),
    [view, setView] = useState("overview"),
    [workerId, setWorkerId] = useState("w1");
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("All statuses"),
    [category, setCategory] = useState("All categories"),
    [zone, setZone] = useState("All locations");
  const [modal, setModal] = useState<string | null>(null),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
      null,
    );
  const [reportCategory, setReportCategory] = useState<Category>("Electrical"),
    [reportZone, setReportZone] = useState<string>("Academic Block"),
    [reportPhoto, setReportPhoto] = useState<string | null>(null),
    [completionPhoto, setCompletionPhoto] = useState<string | null>(null),
    [uploading, setUploading] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null),
    [offline, setOffline] = useState(false),
    [month, setMonth] = useState(() => todayKey(new Date()).slice(0, 7));
  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const body = (await response.json()) as Data & { error?: string };
      if (!response.ok)
        throw new Error(body.error || "Unable to load workspace.");
      setData(body);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to connect.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    const onNetwork = () => setOffline(!navigator.onLine);
    onNetwork();
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("online", onNetwork);
    window.addEventListener("offline", onNetwork);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("online", onNetwork);
      window.removeEventListener("offline", onNetwork);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  async function run(payload: Record<string, unknown>, success: string) {
    if (busy) return false;
    setBusy(true);
    try {
      const r = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const b = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(b.error || "Unable to save.");
      await load(true);
      setToast({ text: success });
      return true;
    } catch (e) {
      setToast({
        text: e instanceof Error ? e.message : "Unable to save. Please retry.",
        error: true,
      });
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function upload(
    file: File | undefined,
    target: "report" | "completion",
  ) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setToast({ text: "Choose an image smaller than 10 MB.", error: true });
      return;
    }
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ].includes(file.type)
    ) {
      setToast({
        text: "Choose a JPG, PNG, WebP, or HEIC image.",
        error: true,
      });
      return;
    }
    setUploading(true);
    try {
      const sign = await fetch("/api/upload", { method: "POST" });
      const s = (await sign.json()) as Record<string, string | number>;
      if (!sign.ok) throw new Error(String(s.error));
      const form = new FormData();
      form.append("file", file);
      for (const k of ["timestamp", "signature", "folder", "allowed_formats"])
        form.append(k, String(s[k]));
      form.append("api_key", String(s.apiKey));
      const r = await fetch(
        "https://api.cloudinary.com/v1_1/" + s.cloudName + "/image/upload",
        { method: "POST", body: form },
      );
      const result = (await r.json()) as {
        secure_url?: string;
        error?: { message?: string };
      };
      if (!r.ok || !result.secure_url)
        throw new Error(result.error?.message || "Photo upload failed.");
      if (target === "report") setReportPhoto(result.secure_url);
      else setCompletionPhoto(result.secure_url);
      setToast({ text: "Photo uploaded to Cloudinary." });
    } catch (e) {
      setToast({
        text: e instanceof Error ? e.message : "Photo upload failed.",
        error: true,
      });
    } finally {
      setUploading(false);
    }
  }
  function navigate(next: string) {
    setView(next);
    setQuery("");
    setStatus("All statuses");
    setCategory("All categories");
    setZone("All locations");
  }
  function openIssue(id: string) {
    setSelectedId(id);
    setCompletionPhoto(null);
  }
  function newReport() {
    setReportPhoto(null);
    setReportCategory("Electrical");
    setReportZone("Academic Block");
    setModal("report");
  }
  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
    } else setModal("install");
  }
  const issues = data?.issues ?? [],
    workers = data?.workers ?? [],
    selected = issues.find((i) => i.id === selectedId);
  const active = issues.filter((i) => !closed(i)),
    unassigned = issues.filter((i) => i.status === "Reported"),
    resolved = issues.filter(closed);
  const monthly = issues.filter((i) =>
    todayKey(new Date(i.createdAt)).startsWith(month),
  );
  const myIssues = issues.filter((i) => i.reporter === "You"),
    jobs = issues.filter((i) => i.workerId === workerId);
  let base =
    role === "worker"
      ? jobs
      : role === "resident" && view === "my-reports"
        ? myIssues
        : issues;
  const filtered = base.filter(
    (i) =>
      (status === "All statuses" ||
        (status === "Completed" && closed(i)) ||
        (status === "Active work" &&
          ["Assigned", "In progress"].includes(i.status)) ||
        i.status === status) &&
      (category === "All categories" || i.category === category) &&
      (zone === "All locations" || i.zone === zone) &&
      (!query ||
        [i.id, i.title, i.zone, i.location, i.category, i.reporter]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const preview = filtered.slice(0, 6);
  const nav =
    role === "admin"
      ? [
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "issues", label: "All issues", icon: ClipboardList },
          { id: "map", label: "Campus map", icon: MapPin },
          { id: "team", label: "Maintenance team", icon: Users },
          {
            id: "analytics",
            label: "Reports & insights",
            icon: ChartNoAxesCombined,
          },
        ]
      : role === "resident"
        ? [
            { id: "overview", label: "Campus feed", icon: LayoutDashboard },
            { id: "my-reports", label: "My reports", icon: ClipboardList },
            { id: "issues", label: "All issues", icon: Wrench },
            { id: "map", label: "Campus map", icon: MapPin },
          ]
        : [
            { id: "overview", label: "My workday", icon: LayoutDashboard },
            { id: "issues", label: "Assigned jobs", icon: Wrench },
            { id: "map", label: "Campus map", icon: MapPin },
          ];
  const label =
    nav.find((n) => n.id === view)?.label ??
    (view === "settings" ? "App & integrations" : "All issues");
  function IssueTable({ rows }: { rows: Issue[] }) {
    return rows.length ? (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Issue details</th>
              <th>Location</th>
              <th>Status</th>
              <th>Assigned to</th>
              <th>Reported</th>
              <th aria-label="Open issue" />
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} onClick={() => openIssue(i.id)}>
                <td>
                  <button
                    className="issue-title-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openIssue(i.id);
                    }}
                  >
                    <CategoryIcon category={i.category} />
                    <span>
                      <strong>{i.title}</strong>
                      <small>
                        {i.id}
                        <span>·</span>
                        {i.category}
                        <span>·</span>
                        <em className={"priority " + i.priority.toLowerCase()}>
                          {i.priority} priority
                        </em>
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  <span className="table-location">{i.zone}</span>
                  <small>{i.location}</small>
                </td>
                <td>
                  <Badge status={i.status} />
                </td>
                <td>
                  {i.workerId ? (
                    <span className="worker-name">
                      <span className="avatar tiny">
                        {initials(
                          workers.find((w) => w.id === i.workerId)?.name ??
                            "Team",
                        )}
                      </span>
                      {workers.find((w) => w.id === i.workerId)?.name}
                    </span>
                  ) : (
                    <span className="muted">Unassigned</span>
                  )}
                </td>
                <td className="date-cell">{date(i.createdAt)}</td>
                <td>
                  <ChevronRight size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="empty-state">
        <CheckCircle2 size={32} />
        <h3>No issues here</h3>
        <p>Try another filter, or report something that needs attention.</p>
        <button
          className="secondary"
          onClick={() => {
            setQuery("");
            setStatus("All statuses");
            setCategory("All categories");
            setZone("All locations");
          }}
        >
          Clear filters
        </button>
      </div>
    );
  }
  function Chart({ full = false }: { full?: boolean }) {
    const parts = month.split("-").map(Number),
      days = new Date(parts[0], parts[1], 0).getDate();
    const points = Array.from({ length: days }, (_, i) => {
      const key = month + "-" + String(i + 1).padStart(2, "0");
      return {
        day: i + 1,
        reported: monthly.filter((x) => todayKey(new Date(x.createdAt)) === key)
          .length,
        resolved: issues.filter(
          (x) => closed(x) && todayKey(new Date(x.updatedAt)) === key,
        ).length,
      };
    });
    const max = Math.max(
      3,
      ...points.map((p) => Math.max(p.reported, p.resolved)),
    );
    return (
      <div className={"chart " + (full ? "full-chart" : "")}>
        <div className="chart-grid">
          {[max, Math.round(max / 2), 0].map((n, i) => (
            <div key={i} className="grid-line">
              <span>{n}</span>
            </div>
          ))}
        </div>
        <div className="bars">
          {points.map((p) => (
            <div
              className="bar-day"
              key={p.day}
              title={
                p.day +
                ": " +
                p.reported +
                " reported, " +
                p.resolved +
                " resolved"
              }
            >
              <div className="bar-pair">
                <i style={{ height: (p.reported / max) * 100 + "%" }} />
                <i style={{ height: (p.resolved / max) * 100 + "%" }} />
              </div>
              <small>{p.day === 1 || p.day % 5 === 0 ? p.day : ""}</small>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <span>
            <i />
            Reported
          </span>
          <span>
            <i />
            Resolved / confirmed
          </span>
          <small>Daily issue count</small>
        </div>
      </div>
    );
  }
  function downloadCSV() {
    const quote = (s: unknown) =>
      '"' + String(s ?? "").replaceAll('"', '""') + '"';
    const rows = [
      [
        "ID",
        "Title",
        "Category",
        "Zone",
        "Location",
        "Status",
        "Priority",
        "Worker",
        "Reported",
      ],
      ...monthly.map((i) => [
        i.id,
        i.title,
        i.category,
        i.zone,
        i.location,
        i.status,
        i.priority,
        workers.find((w) => w.id === i.workerId)?.name ?? "",
        i.createdAt,
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((v) => quote(/^[=+@\-\t\r]/.test(String(v)) ? "'" + v : v))
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "CampusCare-" + month + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  const pending = active.length;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="CampusCare home">
          <span className="brand-icon">
            <Building2 size={23} />
          </span>
          Campus<span>Care</span>
        </a>
        <div className="campus-picker">
          <div className="campus-symbol">
            <Leaf size={20} />
          </div>
          <div>
            <strong>Greenfield Campus</strong>
            <small>Sample campus · Demo workspace</small>
          </div>
          <ShieldCheck size={15} />
        </div>
        <div className="nav-label">
          {role === "admin"
            ? "CAMPUS MANAGEMENT"
            : role === "worker"
              ? "MAINTENANCE WORKSPACE"
              : "YOUR CAMPUS"}
        </div>
        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={"nav-item " + (view === id ? "active" : "")}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "issues" && (
                <b>
                  {role === "worker"
                    ? jobs.filter((i) => !closed(i)).length
                    : active.length}
                </b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-card">
            <span className="leaf-mark">
              <Leaf size={25} />
            </span>
            <strong>
              Small reports.
              <br />A bigger difference.
            </strong>
            <p>A cleaner, safer campus starts with all of us.</p>
            <button onClick={newReport}>
              Report an issue <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={"nav-item " + (view === "settings" ? "active" : "")}
            onClick={() => navigate("settings")}
          >
            <Settings size={18} />
            App & integrations
          </button>
          <button className="nav-item" onClick={() => void install()}>
            <Smartphone size={18} />
            Install on your phone
            <ArrowDownToLine size={15} />
          </button>
          <div className="sidebar-footer">
            <span className="avatar">TP</span>
            <div>
              <strong>Your demo workspace</strong>
              <small>
                {role === "admin"
                  ? "Campus administrator"
                  : role === "worker"
                    ? "Maintenance team"
                    : "Campus member"}
              </small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{label}</strong>
          </div>
          <label className="global-search">
            <Search size={17} />
            <input
              aria-label="Search campus issues"
              placeholder="Search issues, locations…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!["overview", "issues", "my-reports"].includes(view))
                  setView("issues");
              }}
            />
            <kbd>⌕</kbd>
          </label>
          <div className="header-actions">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open app menu"
              onClick={() => setModal("menu")}
            >
              <Menu size={19} />
            </button>
            <button
              className="icon-btn notification-btn"
              aria-label="View recent activity"
              onClick={() => setModal("activity")}
            >
              <Bell size={19} />
              <i />
            </button>
            <div className="header-divider" />
            <label className="role-picker">
              <span className="avatar small">
                {role === "admin" ? "AD" : role === "worker" ? "WK" : "ST"}
              </span>
              <span>
                <small>PREVIEW AS</small>
                <select
                  aria-label="Preview role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as Role);
                    navigate("overview");
                    setSelectedId(null);
                  }}
                >
                  <option value="admin">Administrator</option>
                  <option value="resident">Student / employee</option>
                  <option value="worker">Worker</option>
                </select>
              </span>
            </label>
          </div>
        </header>
        <main className="main-content">
          <div className="prototype-strip">
            <span>
              <Sparkles size={13} />
              Hackathon prototype
            </span>
            <p>Sample data · switch roles to try the full reporting journey.</p>
            <button onClick={() => setModal("about")}>
              How it works <ArrowRight size={13} />
            </button>
          </div>
          {offline && (
            <div className="error-banner">
              <AlertCircle size={18} />
              You are offline. Reconnect before submitting or updating reports.
            </div>
          )}
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} />
              {error}
              <button onClick={() => void load()}>Retry</button>
            </div>
          )}
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                {role === "admin"
                  ? "YOUR CAMPUS, CONNECTED"
                  : role === "worker"
                    ? "EVERY FIX MAKES A DIFFERENCE"
                    : "SEE SOMETHING? SAY SOMETHING."}
              </div>
              <h1>
                {view === "overview"
                  ? role === "admin"
                    ? "Campus overview"
                    : role === "worker"
                      ? "Let’s make things better."
                      : "A better campus starts here."
                  : label}
              </h1>
              <p>
                {view === "overview"
                  ? role === "admin"
                    ? "A little care. A better campus. Keep every issue moving forward."
                    : role === "worker"
                      ? "Your assigned jobs, all in one place."
                      : "Report a problem, follow the fix, and make a difference."
                  : view === "issues"
                    ? "Track every report from the first photo to the final fix."
                    : view === "map"
                      ? "Find the places that need a little more care."
                      : view === "team"
                        ? "The people keeping your campus running."
                        : view === "analytics"
                          ? "Understand what is happening, one report at a time."
                          : view === "my-reports"
                            ? "Your reports and the progress behind every one."
                            : "Make CampusCare work for your team."}
              </p>
            </div>
            <button className="primary report-button" onClick={newReport}>
              <Plus size={18} />
              Report an issue
            </button>
          </section>
          {loading && !data ? (
            <div className="loading">
              <LoaderCircle className="spin" size={28} />
              <p>Opening your campus workspace…</p>
            </div>
          ) : (
            data && (
              <>
                {role === "worker" && (
                  <div className="worker-picker">
                    <HardHat size={18} />
                    <label>
                      Preview worker{" "}
                      <select
                        aria-label="Preview worker"
                        value={workerId}
                        onChange={(e) => setWorkerId(e.target.value)}
                      >
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} · {w.specialty}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                {(view === "overview" || view === "analytics") && (
                  <>
                    {role === "admin" && view === "overview" && (
                      <section className="welcome-card">
                        <div className="welcome-copy">
                          <span className="welcome-pill">
                            <span />
                            LET’S KEEP THINGS MOVING
                          </span>
                          <h2>
                            Every report is a chance
                            <br />
                            to make campus better.
                          </h2>
                          <p>
                            {unassigned.length
                              ? unassigned.length +
                                " issues are waiting for a helping hand. Assign your team and turn reports into resolutions."
                              : "You’re all caught up on new reports. Check in on the fixes already underway."}
                          </p>
                          <button
                            onClick={() => {
                              navigate("issues");
                              setStatus("Reported");
                            }}
                          >
                            Review new issues <ArrowRight size={16} />
                          </button>
                        </div>
                        <div className="campus-art" aria-hidden="true">
                          <div className="art-circle" />
                          <div className="art-path" />
                          <div className="art-tree tree-one" />
                          <div className="art-tree tree-two" />
                          <div className="art-tree tree-three" />
                          <div className="art-building building-back">
                            <i />
                            <i />
                            <i />
                            <i />
                            <i />
                            <i />
                          </div>
                          <div className="art-building building-front">
                            <div className="building-roof" />
                            <i />
                            <i />
                            <i />
                            <i />
                            <i />
                            <i />
                            <span className="building-door" />
                          </div>
                          <div className="art-check">
                            <Check size={20} />
                          </div>
                          <div className="art-mini">
                            <Wrench size={14} />
                            <span>Made better, together</span>
                          </div>
                        </div>
                      </section>
                    )}
                    <section className="stats-grid">
                      {(role === "admin"
                        ? [
                            {
                              title: "Total issues",
                              value: issues.length,
                              icon: ClipboardList,
                              caption: "Across your entire campus",
                              tone: "green",
                              filter: "All statuses",
                            },
                            {
                              title: "Awaiting assignment",
                              value: unassigned.length,
                              icon: Clock3,
                              caption: "Ready for a helping hand",
                              tone: "orange",
                              filter: "Reported",
                            },
                            {
                              title: "Work in progress",
                              value: issues.filter(
                                (i) => i.status === "In progress",
                              ).length,
                              icon: Wrench,
                              caption: "Your team is on the job",
                              tone: "blue",
                              filter: "In progress",
                            },
                            {
                              title: "Resolved & confirmed",
                              value: resolved.length,
                              icon: CheckCircle2,
                              caption:
                                (issues.length
                                  ? Math.round(
                                      (resolved.length / issues.length) * 100,
                                    )
                                  : 0) + "% of all reported issues",
                              tone: "green",
                              filter: "Completed",
                            },
                          ]
                        : role === "worker"
                          ? [
                              {
                                title: "My assigned jobs",
                                value: jobs.length,
                                icon: ClipboardList,
                                caption: "All jobs assigned to you",
                                tone: "green",
                                filter: "All statuses",
                              },
                              {
                                title: "Ready to start",
                                value: jobs.filter(
                                  (i) => i.status === "Assigned",
                                ).length,
                                icon: Clock3,
                                caption: "Your next helping hand",
                                tone: "orange",
                                filter: "Assigned",
                              },
                              {
                                title: "In progress",
                                value: jobs.filter(
                                  (i) => i.status === "In progress",
                                ).length,
                                icon: Wrench,
                                caption: "Let’s get these done",
                                tone: "blue",
                                filter: "In progress",
                              },
                              {
                                title: "Completed",
                                value: jobs.filter(closed).length,
                                icon: CheckCircle2,
                                caption: "Thank you for your care",
                                tone: "green",
                                filter: "Completed",
                              },
                            ]
                          : [
                              {
                                title: "My reports",
                                value: myIssues.length,
                                icon: ClipboardList,
                                caption: "Small actions, real impact",
                                tone: "green",
                                filter: "All statuses",
                              },
                              {
                                title: "Being worked on",
                                value: myIssues.filter(
                                  (i) =>
                                    i.status === "In progress" ||
                                    i.status === "Assigned",
                                ).length,
                                icon: Wrench,
                                caption: "Your reports are moving",
                                tone: "blue",
                                filter: "Active work",
                              },
                              {
                                title: "Ready to confirm",
                                value: myIssues.filter(
                                  (i) => i.status === "Resolved",
                                ).length,
                                icon: CheckCheck,
                                caption: "Check that the fix worked",
                                tone: "orange",
                                filter: "Resolved",
                              },
                              {
                                title: "Campus issues fixed",
                                value: resolved.length,
                                icon: Leaf,
                                caption: "A better place for everyone",
                                tone: "green",
                                filter: "Completed",
                              },
                            ]
                      ).map(
                        ({
                          title,
                          value,
                          icon: Icon,
                          caption,
                          tone,
                          filter,
                        }) => (
                          <button
                            className="stat-card"
                            key={title}
                            onClick={() => {
                              navigate(
                                role === "resident" &&
                                  title !== "Campus issues fixed"
                                  ? "my-reports"
                                  : "issues",
                              );
                              setStatus(filter);
                            }}
                          >
                            <div className="stat-top">
                              <span>{title}</span>
                              <span className={"stat-icon " + tone}>
                                <Icon size={19} />
                              </span>
                            </div>
                            <strong>{value.toString().padStart(2, "0")}</strong>
                            <div className="stat-caption">
                              {caption}
                              <ArrowUpRight size={14} />
                            </div>
                          </button>
                        ),
                      )}
                    </section>
                    {role === "admin" && (
                      <div className="insights-grid">
                        <section className="panel chart-panel">
                          <div className="panel-heading">
                            <div>
                              <h2>Issues at a glance</h2>
                              <p>Reports and resolutions, day by day</p>
                            </div>
                            <label className="month-picker">
                              <CalendarDays size={14} />
                              <input
                                type="month"
                                aria-label="Chart month"
                                value={month}
                                onChange={(e) => {
                                  if (e.target.value) setMonth(e.target.value);
                                }}
                              />
                            </label>
                          </div>
                          <Chart full={view === "analytics"} />
                        </section>
                        <section className="panel categories-panel">
                          <div className="panel-heading">
                            <div>
                              <h2>Where care is needed</h2>
                              <p>Open issues by category</p>
                            </div>
                            <span className="subtle-icon">
                              <Filter size={16} />
                            </span>
                          </div>
                          <div className="category-list">
                            {categories.map((c) => {
                              const n = active.filter(
                                (i) => i.category === c,
                              ).length;
                              return (
                                <button
                                  key={c}
                                  onClick={() => {
                                    navigate("issues");
                                    setCategory(c);
                                  }}
                                >
                                  <CategoryIcon category={c} />
                                  <div>
                                    <span>{c}</span>
                                    <div className="progress-track">
                                      <i
                                        style={{
                                          width:
                                            (active.length
                                              ? (n / active.length) * 100
                                              : 0) + "%",
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <strong>{n}</strong>
                                </button>
                              );
                            })}
                          </div>
                          <div className="category-footer">
                            <span className="online-dot" />
                            {pending} open issues across campus
                          </div>
                        </section>
                      </div>
                    )}
                    {view === "analytics" && (
                      <section className="panel">
                        <div className="panel-heading">
                          <div>
                            <h2>Monthly report</h2>
                            <p>
                              {monthly.length} reports ·{" "}
                              {date(month + "-01T00:00:00+05:30", {
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <button className="secondary" onClick={downloadCSV}>
                            <ArrowDownToLine size={16} />
                            Export CSV
                          </button>
                        </div>
                        <IssueTable rows={monthly} />
                      </section>
                    )}
                  </>
                )}
                {["overview", "issues", "my-reports"].includes(view) && (
                  <section className="panel issue-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          {view === "overview"
                            ? role === "worker"
                              ? "Your latest jobs"
                              : "Recent issues"
                            : role === "resident" && view === "my-reports"
                              ? "My reported issues"
                              : "Issue directory"}
                          <span className="count-pill">{filtered.length}</span>
                        </h2>
                        <p>
                          {role === "worker"
                            ? "Pick a job, update progress, and share the fix."
                            : "Every report brings us one step closer to a better campus."}
                        </p>
                      </div>
                      {view === "overview" && (
                        <button
                          className="text-button"
                          onClick={() => navigate("issues")}
                        >
                          View all issues <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                    <div className="filter-bar">
                      <label className="table-search">
                        <Search size={16} />
                        <input
                          placeholder="Search reports…"
                          aria-label="Search reports"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <select
                        aria-label="Filter by status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option>All statuses</option>
                        <option>Active work</option>
                        <option>Completed</option>
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Filter by category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option>All categories</option>
                        {categories.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Filter by location"
                        value={zone}
                        onChange={(e) => setZone(e.target.value)}
                      >
                        <option>All locations</option>
                        {zones.map((z) => (
                          <option key={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                    <IssueTable
                      rows={view === "overview" ? preview : filtered}
                    />
                    {view === "overview" && filtered.length > 6 && (
                      <div className="table-footer">
                        Showing 6 of {filtered.length} reports
                        <button onClick={() => navigate("issues")}>
                          See all reports <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </section>
                )}
                {view === "map" && (
                  <section className="map-layout">
                    <div className="panel campus-map">
                      <div className="panel-heading">
                        <div>
                          <h2>Your campus, at a glance</h2>
                          <p>
                            Illustrative zone map · choose a location to see
                            reports
                          </p>
                        </div>
                        <span className="map-north">N ↑</span>
                      </div>
                      <div className="map-canvas">
                        <div className="map-road horizontal" />
                        <div className="map-road vertical" />
                        <div className="map-pond" />
                        <span className="map-green green-one" />
                        <span className="map-green green-two" />
                        {zones.map((z, i) => (
                          <button
                            key={z}
                            className={
                              "map-building map-building-" +
                              i +
                              (zone === z ? " chosen" : "")
                            }
                            onClick={() => setZone(z)}
                          >
                            <Building2 size={i === 0 ? 34 : 25} />
                            <strong>{z}</strong>
                            <span>
                              {active.filter((x) => x.zone === z).length} open
                            </span>
                          </button>
                        ))}
                        <span className="map-caption">
                          <Leaf size={13} />
                          Greenfield Campus · sample layout
                        </span>
                      </div>
                    </div>
                    <div className="panel zone-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            {zone === "All locations"
                              ? "Campus locations"
                              : zone}
                          </h2>
                          <p>
                            {zone === "All locations"
                              ? "Choose a location on the map"
                              : "Reports from this area"}
                          </p>
                        </div>
                      </div>
                      {(zone === "All locations" ? zones : [zone]).map((z) => (
                        <div key={z} className="zone-group">
                          <button
                            className="zone-heading"
                            onClick={() => setZone(z)}
                          >
                            <MapPin size={16} />
                            {z}
                            <span>
                              {issues.filter((i) => i.zone === z).length}
                            </span>
                          </button>
                          {issues
                            .filter((i) => i.zone === z)
                            .map((i) => (
                              <button
                                className="zone-issue"
                                key={i.id}
                                onClick={() => openIssue(i.id)}
                              >
                                <strong>{i.title}</strong>
                                <Badge status={i.status} />
                              </button>
                            ))}
                        </div>
                      ))}
                      {zone !== "All locations" && (
                        <button
                          className="text-button padded"
                          onClick={() => setZone("All locations")}
                        >
                          Show all locations
                        </button>
                      )}
                    </div>
                  </section>
                )}
                {view === "team" && (
                  <>
                    <div className="section-toolbar">
                      <span>
                        {workers.length} team members ·{" "}
                        {active.filter((i) => i.workerId).length} active
                        assignments
                      </span>
                      <button
                        className="secondary"
                        onClick={() => setModal("worker")}
                      >
                        <Plus size={16} />
                        Add team member
                      </button>
                    </div>
                    <div className="team-grid">
                      {workers.map((w) => {
                        const assigned = issues.filter(
                          (i) => i.workerId === w.id && !closed(i),
                        );
                        return (
                          <section className="panel team-card" key={w.id}>
                            <div className="team-top">
                              <span className="avatar large">
                                {initials(w.name)}
                              </span>
                              <span
                                className={
                                  "availability " +
                                  (assigned.length >= 4 ? "loaded" : "")
                                }
                              >
                                {assigned.length >= 4 ? "Busy" : "Available"}
                              </span>
                            </div>
                            <h2>{w.name}</h2>
                            <p>
                              <CategoryIcon category={w.specialty} />
                              {w.specialty} specialist
                            </p>
                            {w.phone && <small>{w.phone}</small>}
                            <div className="team-metrics">
                              <div>
                                <strong>{assigned.length}</strong>
                                <span>Active jobs</span>
                              </div>
                              <div>
                                <strong>
                                  {
                                    issues.filter(
                                      (i) => i.workerId === w.id && closed(i),
                                    ).length
                                  }
                                </strong>
                                <span>Completed</span>
                              </div>
                            </div>
                            <button
                              className="secondary"
                              onClick={() => {
                                setRole("worker");
                                setWorkerId(w.id);
                                navigate("issues");
                              }}
                            >
                              Preview assigned jobs <ArrowRight size={15} />
                            </button>
                          </section>
                        );
                      })}
                    </div>
                  </>
                )}
                {view === "settings" && (
                  <div className="settings-grid">
                    <section className="panel settings-card">
                      <div className="integration-logo">
                        <Cloud size={28} />
                      </div>
                      <h2>Photos, powered by Cloudinary</h2>
                      <Badge
                        status={
                          data.cloudinaryReady ? "Connected" : "Setup pending"
                        }
                      />
                      <p>
                        Issue photos and repair evidence are uploaded directly
                        to Cloudinary with a signature generated by the server.
                        Images are delivered in an optimized format.
                      </p>
                      {!data.cloudinaryReady && (
                        <div className="setup-note">
                          Your team needs to configure these runtime values in
                          hosting settings:
                          <code>
                            CLOUDINARY_CLOUD_NAME
                            <br />
                            CLOUDINARY_API_KEY
                            <br />
                            CLOUDINARY_API_SECRET
                          </code>
                          The API secret stays on the server. Photo uploads
                          become available once all three are configured and the
                          app is redeployed.
                        </div>
                      )}
                    </section>
                    <section className="panel settings-card">
                      <div className="integration-logo notion-logo">N</div>
                      <h2>Document the building journey</h2>
                      <span className="badge setup-pending">
                        Notion workspace needed
                      </span>
                      <p>
                        Keep your problem statement, research, task board,
                        design decisions, and daily progress in your team’s
                        Notion workspace.
                      </p>
                      <div className="setup-note">
                        A Notion-ready project journal is included with the
                        source handoff. Import it into your team’s workspace and
                        add your daily updates. This prototype does not sync to
                        Notion automatically.
                      </div>
                    </section>
                    <section className="panel settings-card">
                      <div className="integration-logo">
                        <Smartphone size={26} />
                      </div>
                      <h2>Take CampusCare with you</h2>
                      <p>
                        One app for campus members, workers, and admins. The
                        layout adapts to your phone and can be added to your
                        home screen.
                      </p>
                      <button
                        className="primary"
                        onClick={() => void install()}
                      >
                        <ArrowDownToLine size={17} />
                        Install app
                      </button>
                    </section>
                    <section className="panel settings-card">
                      <div className="integration-logo">
                        <ShieldCheck size={26} />
                      </div>
                      <h2>About this prototype</h2>
                      <p>
                        This is your private demo workspace with sample reports.
                        All three roles are previews inside this browser’s demo
                        session. Data is saved online for this browser’s private
                        demo session.
                      </p>
                      <div className="setup-note">
                        Before a campus launch: add campus membership, protected
                        admin and worker roles, worker invitations, and
                        notification delivery. The role preview is for testing
                        the workflow.
                      </div>
                    </section>
                  </div>
                )}
              </>
            )
          )}
          <footer className="main-footer">
            <span>
              <Leaf size={13} />A better campus, together.
            </span>
            <span>
              Built for Hacktober HackDays 2026{" "}
              <span className="footer-dot">·</span> CampusCare
            </span>
          </footer>
        </main>
        <nav className="mobile-nav">
          {nav.slice(0, 4).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>
                {label === "Maintenance team"
                  ? "Team"
                  : label === "Campus map"
                    ? "Map"
                    : label}
              </span>
            </button>
          ))}
          <button onClick={newReport}>
            <Plus size={22} />
            <span>Report</span>
          </button>
        </nav>
      </div>
      {modal === "report" && (
        <Modal
          title="A small report. A real difference."
          onClose={() => setModal(null)}
          wide
        >
          <p className="modal-intro">
            Tell us what needs attention. Your campus team will take it from
            here.
          </p>
          <form
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ok = await run(
                {
                  action: "create",
                  title: f.get("title"),
                  category: reportCategory,
                  zone: reportZone,
                  location: f.get("location"),
                  description: f.get("description"),
                  priority: f.get("priority"),
                  photo: reportPhoto,
                },
                "Issue reported. Thank you for caring for your campus.",
              );
              if (ok) setModal(null);
            }}
          >
            <label className="field">
              What needs fixing?
              <input
                name="title"
                required
                maxLength={120}
                placeholder="e.g. Broken light outside the library"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Category
                <select
                  value={reportCategory}
                  onChange={(e) =>
                    setReportCategory(e.target.value as Category)
                  }
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Campus location
                <select
                  value={reportZone}
                  onChange={(e) => setReportZone(e.target.value)}
                >
                  {zones.map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              Exact location
              <input
                name="location"
                required
                maxLength={160}
                placeholder="Building, floor, room, or a nearby landmark"
              />
            </label>
            {issues.some(
              (i) =>
                i.category === reportCategory &&
                i.zone === reportZone &&
                !closed(i),
            ) && (
              <div className="similar-reports">
                <strong>
                  <ClipboardList size={15} />
                  Already reported nearby?
                </strong>
                <p>
                  Support an existing report if it describes the same problem.
                </p>
                {issues
                  .filter(
                    (i) =>
                      i.category === reportCategory &&
                      i.zone === reportZone &&
                      !closed(i),
                  )
                  .slice(0, 3)
                  .map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => {
                        setModal(null);
                        openIssue(i.id);
                      }}
                    >
                      {i.title}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
              </div>
            )}
            <label className="field">
              Tell us a little more
              <textarea
                name="description"
                required
                maxLength={2000}
                rows={3}
                placeholder="What is happening, and how is it affecting people?"
              />
            </label>
            <label className="field">
              Priority
              <select name="priority" defaultValue="Medium">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <PhotoField
              target="report"
              photo={reportPhoto}
              ready={!!data?.cloudinaryReady}
              uploading={uploading}
              onRemove={() => setReportPhoto(null)}
              onUpload={(file) => void upload(file, "report")}
            />
            <div className="modal-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="primary"
                disabled={busy || uploading || offline}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Plus size={17} />
                )}
                Submit report
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal
          title={selected.id + " · Issue details"}
          onClose={() => setSelectedId(null)}
          wide
        >
          <div className="detail-heading">
            <CategoryIcon category={selected.category} />
            <div>
              <h3>{selected.title}</h3>
              <p>
                {selected.category} · Reported{" "}
                {date(selected.createdAt, {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                by {selected.reporter}
              </p>
            </div>
          </div>
          <div className="detail-badges">
            <Badge status={selected.status} />
            <span className={"priority " + selected.priority.toLowerCase()}>
              {selected.priority} priority
            </span>
            <span className="support-count">
              <ThumbsUp size={14} />
              {selected.supporters.length} affected
            </span>
          </div>
          <div className="detail-location">
            <MapPin size={18} />
            <div>
              <strong>{selected.zone}</strong>
              <p>{selected.location}</p>
            </div>
          </div>
          <p className="description">{selected.description}</p>
          {selected.photo && (
            <img
              className="detail-photo"
              src={selected.photo.replace(
                "/upload/",
                "/upload/f_auto,q_auto,w_1000/",
              )}
              alt="Reported maintenance issue"
            />
          )}
          <div className="timeline">
            <h4>Every step toward a fix</h4>
            {selected.history.map((h, i) => (
              <div className="timeline-item" key={i}>
                <span>
                  <Check size={10} />
                </span>
                <div>
                  <strong>{h.text}</strong>
                  <small>
                    {date(h.at, {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              </div>
            ))}
          </div>
          {selected.note && (
            <div className="completion-note">
              <CheckCircle2 size={19} />
              <div>
                <strong>Worker’s completion note</strong>
                <p>{selected.note}</p>
                {selected.completionPhoto && (
                  <img
                    className="detail-photo"
                    src={selected.completionPhoto.replace(
                      "/upload/",
                      "/upload/f_auto,q_auto,w_1000/",
                    )}
                    alt="Completed repair"
                  />
                )}
              </div>
            </div>
          )}
          {role === "admin" && !closed(selected) && (
            <form
              className="action-box"
              key={selected.id + selected.workerId}
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await run(
                  {
                    action: "assign",
                    id: selected.id,
                    workerId: f.get("workerId"),
                    priority: f.get("priority"),
                  },
                  "Worker assigned. The issue is ready to start.",
                );
              }}
            >
              <h4>
                <HardHat size={17} />
                Assign a helping hand
              </h4>
              <div className="form-grid">
                <label className="field">
                  Team member
                  <select
                    name="workerId"
                    aria-label="Team member"
                    required
                    defaultValue={selected.workerId ?? ""}
                  >
                    <option value="" disabled>
                      Choose a specialist
                    </option>
                    {workers
                      .filter(
                        (w) =>
                          w.specialty === selected.category ||
                          w.specialty === "Other",
                      )
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ·{" "}
                          {
                            issues.filter(
                              (i) => i.workerId === w.id && !closed(i),
                            ).length
                          }{" "}
                          active
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  Priority
                  <select name="priority" defaultValue={selected.priority}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
              </div>
              <button className="primary" disabled={busy || offline}>
                {selected.workerId ? "Update assignment" : "Assign worker"}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
          {role === "worker" &&
            selected.workerId === workerId &&
            selected.status === "Assigned" && (
              <button
                className="primary full-width"
                disabled={busy || offline}
                onClick={() =>
                  void run(
                    { action: "start", id: selected.id, workerId },
                    "Work started. Thanks for taking this on.",
                  )
                }
              >
                <Wrench size={17} />
                Start working
              </button>
            )}
          {role === "worker" &&
            selected.workerId === workerId &&
            selected.status === "In progress" && (
              <form
                className="action-box"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await run(
                    {
                      action: "resolve",
                      id: selected.id,
                      workerId,
                      note: f.get("note"),
                      photo: completionPhoto,
                    },
                    "Repair marked resolved. The reporter can now confirm it.",
                  );
                }}
              >
                <h4>
                  <CheckCircle2 size={17} />
                  Share the fix
                </h4>
                <label className="field">
                  What did you fix?
                  <textarea
                    name="note"
                    rows={3}
                    required
                    maxLength={2000}
                    placeholder="Describe the repair and what you checked."
                  />
                </label>
                <PhotoField
                  target="completion"
                  photo={completionPhoto}
                  ready={!!data?.cloudinaryReady}
                  uploading={uploading}
                  onRemove={() => setCompletionPhoto(null)}
                  onUpload={(file) => void upload(file, "completion")}
                />
                <button
                  className="primary"
                  disabled={busy || uploading || offline}
                >
                  Mark as resolved
                  <Check size={17} />
                </button>
              </form>
            )}
          {role === "resident" &&
            selected.reporter !== "You" &&
            !closed(selected) && (
              <button
                className="secondary full-width"
                disabled={busy || offline}
                onClick={() =>
                  void run(
                    { action: "support", id: selected.id },
                    "Your support was added to this report.",
                  )
                }
              >
                <ThumbsUp size={17} />
                I’m affected by this too
              </button>
            )}
          {role === "resident" &&
            selected.reporter === "You" &&
            selected.status === "Resolved" && (
              <button
                className="primary full-width"
                disabled={busy || offline}
                onClick={() =>
                  void run(
                    { action: "confirm", id: selected.id },
                    "Fix confirmed. A better campus, thanks to you.",
                  )
                }
              >
                <CheckCheck size={17} />
                Confirm the problem is fixed
              </button>
            )}
          {role === "resident" &&
            selected.reporter === "You" &&
            closed(selected) && (
              <form
                className="reopen-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await run(
                    { action: "reopen", id: selected.id, note: f.get("note") },
                    "Issue reopened for the maintenance team.",
                  );
                }}
              >
                <label className="field">
                  Still a problem?
                  <input
                    name="note"
                    required
                    maxLength={2000}
                    placeholder="Tell the team what still needs fixing"
                  />
                </label>
                <button className="secondary" disabled={busy || offline}>
                  Reopen issue
                </button>
              </form>
            )}
          <p className="detail-footnote">
            Role preview · these actions are for testing your private demo
            workspace.
          </p>
        </Modal>
      )}
      {modal === "worker" && (
        <Modal title="Add a team member" onClose={() => setModal(null)}>
          <p className="modal-intro">
            Add a specialist to your demo maintenance team.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ok = await run(
                {
                  action: "addWorker",
                  name: f.get("name"),
                  specialty: f.get("specialty"),
                  phone: f.get("phone"),
                },
                "Team member added.",
              );
              if (ok) setModal(null);
            }}
          >
            <label className="field">
              Full name
              <input
                name="name"
                maxLength={80}
                required
                placeholder="Team member’s name"
              />
            </label>
            <label className="field">
              Specialty
              <select name="specialty">
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Phone number (optional)
              <input name="phone" type="tel" maxLength={30} placeholder="+91" />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy || offline}>
                Add member
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "activity" && (
        <Modal title="Campus activity" onClose={() => setModal(null)}>
          <p className="modal-intro">
            The latest steps toward a better campus.
          </p>
          {issues
            .flatMap((i) =>
              i.history.map((h) => ({ ...h, id: i.id, title: i.title })),
            )
            .sort((a, b) => b.at.localeCompare(a.at))
            .slice(0, 12)
            .map((h, i) => (
              <button
                className="activity-row"
                key={i}
                onClick={() => {
                  setModal(null);
                  openIssue(h.id);
                }}
              >
                <span className="activity-icon">
                  <Check size={15} />
                </span>
                <span>
                  <strong>{h.text}</strong>
                  <p>{h.title}</p>
                  <small>
                    {date(h.at, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
        </Modal>
      )}
      {modal === "menu" && (
        <Modal title="Your campus workspace" onClose={() => setModal(null)}>
          <div className="app-menu">
            {nav.map(({ id, label, icon: Icon }) => (
              <button
                className="nav-item"
                key={id}
                onClick={() => {
                  navigate(id);
                  setModal(null);
                }}
              >
                <Icon size={19} />
                {label}
                <ChevronRight size={16} />
              </button>
            ))}
            <button
              className="nav-item"
              onClick={() => {
                navigate("settings");
                setModal(null);
              }}
            >
              <Settings size={19} />
              App & integrations
              <ChevronRight size={16} />
            </button>
            <button
              className="nav-item"
              onClick={() => {
                setModal(null);
                void install();
              }}
            >
              <Smartphone size={19} />
              Install on your phone
              <ArrowDownToLine size={16} />
            </button>
          </div>
        </Modal>
      )}
      {modal === "install" && (
        <Modal
          title="Your campus, in your pocket."
          onClose={() => setModal(null)}
        >
          <div className="install-art">
            <Smartphone size={50} />
            <Leaf size={26} />
          </div>
          <p className="modal-intro">
            Add CampusCare to your home screen to open it like an app.
          </p>
          <ol className="install-steps">
            <li>
              <strong>On iPhone or iPad</strong>
              <p>
                Open this site in Safari, tap Share, then choose Add to Home
                Screen.
              </p>
            </li>
            <li>
              <strong>On Android</strong>
              <p>
                Open in Chrome, tap the browser menu, then Install app or Add to
                Home screen.
              </p>
            </li>
            <li>
              <strong>On desktop</strong>
              <p>
                Use the install icon in your browser’s address bar when
                available.
              </p>
            </li>
          </ol>
          <p className="setup-note">
            An internet connection is needed to load and save reports. This
            browser has its own private demo workspace.
          </p>
        </Modal>
      )}
      {modal === "about" && (
        <Modal
          title="One campus. Everyone connected."
          onClose={() => setModal(null)}
        >
          <p className="modal-intro">
            Use the Preview as selector to test the same issue from every
            perspective.
          </p>
          <div className="about-step">
            <span>01</span>
            <div>
              <h3>See it. Report it.</h3>
              <p>
                Choose Student / employee, add a location, and submit an issue.
              </p>
            </div>
          </div>
          <div className="about-step">
            <span>02</span>
            <div>
              <h3>Give it a helping hand.</h3>
              <p>
                Choose Administrator, open the report, and assign a matching
                specialist.
              </p>
            </div>
          </div>
          <div className="about-step">
            <span>03</span>
            <div>
              <h3>Work on it. Share the fix.</h3>
              <p>
                Choose Worker and select that team member. Start the job, then
                mark it resolved.
              </p>
            </div>
          </div>
          <div className="about-step">
            <span>04</span>
            <div>
              <h3>Close the loop.</h3>
              <p>
                Return to Student / employee to confirm the fix or reopen the
                report.
              </p>
            </div>
          </div>
          <div className="setup-note">
            Sample reports are labelled as demo content. Your changes are saved
            to a private online workspace for this browser’s demo session.
            Campus membership and separate staff permissions are planned for the
            next stage.
          </div>
        </Modal>
      )}
      {toast && (
        <div
          role="status"
          className={"toast " + (toast.error ? "toast-error" : "")}
        >
          {toast.error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
          <span>{toast.text}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
