const API_BASE = "http://127.0.0.1:5000/api";

const requestJson = async (request, path, { method = "GET", token, data } = {}) => {
  const response = await request.fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data ? { "content-type": "application/json" } : {}),
    },
    data,
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

export const createAdminAndStudentFixture = async (request) => {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const adminEmail = `e2e.admin.${stamp}@example.com`;
  const adminPassword = "Admin@Test123";
  const studentPassword = "Student@Test123";
  const rollNo = `RL${String(stamp).slice(-8)}`;

  const adminRegister = await requestJson(request, "/auth/register", {
    method: "POST",
    data: {
      name: `E2E Admin ${stamp}`,
      email: adminEmail,
      password: adminPassword,
      role: "admin",
    },
  });
  if (!adminRegister.response.ok()) {
    throw new Error(`Admin register failed: ${adminRegister.response.status()} ${JSON.stringify(adminRegister.body)}`);
  }
  const adminToken = adminRegister.body?.token;
  const adminUser = adminRegister.body?.user;
  if (!adminToken || !adminUser?._id) {
    throw new Error("Admin token/user missing after register");
  }

  const studentEmail = `e2e.student.${stamp}@example.com`;
  const studentCreate = await requestJson(request, "/admin/users", {
    method: "POST",
    token: adminToken,
    data: {
      name: `E2E Student ${stamp}`,
      email: studentEmail,
      role: "student",
      userType: "student",
      rollNo,
    },
  });
  if (!studentCreate.response.ok()) {
    throw new Error(`Student create failed: ${studentCreate.response.status()} ${JSON.stringify(studentCreate.body)}`);
  }
  const studentUserId = studentCreate.body?.user?._id;
  if (!studentUserId) {
    throw new Error("Student user id missing after create");
  }

  const resetPassword = await requestJson(
    request,
    `/admin/users/${studentUserId}/reset-password`,
    {
      method: "POST",
      token: adminToken,
      data: { newPassword: studentPassword },
    }
  );
  if (!resetPassword.response.ok()) {
    throw new Error(
      `Student reset-password failed: ${resetPassword.response.status()} ${JSON.stringify(resetPassword.body)}`
    );
  }

  return {
    admin: {
      email: adminEmail,
      password: adminPassword,
      token: adminToken,
      user: adminUser,
    },
    student: {
      userId: studentUserId,
      email: studentEmail,
      rollNo,
      password: studentPassword,
    },
  };
};

export const loginStudentForApi = async (request, { identifier, password }) => {
  const login = await requestJson(request, "/auth/lms/login", {
    method: "POST",
    data: { identifier, password },
  });
  if (!login.response.ok()) {
    throw new Error(`Student login failed: ${login.response.status()} ${JSON.stringify(login.body)}`);
  }
  const token = login.body?.token;
  if (!token) throw new Error("Student login token missing");
  return token;
};

export const getNormalTaxonomyEntry = async (request) => {
  const taxonomy = await requestJson(request, "/tickets/meta/taxonomy");
  if (!taxonomy.response.ok()) {
    throw new Error(`Taxonomy fetch failed: ${taxonomy.response.status()}`);
  }
  const categories = Array.isArray(taxonomy.body?.taxonomy?.categories)
    ? taxonomy.body.taxonomy.categories
    : Array.isArray(taxonomy.body?.taxonomy)
      ? taxonomy.body.taxonomy
      : [];
  const category = categories.find((entry) => {
    const name = String(entry?.name || entry?.category || "").toLowerCase();
    const subs = Array.isArray(entry?.subCategories) ? entry.subCategories : [];
    return (
      subs.length > 0 &&
      !name.includes("follow on existing ticket") &&
      !name.includes("ticket closed without resolution")
    );
  });
  if (!category) throw new Error("No usable taxonomy category found");
  return {
    category: category.name || category.category,
    subCategory: category.subCategories[0],
  };
};

export const createTicketAsStudent = async (request, { token, title, description, helpType }) => {
  const taxonomy = await getNormalTaxonomyEntry(request);
  const ticketCreate = await requestJson(request, "/tickets", {
    method: "POST",
    token,
    data: {
      title,
      description,
      queryCategory: taxonomy.category,
      querySubCategory: taxonomy.subCategory,
      helpType: helpType || "Technical",
      priority: "Medium",
    },
  });
  if (!ticketCreate.response.ok()) {
    throw new Error(
      `Student ticket create failed: ${ticketCreate.response.status()} ${JSON.stringify(ticketCreate.body)}`
    );
  }
  return ticketCreate.body?.ticket;
};

export const findTicketByTitleAsAdmin = async (request, { adminToken, title }) => {
  const list = await requestJson(request, `/tickets?search=${encodeURIComponent(title)}&page=1&limit=20`, {
    method: "GET",
    token: adminToken,
  });
  if (!list.response.ok()) return null;
  const data = Array.isArray(list.body?.data) ? list.body.data : [];
  return data.find((entry) => String(entry?.title || "") === title) || null;
};

