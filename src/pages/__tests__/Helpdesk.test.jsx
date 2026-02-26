import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Helpdesk from "../Helpdesk";

const mockUseAuth = vi.fn();
const mockListTickets = vi.fn();
const mockGetTicket = vi.fn();
const mockGetTicketTaxonomy = vi.fn();
const mockListAdminUsers = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../services/ticket.service", () => ({
  listTickets: (...args) => mockListTickets(...args),
  getTicket: (...args) => mockGetTicket(...args),
  getTicketTaxonomy: (...args) => mockGetTicketTaxonomy(...args),
  listAdminUsers: (...args) => mockListAdminUsers(...args),
  updateTicket: vi.fn(),
  addAdminComment: vi.fn(),
  closeTicket: vi.fn(),
  resolveTicketAttachmentUrl: (value) => value,
}));

const ticketRows = [
  {
    _id: "ticket-1",
    ticketId: "TKT-2026-000001",
    title: "Login issue",
    status: "Pending",
    priority: "Medium",
    helpType: "Academic",
    source: "LMS",
    createdBy: { name: "Student One", email: "student1@example.com" },
    queryCategory: "LMS Related",
    lastUpdateAt: "2026-02-20T10:00:00.000Z",
  },
  {
    _id: "ticket-2",
    ticketId: "TKT-2026-000002",
    title: "Video playback issue",
    status: "In-Progress",
    priority: "High",
    helpType: "Technical",
    source: "LMS",
    createdBy: { name: "Student Two", email: "student2@example.com" },
    queryCategory: "LMS Related",
    lastUpdateAt: "2026-02-20T11:00:00.000Z",
  },
];

describe("Helpdesk master/detail behavior", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { role: "admin", _id: "admin-1" },
    });
    mockListTickets.mockResolvedValue({
      success: true,
      data: ticketRows,
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
    mockGetTicketTaxonomy.mockResolvedValue({
      success: true,
      taxonomy: { categories: [], escalationLevels: [], routedToRoles: [] },
    });
    mockListAdminUsers.mockResolvedValue({ users: [] });
    mockGetTicket.mockImplementation(async (id) => {
      const found = ticketRows.find((entry) => entry._id === id);
      return {
        success: true,
        ticket: {
          ...found,
          description: `${found?.title} details`,
          comments: [],
        },
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("opens details when a list row is clicked", async () => {
    render(<Helpdesk />);

    await waitFor(() => {
      expect(screen.getByText("Login issue")).toBeInTheDocument();
      expect(screen.getByText("Video playback issue")).toBeInTheDocument();
    });

    const secondRow = screen.getByRole("button", { name: /Video playback issue/i });
    await userEvent.click(secondRow);

    await waitFor(() => {
      expect(mockGetTicket).toHaveBeenCalledWith("ticket-2");
    });

    const detailPanel = screen.getByText("Ticket Detail").closest("section");
    expect(detailPanel).toBeTruthy();
    expect(within(detailPanel).getByText("Video playback issue")).toBeInTheDocument();
    expect(within(detailPanel).getByText("TKT-2026-000002")).toBeInTheDocument();
  });
});
