import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from "react"
import { useLocalData } from "./storage"
import type { AppSettings, JobStatus, PrintJob } from "./types"

const ConverterPage = lazy(() => import("./ConverterPage"))

type Page = "dashboard" | "jobs" | "converter" | "customers" | "pricing" | "reports" | "printer" | "settings"

const navItems: { id: Page; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "jobs", label: "Print Jobs", icon: "printer" },
  { id: "converter", label: "File Converter", icon: "refresh" },
  { id: "customers", label: "Customers", icon: "users" },
  { id: "pricing", label: "Pricing", icon: "tag" },
  { id: "reports", label: "Reports", icon: "chart" },
  { id: "printer", label: "Printer Setup", icon: "device" },
  { id: "settings", label: "Settings", icon: "settings" },
]

type IconName = "grid" | "printer" | "users" | "tag" | "chart" | "device" | "settings" | "search" | "bell" | "plus" | "file" | "clock" | "check" | "rupee" | "more" | "chevron" | "menu" | "x" | "download" | "refresh" | "wifi" | "arrow" | "trash"

const paths: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  printer: (
    <>
      <path d="M6 9V3h12v6" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
      <path d="M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M17 12h.01" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 13.6 11 4H4v7l9.6 9.6a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8Z" />
      <circle cx="7.5" cy="7.5" r=".8" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 4 3 5-7" />
    </>
  ),
  device: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h8M9 18h6" />
      <circle cx="8" cy="14" r=".5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.12.36.34.7.6 1 .28.28.68.4 1.1.4h.1a2 2 0 1 1 0 4h-.1A1.7 1.7 0 0 0 19.4 15Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M9 15h6M9 11h2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  rupee: (
    <>
      <path d="M6 4h12M6 8h12M7 4c7 0 7 8 0 8h-1l9 8" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M5 20h14" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18.5 9A7 7 0 0 0 6 6.5L4 11M5.5 15A7 7 0 0 0 18 17.5l2-4.5" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="20" r=".7" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </>
  ),
}

function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

const statusLabel: Record<JobStatus, string> = {
  queued: "In queue",
  printing: "Printing",
  completed: "Completed",
  failed: "Needs attention",
}

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`
const csvCell = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`
const isToday = (iso: string) =>
  new Date(iso).toDateString() === new Date().toDateString()
const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}
const todayLabel = () =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date())
    .toUpperCase()
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PF"
const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(iso))

function App() {
  const { data, setData, resetData } = useLocalData()
  const [page, setPage] = useState<Page>("dashboard")
  const [mobileNav, setMobileNav] = useState(false)
  const [newJobOpen, setNewJobOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | JobStatus>("all")
  const [toast, setToast] = useState("")
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  )

  useEffect(() => {
    const captureInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", captureInstall)
    return () =>
      window.removeEventListener("beforeinstallprompt", captureInstall)
  }, [])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 2400)
  }

  const updateStatus = (id: string, status: JobStatus) => {
    setData((current) => ({
      ...current,
      jobs: current.jobs.map((job) =>
        job.id === id ? { ...job, status } : job,
      ),
    }))
    notify(`Job ${id} moved to ${statusLabel[status].toLowerCase()}`)
  }

  const addJob = (job: PrintJob) => {
    setData((current) => ({ ...current, jobs: [job, ...current.jobs] }))
    setNewJobOpen(false)
    notify(`Job ${job.id} added to the queue`)
  }

  const deleteJob = (id: string) => {
    setData((current) => ({
      ...current,
      jobs: current.jobs.filter((job) => job.id !== id),
    }))
    notify(`Job ${id} deleted`)
  }

  const nextJobNumber =
    data.jobs.reduce(
      (max, job) => Math.max(max, parseInt(job.id.replace(/\D/g, ""), 10) || 0),
      1044,
    ) + 1

  const pageTitle =
    navItems.find((item) => item.id === page)?.label ?? "Dashboard"

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Icon name="printer" size={22} />
          </div>
          <div>
            <strong>PrintFlow</strong>
            <span>Local ERP</span>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <Icon name="x" />
          </button>
        </div>
        <nav>
          <p className="nav-label">Workspace</p>
          {navItems.slice(0, 6).map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => {
                setPage(item.id)
                setMobileNav(false)
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "jobs" && (
                <b>{data.jobs.filter((j) => j.status === "queued").length}</b>
              )}
            </button>
          ))}
          <p className="nav-label nav-label-second">System</p>
          {navItems.slice(6).map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => {
                setPage(item.id)
                setMobileNav(false)
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="shop-card">
          <div className="shop-avatar">{initials(data.settings.shopName)}</div>
          <div>
            <strong>{data.settings.shopName}</strong>
            <span>
              <i /> System online
            </span>
          </div>
          <Icon name="chevron" size={15} />
        </div>
      </aside>
      {mobileNav && (
        <div className="nav-scrim" onClick={() => setMobileNav(false)} />
      )}

      <main>
        <header>
          <button
            className="menu-button"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
          <div className="header-title">
            <span>Workspace</span>
            <b>/</b>
            <strong>{pageTitle}</strong>
          </div>
          <div className="header-actions">
            {installPrompt && (
              <button
                className="install-button"
                onClick={async () => {
                  await installPrompt.prompt()
                  setInstallPrompt(null)
                }}
              >
                <Icon name="download" size={16} />
                <span>Install app</span>
              </button>
            )}
            <label className="global-search">
              <Icon name="search" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search jobs, customers…"
              />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button" aria-label="Notifications">
              <Icon name="bell" />
              <i />
            </button>
            <button
              className="primary-button"
              onClick={() => setNewJobOpen(true)}
            >
              <Icon name="plus" size={18} />
              <span>New print job</span>
            </button>
          </div>
        </header>

        <section className="content">
          {page === "dashboard" && (
            <Dashboard
              jobs={data.jobs}
              shopName={data.settings.shopName}
              onViewJobs={() => setPage("jobs")}
              onNewJob={() => setNewJobOpen(true)}
              onStatus={updateStatus}
            />
          )}
          {page === "jobs" && (
            <JobsPage
              jobs={data.jobs}
              search={search}
              filter={filter}
              setFilter={setFilter}
              onStatus={updateStatus}
              onDelete={deleteJob}
            />
          )}
          {page === "converter" && (
            <Suspense
              fallback={
                <div className="panel module-loading">
                  <span className="spinner dark" />
                  Loading private converter…
                </div>
              }
            >
              <ConverterPage notify={notify} />
            </Suspense>
          )}
          {page === "customers" && <CustomersPage jobs={data.jobs} />}
          {page === "pricing" && (
            <PricingPage
              settings={data.settings}
              onSave={(settings) => {
                setData((current) => ({ ...current, settings }))
                notify("Pricing updated")
              }}
            />
          )}
          {page === "reports" && <ReportsPage jobs={data.jobs} />}
          {page === "printer" && <PrinterPage notify={notify} />}
          {page === "settings" && (
            <SettingsPage
              settings={data.settings}
              onSave={(settings) => {
                setData((current) => ({ ...current, settings }))
                notify("Settings saved locally")
              }}
              onReset={() => {
                resetData()
                notify("Demo data restored")
              }}
            />
          )}
        </section>
      </main>

      {newJobOpen && (
        <NewJobModal
          settings={data.settings}
          nextId={`PR-${nextJobNumber}`}
          onClose={() => setNewJobOpen(false)}
          onSubmit={addJob}
        />
      )}
      {toast && (
        <div className="toast">
          <Icon name="check" size={17} />
          {toast}
        </div>
      )}
    </div>
  )
}

function Dashboard({
  jobs,
  shopName,
  onViewJobs,
  onNewJob,
  onStatus,
}: {
  jobs: PrintJob[]
  shopName: string
  onViewJobs: () => void
  onNewJob: () => void
  onStatus: (id: string, status: JobStatus) => void
}) {
  const completed = jobs.filter((j) => j.status === "completed")
  const revenue = completed
    .filter((job) => isToday(job.createdAt))
    .reduce((sum, job) => sum + job.amount, 0)
  const pages = completed.reduce((sum, job) => sum + job.pages * job.copies, 0)
  const queue = jobs.filter(
    (j) => j.status === "queued" || j.status === "printing",
  ).length
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{todayLabel()}</p>
          <h1>
            {greeting()}, {shopName}
          </h1>
          <span>Here’s what’s happening in your print shop today.</span>
        </div>
        <div className="live-pill">
          <i /> Accepting online jobs
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          icon="file"
          tone="blue"
          label="Print jobs"
          value={jobs.length}
          detail={`${queue} currently active`}
          trend="Total"
        />
        <Stat
          icon="clock"
          tone="amber"
          label="In queue"
          value={queue}
          detail={queue ? `${queue} waiting or printing` : "Queue is clear"}
          trend="Live"
        />
        <Stat
          icon="check"
          tone="green"
          label="Pages printed"
          value={pages}
          detail={`${completed.length} jobs completed`}
          trend="Done"
        />
        <Stat
          icon="rupee"
          tone="violet"
          label="Today's revenue"
          value={money(revenue)}
          detail="Completed jobs today"
          trend="Today"
        />
      </div>
      <div className="dashboard-grid">
        <div className="panel queue-panel">
          <div className="panel-head">
            <div>
              <h2>Live print queue</h2>
              <p>Jobs waiting and currently printing</p>
            </div>
            <button className="text-button" onClick={onViewJobs}>
              View all <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="job-list">
            {jobs.slice(0, 4).map((job) => (
              <JobRow key={job.id} job={job} onStatus={onStatus} />
            ))}
          </div>
        </div>
        <div className="side-stack">
          <div className="panel quick-panel">
            <div className="panel-head">
              <div>
                <h2>Quick actions</h2>
                <p>Common shop tasks</p>
              </div>
            </div>
            <button className="quick-action" onClick={onNewJob}>
              <span className="quick-icon blue">
                <Icon name="plus" />
              </span>
              <span>
                <b>Create print job</b>
                <small>Add a counter order manually</small>
              </span>
              <Icon name="chevron" size={16} />
            </button>
            <button className="quick-action" onClick={() => window.print()}>
              <span className="quick-icon violet">
                <Icon name="printer" />
              </span>
              <span>
                <b>Print test page</b>
                <small>Check printer output</small>
              </span>
              <Icon name="chevron" size={16} />
            </button>
            <button className="quick-action" onClick={onViewJobs}>
              <span className="quick-icon amber">
                <Icon name="refresh" />
              </span>
              <span>
                <b>Manage queue</b>
                <small>Reorder or retry jobs</small>
              </span>
              <Icon name="chevron" size={16} />
            </button>
          </div>
          <div className="qr-card">
            <div className="qr-art">
              <span />
              <span />
              <span />
              <i>PF</i>
            </div>
            <div>
              <b>Your upload QR is active</b>
              <p>
                Customers can scan, upload and pay directly from their phone.
              </p>
              <button onClick={() => window.print()}>
                Download QR poster <Icon name="download" size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Stat({
  icon,
  tone,
  label,
  value,
  detail,
  trend,
}: {
  icon: IconName
  tone: string
  label: string
  value: string | number
  detail: string
  trend: string
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <div>
        <small>{detail}</small>
        <b className={tone}>{trend}</b>
      </div>
    </div>
  )
}

function JobRow({
  job,
  onStatus,
  onDelete,
}: {
  job: PrintJob
  onStatus: (id: string, status: JobStatus) => void
  onDelete?: (id: string) => void
}) {
  const next: JobStatus =
    job.status === "queued"
      ? "printing"
      : job.status === "printing" || job.status === "failed"
        ? "completed"
        : "completed"
  return (
    <div className="job-row">
      <div className="file-icon">
        <Icon name="file" size={20} />
        <span>{job.fileName.split(".").pop()}</span>
      </div>
      <div className="job-primary">
        <b>{job.fileName}</b>
        <span>
          {job.customer} · {job.id}
        </span>
      </div>
      <div className="job-spec">
        <b>
          {job.pages} pages × {job.copies}
        </b>
        <span>
          {job.color ? "Colour" : "B&W"} · {job.paper} · {job.side}
        </span>
      </div>
      <div className="job-time">
        <b>{money(job.amount)}</b>
        <span>{dateTime(job.createdAt)}</span>
      </div>
      <span className={`status ${job.status}`}>
        <i />
        {statusLabel[job.status]}
      </span>
      <div className="row-actions">
        {job.status !== "completed" && (
          <button
            title={`Move to ${statusLabel[next]}`}
            onClick={() => onStatus(job.id, next)}
          >
            <Icon
              name={job.status === "queued" ? "printer" : "check"}
              size={17}
            />
          </button>
        )}
        {onDelete && (
          <button title="Delete job" onClick={() => onDelete(job.id)}>
            <Icon name="trash" size={17} />
          </button>
        )}
        {!onDelete && (
          <button aria-label="More options">
            <Icon name="more" size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

function JobsPage({
  jobs,
  search,
  filter,
  setFilter,
  onStatus,
  onDelete,
}: {
  jobs: PrintJob[]
  search: string
  filter: "all" | JobStatus
  setFilter: (value: "all" | JobStatus) => void
  onStatus: (id: string, status: JobStatus) => void
  onDelete: (id: string) => void
}) {
  const visible = jobs.filter(
    (job) =>
      (filter === "all" || job.status === filter) &&
      `${job.customer} ${job.fileName} ${job.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  return (
    <>
      <SectionHeading
        eyebrow="OPERATIONS"
        title="Print jobs"
        description="Track every upload, counter order and printer status."
      />
      <div className="filter-row">
        {(["all", "queued", "printing", "completed", "failed"] as const).map(
          (item) => (
            <button
              key={item}
              className={filter === item ? "selected" : ""}
              onClick={() => setFilter(item)}
            >
              {item === "all" ? "All jobs" : statusLabel[item]}{" "}
              <span>
                {item === "all"
                  ? jobs.length
                  : jobs.filter((j) => j.status === item).length}
              </span>
            </button>
          ),
        )}
      </div>
      <div className="panel all-jobs">
        {visible.length ? (
          visible.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onStatus={onStatus}
              onDelete={onDelete}
            />
          ))
        ) : (
          <Empty message="No matching print jobs found." />
        )}
      </div>
    </>
  )
}

function CustomersPage({ jobs }: { jobs: PrintJob[] }) {
  const customers = useMemo(
    () =>
      Object.values(
        jobs.reduce<Record<string, {
          name: string
          phone: string
          jobs: number
          spent: number
          last: string
        }>>((acc, job) => {
          acc[job.phone] ??= {
            name: job.customer,
            phone: job.phone,
            jobs: 0,
            spent: 0,
            last: job.createdAt,
          }
          acc[job.phone].jobs += 1
          acc[job.phone].spent += job.payment === "paid" ? job.amount : 0
          return acc
        }, {}),
      ),
    [jobs],
  )
  return (
    <>
      <SectionHeading
        eyebrow="RELATIONSHIPS"
        title="Customers"
        description="Customer history is generated automatically from local print jobs."
      />
      <div className="customer-grid">
        {customers.map((customer) => (
          <div className="customer-card" key={customer.phone}>
            <div className="avatar">
              {customer.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <h3>{customer.name}</h3>
              <p>{customer.phone}</p>
            </div>
            <dl>
              <div>
                <dt>Jobs</dt>
                <dd>{customer.jobs}</dd>
              </div>
              <div>
                <dt>Paid</dt>
                <dd>{money(customer.spent)}</dd>
              </div>
              <div>
                <dt>Last visit</dt>
                <dd>{dateTime(customer.last)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </>
  )
}

function PricingPage({
  settings,
  onSave,
}: {
  settings: AppSettings
  onSave: (value: AppSettings) => void
}) {
  const [form, setForm] = useState(settings)
  return (
    <>
      <SectionHeading
        eyebrow="CATALOGUE"
        title="Pricing"
        description="Set the base per-page rates used for new jobs."
      />
      <form
        className="panel settings-form narrow"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
      >
        <div className="form-section">
          <h2>Print rates</h2>
          <p>Rates are saved only in this browser.</p>
          <div className="two-fields">
            <Field label="B&W per page (₹)">
              <input
                type="number"
                min="0"
                value={form.bwPrice}
                onChange={(e) =>
                  setForm({ ...form, bwPrice: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Colour per page (₹)">
              <input
                type="number"
                min="0"
                value={form.colorPrice}
                onChange={(e) =>
                  setForm({ ...form, colorPrice: Number(e.target.value) })
                }
              />
            </Field>
          </div>
        </div>
        <button className="primary-button" type="submit">
          Save pricing
        </button>
      </form>
    </>
  )
}

function ReportsPage({ jobs }: { jobs: PrintJob[] }) {
  const completed = jobs.filter((j) => j.status === "completed")
  const total = completed.reduce((sum, j) => sum + j.amount, 0)
  const max = Math.max(...jobs.map((j) => j.amount), 1)
  const exportCsv = () => {
    const rows = [
      ["Job ID", "Customer", "File", "Pages", "Amount", "Status"],
      ...jobs.map((j) => [
        j.id,
        j.customer,
        j.fileName,
        String(j.pages * j.copies),
        String(j.amount),
        j.status,
      ]),
    ]
    const blob = new Blob(
      [rows.map((r) => r.map(csvCell).join(",")).join("\n")],
      { type: "text/csv" },
    )
    const anchor = document.createElement("a")
    anchor.href = URL.createObjectURL(blob)
    anchor.download = "printflow-report.csv"
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000)
  }
  return (
    <>
      <SectionHeading
        eyebrow="INSIGHTS"
        title="Reports"
        description="A local overview of revenue and order activity."
        action={
          <button className="secondary-button" onClick={exportCsv}>
            <Icon name="download" size={17} /> Export CSV
          </button>
        }
      />
      <div className="report-grid">
        <div className="panel chart-card">
          <h2>Revenue by recent job</h2>
          <p>Completed orders: {money(total)}</p>
          <div className="bar-chart">
            {jobs
              .slice()
              .reverse()
              .map((job) => (
                <div key={job.id}>
                  <span
                    style={{
                      height: `${Math.max(8, (job.amount / max) * 100)}%`,
                    }}
                  />
                  <small>{job.id.replace("PR-", "")}</small>
                </div>
              ))}
          </div>
        </div>
        <div className="panel report-summary">
          <h2>Order mix</h2>
          <div>
            <span>B&W documents</span>
            <b>{jobs.filter((j) => !j.color).length} jobs</b>
          </div>
          <div>
            <span>Colour documents</span>
            <b>{jobs.filter((j) => j.color).length} jobs</b>
          </div>
          <div>
            <span>Average order value</span>
            <b>
              {money(
                jobs.length
                  ? Math.round(
                      jobs.reduce((s, j) => s + j.amount, 0) / jobs.length,
                    )
                  : 0,
              )}
            </b>
          </div>
          <div>
            <span>Payment pending</span>
            <b>{jobs.filter((j) => j.payment === "pending").length} jobs</b>
          </div>
        </div>
      </div>
    </>
  )
}

function PrinterPage({ notify }: { notify: (value: string) => void }) {
  const [online, setOnline] = useState(true)
  return (
    <>
      <SectionHeading
        eyebrow="HARDWARE"
        title="Printer setup"
        description="Configure the printer used for automatic jobs."
      />
      <div className="printer-layout">
        <div className="panel printer-device">
          <div className="printer-visual">
            <Icon name="printer" size={55} />
            <i className={online ? "" : "off"} />
          </div>
          <div>
            <span className={`status ${online ? "completed" : "failed"}`}>
              <i />
              {online ? "Online" : "Offline"}
            </span>
            <h2>HP LaserJet Pro M404dn</h2>
            <p>Default printer · USB001</p>
          </div>
          <button
            className="secondary-button"
            onClick={() => {
              setOnline(!online)
              notify(online ? "Printer disconnected" : "Printer connected")
            }}
          >
            <Icon name={online ? "x" : "wifi"} size={17} />
            {online ? "Disconnect" : "Connect"}
          </button>
        </div>
        <div className="panel setup-list">
          <h2>Device settings</h2>
          <div>
            <span>Paper size</span>
            <b>A4</b>
          </div>
          <div>
            <span>Default quality</span>
            <b>Standard (600 dpi)</b>
          </div>
          <div>
            <span>Duplex unit</span>
            <b>Available</b>
          </div>
          <div>
            <span>Auto-print paid jobs</span>
            <b>Enabled</b>
          </div>
          <button
            className="secondary-button"
            onClick={() => notify("Test page sent to printer")}
          >
            <Icon name="printer" size={17} /> Print test page
          </button>
        </div>
      </div>
    </>
  )
}

function SettingsPage({
  settings,
  onSave,
  onReset,
}: {
  settings: AppSettings
  onSave: (value: AppSettings) => void
  onReset: () => void
}) {
  const [form, setForm] = useState(settings)
  return (
    <>
      <SectionHeading
        eyebrow="PREFERENCES"
        title="Settings"
        description="Manage this browser's local PrintFlow workspace."
      />
      <form
        className="panel settings-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(form)
        }}
      >
        <div className="form-section">
          <h2>Shop profile</h2>
          <p>Shown on the dashboard and customer-facing QR poster.</p>
          <div className="two-fields">
            <Field label="Shop name">
              <input
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              />
            </Field>
            <Field label="Support phone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <div className="form-section">
          <h2>Automation</h2>
          <p>Control how incoming QR orders are handled.</p>
          <Toggle
            label="Accept online jobs"
            help="Allow customers to submit new jobs"
            checked={form.acceptJobs}
            onChange={(acceptJobs) => setForm({ ...form, acceptJobs })}
          />
          <Toggle
            label="Auto-print paid jobs"
            help="Send verified jobs to the default printer"
            checked={form.autoPrint}
            onChange={(autoPrint) => setForm({ ...form, autoPrint })}
          />
        </div>
        <div className="form-footer">
          <button type="button" className="danger-button" onClick={onReset}>
            Restore demo data
          </button>
          <button className="primary-button" type="submit">
            Save settings
          </button>
        </div>
      </form>
    </>
  )
}

function NewJobModal({
  settings,
  nextId,
  onClose,
  onSubmit,
}: {
  settings: AppSettings
  nextId: string
  onClose: () => void
  onSubmit: (job: PrintJob) => void
}) {
  const [form, setForm] = useState({
    customer: "",
    phone: "",
    fileName: "",
    pages: 1,
    copies: 1,
    color: false,
    side: "Single" as "Single" | "Double",
    payment: "paid" as "paid" | "pending",
  })
  const amount =
    form.pages *
    form.copies *
    (form.color ? settings.colorPrice : settings.bwPrice)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({
      id: nextId,
      ...form,
      fileName: form.fileName || "Counter_document.pdf",
      paper: "A4",
      amount,
      status: "queued",
      createdAt: new Date().toISOString(),
    })
  }
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal"
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span>NEW COUNTER ORDER</span>
            <h2>Create print job</h2>
            <p>Add a walk-in customer's document to the queue.</p>
          </div>
          <button type="button" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">
          <div className="two-fields">
            <Field label="Customer name">
              <input
                required
                autoFocus
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                placeholder="Enter full name"
              />
            </Field>
            <Field label="Phone number">
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="10-digit number"
              />
            </Field>
          </div>
          <Field label="Document name">
            <input
              value={form.fileName}
              onChange={(e) => setForm({ ...form, fileName: e.target.value })}
              placeholder="e.g. Application_Form.pdf"
            />
          </Field>
          <div className="three-fields">
            <Field label="Pages">
              <input
                type="number"
                min="1"
                value={form.pages}
                onChange={(e) =>
                  setForm({ ...form, pages: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Copies">
              <input
                type="number"
                min="1"
                value={form.copies}
                onChange={(e) =>
                  setForm({ ...form, copies: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Print type">
              <select
                value={form.color ? "color" : "bw"}
                onChange={(e) =>
                  setForm({ ...form, color: e.target.value === "color" })
                }
              >
                <option value="bw">B&W</option>
                <option value="color">Colour</option>
              </select>
            </Field>
          </div>
          <div className="two-fields">
            <Field label="Sides">
              <select
                value={form.side}
                onChange={(e) =>
                  setForm({
                    ...form,
                    side: e.target.value as "Single" | "Double",
                  })
                }
              >
                <option>Single</option>
                <option>Double</option>
              </select>
            </Field>
            <Field label="Payment">
              <select
                value={form.payment}
                onChange={(e) =>
                  setForm({
                    ...form,
                    payment: e.target.value as "paid" | "pending",
                  })
                }
              >
                <option value="paid">Paid</option>
                <option value="pending">Pay at counter</option>
              </select>
            </Field>
          </div>
        </div>
        <div className="modal-footer">
          <div>
            <span>Order total</span>
            <b>{money(amount)}</b>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Add to queue <Icon name="arrow" size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="page-heading section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {action}
    </div>
  )
}
function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}
function Toggle({
  label,
  help,
  checked,
  onChange,
}: {
  label: string
  help: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="toggle-row">
      <span>
        <b>{label}</b>
        <small>{help}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <i />
    </label>
  )
}
function Empty({ message }: { message: string }) {
  return (
    <div className="empty">
      <Icon name="search" size={30} />
      <h3>{message}</h3>
      <p>Try changing your search or filter.</p>
    </div>
  )
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

export default App
