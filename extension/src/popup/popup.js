const els = {
  apiBaseUrl: document.getElementById('apiBaseUrl'),
  extensionToken: document.getElementById('extensionToken'),
  saveTokenBtn: document.getElementById('saveTokenBtn'),
  clearTokenBtn: document.getElementById('clearTokenBtn'),
  scanBtn: document.getElementById('scanBtn'),
  previewBtn: document.getElementById('previewBtn'),
  syncBtn: document.getElementById('syncBtn'),
  pageStatus: document.getElementById('pageStatus'),
  summary: document.getElementById('summary'),
  message: document.getElementById('message'),
};

let activePayload = null;
const CONTENT_SCRIPT_FILES = [
  'src/content/normalizer.js',
  'src/content/transcriptScraper.js',
  'src/content/timetableScraper.js',
  'src/content/usthDetector.js',
];

function setMessage(message, isError = false) {
  els.message.textContent = message || '';
  els.message.style.color = isError ? '#dc2626' : '#64748b';
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function appendSummaryLine(label, values) {
  const row = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = label;
  row.appendChild(strong);
  row.appendChild(document.createTextNode(values));
  els.summary.appendChild(row);
}

function resetPreviewState() {
  els.previewBtn.disabled = true;
  els.syncBtn.disabled = true;
  els.summary.classList.add('hidden');
  clearNode(els.summary);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isSupportedUsthTab(tab) {
  const url = tab?.url || '';
  return (
    url.startsWith('https://erp.usth.edu.vn/students/learn/timetable') ||
    url.startsWith('https://erp.usth.edu.vn/students/learn/personal-transcript')
  );
}

function isMissingReceiverError(error) {
  return error?.message?.includes('Receiving end does not exist');
}

async function injectContentScripts(tabId) {
  for (const file of CONTENT_SCRIPT_FILES) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [file],
    });
  }
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('Không tìm thấy tab hiện tại');

  if (!isSupportedUsthTab(tab)) {
    throw new Error('Hãy mở trang bảng điểm hoặc thời khóa biểu USTH ERP rồi bấm lại.');
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    if (!isMissingReceiverError(error)) throw error;
    await injectContentScripts(tab.id);
    return chrome.tabs.sendMessage(tab.id, message);
  }
}

async function loadSettings() {
  const data = await chrome.storage.local.get(['gpaApiBaseUrl', 'gpaAccessToken']);
  els.apiBaseUrl.value = data.gpaApiBaseUrl || 'http://localhost:5000';
  els.extensionToken.value = data.gpaAccessToken || '';
  return data;
}

async function saveBaseSettings() {
  await chrome.storage.local.set({
    gpaApiBaseUrl: els.apiBaseUrl.value.replace(/\/$/, ''),
  });
}

async function getAuthHeaders() {
  const data = await chrome.storage.local.get(['gpaAccessToken']);
  if (!data.gpaAccessToken) throw new Error('Bạn cần dán và lưu Extension Token từ app GPA trước');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.gpaAccessToken}`,
  };
}

async function requestBackend(path, options = {}) {
  await saveBaseSettings();
  const baseUrl = els.apiBaseUrl.value.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${path}`, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Không thể kết nối backend ERP tại ${baseUrl}. Kiểm tra backend URL và server.`);
    }
    throw new Error('Backend trả về dữ liệu không hợp lệ');
  }
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Backend trả lỗi');
  }
  return data;
}

function renderSummary(data) {
  const summary = data?.data?.summary;
  if (!summary) return;
  els.summary.classList.remove('hidden');
  clearNode(els.summary);
  appendSummaryLine(
    'Bảng điểm:',
    ` tạo ${summary.subjects.create}, sửa ${summary.subjects.update}, giữ ${summary.subjects.unchanged}, conflict ${summary.subjects.conflicts}`,
  );
  appendSummaryLine(
    'Thời khóa biểu:',
    ` tạo ${summary.schedules.create}, sửa ${summary.schedules.update}, giữ ${summary.schedules.unchanged}, conflict ${summary.schedules.conflicts}`,
  );
}

async function detectPage() {
  try {
    const result = await sendToActiveTab({ type: 'USTH_GET_PAGE' });
    if (!result?.success || result.page === 'unsupported') {
      els.pageStatus.textContent = 'Hãy mở trang bảng điểm hoặc thời khóa biểu USTH ERP.';
      return;
    }
    els.pageStatus.textContent = result.page === 'transcript'
      ? 'Đã phát hiện trang bảng điểm ERP.'
      : 'Đã phát hiện trang thời khóa biểu ERP.';
  } catch (error) {
    els.pageStatus.textContent = error.message || 'Tab hiện tại chưa sẵn sàng hoặc không phải trang ERP USTH.';
  }
}

els.saveTokenBtn.addEventListener('click', async () => {
  try {
    await saveBaseSettings();
    const token = els.extensionToken.value.trim();
    if (!token) throw new Error('Hãy dán Extension Token từ app GPA');
    await chrome.storage.local.set({ gpaAccessToken: token });
    setMessage('Đã lưu token GPA. Có thể quét và đồng bộ.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

els.clearTokenBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['gpaAccessToken', 'lastUsthPayload']);
  els.extensionToken.value = '';
  activePayload = null;
  resetPreviewState();
  setMessage('Đã xóa token và dữ liệu quét tạm trên extension.');
});

els.scanBtn.addEventListener('click', async () => {
  try {
    resetPreviewState();
    const result = await sendToActiveTab({ type: 'USTH_SCRAPE' });
    if (!result?.success) throw new Error(result?.message || 'Không quét được dữ liệu');
    activePayload = result.payload;
    els.previewBtn.disabled = false;
    els.syncBtn.disabled = true;
    const subjectCount = activePayload.subjects?.length || 0;
    const scoredSubjectCount = (activePayload.subjects || []).filter((subject) => subject.score20 !== null && subject.score20 !== undefined).length;
    const scheduleCount = activePayload.schedules?.length || 0;
    const scoreInfo = subjectCount > 0 ? `, trong đó ${scoredSubjectCount} môn có điểm số` : '';
    setMessage(`Đã quét ${subjectCount} môn${scoreInfo} và ${scheduleCount} lịch học. Bấm preview trước khi sync.`);
    if (subjectCount > 0) {
      els.summary.classList.remove('hidden');
      clearNode(els.summary);
      const title = document.createElement('strong');
      title.textContent = 'Mẫu điểm quét được:';
      els.summary.appendChild(title);
      (activePayload.subjects || []).slice(0, 5).forEach((subject) => {
        const row = document.createElement('div');
        const score = subject.score20 === null || subject.score20 === undefined ? 'không có điểm' : subject.score20;
        row.textContent = `${subject.code || ''} · ${score}`;
        els.summary.appendChild(row);
      });
    }
  } catch (error) {
    activePayload = null;
    setMessage(error.message, true);
  }
});

els.previewBtn.addEventListener('click', async () => {
  try {
    const payload = activePayload;
    if (!payload) throw new Error('Chưa có dữ liệu để preview. Hãy quét lại trang ERP hiện tại.');
    const headers = await getAuthHeaders();
    const data = await requestBackend('/api/integrations/usth-erp/preview', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    renderSummary(data);
    els.syncBtn.disabled = false;
    setMessage('Preview xong. Kiểm tra số liệu rồi bấm đồng bộ.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

els.syncBtn.addEventListener('click', async () => {
  try {
    const payload = activePayload;
    if (!payload) throw new Error('Chưa có dữ liệu để sync. Hãy quét lại trang ERP hiện tại.');
    const headers = await getAuthHeaders();
    const data = await requestBackend('/api/integrations/usth-erp/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    renderSummary(data);
    setMessage('Đồng bộ thành công. Mở app GPA để kiểm tra bảng điểm/lịch học.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

loadSettings().then(detectPage);
