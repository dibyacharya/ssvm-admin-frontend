import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import UserManagement from "../UserManagement";

const mockListUsers = vi.fn();
const mockListRoles = vi.fn();
const mockGetProgramsDropdown = vi.fn();
const mockGetBatchesDropdown = vi.fn();

vi.mock("../../services/user.service", () => ({
  listUsers: (...args) => mockListUsers(...args),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  bulkDeleteUsers: vi.fn(),
  getUserDetails: vi.fn(),
  updateUserDetails: vi.fn(),
  resetUserPassword: vi.fn(),
}));

vi.mock("../../services/program.service", () => ({
  getProgramsDropdown: (...args) => mockGetProgramsDropdown(...args),
}));

vi.mock("../../services/batch.service", () => ({
  getBatchesDropdown: (...args) => mockGetBatchesDropdown(...args),
}));

vi.mock("../../services/role.service", () => ({
  listRoles: (...args) => mockListRoles(...args),
}));

vi.mock("../../components/userManagement/StudentImportModal", () => ({
  default: () => null,
}));

describe("UserManagement tab filtering", () => {
  beforeEach(() => {
    mockListUsers.mockResolvedValue({
      users: [],
      pagination: { currentPage: 1, totalPages: 1, totalUsers: 0, hasNext: false, hasPrev: false },
    });
    mockListRoles.mockResolvedValue({ roles: [] });
    mockGetProgramsDropdown.mockResolvedValue([]);
    mockGetBatchesDropdown.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("calls listUsers with userType on Student/Teacher/Executive tabs", async () => {
    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalled();
    });
    expect(mockListUsers).toHaveBeenCalledWith(
      expect.objectContaining({ userType: "student", sort: "rollNo_asc" })
    );

    await userEvent.click(screen.getByRole("button", { name: /Teacher/i }));
    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({ userType: "teacher", sort: "employeeId_asc" })
      );
    });

    await userEvent.click(screen.getByRole("button", { name: /Executive Staff/i }));
    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({ userType: "executive_staff", sort: "employeeId_asc" })
      );
    });
  });
});
