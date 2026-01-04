// content.js

// --- Utility: CSS Selector Generator ---
function generateSelector(el) {
  if (!el) return "";

  // 1. ID
  if (el.id) return `#${el.id}`;

  // 2. Attributes (specific data attributes often used in modern apps)
  const dataTestId = el.getAttribute("data-testid");
  if (dataTestId) return `[data-testid="${dataTestId}"]`;

  // 3. Path generation
  const path = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();

    if (el.id) {
      selector = `#${el.id}`;
      path.unshift(selector);
      break;
    }

    // Use classes if they look stable (not random hashes)
    // Simplistic check: if class is meaningful text
    if (
      el.className &&
      typeof el.className === "string" &&
      el.className.trim() !== ""
    ) {
      const classes = el.className
        .split(/\s+/)
        .filter((c) => !c.match(/^[a-z0-9]{10,}$/i)); // filter potential hashes
      if (classes.length > 0) {
        selector += `.${classes.join(".")}`;
        // If this uniquely identifies it among siblings, great
      }
    }

    let sibling = el;
    let nth = 1;
    while ((sibling = sibling.previousElementSibling)) {
      if (sibling.nodeName.toLowerCase() === el.nodeName.toLowerCase()) nth++;
    }
    if (nth !== 1) selector += `:nth-of-type(${nth})`;

    path.unshift(selector);
    el = el.parentNode;
  }
  return path.join(" > ");
}

// --- Main Class ---
class App {
  constructor() {
    this.config = null;
    this.isPicking = false;
    this.activePickField = null;
    this.domain = window.location.hostname;

    this.init();
  }

  async init() {
    this.setupMessageListener();
    await this.loadConfig();
    this.checkAndInject();

    // Re-check periodically for SPAs
    setInterval(() => this.checkAndInject(), 2000);
  }

  async loadConfig() {
    const result = await chrome.storage.local.get(this.domain);
    this.config = result[this.domain] || null;
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "toggleConfiguration") {
        this.showConfigPanel();
      }
    });
  }

  checkAndInject() {
    // Dynamic Config (Company Analysis)
    if (this.config && !document.querySelector(".ai-analyzer-btn")) {
      this.createAnalyzeButton();
    }

    // Legacy LinkedIn Logic
    if (this.domain.includes("linkedin.com")) {
      if (window.location.href.includes("/company/")) {
        if (!this.config && !document.querySelector(".ai-analyzer-btn")) {
          this.createAnalyzeButton(true);
        }
      } else if (window.location.href.includes("/jobs/")) {
        this.checkAndInjectJobUI();
      }
    }
  }

  // --- Configuration UI ---
  showConfigPanel() {
    if (document.querySelector(".ai-config-panel")) return;

    const panel = document.createElement("div");
    panel.className = "ai-config-panel";
    panel.innerHTML = `
            <div class="ai-config-header">
                <h3>Configure Scraper</h3>
                <button class="ai-close-config">&times;</button>
            </div>
            <div class="ai-config-body">
                <p>Select elements to map them to fields.</p>
                
                <div class="ai-field-group">
                    <label>Company Name <span style="color:red">*</span></label>
                    <div class="ai-input-row">
                        <input type="text" id="selector-name" placeholder="Selector or type manually...">
                        <button class="ai-pick-btn" data-field="name">🎯</button>
                    </div>
                    <div id="preview-name" class="ai-preview-text"></div>
                </div>

                <div class="ai-field-group">
                    <label>Location</label>
                    <div class="ai-input-row">
                        <input type="text" id="selector-location" placeholder="Selector or type manually...">
                        <button class="ai-pick-btn" data-field="location">🎯</button>
                    </div>
                    <div id="preview-location" class="ai-preview-text"></div>
                </div>

                <div class="ai-field-group">
                    <label>About / Description</label>
                    <div class="ai-input-row">
                        <input type="text" id="selector-about" placeholder="Selector or type manually...">
                        <button class="ai-pick-btn" data-field="about">🎯</button>
                    </div>
                    <div id="preview-about" class="ai-preview-text"></div>
                </div>

                <div class="ai-actions">
                    <button id="ai-save-config" class="primary">Save Configuration</button>
                    <button id="ai-clear-config" class="danger">Clear Config</button>
                </div>
            </div>
        `;

    document.body.appendChild(panel);

    // Pre-fill if exists
    if (this.config) {
      panel.querySelector("#selector-name").value = this.config.name || "";
      panel.querySelector("#selector-location").value =
        this.config.location || "";
      panel.querySelector("#selector-about").value = this.config.about || "";
    }

    // Listeners
    panel
      .querySelector(".ai-close-config")
      .addEventListener("click", () => panel.remove());

    // Manual Input Listeners
    ["name", "location", "about"].forEach((field) => {
      panel
        .querySelector(`#selector-${field}`)
        .addEventListener("input", (e) => {
          this.updatePreview(field, e.target.value);
        });
    });

    panel.querySelectorAll(".ai-pick-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.startPicking(e.target.dataset.field);
      });
    });

    panel
      .querySelector("#ai-save-config")
      .addEventListener("click", () => this.saveConfig(panel));
    panel
      .querySelector("#ai-clear-config")
      .addEventListener("click", async () => {
        await chrome.storage.local.remove(this.domain);
        this.config = null;
        alert("Configuration cleared.");
        panel.remove();
        const btn = document.querySelector(".ai-analyzer-btn");
        if (btn) btn.remove();
      });

    // Initial preview update
    this.updatePreview("name", panel.querySelector("#selector-name").value);
    this.updatePreview(
      "location",
      panel.querySelector("#selector-location").value
    );
    this.updatePreview("about", panel.querySelector("#selector-about").value);
  }

  updatePreview(field, selector) {
    if (!selector) return;
    const el = document.querySelector(selector);
    const previewEl = document.getElementById(`preview-${field}`);
    if (previewEl && el) {
      const text = el.innerText.trim();
      previewEl.textContent = `Preview: "${text.substring(0, 60)}${
        text.length > 60 ? "..." : ""
      }"`;
      previewEl.title = text;
      previewEl.style.color = "#27ae60";
    } else if (previewEl) {
      previewEl.textContent = "Element not found";
      previewEl.style.color = "#e74c3c";
    }
  }

  startPicking(field) {
    this.isPicking = true;
    this.activePickField = field;

    // Add overlay or highlighting listeners
    document.body.style.cursor = "crosshair";

    const highlight = (e) => {
      if (this.configPanelContains(e.target)) return;
      e.stopPropagation();
      e.target.style.outline = "2px solid #e74c3c";
    };

    const unhighlight = (e) => {
      if (this.configPanelContains(e.target)) return;
      e.stopPropagation();
      e.target.style.outline = "";
    };

    const pick = (e) => {
      // Don't select the config panel itself
      if (this.configPanelContains(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      const selector = generateSelector(e.target);

      // Update UI
      document.getElementById(`selector-${this.activePickField}`).value =
        selector;

      this.updatePreview(this.activePickField, selector);

      // Cleanup
      this.stopPicking(highlight, unhighlight, pick);

      // Remove outline
      e.target.style.outline = "";
    };

    this.pickerHandlers = { highlight, unhighlight, pick };

    document.addEventListener("mouseover", highlight, true);
    document.addEventListener("mouseout", unhighlight, true);
    document.addEventListener("click", pick, true);

    // Stop links from navigating while picking
    document.addEventListener(
      "click",
      (e) => {
        if (this.isPicking && !this.configPanelContains(e.target)) {
          e.preventDefault();
        }
      },
      true
    );
  }

  configPanelContains(el) {
    return document.querySelector(".ai-config-panel")?.contains(el);
  }

  stopPicking(h, u, p) {
    this.isPicking = false;
    this.activePickField = null;
    document.body.style.cursor = "";
    document.removeEventListener("mouseover", h, true);
    document.removeEventListener("mouseout", u, true);
    document.removeEventListener("click", p, true);
  }

  async saveConfig(panel) {
    const name = panel.querySelector("#selector-name").value;
    const location = panel.querySelector("#selector-location").value;
    const about = panel.querySelector("#selector-about").value;

    if (!name) {
      alert("Company Name selector is required!");
      return;
    }

    const newConfig = { name, location, about };
    await chrome.storage.local.set({ [this.domain]: newConfig });
    this.config = newConfig;

    alert("Configuration Saved! You should now see the Analyze button.");
    panel.remove();
    this.checkAndInject();
  }

  // --- Analysis Logic ---
  createAnalyzeButton(isLegacy = false) {
    if (document.querySelector(".ai-analyzer-btn")) return;

    const btn = document.createElement("button");
    btn.className = "ai-analyzer-btn";
    btn.textContent = "Analyze Company";

    document.body.appendChild(btn);

    btn.addEventListener("click", async () => {
      this.showAnalysisPanel();
      this.runAnalysis(isLegacy);
    });
  }

  showAnalysisPanel() {
    let panel = document.querySelector(".ai-analyzer-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "ai-analyzer-panel";
      panel.innerHTML = `
                <h2>
                    Company Analysis
                    <button class="ai-close-btn">&times;</button>
                </h2>
                <div class="ai-loader">Analyzing... <br><small>This may take a few seconds</small></div>
                <div class="ai-result ai-analyzer-content"></div>
            `;
      document.body.appendChild(panel);
      panel.querySelector(".ai-close-btn").addEventListener("click", () => {
        panel.classList.remove("visible");
      });
    }

    panel.classList.add("visible");
    panel.querySelector(".ai-loader").classList.add("visible");
    panel.querySelector(".ai-result").textContent = "";
  }

  runAnalysis(isLegacy) {
    let data = {};
    if (isLegacy) {
      data = this.scrapeLegacyLinkedIn();
    } else {
      data = this.scrapeFromConfig();
    }

    console.log("Scraped Data:", data);

    const loader = document.querySelector(".ai-loader");
    const resultEl = document.querySelector(".ai-result");

    if (!data.name) {
      resultEl.textContent =
        "Could not find company Name. Please check your configuration.";
      loader.classList.remove("visible");
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: "analyzeCompany",
        data: data,
      },
      (response) => {
        loader.classList.remove("visible");
        if (response && response.success) {
          resultEl.innerHTML = marked.parse(response.data.analysis);
        } else {
          resultEl.textContent =
            "Error: " +
            (response?.error || response?.toString() || "Unknown error");
        }
      }
    );
  }

  scrapeFromConfig() {
    const getText = (sel) => {
      if (!sel) return "";
      const el = document.querySelector(sel);
      return el ? el.innerText.trim() : "";
    };

    return {
      name: getText(this.config.name),
      location: getText(this.config.location),
      about: getText(this.config.about),
      website: window.location.href,
    };
  }

  scrapeLegacyLinkedIn() {
    const getText = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.innerText.trim() : "";
    };

    // 1. Name
    let name = getText("h1");
    if (!name) name = getText(".org-top-card-summary__title");

    // 2. Location
    let location = getText(
      ".org-top-card-summary-info-list__info-item:nth-child(1)"
    );

    // 3. About
    let about = getText(".org-about-module__description");
    if (!about) about = getText(".org-grid__content-height-enforcer p");

    // 4. Website
    let website = "";
    const linkEl = Array.from(document.querySelectorAll("a")).find(
      (a) =>
        a.innerText.includes("Website") ||
        (a.href &&
          !a.href.includes("linkedin.com") &&
          a.closest(".org-top-card"))
    );
    if (linkEl) website = linkEl.href;

    return { name, location, about, website };
  }

  // --- Job UI (Legacy) ---
  checkAndInjectJobUI() {
    // Job details load dynamically.
    // Usually .jobs-details__main-content exists when a job is selected.
    const container = document.querySelector(".jobs-details__main-content");
    if (container && !document.querySelector(".ai-tailor-btn")) {
      this.createJobUI();
    }
  }

  createJobUI() {
    const topCardParams =
      document.querySelector(
        ".job-details-jobs-unified-top-card__top-buttons"
      ) || document.querySelector(".jobs-s-apply");
    if (!topCardParams) return;

    const btn = document.createElement("button");
    btn.className =
      "artdeco-button artdeco-button--2 artdeco-button--secondary ai-tailor-btn";
    btn.textContent = "✨ Tailor Resume";
    btn.style.marginLeft = "8px";
    btn.style.backgroundColor = "#e8f0fe";
    btn.style.color = "#0a66c2";
    btn.style.border = "1px solid #0a66c2";

    if (document.querySelector(".ai-tailor-btn")) return;
    topCardParams.appendChild(btn);

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      btn.textContent = "Processing...";
      btn.disabled = true;

      const data = this.scrapeJobData();
      console.log("Scraped Job Data:", data);

      if (!data.title || !data.company) {
        alert("Could not extract job details. Please try again.");
        btn.textContent = "✨ Tailor Resume";
        btn.disabled = false;
        return;
      }

      chrome.runtime.sendMessage(
        {
          action: "createDraftResume",
          data: data,
        },
        (response) => {
          btn.textContent = "✨ Tailor Resume";
          btn.disabled = false;

          if (response && response.success) {
            window.open(
              `http://localhost:5173/tailor/${response.id}`,
              "_blank"
            );
          } else {
            alert("Error: " + (response?.error || "Unknown error"));
          }
        }
      );
    });
  }

  scrapeJobData() {
    const getText = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.innerText.trim() : "";
    };
    const title =
      getText(".job-details-jobs-unified-top-card__job-title h1") ||
      getText("h1");
    const company =
      getText(".job-details-jobs-unified-top-card__company-name a") ||
      getText(".job-details-jobs-unified-top-card__company-name");
    const descriptionEl =
      document.querySelector("#job-details") ||
      document.querySelector(".jobs-description-content__text");
    const description = descriptionEl ? descriptionEl.innerText : "";
    const url = window.location.href;
    return { title, company, description, url };
  }
}

// Start
new App();
