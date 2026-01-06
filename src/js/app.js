
let currentTab = 'events';

document.addEventListener('DOMContentLoaded', () => {
    switchTab('events');
});

function switchTab(tab) {
    currentTab = tab;

    // UI Toggles
    // UI Toggles
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) targetTab.classList.remove('hidden');

    document.getElementById('view-event-details').classList.add('hidden'); // Hide details if open

    // Load Data
    if (tab === 'events') loadEvents();
    if (tab === 'rosters') loadRosters();
    if (tab === 'users' && typeof loadUsers === 'function') loadUsers();

    const rosterDetails = document.getElementById('view-roster-details');
    if (rosterDetails) rosterDetails.classList.add('hidden');
}

// --- EVENTS ---

const PRESET_NAMES = {
    'default': 'デフォルト',
    'entry_management': '入寮運営'
};

const PRESET_STATUSES = {
    'default': {
        'absent': '欠席', 'present': '出席', 'late': '遅刻', 'excused': '公欠'
    },
    'entry_management': {
        'not_arrived': '未到着',
        'arrived': '到着済み',
        'reception_done': '受付済み',
        'guiding': '案内中',
        'guided': '案内済み'
    }
};

const PRESET_COLORS = {
    'not_arrived': '#f3f4f6', // gray
    'arrived': '#fee2e2', // red-ish (warning like?) or maybe blue
    'reception_done': '#fef9c3', // yellow
    'guiding': '#dbeafe', // blue-100
    'guided': '#dcfce7' // green - completed
};

async function loadEvents() {
    try {
        const res = await fetch('api/event.php');
        const events = await res.json();
        const list = document.getElementById('eventList');
        list.innerHTML = '';

        events.forEach(event => {
            const date = new Date(event.created_at).toLocaleDateString();
            const div = document.createElement('div');

            const presetLabel = PRESET_NAMES[event.preset] || PRESET_NAMES['default'];
            const displayName = `${event.name} (${presetLabel})`;

            div.className = 'card';
            div.innerHTML = `
                <h3 style="margin: 0 0 0.5rem 0;">${displayName}</h3>
                <p style="color: #666; font-size: 0.9rem; margin: 0;">Roster: ${event.roster_name}</p>
                <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.8rem; color: #999;">${date}</span>
                    <span style="font-size: 0.85rem; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px;">Present: ${event.present_count}</span>
                </div>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                     <button class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="openEditEventModal(event, ${event.id}, '${event.name}')">編集</button>
                     <button class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; color: #ef4444; border-color: #fee2e2; background: #fef2f2;" onclick="deleteEvent(event, ${event.id})">削除</button>
                </div>
            `;
            div.onclick = () => showEventDetails(event.id);
            list.appendChild(div);
        });
    } catch (e) {
        console.error(e);
    }
}

const createEventForm = document.getElementById('createEventForm');
if (createEventForm) {
    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('eventName').value;
        const roster_id = document.getElementById('eventRosterSelect').value;
        const preset = document.getElementById('eventPresetSelect').value;

        const res = await fetch('api/event.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, roster_id, preset })
        });
        const data = await res.json();

        if (data.status === 'success') {
            closeModal('eventModal');
            loadEvents();
        } else {
            alert(data.message);
        }
    });
}

// Duplicate declarations removed

function getStatusLabel(status, preset) {
    const map = PRESET_STATUSES[preset] || PRESET_STATUSES['default'];
    return map[status] || status;
}

async function showEventDetails(eventId) {
    document.getElementById('tab-events').classList.add('hidden');
    document.getElementById('view-event-details').classList.remove('hidden');

    const res = await fetch(`api/event.php?id=${eventId}`);
    const data = await res.json();
    const evt = data.event;
    const students = data.students;

    document.getElementById('detailEventName').innerText = evt.name;
    const preset = evt.preset || 'default';

    // --- Stats Dashboard ---
    const statsContainer = document.getElementById('statsDashboard');
    if (statsContainer) {
        if (preset === 'entry_management') {
            statsContainer.classList.remove('hidden');
            renderStats(students);
        } else {
            statsContainer.classList.add('hidden');
        }
    }

    // --- List ---
    const tbody = document.getElementById('attendanceList');
    tbody.innerHTML = '';

    const statusMap = PRESET_STATUSES[preset] || PRESET_STATUSES['default'];
    const defaultStatus = preset === 'entry_management' ? 'not_arrived' : 'absent';

    students.forEach(student => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';

        const currentStatus = student.status || defaultStatus;

        let options = '';
        for (let k in statusMap) {
            const selected = currentStatus === k ? 'selected' : '';
            options += `<option value="${k}" ${selected}>${statusMap[k]}</option>`;
        }

        let bg = getStatusColor(currentStatus);
        if (preset === 'entry_management') bg = PRESET_COLORS[currentStatus] || bg;

        tr.innerHTML = `
            <td class="col-status" style="padding: 1rem;">
                <select onchange="updateAttendance(${eventId}, '${student.internal_id}', this.value, null, '${preset}')" 
                        style="padding: 0.5rem; border-radius: 6px; border: 1px solid #ddd; background: ${bg}">
                    ${options}
                </select>
            </td>
            <td class="col-name" style="padding: 1rem;">${student.name}</td>
            <td class="col-kana" style="padding: 1rem;">${student.kana || ''}</td>
            <td class="col-gender" style="padding: 1rem;">${student.gender || ''}</td>
            <td class="col-room" style="padding: 1rem;">${student.room || '-'}</td>
            <td class="col-floor" style="padding: 1rem;">${student.floor || ''}</td>
            <td class="col-category" style="padding: 1rem;">${student.category || ''}</td>
            <td class="col-hometown" style="padding: 1rem;">${student.hometown || ''}</td>
            <td class="col-student_num" style="padding: 1rem;">${student.student_num || ''}</td>
            <td class="col-department" style="padding: 1rem;">${student.department || ''}</td>
            <td class="col-note" style="padding: 1rem;">
                <input type="text" placeholder="Note..." value="${student.note || ''}" 
                       onblur="updateAttendance(${eventId}, '${student.internal_id}', null, this.value, '${preset}')"
                       style="padding: 0.5rem; border-radius: 6px; border: 1px solid #ddd; width: 100%;">
            </td>
        `;
        tbody.appendChild(tr);
    });

    applyColumnVisibility('event');
}

function renderStats(students) {
    const total = students.length;
    let counts = { 'not_arrived': 0, 'arrived': 0, 'reception_done': 0, 'guiding': 0, 'guided': 0 };

    students.forEach(s => {
        const st = s.status || 'not_arrived';
        if (counts[st] !== undefined) counts[st]++;
    });

    const guided = counts['guided'];
    const percent = total > 0 ? Math.round((guided / total) * 100) : 0;

    // Group: Arrived + Reception + Guiding
    const activeCount = counts['arrived'] + counts['reception_done'] + counts['guiding'];

    const container = document.getElementById('statsDashboard');
    container.innerHTML = `
        <div class="stat-card liquid-card wide">
            <div class="liquid-fill" style="height: ${percent}%">
                <svg class="waves" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shape-rendering="auto">
                    <defs>
                        <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
                    </defs>
                    <g class="parallax">
                        <use xlink:href="#gentle-wave" x="48" y="0" />
                        <use xlink:href="#gentle-wave" x="48" y="3" />
                        <use xlink:href="#gentle-wave" x="48" y="5" />
                        <use xlink:href="#gentle-wave" x="48" y="7" />
                    </g>
                </svg>
            </div>
            <div class="stat-value">${percent}% <span style="font-size: 1rem; opacity: 0.8;">(${guided}人)</span></div>
            <div class="stat-label">案内完了 (Guided)</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${total}</div>
            <div class="stat-label">総人数</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${counts['not_arrived']}</div>
            <div class="stat-label">未到着</div>
        </div>
        <div class="stat-card" style="height: auto; min-height: 140px; justify-content: flex-start; background: #f0f9ff;">
             <div class="stat-label" style="color: #0369a1; margin-bottom: 1rem; font-weight: bold;">対応中詳細</div>
             <div style="display: flex; justify-content: space-around; width: 100%;">
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #0369a1;">${counts['arrived']}</div>
                    <div style="font-size: 0.75rem; color: #555;">到着</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #0369a1;">${counts['reception_done']}</div>
                    <div style="font-size: 0.75rem; color: #555;">受付</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #0369a1;">${counts['guiding']}</div>
                    <div style="font-size: 0.75rem; color: #555;">案内</div>
                </div>
             </div>
        </div>
    `;
}

function getStatusColor(status) {
    if (status === 'present') return '#dcfce7'; // green-100
    if (status === 'late') return '#fef9c3'; // yellow-100
    if (status === 'excused') return '#e0e7ff'; // indigo-100
    return '#fee2e2'; // red-100
}

async function updateAttendance(eventId, studentId, status, note, preset) {
    const payload = {
        event_id: eventId,
        student_internal_id: studentId
    };

    // Handle Status: Use argument if provided, else try DOM
    let finalStatus = status;
    const statusSelect = document.querySelector(`select[onchange*="${studentId}"]`);

    if (finalStatus === null && statusSelect) {
        finalStatus = statusSelect.value;
    }

    if (finalStatus !== null) {
        payload.status = finalStatus;
    }

    // Handle Note: Use argument if provided, else try DOM
    let finalNote = note;
    const noteInput = document.querySelector(`input[onblur*="${studentId}"]`);

    if (finalNote === null && noteInput) {
        finalNote = noteInput.value;
    }

    if (finalNote !== null) {
        payload.note = finalNote;
    }

    // Update UI (Background color) if select element exists
    if (statusSelect && finalStatus) {
        let bg = getStatusColor(finalStatus);
        if (preset === 'entry_management') bg = PRESET_COLORS[finalStatus] || bg;
        statusSelect.style.background = bg;
    }

    await fetch('api/event.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    // Refresh Stats/List if preset is entry_management
    // This calls the global showEventDetails, which might be overridden by entrance.html
    if (preset === 'entry_management') {
        showEventDetails(eventId);
    }
}

function backToEvents() {
    document.getElementById('view-event-details').classList.add('hidden');
    document.getElementById('tab-events').classList.remove('hidden');
    loadEvents();
}


// --- ROSTERS ---

async function loadRosters() {
    try {
        const res = await fetch('api/roster.php');
        const rosters = await res.json();
        const list = document.getElementById('rosterList');
        list.innerHTML = '';

        rosters.forEach(roster => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <h3 style="margin: 0 0 0.5rem 0;">${roster.name}</h3>
                <p style="color: #666; font-size: 0.9rem; margin: 0;">Students: ${roster.student_count}</p>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn-secondary" style="font-size: 0.8rem;" onclick="editRoster(event, ${roster.id})">設定</button>
                    <button class="btn-secondary" style="font-size: 0.8rem; color: #ef4444; border-color: #fee2e2; background: #fef2f2;" onclick="deleteRoster(event, ${roster.id})">削除</button>
                </div>
            `;
            div.onclick = () => showRosterDetails(roster.id);
            list.appendChild(div);
        });
    } catch (e) {
        console.error(e);
    }
}

async function editRoster(e, id) {
    e.stopPropagation();
    const res = await fetch(`api/roster.php?id=${id}`);
    const data = await res.json();

    document.getElementById('editRosterId').value = data.id;
    document.getElementById('rosterName').value = data.name;
    document.getElementById('fileUploadGroup').style.display = 'none'; // Cannot change file on edit

    ['room', 'name', 'floor', 'gender', 'category', 'kana', 'hometown', 'student_num', 'department'].forEach(field => {
        document.getElementById(`col_${field}`).value = data[`col_${field}`] || '';
    });

    openModal('rosterModal');
}

const importRosterForm = document.getElementById('importRosterForm');
if (importRosterForm) {
    importRosterForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editRosterId').value;
        const isEdit = !!id;

        const formData = new FormData();
        if (isEdit) {
            formData.append('_method', 'PUT');
            formData.append('id', id);
            // PHP PUT parsing from FormData is tricky, we might need to send as x-www-form-urlencoded or handle RAW input in PHP.
            // My PHP code uses parse_str(file_get_contents("php://input"), $_PUT) for PUT.
            // But FormData with file uploads is multipart/form-data.
            // If updating implementation: The PHP script for PUT `parse_str` works for `x-www-form-urlencoded`, not multipart.
            // But we are not uploading a file in PUT mode (file input hidden).
            // So we can convert to URLSearchParams.
        } else {
            const file = document.getElementById('rosterFile').files[0];
            if (!file) { alert('Please select a file'); return; }
            formData.append('file', file);
        }

        formData.append('name', document.getElementById('rosterName').value);

        ['room', 'name', 'floor', 'gender', 'category', 'kana', 'hometown', 'student_num', 'department'].forEach(field => {
            const val = document.getElementById(`col_${field}`).value;
            formData.append(`col_${field}`, val);
        });

        try {
            let res;
            if (isEdit) {
                // Convert to URLSearchParams for PHP PUT handling
                const params = new URLSearchParams();
                for (const pair of formData.entries()) {
                    params.append(pair[0], pair[1]);
                }
                res = await fetch('api/roster.php', {
                    method: 'PUT',
                    body: params
                });
            } else {
                res = await fetch('api/roster.php', {
                    method: 'POST',
                    body: formData
                });
            }

            const data = await res.json();
            if (data.status === 'success') {
                closeModal('rosterModal');
                loadRosters();
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Error saving roster');
        }
    });
}




async function showRosterDetails(id) {
    document.getElementById('tab-rosters').classList.add('hidden');
    document.getElementById('view-roster-details').classList.remove('hidden');

    const res = await fetch(`api/roster.php?id=${id}`);
    const data = await res.json();

    document.getElementById('detailRosterName').innerText = data.name;
    const tbody = document.getElementById('rosterStudentList');
    tbody.innerHTML = '';

    if (data.students) {
        data.students.forEach(s => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';
            tr.innerHTML = `
                <td class="col-room" style="padding: 1rem;">${s.room || '-'}</td>
                <td class="col-name" style="padding: 1rem;">${s.name || ''}</td>
                <td class="col-floor" style="padding: 1rem;">${s.floor || ''}</td>
                <td class="col-gender" style="padding: 1rem;">${s.gender || ''}</td>
                <td class="col-category" style="padding: 1rem;">${s.category || ''}</td>
                <td class="col-kana" style="padding: 1rem;">${s.kana || ''}</td>
                <td class="col-hometown" style="padding: 1rem;">${s.hometown || ''}</td>
                <td class="col-student_num" style="padding: 1rem;">${s.student_num || ''}</td>
                <td class="col-department" style="padding: 1rem;">${s.department || ''}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    applyColumnVisibility('roster');
}

function backToRosters() {
    document.getElementById('view-roster-details').classList.add('hidden');
    document.getElementById('tab-rosters').classList.remove('hidden');
    loadRosters();
}


// --- UTILS ---

function openModal(id) {
    document.getElementById(id).classList.add('active');

    // Reset forms if opening 'fresh'
    if (id === 'eventModal') {
        loadRosterOptions();
        document.getElementById('createEventForm').reset();
    }
    if (id === 'rosterModal') {
        const isEdit = document.getElementById(id).classList.contains('edit-mode');
        if (!document.getElementById('editRosterId').value) {
            // New Upload
            document.getElementById('importRosterForm').reset();
            document.getElementById('fileUploadGroup').style.display = 'block';
        }
    }
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    if (id === 'rosterModal') {
        document.getElementById('editRosterId').value = ''; // Reset edit ID
    }
}

async function loadRosterOptions() {
    const res = await fetch('api/roster.php');
    const rosters = await res.json();
    const select = document.getElementById('eventRosterSelect');
    select.innerHTML = '';
    rosters.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.innerText = r.name;
        select.appendChild(opt);
    });
}

function logout() {
    // Determine logout, for now just reload login
    window.location.href = 'index.html';
}

// --- CRUD FUNCTIONS ---

async function deleteEvent(e, id) {
    e.stopPropagation();
    if (!confirm('このイベントを削除してもよろしいですか？記録された出席データも削除されます。')) return;

    await fetch(`api/event.php?id=${id}`, { method: 'DELETE' });
    loadEvents();
}

async function deleteRoster(e, id) {
    e.stopPropagation();
    if (!confirm('この名簿を削除してもよろしいですか？関連するイベントと学生データも全て削除されます。')) return;

    await fetch(`api/roster.php?id=${id}`, { method: 'DELETE' });
    loadRosters();
}

function openEditEventModal(e, id, name) {
    e.stopPropagation();
    document.getElementById('editEventId').value = id;
    document.getElementById('editEventName').value = name;
    openModal('editEventModal');
}

const editEventForm = document.getElementById('editEventForm');
if (editEventForm) {
    editEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editEventId').value;
        const name = document.getElementById('editEventName').value;

        await fetch('api/event.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name })
        });

        closeModal('editEventModal');
        loadEvents();
    });
}

// Global click to close modal
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        if (event.target.id === 'rosterModal') document.getElementById('editRosterId').value = '';
    }
}

const COL_CONFIG = {
    'roster': [
        { id: 'col-room', label: '部屋番号' },
        { id: 'col-name', label: '名前' },
        { id: 'col-floor', label: '階' },
        { id: 'col-gender', label: '性別' },
        { id: 'col-category', label: '区分' },
        { id: 'col-kana', label: 'かな' },
        { id: 'col-hometown', label: '出身' },
        { id: 'col-student_num', label: '学籍番号' },
        { id: 'col-department', label: '学科' }
    ],
    'event': [
        { id: 'col-status', label: '状態' },
        { id: 'col-name', label: '名前' },
        { id: 'col-kana', label: 'かな' },
        { id: 'col-gender', label: '性別' },
        { id: 'col-room', label: '部屋番号' },
        { id: 'col-floor', label: '階' },
        { id: 'col-category', label: '区分' },
        { id: 'col-hometown', label: '出身' },
        { id: 'col-student_num', label: '学籍番号' },
        { id: 'col-department', label: '学科' },
        { id: 'col-note', label: '備考' }
    ]
};

let currentSettingsType = null;

function openColumnSettings(type) {
    currentSettingsType = type;
    const container = document.getElementById('columnSettingsContainer');
    container.innerHTML = '';

    // Load saved settings or default (all true)
    const saved = JSON.parse(localStorage.getItem(`cols_${type}`)) || {};

    COL_CONFIG[type].forEach(col => {
        const isChecked = saved[col.id] !== false; // Default true
        const div = document.createElement('div');
        div.innerHTML = `
            <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="chk_${col.id}" ${isChecked ? 'checked' : ''}>
                ${col.label}
            </label>
        `;
        container.appendChild(div);
    });

    openModal('columnSettingsModal');
}

function saveColumnSettings() {
    const type = currentSettingsType;
    if (!type) return;

    const settings = {};
    COL_CONFIG[type].forEach(col => {
        settings[col.id] = document.getElementById(`chk_${col.id}`).checked;
    });

    localStorage.setItem(`cols_${type}`, JSON.stringify(settings));
    closeModal('columnSettingsModal');

    applyColumnVisibility(type);
}

function applyColumnVisibility(type) {
    const saved = JSON.parse(localStorage.getItem(`cols_${type}`)) || {};

    const context = type === 'roster' ? document.getElementById('view-roster-details') : document.getElementById('view-event-details');
    if (!context) return; // Not in view

    COL_CONFIG[type].forEach(col => {
        const isVisible = saved[col.id] !== false;
        const display = isVisible ? '' : 'none';

        // Headers need to match class. I need to update HTML headers.
        const th = context.querySelector(`th.${col.id}`);
        if (th) th.style.display = display;

        // Cells
        context.querySelectorAll(`td.${col.id}`).forEach(td => td.style.display = display);
    });
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

function checkResponsiveSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Small screen threshold -> Top Navigation Mode
    // We REMOVE collapsed class so CSS can style it as full top bar
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('collapsed');
    } else {
        // Optional: Auto-expand on large screens? 
        // Or just leave it as is (user preference preserved if they manually collapsed it previously?
        // For now, let's just ensure it doesn't get stuck in "mobile mode" if resized back up
        // User request was "auto minimize" previously. Now "top bar".
        // Let's leave it as is for >768. 
        // Actually, if we come from mobile, it might be un-collapsed. 
        // The previous logic was "<= 768 -> add collapsed". 
        // Now "<= 768 -> remove collapsed (Use CSS Top Bar)".
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkResponsiveSidebar();
});

window.addEventListener('resize', checkResponsiveSidebar);
