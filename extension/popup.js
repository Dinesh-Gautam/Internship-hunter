document.addEventListener("DOMContentLoaded", () => {
  const configBtn = document.getElementById("configure-btn");

  configBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleConfiguration" });
        window.close(); // Close popup so user can interact with the page
      }
    });
  });
});
