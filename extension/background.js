// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyzeCompany") {
        fetch('http://localhost:3000/api/extension/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request.data)
        })
        .then(response => response.json())
        .then(data => sendResponse({ success: true, data: data }))
        .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // Will respond asynchronously
    }

    if (request.action === "createDraftResume") {
        fetch('http://localhost:3000/api/resume/draft', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request.data)
        })
        .then(response => response.json())
        .then(data => sendResponse(data))
        .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
});
