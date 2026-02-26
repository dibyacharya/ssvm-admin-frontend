import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import UserProfile from "../UserProfile";

const mockUseAuth = vi.fn();
const mockGetUserProfile = vi.fn();
const mockGetUserProgress = vi.fn();
const mockUpdateUserProfile = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../services/user.service", () => ({
  default: {
    getUserProfile: (...args) => mockGetUserProfile(...args),
    getUserProgress: (...args) => mockGetUserProgress(...args),
    updateUserProfile: (...args) => mockUpdateUserProfile(...args),
    uploadUserProfilePhoto: vi.fn(),
    deleteUserProfilePhoto: vi.fn(),
    getUserAccessRoles: vi.fn(),
    updateUserAccessRoles: vi.fn(),
  },
}));

const profileResponse = {
  success: true,
  user: {
    _id: "u-student-1",
    userType: "student",
    role: "student",
    name: "Student One",
  },
  academicSummary: {
    rollNo: "RL-001",
    enrolmentNo: "EN-001",
    registrationNo: "REG-001",
    program: "MBA",
    stream: "Finance",
    batch: "2025",
    academicYear: "2025-26",
    session: "Autumn",
    currentStage: "Semester 1",
    currentSemester: 1,
  },
  personalDetails: {
    "Email id": "student.one@example.com",
    "Designation": "Intern",
  },
  profilePhotoUrl: "",
};

const progressResponse = {
  success: true,
  semesters: [
    {
      semesterNo: 1,
      academicYear: "2025-26",
      season: "Autumn",
      status: "Backlog",
      totalCredits: 16,
      sgpa: 7.25,
      cgpa: 7.25,
      hasBacklog: true,
      courses: [
        {
          courseCode: "FIN101",
          courseName: "Finance Basics",
          credit: 4,
          grade: "F",
          isBacklog: true,
        },
      ],
    },
  ],
};

describe("UserProfile page", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { role: "admin", accessRoles: ["SUPER_ADMIN"], _id: "admin-1" },
      updateUser: vi.fn(),
    });
    mockGetUserProfile.mockResolvedValue(profileResponse);
    mockGetUserProgress.mockResolvedValue(progressResponse);
    mockUpdateUserProfile.mockResolvedValue({
      success: true,
      message: "Profile updated",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("renders progress and saves edited personal details", async () => {
    render(
      <MemoryRouter initialEntries={["/users/u-student-1/profile"]}>
        <Routes>
          <Route path="/users/:userId/profile" element={<UserProfile />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Program Progress")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("1st"));
    expect(await screen.findByText("Semester Course Progress")).toBeInTheDocument();
    expect(screen.getByText("FIN101")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Edit/i }));
    const designationInput = await screen.findByPlaceholderText("Enter Designation");
    await userEvent.clear(designationInput);
    await userEvent.type(designationInput, "Senior Mentor");
    await userEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalled();
    });

    const [calledUserId, calledPayload] = mockUpdateUserProfile.mock.calls[0];
    expect(calledUserId).toBe("u-student-1");
    expect(String(calledPayload?.personalDetails?.Designation || "")).toContain("Senior");
  });
});
