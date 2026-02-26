import { expect, test } from "@playwright/test";
import {
  createAdminAndStudentFixture,
  findTicketByTitleAsAdmin,
  getNormalTaxonomyEntry,
} from "./helpers/api";

test("student can login, edit profile, raise helpdesk ticket, and ticket is visible to admin", async ({
  page,
  request,
}) => {
  const fixture = await createAdminAndStudentFixture(request);
  const taxonomy = await getNormalTaxonomyEntry(request);

  await page.goto("http://127.0.0.1:3001/login");
  await page
    .getByLabel("User ID (Roll No / Enrolment No / Employee ID)")
    .fill(fixture.student.rollNo);
  await page.getByLabel("Password").fill(fixture.student.password);
  await page.getByRole("button", { name: /Sign In/i }).click();
  await expect(page).toHaveURL(/\/student\/dashboard$/);

  await page.goto("http://127.0.0.1:3001/profile");
  await expect(page.getByText("Student Profile")).toBeVisible();
  await page.getByRole("button", { name: /^Edit$/i }).click();
  await page.getByPlaceholder("Enter Designation").first().fill("LMS E2E Mentor");
  const saveProfilePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().includes("/api/me/profile")
  );
  await page.getByRole("button", { name: /^Save$/i }).click();
  const saveProfileResponse = await saveProfilePromise;
  expect(saveProfileResponse.ok()).toBeTruthy();

  await page.goto("http://127.0.0.1:3001/student/profile/help");
  await expect(page.getByText("Helpdesk")).toBeVisible();
  await page.getByRole("button", { name: /Raise Ticket/i }).click();

  const ticketTitle = `E2E LMS Ticket ${Date.now()}`;
  await page.getByPlaceholder("Short summary of the issue").fill(ticketTitle);
  await page.getByText("Help Type").locator("..").locator("select").selectOption("Technical");
  await page
    .getByText("Query Category")
    .locator("..")
    .locator("select")
    .selectOption(taxonomy.category);
  await page
    .getByText("Query Sub-category")
    .locator("..")
    .locator("select")
    .selectOption(taxonomy.subCategory);
  await page
    .getByPlaceholder("Explain the issue with relevant details")
    .fill("E2E LMS helpdesk ticket creation flow");
  await page.getByRole("button", { name: /Submit Ticket/i }).click();

  await expect(page.getByText(ticketTitle)).toBeVisible();

  const adminSeenTicket = await findTicketByTitleAsAdmin(request, {
    adminToken: fixture.admin.token,
    title: ticketTitle,
  });
  expect(adminSeenTicket).toBeTruthy();
});
