const API_URL = "/api/employees";
const avatarPalettes = [
  ["#e5f0e7", "#3d7250"],
  ["#f8e8df", "#a4553c"],
  ["#e9e8f4", "#625d91"],
  ["#f5edcf", "#8c752c"],
  ["#e2edf1", "#466b7c"],
  ["#f2e5eb", "#8c5570"]
];

const state = { employees: [], query: "", department: "", deletingId: null };
const elements = {
  rows: document.querySelector("#employee-rows"),
  empty: document.querySelector("#empty-state"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyCopy: document.querySelector("#empty-copy"),
  search: document.querySelector("#search-input"),
  departmentFilter: document.querySelector("#department-filter"),
  resultCount: document.querySelector("#result-count"),
  footerLabel: document.querySelector("#table-footer-label"),
  statPeople: document.querySelector("#stat-people"),
  statDepartments: document.querySelector("#stat-departments"),
  statLargest: document.querySelector("#stat-largest"),
  statLargestCaption: document.querySelector("#stat-largest-caption"),
  navCount: document.querySelector("#nav-count"),
  dialog: document.querySelector("#employee-dialog"),
  form: document.querySelector("#employee-form"),
  formError: document.querySelector("#form-error"),
  confirmDialog: document.querySelector("#confirm-dialog"),
  toastRegion: document.querySelector("#toast-region")
};

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function paletteFor(employee) {
  const seed = Number(employee.id) || employee.name.split("").reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return avatarPalettes[seed % avatarPalettes.length];
}

function visibleEmployees() {
  const query = state.query.trim().toLocaleLowerCase();
  return state.employees.filter((employee) => {
    const matchesQuery = !query || [employee.name, employee.email, employee.department, String(employee.id)]
      .some((field) => field.toLocaleLowerCase().includes(query));
    return matchesQuery && (!state.department || employee.department === state.department);
  });
}

function renderRows() {
  const employees = visibleEmployees();
  elements.resultCount.textContent = employees.length;
  elements.footerLabel.textContent = `Showing ${employees.length} ${employees.length === 1 ? "person" : "people"}`;
  elements.rows.innerHTML = employees.map((employee, index) => {
    const [background, foreground] = paletteFor(employee);
    return `<tr style="animation-delay:${Math.min(index * 35, 280)}ms">
      <td><div class="person-cell"><span class="person-avatar" style="background:${background};color:${foreground}">${escapeHtml(initials(employee.name))}</span><span class="person-copy"><strong>${escapeHtml(employee.name)}</strong><small>Team member</small></span></div></td>
      <td><span class="department-pill">${escapeHtml(employee.department)}</span></td>
      <td><a class="email-link" href="mailto:${encodeURIComponent(employee.email)}">${escapeHtml(employee.email)}</a></td>
      <td class="id-cell">#${escapeHtml(employee.id)}</td>
      <td><div class="row-actions">
        <button class="icon-button edit-button" type="button" data-action="edit" data-id="${escapeHtml(employee.id)}" aria-label="Edit ${escapeHtml(employee.name)}" title="Edit person"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z"/></svg></button>
        <button class="icon-button delete-button" type="button" data-action="delete" data-id="${escapeHtml(employee.id)}" aria-label="Remove ${escapeHtml(employee.name)}" title="Remove person"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16m-10 4v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
      </div></td>
    </tr>`;
  }).join("");

  const noEmployees = state.employees.length === 0;
  const noMatches = !noEmployees && employees.length === 0;
  elements.empty.hidden = employees.length > 0;
  elements.rows.closest("table").hidden = employees.length === 0;
  elements.emptyTitle.textContent = noMatches ? "No matches this time" : "A fresh page";
  elements.emptyCopy.textContent = noMatches ? "Try another name or department." : "Add the first person to your directory.";
  document.querySelector("#empty-add").hidden = noMatches;
}

function renderOverview() {
  const departments = new Map();
  state.employees.forEach(({ department }) => departments.set(department, (departments.get(department) || 0) + 1));
  const largest = [...departments.entries()].sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))[0];
  elements.statPeople.textContent = state.employees.length;
  elements.statDepartments.textContent = departments.size;
  elements.statLargest.textContent = largest ? largest[0] : "—";
  elements.statLargestCaption.textContent = largest ? `${largest[1]} ${largest[1] === 1 ? "person" : "people"}` : "by headcount";
  elements.navCount.textContent = state.employees.length;

  const selectedDepartment = elements.departmentFilter.value;
  const sortedDepartments = [...departments.keys()].sort((first, second) => first.localeCompare(second));
  elements.departmentFilter.innerHTML = `<option value="">All departments</option>${sortedDepartments.map((department) => `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`).join("")}`;
  elements.departmentFilter.value = sortedDepartments.includes(selectedDepartment) ? selectedDepartment : "";
  state.department = elements.departmentFilter.value;
  document.querySelector("#department-options").innerHTML = sortedDepartments.map((department) => `<option value="${escapeHtml(department)}"></option>`).join("");
}

function setLoading() {
  elements.rows.closest("table").hidden = false;
  elements.empty.hidden = true;
  elements.rows.innerHTML = `<tr class="loading-row"><td colspan="5">Gathering the directory <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></td></tr>`;
}

async function loadEmployees({ quiet = false } = {}) {
  if (!quiet && state.employees.length === 0) setLoading();
  try {
    const response = await fetch(API_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`The directory returned ${response.status}.`);
    const employees = await response.json();
    if (!Array.isArray(employees)) throw new Error("The directory response was not a list.");
    state.employees = employees.sort((first, second) => first.name.localeCompare(second.name));
    renderOverview();
    renderRows();
  } catch (error) {
    elements.rows.closest("table").hidden = true;
    elements.empty.hidden = false;
    elements.emptyTitle.textContent = "The directory is out of reach";
    elements.emptyCopy.textContent = "Check that the employee service is running, then try again.";
    document.querySelector("#empty-add").hidden = true;
    toast(error.message || "Couldn't load the directory.", true);
  }
}

function toast(message, isError = false) {
  const node = document.createElement("div");
  node.className = `toast${isError ? " toast-error" : ""}`;
  node.innerHTML = `<span class="toast-mark" aria-hidden="true">${isError ? "!" : "✓"}</span><span>${escapeHtml(message)}</span>`;
  elements.toastRegion.append(node);
  window.setTimeout(() => node.remove(), 3200);
}

function openEmployeeDialog(employee = null) {
  elements.form.reset();
  elements.formError.hidden = true;
  elements.formError.textContent = "";
  elements.form.querySelectorAll(".form-input").forEach((input) => input.removeAttribute("aria-invalid"));
  document.querySelector("#employee-id").value = employee ? employee.id : "";
  document.querySelector("#dialog-title").textContent = employee ? "Edit person" : "Add a person";
  document.querySelector("#dialog-subtitle").textContent = employee ? "Keep their details up to date." : "A few details, and they're in.";
  document.querySelector("#submit-button span").textContent = employee ? "Save changes" : "Save person";
  if (employee) {
    document.querySelector("#employee-name").value = employee.name;
    document.querySelector("#employee-email").value = employee.email;
    document.querySelector("#employee-department").value = employee.department;
  }
  elements.dialog.showModal();
  window.requestAnimationFrame(() => document.querySelector("#employee-name").focus());
}

function showFormError(message, fieldName = null) {
  elements.formError.textContent = message;
  elements.formError.hidden = false;
  if (fieldName) {
    const field = elements.form.elements.namedItem(fieldName);
    field.setAttribute("aria-invalid", "true");
    field.focus();
  }
}

async function saveEmployee(event) {
  event.preventDefault();
  const employeeId = document.querySelector("#employee-id").value;
  const submitButton = document.querySelector("#submit-button");
  const name = document.querySelector("#employee-name").value.trim();
  const email = document.querySelector("#employee-email").value.trim();
  const department = document.querySelector("#employee-department").value.trim();
  const emailInput = document.querySelector("#employee-email");

  for (const [fieldName, value, label] of [["name", name, "name"], ["email", email, "email"], ["department", department, "department"]]) {
    if (!value) {
      showFormError(`Please enter a ${label}.`, fieldName);
      return;
    }
  }
  if (!emailInput.validity.valid) {
    showFormError("Enter a valid email address.", "email");
    return;
  }

  submitButton.disabled = true;
  elements.formError.hidden = true;
  try {
    const response = await fetch(employeeId ? `${API_URL}/${encodeURIComponent(employeeId)}` : API_URL, {
      method: employeeId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ name, email, department })
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      const detail = problem.detail || Object.values(problem.errors || {})[0] || `Request failed (${response.status}).`;
      throw new Error(detail);
    }
    elements.dialog.close();
    toast(employeeId ? "Person updated." : "Person added.");
    await loadEmployees({ quiet: true });
  } catch (error) {
    showFormError(error.message || "Couldn't save this person.");
  } finally {
    submitButton.disabled = false;
  }
}

function openDeleteDialog(employeeId) {
  const employee = state.employees.find((item) => String(item.id) === String(employeeId));
  if (!employee) return;
  state.deletingId = employee.id;
  document.querySelector("#confirm-copy").textContent = `${employee.name} will be removed from the directory.`;
  elements.confirmDialog.showModal();
}

async function deleteEmployee() {
  if (state.deletingId === null) return;
  const button = document.querySelector("#confirm-delete");
  button.disabled = true;
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(state.deletingId)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) throw new Error(`Request failed (${response.status}).`);
    elements.confirmDialog.close();
    toast("Person removed.");
    await loadEmployees({ quiet: true });
  } catch (error) {
    toast(error.message || "Couldn't remove this person.", true);
  } finally {
    state.deletingId = null;
    button.disabled = false;
  }
}

document.querySelector("#add-employee").addEventListener("click", () => openEmployeeDialog());
document.querySelector("#empty-add").addEventListener("click", () => openEmployeeDialog());
document.querySelector(".close-dialog").addEventListener("click", () => elements.dialog.close());
document.querySelector(".cancel-dialog").addEventListener("click", () => elements.dialog.close());
document.querySelector(".cancel-delete").addEventListener("click", () => elements.confirmDialog.close());
document.querySelector("#confirm-delete").addEventListener("click", deleteEmployee);
elements.form.addEventListener("submit", saveEmployee);
elements.form.addEventListener("input", (event) => {
  event.target.removeAttribute("aria-invalid");
  if (!elements.formError.hidden) elements.formError.hidden = true;
});
elements.search.addEventListener("input", () => {
  state.query = elements.search.value;
  renderRows();
});
elements.departmentFilter.addEventListener("change", () => {
  state.department = elements.departmentFilter.value;
  renderRows();
});
document.querySelector("#refresh-button").addEventListener("click", () => loadEmployees());
elements.rows.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const employee = state.employees.find((item) => String(item.id) === button.dataset.id);
  if (button.dataset.action === "edit" && employee) openEmployeeDialog(employee);
  if (button.dataset.action === "delete") openDeleteDialog(button.dataset.id);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.focus();
  }
});
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date()).toUpperCase();

loadEmployees();