function getCurrentUsthPage() {
  const url = window.location.href;
  if (url.includes('/students/learn/personal-transcript')) return 'transcript';
  if (url.includes('/students/learn/timetable')) return 'timetable';
  return 'unsupported';
}

if (window.__USTH_ERP_DETECTOR_READY__) {
  chrome.runtime.onMessage.removeListener(window.__USTH_ERP_DETECTOR_READY__);
}

window.__USTH_ERP_DETECTOR_READY__ = (message, sender, sendResponse) => {
  if (message?.type === 'USTH_GET_PAGE') {
    sendResponse({ success: true, page: getCurrentUsthPage(), url: window.location.href });
    return true;
  }

  if (message?.type === 'USTH_SCRAPE') {
    try {
      const page = getCurrentUsthPage();
      if (page === 'transcript') {
        sendResponse({ success: true, page, payload: window.UsthTranscriptScraper.scrape() });
      } else if (page === 'timetable') {
        sendResponse({ success: true, page, payload: window.UsthTimetableScraper.scrape() });
      } else {
        sendResponse({ success: false, message: 'Trang hiện tại không hỗ trợ đồng bộ' });
      }
    } catch (error) {
      sendResponse({ success: false, message: error.message });
    }
    return true;
  }

  return false;
};

chrome.runtime.onMessage.addListener(window.__USTH_ERP_DETECTOR_READY__);
