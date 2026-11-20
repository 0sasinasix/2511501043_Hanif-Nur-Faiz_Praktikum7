const BASE = "backend"; // path ke folder backend relatif ke index.html

// Elemen Form & Tabel
const form = document.getElementById("formMahasiswa");
const formModeBadge = document.getElementById("formModeBadge");
const formTitle = document.getElementById("formTitle");
const namaInput = document.getElementById("nama");
const nimInput = document.getElementById("nim");
const editIdInput = document.getElementById("editId");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelEdit");
const msg = document.getElementById("message");
const tbody = document.querySelector("#tabelMahasiswa tbody");
const searchInput = document.getElementById("searchInput");
const totalCount = document.getElementById("totalCount");

// Elemen Sidebar
const menuToggle = document.querySelector(".menu-toggle");
const btnClose = document.querySelector(".btn-close");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// Elemen Modal Hapus
const deleteModal = document.getElementById("deleteModal");
const modalDesc = document.getElementById("modalDesc");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

let allData = [];
let pendingDeleteId = null;
let msgTimeout;

// Validasi NIM hanya angka
nimInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, "");
});

// Kontrol Sidebar Mobile
function openSidebar() {
  sidebar.classList.add("active");
  sidebarOverlay.classList.add("active");
}

function closeSidebar() {
  sidebar.classList.remove("active");
  sidebarOverlay.classList.remove("active");
}

menuToggle.addEventListener("click", openSidebar);
btnClose.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

// Pencarian Real-Time
searchInput.addEventListener("input", () => {
  applyFilterAndRender();
});

function applyFilterAndRender() {
  const keyword = searchInput.value.toLowerCase().trim();
  if (!keyword) {
    renderTable(allData, false);
    return;
  }

  const filtered = allData.filter(
    (mhs) =>
      mhs.nama.toLowerCase().includes(keyword) ||
      String(mhs.nim).toLowerCase().includes(keyword)
  );
  renderTable(filtered, true);
}

// Muat Data Awal saat Halaman Dibuka
document.addEventListener("DOMContentLoaded", () => {
  renderTable([], false);
  loadData();
});

// Ambil Data dari Server (read.php)
async function loadData() {
  try {
    const res = await fetch(`${BASE}/read.php`);
    const json = await res.json();
    if (json.success) {
      allData = Array.isArray(json.data) ? json.data : [];
      totalCount.textContent = `${allData.length} Data`;
      applyFilterAndRender();
    } else {
      showMessage(json.message || "Gagal memuat data mahasiswa", true);
    }
  } catch (err) {
    showMessage("Koneksi ke server gagal: " + err.message, true);
  }
}

// Render Baris Tabel atau Tampilan Awal Kosong
function renderTable(data, isFiltering = false) {
  tbody.innerHTML = "";

  if (data.length === 0) {
    const emptyTitle = isFiltering
      ? "Data Tidak Ditemukan"
      : "Belum Ada Data Mahasiswa";
    const emptySubtitle = isFiltering
      ? "Tidak ada nama atau NIM yang cocok dengan kata kunci pencarian Anda."
      : "Silakan isi formulir di samping untuk menambahkan data mahasiswa baru.";

    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state-cell">
          <div class="empty-state-box">
            <div class="empty-icon-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <h3>${emptyTitle}</h3>
            <p>${emptySubtitle}</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((mhs, idx) => {
    const initials = getInitials(mhs.nama);
    const tr = document.createElement("tr");
    tr.className = "data-row";
    tr.innerHTML = `
      <td style="color: var(--text-secondary); font-weight: 600;">${idx + 1}</td>
      <td>
        <div class="student-cell">
          <div class="avatar-circle">${escapeHtml(initials)}</div>
          <strong>${escapeHtml(mhs.nama)}</strong>
        </div>
      </td>
      <td><span class="nim-pill">${escapeHtml(String(mhs.nim))}</span></td>
      <td>
        <div class="action-group">
          <button type="button" class="btn-edit" data-id="${mhs.id}">Edit</button>
          <button type="button" class="btn-delete" data-id="${mhs.id}">Hapus</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document
    .querySelectorAll(".btn-edit")
    .forEach((btn) => btn.addEventListener("click", onEdit));
  document
    .querySelectorAll(".btn-delete")
    .forEach((btn) => btn.addEventListener("click", openDeleteModal));
}

// Reset Form ke Mode Input
function resetFormState() {
  form.reset();
  editIdInput.value = "";
  formModeBadge.textContent = "MODE INPUT";
  formModeBadge.classList.remove("edit-mode");
  formTitle.textContent = "Tambah Data Mahasiswa";
  submitBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
    <span>Tambah Data</span>
  `;
  cancelBtn.style.display = "none";
}

// Submit Form (Create atau Update)
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nama = namaInput.value.trim();
  const nim = nimInput.value.trim();
  const id = editIdInput.value;

  if (!nama || !nim) {
    showMessage("Nama & NIM wajib diisi", true);
    return;
  }

  const payload = { nama, nim };

  try {
    if (!id) {
      // Create Data Baru
      const res = await fetch(`${BASE}/create.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (j.success) {
        showMessage("Data mahasiswa berhasil ditambahkan");
        resetFormState();
        loadData();
      } else {
        showMessage(j.message || "Gagal menambah data", true);
      }
    } else {
      // Update Data yang Ada
      payload.id = id;
      const res = await fetch(`${BASE}/update.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (j.success) {
        showMessage("Data mahasiswa berhasil diperbarui");
        resetFormState();
        loadData();
      } else {
        showMessage(j.message || "Gagal memperbarui data", true);
      }
    }
  } catch (err) {
    showMessage("Request gagal: " + err.message, true);
  }
});

// Handler Tombol Edit
async function onEdit(e) {
  const id = e.target.dataset.id;
  try {
    const res = await fetch(`${BASE}/read.php`);
    const j = await res.json();
    if (j.success) {
      const item = j.data.find((x) => String(x.id) === String(id));
      if (item) {
        namaInput.value = item.nama;
        nimInput.value = item.nim;
        editIdInput.value = item.id;

        formModeBadge.textContent = "MODE EDIT";
        formModeBadge.classList.add("edit-mode");
        formTitle.textContent = "Edit Data Mahasiswa";
        submitBtn.innerHTML = `<span>Simpan Perubahan</span>`;
        cancelBtn.style.display = "inline-flex";

        namaInput.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  } catch (err) {
    showMessage("Gagal mengambil data untuk edit", true);
  }
}

cancelBtn.addEventListener("click", resetFormState);

// Modal Konfirmasi Hapus
function openDeleteModal(e) {
  const id = e.target.dataset.id;
  const target = allData.find((x) => String(x.id) === String(id));
  pendingDeleteId = id;
  modalDesc.textContent = target
    ? `Data mahasiswa "${target.nama}" (${target.nim}) akan dihapus permanen. Lanjutkan?`
    : "Data yang dihapus tidak dapat dikembalikan. Lanjutkan penghapusan?";
  deleteModal.classList.add("active");
}

function closeDeleteModal() {
  pendingDeleteId = null;
  deleteModal.classList.remove("active");
}

cancelDeleteBtn.addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

confirmDeleteBtn.addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  closeDeleteModal();

  try {
    const res = await fetch(`${BASE}/delete.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await res.json();
    if (j.success) {
      if (String(editIdInput.value) === String(id)) {
        resetFormState();
      }
      showMessage("Data mahasiswa berhasil dihapus");
      loadData();
    } else {
      showMessage(j.message || "Gagal menghapus data", true);
    }
  } catch (err) {
    showMessage("Request gagal: " + err.message, true);
  }
});

// Helper: Pesan Status
function showMessage(text, isError = false) {
  clearTimeout(msgTimeout);
  msg.textContent = text;
  msg.className = `alert-box show ${isError ? "msg-error" : "msg-success"}`;
  msgTimeout = setTimeout(() => {
    msg.className = "alert-box";
    msg.textContent = "";
  }, 4000);
}

// Helper: Inisial Nama untuk Avatar
function getInitials(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "M";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Helper: Escape HTML untuk Mencegah XSS
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}