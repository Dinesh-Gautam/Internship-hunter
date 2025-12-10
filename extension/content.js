// content.js

function createUI() {
    const btn = document.createElement('button');
    btn.className = 'ai-analyzer-btn';
    btn.textContent = 'Analyze Company';
    
    const panel = document.createElement('div');
    panel.className = 'ai-analyzer-panel';
    panel.innerHTML = `
        <h2>
            Company Analysis
            <button class="ai-close-btn">&times;</button>
        </h2>
        <div class="ai-loader">Analyzing... <br><small>This may take a few seconds</small></div>
        <div class="ai-result ai-analyzer-content"></div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    // Close Button Logic
    panel.querySelector('.ai-close-btn').addEventListener('click', () => {
        panel.classList.remove('visible');
    });

    btn.addEventListener('click', async () => {
        const panelEl = document.querySelector('.ai-analyzer-panel');
        const loader = document.querySelector('.ai-loader');
        const resultEl = document.querySelector('.ai-result');

        panelEl.classList.add('visible');
        loader.classList.add('visible');
        resultEl.textContent = '';

        const data = scrapeCompanyData();
        console.log("Scraped Data:", data);

        if (!data.name) {
            resultEl.textContent = "Could not find company Name. Please ensure you are on a Company Page.";
            loader.classList.remove('visible');
            return;
        }

        chrome.runtime.sendMessage({
            action: "analyzeCompany",
            data: data
        }, (response) => {
            loader.classList.remove('visible');
            if (response && response.success) {
                // Render Markdown
                // marked is loaded via manifest injection
                resultEl.innerHTML = marked.parse(response.data.analysis);
            } else {
                resultEl.textContent = "Error: " + (response?.error || "Unknown error");
            }
        });
    });
}

function scrapeCompanyData() {
    // Selectors are tricky on LinkedIn and change often. 
    // We try multiple strategies.
    
    const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.innerText.trim() : "";
    }

    // 1. Name
    let name = getText('h1'); // Usually the company name is the main H1
    if (!name) name = getText('.org-top-card-summary__title');

    // 2. Location
    let location = getText('.org-top-card-summary__headquarters');
    if (!location) location = getText('.org-top-card-summary-info-list__info-item:nth-child(1)');

    // 3. About
    // This is hard because "About" is often in a different tab or further down.
    // We'll try to grab the first substantial text block in the about section if visible, 
    // or just send what we have.
    let about = getText('.org-about-module__description');
    if (!about) about = getText('.org-grid__content-height-enforcer p'); 

    // 4. Website
    let website = "";
    const websiteLink = document.querySelector('a[href^="http"] .link-without-visited-state'); // generic?
    // Try finding a link that looks like a website in the top card
    const linkEl = Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('Website') || (a.href && !a.href.includes('linkedin.com') && a.closest('.org-top-card')));
    if (linkEl) website = linkEl.href;

    return {
        name,
        location,
        about,
        website
    };
}

// Check if we are on a company page roughly
function checkAndInject() {
    if (window.location.href.includes('/company/')) {
        const btn = document.querySelector('.ai-analyzer-btn');
        if (!btn) {
            console.log("Company page detected, injecting UI...");
            createUI();
        }
    } else {
        // Optional: Remove button if not on company page?
        // usually LinkedIn removes the whole body/content so our button goes away automatically.
        // But if it persists, we might want to hide it.
        const btn = document.querySelector('.ai-analyzer-btn');
        const panel = document.querySelector('.ai-analyzer-panel');
        if (btn) btn.remove();
        if (panel) panel.remove();
    }
}

// Run periodically to handle SPA navigation
setInterval(checkAndInject, 1000);
