chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    gpaApiBaseUrl: 'http://localhost:5000',
  });
});
