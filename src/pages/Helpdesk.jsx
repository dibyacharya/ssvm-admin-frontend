import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  addAdminComment,
  closeTicket,
  getTicketTaxonomy,
  getTicket,
  listAdminUsers,
  listTickets,
  resolveTicketAttachmentUrl,
  updateTicket,
} from "../services/ticket.service";

const STATUS_OPTIONS = ["Pending", "In-Progress", "Resolved", "Closed"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
const HELP_TYPE_OPTIONS = ["Academic", "Technical"];
const SOURCE_OPTIONS = ["LMS", "WEBSITE"];
const QUEUE_OPTIONS = [
  { key: "", label: "All Queues" },
  { key: "L1", label: "L1 Queue" },
  { key: "L2", label: "L2 Escalation" },
  { key: "L3", label: "L3 Escalation" },
];

const DEFAULT_TAXONOMY = {
  categories: [],
  escalationLevels: [],
  routedToRoles: [],
};

const statusBadgeClass = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "in-progress":
      return "bg-blue-100 text-blue-700";
    case "resolved":
      return "bg-emerald-100 text-emerald-700";
    case "closed":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

const priorityClass = (priority) => {
  switch (String(priority || "").toLowerCase()) {
    case "high":
      return "text-red-600";
    case "medium":
      return "text-amber-600";
    case "low":
      return "text-emerald-600";
    default:
      return "text-gray-600";
  }
};

const helpTypeBadgeClass = (helpType) => {
  if (String(helpType || "").toLowerCase() === "technical") {
    return "bg-purple-100 text-purple-700";
  }
  return "bg-indigo-100 text-indigo-700";
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const getErrorMessage = (error, fallbackMessage) => {
  const apiPayload = error?.response?.data;
  if (typeof apiPayload?.message === "string" && apiPayload.message.trim()) {
    return apiPayload.message.trim();
  }
  if (typeof apiPayload?.error === "string" && apiPayload.error.trim()) {
    return apiPayload.error.trim();
  }
  if (typeof apiPayload === "string" && apiPayload.trim()) {
    return apiPayload.trim();
  }
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return fallbackMessage;
};

const unwrapPayload = (raw) => {
  if (!raw || typeof raw !== "object") return {};
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
    const nested = raw.data;
    if (
      Object.prototype.hasOwnProperty.call(nested, "data") ||
      Object.prototype.hasOwnProperty.call(nested, "tickets") ||
      Object.prototype.hasOwnProperty.call(nested, "ticket") ||
      Object.prototype.hasOwnProperty.call(nested, "page") ||
      Object.prototype.hasOwnProperty.call(nested, "total")
    ) {
      return nested;
    }
  }
  return raw;
};

const normalizeListResponse = ({ raw, fallbackPage, fallbackLimit }) => {
  const payload = unwrapPayload(raw);
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.tickets)
      ? payload.tickets
      : [];

  const page = Number(payload?.page ?? payload?.pagination?.page ?? fallbackPage) || fallbackPage;
  const limit =
    Number(payload?.limit ?? payload?.pagination?.limit ?? fallbackLimit) || fallbackLimit;
  const total = Number(payload?.total ?? payload?.pagination?.total ?? 0) || 0;
  const totalPages =
    Number(payload?.totalPages ?? payload?.pagination?.totalPages ?? 1) || 1;

  const hasNext =
    payload?.pagination?.hasNext !== undefined
      ? Boolean(payload.pagination.hasNext)
      : page < totalPages;
  const hasPrev =
    payload?.pagination?.hasPrev !== undefined
      ? Boolean(payload.pagination.hasPrev)
      : page > 1 && total > limit;

  return {
    rows,
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
  };
};

const extractTicket = (raw) => {
  const payload = unwrapPayload(raw);
  if (payload?.ticket && typeof payload.ticket === "object") return payload.ticket;
  if (payload && typeof payload === "object" && payload._id && payload.ticketId) return payload;
  return null;
};

const getTicketIdentifier = (ticket) => {
  if (!ticket || typeof ticket !== "object") return "";
  return String(ticket._id || ticket.ticketId || "").trim();
};

export default function Helpdesk() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase().includes("admin");

  const [filters, setFilters] = useState({
    queue: "",
    source: "",
    helpType: "",
    status: "",
    priority: "",
    queryCategory: "",
    querySubCategory: "",
    escalationLevel: "",
    routedToRole: "",
    assignedTo: "",
    searchInput: "",
    search: "",
    page: 1,
    limit: 10,
  });

  const [taxonomy, setTaxonomy] = useState(DEFAULT_TAXONOMY);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const latestTicketRequestRef = useRef(0);

  const [editForm, setEditForm] = useState({
    status: "",
    priority: "",
    assignedTo: "",
  });
  const [commentForm, setCommentForm] = useState({ message: "", files: [] });

  const [savingChanges, setSavingChanges] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [listError, setListError] = useState("");
  const [actionError, setActionError] = useState("");

  const categories = useMemo(
    () => (Array.isArray(taxonomy.categories) ? taxonomy.categories : []),
    [taxonomy.categories]
  );
  const selectedFilterCategoryConfig = useMemo(
    () =>
      categories.find(
        (entry) =>
          String(entry?.name || "").toLowerCase() ===
          String(filters.queryCategory || "").toLowerCase()
      ) || null,
    [categories, filters.queryCategory]
  );
  const filterSubCategoryOptions = useMemo(
    () =>
      Array.isArray(selectedFilterCategoryConfig?.subCategories)
        ? selectedFilterCategoryConfig.subCategories
        : [],
    [selectedFilterCategoryConfig]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: prev.searchInput.trim(),
        page: 1,
      }));
    }, 350);
    return () => clearTimeout(timer);
  }, [filters.searchInput]);

  const fetchTickets = async ({ keepLoading = false } = {}) => {
    if (keepLoading) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setListError("");

    try {
      const response = await listTickets({
        queue: filters.queue || undefined,
        source: filters.source || undefined,
        helpType: filters.helpType || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        queryCategory: filters.queryCategory || undefined,
        querySubCategory: filters.querySubCategory || undefined,
        escalationLevel: filters.escalationLevel || undefined,
        routedToRole: filters.routedToRole || undefined,
        assignedTo: filters.assignedTo || undefined,
        search: filters.search || undefined,
        page: filters.page,
        limit: filters.limit,
        sort: "-createdAt",
      });

      const normalized = normalizeListResponse({
        raw: response,
        fallbackPage: filters.page,
        fallbackLimit: filters.limit,
      });

      setTickets(normalized.rows);
      setPagination({
        page: normalized.page,
        totalPages: normalized.totalPages,
        total: normalized.total,
        hasNext: normalized.hasNext,
        hasPrev: normalized.hasPrev,
      });
      setListError("");
    } catch (error) {
      setTickets([]);
      setPagination((prev) => ({
        ...prev,
        page: filters.page,
      }));
      setListError(getErrorMessage(error, "Failed to load tickets"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const response = await listAdminUsers();
      const users = Array.isArray(response?.users) ? response.users : [];
      setAdmins(users);
    } catch {
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const fetchTaxonomy = async () => {
    setLoadingTaxonomy(true);
    try {
      const response = await getTicketTaxonomy();
      const nextTaxonomy = response?.taxonomy || DEFAULT_TAXONOMY;
      setTaxonomy({
        categories: Array.isArray(nextTaxonomy?.categories)
          ? nextTaxonomy.categories
          : [],
        escalationLevels: Array.isArray(nextTaxonomy?.escalationLevels)
          ? nextTaxonomy.escalationLevels
          : [],
        routedToRoles: Array.isArray(nextTaxonomy?.routedToRoles)
          ? nextTaxonomy.routedToRoles
          : [],
      });
    } catch {
      setTaxonomy(DEFAULT_TAXONOMY);
    } finally {
      setLoadingTaxonomy(false);
    }
  };

  const openTicket = useCallback(async (id, options = {}) => {
    const ticketId = String(id || "").trim();
    if (!ticketId) return;

    const { revealOnMobile = true } = options;
    const requestId = latestTicketRequestRef.current + 1;
    latestTicketRequestRef.current = requestId;

    setSelectedTicketId(ticketId);
    setLoadingTicket(true);
    setActionError("");

    if (
      revealOnMobile &&
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setIsMobileDetailOpen(true);
    }

    try {
      const response = await getTicket(ticketId);
      if (latestTicketRequestRef.current !== requestId) return;

      const ticket = extractTicket(response);
      if (!ticket) {
        throw new Error("Ticket details are unavailable");
      }

      setSelectedTicket(ticket);
      setEditForm({
        status: ticket?.status || "Pending",
        priority: ticket?.priority || "Medium",
        assignedTo: ticket?.assignedTo?._id || "",
      });
      setCommentForm({ message: "", files: [] });
    } catch (error) {
      if (latestTicketRequestRef.current !== requestId) return;
      setSelectedTicket(null);
      setSelectedTicketId("");
      setActionError(getErrorMessage(error, "Failed to load ticket details"));
    } finally {
      if (latestTicketRequestRef.current === requestId) {
        setLoadingTicket(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAdmin,
    filters.queue,
    filters.source,
    filters.helpType,
    filters.status,
    filters.priority,
    filters.queryCategory,
    filters.querySubCategory,
    filters.escalationLevel,
    filters.routedToRole,
    filters.assignedTo,
    filters.search,
    filters.page,
    filters.limit,
  ]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAdmins();
    fetchTaxonomy();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    if (!tickets.length) {
      setSelectedTicketId("");
      setSelectedTicket(null);
      setIsMobileDetailOpen(false);
      return;
    }

    const selectedExists = tickets.some(
      (ticket) => getTicketIdentifier(ticket) === selectedTicketId
    );
    if (selectedExists) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setIsMobileDetailOpen(false);
    }

    const firstTicketId = getTicketIdentifier(tickets[0]);
    if (firstTicketId) {
      openTicket(firstTicketId, { revealOnMobile: false });
    }
  }, [isAdmin, tickets, selectedTicketId, openTicket]);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
          Access denied. Helpdesk management is admin-only.
        </div>
      </div>
    );
  }

  const handleSaveMeta = async () => {
    if (!selectedTicketId) return;
    setSavingChanges(true);
    setActionError("");
    try {
      const response = await updateTicket(selectedTicketId, {
        status: editForm.status,
        priority: editForm.priority,
        assignedTo: editForm.assignedTo || null,
      });
      const ticket = extractTicket(response);
      if (!ticket) {
        throw new Error("Updated ticket payload is unavailable");
      }
      setSelectedTicket(ticket);
      await fetchTickets({ keepLoading: true });
    } catch (error) {
      setActionError(getErrorMessage(error, "Failed to update ticket"));
    } finally {
      setSavingChanges(false);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!selectedTicketId) return;
    setActionError("");

    if (!commentForm.message.trim() && commentForm.files.length === 0) {
      setActionError("Add a message or attachment first.");
      return;
    }

    const formData = new FormData();
    formData.append("message", commentForm.message.trim());
    commentForm.files.forEach((file) => {
      formData.append("attachments", file);
    });

    setPostingComment(true);
    try {
      const response = await addAdminComment(selectedTicketId, formData);
      const ticket = extractTicket(response);
      if (!ticket) {
        throw new Error("Ticket payload is unavailable after comment");
      }
      setSelectedTicket(ticket);
      setCommentForm({ message: "", files: [] });
      await fetchTickets({ keepLoading: true });
    } catch (error) {
      setActionError(getErrorMessage(error, "Failed to post comment"));
    } finally {
      setPostingComment(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicketId) return;
    setClosingTicket(true);
    setActionError("");
    try {
      const response = await closeTicket(selectedTicketId);
      const ticket = extractTicket(response);
      if (!ticket) {
        throw new Error("Ticket payload is unavailable after close");
      }
      setSelectedTicket(ticket);
      setEditForm((prev) => ({ ...prev, status: "Closed" }));
      await fetchTickets({ keepLoading: true });
    } catch (error) {
      setActionError(getErrorMessage(error, "Failed to close ticket"));
    } finally {
      setClosingTicket(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Helpdesk Management</h1>
          <p className="text-xs text-gray-600">Monitor, assign, and resolve LMS support tickets.</p>
        </div>
        <div className="text-xs text-gray-600">Total tickets: {pagination.total}</div>
      </div>

      {actionError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-red-700">Action failed</p>
          <p className="text-xs text-red-600">{actionError}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {QUEUE_OPTIONS.map((queue) => (
          <button
            key={queue.key || "ALL"}
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                queue: queue.key,
                page: 1,
              }))
            }
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              filters.queue === queue.key
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {queue.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
        <select
          value={filters.source}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, source: event.target.value, page: 1 }))
          }
          className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
        >
          <option value="">All Sources</option>
          {SOURCE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={filters.helpType}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, helpType: event.target.value, page: 1 }))
          }
          className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
        >
          <option value="">All Help Types</option>
          {HELP_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, status: event.target.value, page: 1 }))
          }
          className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={filters.priority}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, priority: event.target.value, page: 1 }))
          }
          className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
        >
          <option value="">All Priority</option>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <input
          value={filters.queryCategory}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              queryCategory: event.target.value,
              querySubCategory: "",
              page: 1,
            }))
          }
          list="ticket-category-options"
          placeholder={loadingTaxonomy ? "Loading categories..." : "Query category"}
          className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
        />
        <datalist id="ticket-category-options">
          {categories.map((entry) => (
            <option key={entry.name} value={entry.name} />
          ))}
        </datalist>

        <select
          value={filters.querySubCategory}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              querySubCategory: event.target.value,
              page: 1,
            }))
          }
          className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
          disabled={!filters.queryCategory}
        >
          <option value="">All Sub-categories</option>
          {filterSubCategoryOptions.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>

        <select
          value={filters.escalationLevel}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              escalationLevel: event.target.value,
              page: 1,
            }))
          }
          className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
        >
          <option value="">All Escalation Levels</option>
          {(taxonomy.escalationLevels || []).map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>

        <select
          value={filters.routedToRole}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              routedToRole: event.target.value,
              page: 1,
            }))
          }
          className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
        >
          <option value="">All Routed Roles</option>
          {(taxonomy.routedToRoles || []).map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>

        <select
          value={filters.assignedTo}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, assignedTo: event.target.value, page: 1 }))
          }
          className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
        >
          <option value="">All Assignees</option>
          {admins.map((adminUser) => (
            <option key={adminUser._id} value={adminUser._id}>
              {adminUser.name || adminUser.email}
            </option>
          ))}
        </select>

        <div className="relative sm:col-span-2 xl:col-span-1 2xl:col-span-2">
          <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={filters.searchInput}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, searchInput: event.target.value, page: 1 }))
            }
            placeholder="Search ticket/title/user/requester"
            className="w-full border border-gray-300 rounded-md pl-8 pr-2.5 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:h-[calc(100vh-250px)] lg:min-h-[560px]">
        <section
          className={`${
            isMobileDetailOpen ? "hidden" : "flex"
          } lg:flex lg:col-span-5 bg-white border border-gray-200 rounded-lg flex-col min-h-0 overflow-hidden`}
        >
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Tickets</p>
            <button
              type="button"
              onClick={() => fetchTickets({ keepLoading: true })}
              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {listError ? (
              <div className="py-8 px-4 text-center">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-100 text-red-600 mb-2">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
                <p className="text-sm font-medium text-gray-900">Unable to load tickets</p>
                <p className="text-xs text-gray-600 mt-1">{listError}</p>
                <button
                  type="button"
                  onClick={() => fetchTickets()}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div className="py-14 text-center text-sm text-gray-600">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-600">No tickets found.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {tickets.map((ticket) => {
                  const ticketId = getTicketIdentifier(ticket);
                  const isSelected = ticketId === selectedTicketId;
                  const isWebsiteTicket =
                    String(ticket?.source || "").toUpperCase() === "WEBSITE";
                  const requesterName = isWebsiteTicket
                    ? ticket?.requester?.name || "-"
                    : ticket?.createdBy?.name || "-";
                  const requesterEmail = isWebsiteTicket
                    ? ticket?.requester?.email || "-"
                    : ticket?.createdBy?.email || "-";

                  return (
                    <li key={ticketId || ticket.ticketId}>
                      <button
                        type="button"
                        disabled={!ticketId}
                        onClick={() => openTicket(ticketId, { revealOnMobile: true })}
                        className={`w-full text-left px-3 py-2.5 transition-colors ${
                          isSelected
                            ? "bg-blue-50 border-l-2 border-blue-600"
                            : "hover:bg-gray-50 border-l-2 border-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] text-gray-500">{ticket.ticketId || "-"}</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {ticket.title || "Untitled"}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {requesterName} · {requesterEmail}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${statusBadgeClass(ticket.status)}`}
                          >
                            {ticket.status || "Pending"}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`text-xs font-semibold ${priorityClass(ticket.priority)}`}>
                            {ticket.priority || "Medium"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${helpTypeBadgeClass(ticket.helpType)}`}
                          >
                            {ticket.helpType || "Academic"}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {ticket.queryCategory || ticket.category || "-"}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {String(ticket?.source || "LMS").toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-gray-500">
                          Updated: {formatDate(ticket.lastUpdateAt || ticket.updatedAt)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Page {pagination.page} / {pagination.totalPages}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={!pagination.hasPrev}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                }
                className="px-2.5 py-1 rounded border border-gray-300 text-xs disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={!pagination.hasNext}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="px-2.5 py-1 rounded border border-gray-300 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <section
          className={`${
            isMobileDetailOpen ? "flex" : "hidden"
          } lg:flex lg:col-span-7 bg-white border border-gray-200 rounded-lg flex-col min-h-0 overflow-hidden`}
        >
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileDetailOpen(false)}
                className="lg:hidden inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700">Ticket Detail</p>
                <p className="text-xs text-gray-500 truncate">
                  {selectedTicket?.ticketId || selectedTicketId || "Select a ticket"}
                </p>
              </div>
            </div>
            {selectedTicket?.status ? (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadgeClass(selectedTicket.status)}`}
              >
                {selectedTicket.status}
              </span>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selectedTicketId ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500 px-4 text-center">
                Select a ticket from the list to view and manage details.
              </div>
            ) : loadingTicket || !selectedTicket ? (
              <div className="py-16 text-center text-sm text-gray-600">Loading ticket...</div>
            ) : (
              <div className="p-3 space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${helpTypeBadgeClass(selectedTicket.helpType)}`}
                    >
                      {selectedTicket.helpType || "Academic"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadgeClass(selectedTicket.status)}`}
                    >
                      {selectedTicket.status}
                    </span>
                    <span className={`text-xs font-semibold ${priorityClass(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className="text-xs text-gray-600">
                      {selectedTicket.queryCategory || selectedTicket.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{selectedTicket.title}</h3>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                  <p className="text-xs text-gray-600">
                    Source: {String(selectedTicket.source || "LMS").toUpperCase()}
                  </p>
                  {String(selectedTicket.source || "").toUpperCase() === "WEBSITE" ? (
                    <>
                      <p className="text-xs text-gray-600">
                        Requester Name: {selectedTicket?.requester?.name || "-"}
                      </p>
                      <p className="text-xs text-gray-600">
                        Requester Email: {selectedTicket?.requester?.email || "-"}
                      </p>
                      <p className="text-xs text-gray-600">
                        Requester Phone: {selectedTicket?.requester?.phone || "-"}
                      </p>
                    </>
                  ) : null}
                  <p className="text-xs text-gray-600">
                    Sub-category: {selectedTicket.querySubCategory || "-"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Escalation: {selectedTicket.escalationLevel || "-"}
                  </p>
                  {Array.isArray(selectedTicket.frontlineLevels) &&
                  selectedTicket.frontlineLevels.length > 1 ? (
                    <p className="text-xs text-gray-600">
                      Eligible frontlines: {selectedTicket.frontlineLevels.join(" / ")}
                    </p>
                  ) : null}
                  <p className="text-xs text-gray-600">
                    Routed To: {selectedTicket.routedToRole || "-"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Resolution Status: {selectedTicket.resolutionStatus || "Unresolved"}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Created: {formatDate(selectedTicket.createdAt)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, status: event.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={editForm.priority}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, priority: event.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Assign To</label>
                    <select
                      value={editForm.assignedTo}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, assignedTo: event.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {admins.map((adminUser) => (
                        <option key={adminUser._id} value={adminUser._id}>
                          {adminUser.name || adminUser.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={savingChanges}
                    onClick={handleSaveMeta}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
                  >
                    <UserCheck className="h-4 w-4" />
                    {savingChanges ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    disabled={closingTicket || selectedTicket.status === "Closed"}
                    onClick={handleCloseTicket}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-700 text-white text-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {closingTicket ? "Closing..." : "Close Ticket"}
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-800 mb-2">Attachments</h4>
                  {selectedTicket.attachments?.length ? (
                    <div className="space-y-1.5">
                      {selectedTicket.attachments.map((attachment, index) => (
                        <a
                          key={`${attachment.url}-${index}`}
                          href={resolveTicketAttachmentUrl(attachment.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-xs text-blue-700 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {attachment.originalName || `Attachment ${index + 1}`}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No ticket-level attachments</p>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-800 mb-2">Comments</h4>
                  <div className="space-y-2">
                    {(selectedTicket.comments || []).length === 0 ? (
                      <p className="text-xs text-gray-500">No comments yet.</p>
                    ) : (
                      selectedTicket.comments.map((comment) => (
                        <div
                          key={comment._id}
                          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[11px] font-semibold text-gray-700">
                              {comment?.by?.name || "User"} ({comment?.byRole || "user"})
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {formatDate(comment?.createdAt)}
                            </p>
                          </div>
                          {comment?.message ? (
                            <p className="text-xs text-gray-800 whitespace-pre-wrap">
                              {comment.message}
                            </p>
                          ) : null}
                          {comment?.attachments?.length ? (
                            <div className="mt-2 space-y-1">
                              {comment.attachments.map((attachment, index) => (
                                <a
                                  key={`${attachment.url}-${index}`}
                                  href={resolveTicketAttachmentUrl(attachment.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 text-xs text-blue-700 hover:underline"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  {attachment.originalName || `Attachment ${index + 1}`}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <form
                  onSubmit={handleAddComment}
                  className="border border-gray-200 rounded-lg p-3 space-y-2.5"
                >
                  <label className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Reply to Ticket
                  </label>
                  <textarea
                    value={commentForm.message}
                    onChange={(event) =>
                      setCommentForm((prev) => ({ ...prev, message: event.target.value }))
                    }
                    rows={3}
                    maxLength={2000}
                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
                    placeholder="Write an update for the user"
                  />
                  <input
                    type="file"
                    multiple
                    onChange={(event) =>
                      setCommentForm((prev) => ({
                        ...prev,
                        files: Array.from(event.target.files || []),
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={postingComment}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {postingComment ? "Posting..." : "Post Reply"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="text-xs text-gray-500 flex items-center gap-2">
        <Clock3 className="h-3.5 w-3.5" />
        Admin users loaded: {loadingAdmins ? "Loading..." : admins.length}
      </div>
    </div>
  );
}
