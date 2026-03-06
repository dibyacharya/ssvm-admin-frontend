import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import RBACManager from "../RBACManager";

const mockUseAuth = vi.fn();
const mockListRoles = vi.fn();
const mockGetRoleFeatures = vi.fn();
const mockCreateRole = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../services/role.service", () => ({
  listRoles: (...args) => mockListRoles(...args),
  getRoleFeatures: (...args) => mockGetRoleFeatures(...args),
  createRole: (...args) => mockCreateRole(...args),
  deleteRole: vi.fn(),
  actAsRolePreview: vi.fn(),
  clearActAsRolePreview: vi.fn(),
}));

describe("RBAC Add Role modal", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        role: "admin",
        accessRoles: ["ADMIN"],
      },
      updateUser: vi.fn(),
    });
    mockListRoles.mockResolvedValue({
      success: true,
      roles: [
        {
          _id: "role-1",
          key: "dean",
          label: "Dean",
          isSystemRole: true,
          order: 2,
        },
      ],
    });
    mockGetRoleFeatures.mockResolvedValue({
      success: true,
      features: [
        {
          featureKey: "user_management",
          featureName: "User Management",
          actions: ["view", "edit"],
        },
      ],
    });
    mockCreateRole.mockResolvedValue({
      success: true,
      role: { _id: "role-2", roleKey: "content_reviewer", roleName: "Content Reviewer" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("submits roleName, roleKey, parentRoleId and permissions from matrix", async () => {
    render(<RBACManager />);

    const addRoleButton = await screen.findByRole("button", { name: /^Add Role$/i });
    await userEvent.click(addRoleButton);

    await userEvent.type(
      screen.getByPlaceholderText("e.g. Content Reviewer"),
      "Content Reviewer"
    );

    const roleCodeInput = screen.getByPlaceholderText("content_reviewer");
    await waitFor(() => {
      expect(roleCodeInput).toHaveValue("content_reviewer");
    });

    const reportingLabel = screen.getByText("Reporting To");
    const reportingToSelect = reportingLabel?.parentElement?.querySelector("select");
    expect(reportingToSelect).toBeTruthy();
    await userEvent.selectOptions(reportingToSelect, "role-1");

    const matrix = screen.getByRole("table");
    const checkboxes = within(matrix).getAllByRole("checkbox");
    await userEvent.click(checkboxes[0]);

    await userEvent.click(screen.getByRole("button", { name: /^Create Role$/i }));

    await waitFor(() => {
      expect(mockCreateRole).toHaveBeenCalledWith(
        expect.objectContaining({
          roleName: "Content Reviewer",
          roleKey: "content_reviewer",
          parentRoleId: "role-1",
          permissions: [
            expect.objectContaining({
              featureKey: "user_management",
              actions: expect.arrayContaining(["view"]),
            }),
          ],
        })
      );
    });
  });
});
