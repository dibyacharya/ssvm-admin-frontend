import { expect, test } from "@playwright/test";
import {
  createAdminAndStudentFixture,
  createTicketAsStudent,
  loginStudentForApi,
} from "./helpers/api";

test("admin can login, edit user profile, manage helpdesk ticket, and create role", async ({
  page,
  request,
}) => {
  const fixture = await createAdminAndStudentFixture(request);

  await page.goto("http://127.0.0.1:3000/login");
  await page.getByLabel("User ID").fill(fixture.admin.email);
  await page.getByLabel("Password").fill(fixture.admin.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto(`http://127.0.0.1:3000/users/${fixture.student.userId}/profile`);
  await expect(page.getByText("Student Profile")).toBeVisible();
  await page.getByRole("button", { name: /^Edit$/i }).click();
  await page.getByPlaceholder("Enter Designation").first().fill("Automation Mentor");
  await page.getByRole("button", { name: /^Save$/i }).click();
  await expect(page.getByText(/updated successfully/i)).toBeVisible();

  const studentToken = await loginStudentForApi(request, {
    identifier: fixture.student.rollNo,
    password: fixture.student.password,
  });
  const ticketTitle = `E2E Helpdesk Ticket ${Date.now()}`;
  await createTicketAsStudent(request, {
    token: studentToken,
    title: ticketTitle,
    description: "E2E admin helpdesk management flow",
    helpType: "Technical",
  });

  await page.goto("http://127.0.0.1:3000/helpdesk");
  const ticketRowButton = page.getByRole("button", { name: new RegExp(ticketTitle) });
  await expect(ticketRowButton).toBeVisible();
  await ticketRowButton.click();

  const statusSelect = page
    .locator('label:has-text("Status")')
    .locator("..")
    .locator("select")
    .last();
  await statusSelect.selectOption("In-Progress");
  const patchTicketPromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes("/api/tickets/")
  );
  await page.getByRole("button", { name: /Save Changes/i }).click();
  const patchTicketResponse = await patchTicketPromise;
  expect(patchTicketResponse.ok()).toBeTruthy();

  await page.goto("http://127.0.0.1:3000/rbac");
  await page.getByRole("button", { name: /^Add Role$/i }).click();
  const roleName = `E2E Reviewer ${Date.now()}`;
  await page.getByPlaceholder("e.g. Content Reviewer").fill(roleName);

  const reportingSelect = page
    .getByText("Reporting To")
    .locator("..")
    .locator("select");
  const optionCount = await reportingSelect.locator("option").count();
  if (optionCount > 1) {
    await reportingSelect.selectOption({ index: 1 });
  }

  const matrixCheckboxes = page.locator("div.max-h\\[48vh\\] input[type='checkbox']");
  const checkboxCount = await matrixCheckboxes.count();
  if (checkboxCount > 0) {
    await matrixCheckboxes.first().check();
  }
  await page.getByRole("button", { name: /^Create Role$/i }).click();
  await expect(page.getByText(/Role created successfully/i)).toBeVisible();
});
