import { ResumeData } from "../services/ai.js";

export function generateResumeHtml(data: ResumeData): string {
    const { fullName, contact, summary, education, experience, projects, skills, certifications, openSource } = data;

    // Helper to parse simple markdown bold and links to HTML
    const formatText = (text: string) => {
        if (!text) return "";
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Regex for [text](url) -> <a href="url">text</a>
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        return formatted;
    };

    // Helpers to safely render lists
    const renderList = (items?: string[]) => {
        if (!items || items.length === 0) return "";
        return `<ul>${items.map(item => `<li>${formatText(item)}</li>`).join("")}</ul>`;
    };

    const renderSection = (title: string, content: string) => {
        if (!content) return "";
        return `
      <div class="section">
        <h2>${title}</h2>
        ${content}
      </div>
    `;
    };

    const contactParts = [
        contact.email && `<a href="mailto:${contact.email}">${contact.email}</a>`,
        contact.phone,
        contact.linkedin && `<a href="${contact.linkedin}">LinkedIn</a>`,
        contact.github && `<a href="${contact.github}">GitHub</a>`,
        contact.portfolio && `<a href="${contact.portfolio}">Portfolio</a>`,
    ].filter(Boolean).join(" | ");

    const educationHtml = education.map(edu => `
    <div class="item">
      <div class="item-header">
        <span>${edu.institution}</span>
        <span>${edu.location || ""}</span>
      </div>
      <div class="item-sub">
        <span>${edu.degree}</span>
        <span>${edu.date}</span>
      </div>
      ${renderList(edu.details)}
    </div>
  `).join("");

    const experienceHtml = experience.map(exp => `
    <div class="item">
      <div class="item-header">
        <span>${exp.company}</span>
        <span>${exp.location || ""}</span>
      </div>
      <div class="item-sub">
        <span>${exp.role}</span>
        <span>${exp.date}</span>
      </div>
      ${renderList(exp.details)}
    </div>
  `).join("");

    const projectsHtml = projects ? projects.map(proj => `
    <div class="item">
      <div class="item-header">
        <span>${proj.name} ${proj.link ? `<a href="${proj.link}" style="font-weight:normal; font-size: 0.9em;">[Link]</a>` : ""}</span>
        <span>${proj.date || ""}</span>
      </div>
      ${proj.technologies ? `<div class="item-sub"><i>Technologies: ${proj.technologies}</i></div>` : ""}
      ${renderList(proj.details)}
    </div>
  `).join("") : "";

    const openSourceHtml = openSource ? openSource.map(os => `
    <div class="item">
      <div class="item-header">
        <span>${os.name} ${os.link ? `<a href="${os.link}" style="font-weight:normal; font-size: 0.9em;">[Link]</a>` : ""}</span>
        <span>${os.role || ""}</span>
      </div>
      ${renderList(os.details)}
    </div>
  `).join("") : "";

    const skillsHtml = `
    <div class="skills-grid">
      ${skills.languages && skills.languages.length ? `<div><strong>Languages:</strong> ${formatText(skills.languages.join(", "))}</div>` : ""}
      ${skills.frameworks && skills.frameworks.length ? `<div><strong>Frameworks:</strong> ${formatText(skills.frameworks.join(", "))}</div>` : ""}
      ${skills.tools && skills.tools.length ? `<div><strong>Tools:</strong> ${formatText(skills.tools.join(", "))}</div>` : ""}
      ${skills.softSkills && skills.softSkills.length ? `<div><strong>Soft Skills:</strong> ${formatText(skills.softSkills.join(", "))}</div>` : ""}
    </div>
  `;

    const certsHtml = certifications ? certifications.map(cert => `
    <div class="item-header">
       <span>${cert.name} - ${cert.issuer}</span>
       <span>${cert.date || ""}</span>
    </div>
  `).join("") : "";

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${fullName} - Resume</title>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Cormorant Garamond', serif;
          line-height: 1.25; 
          color: #000; /* Darker black */
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-size: 10.5pt;
          font-weight: 500;
        }
        
        a { color: #000; text-decoration: none; }
        
        /* Header */
        header { text-align: center; margin-bottom: 15px; }
        h1 { font-family: 'Lato', sans-serif; text-transform: uppercase; letter-spacing: 2px; font-size: 22pt; margin: 0 0 5px 0; color: #000; }
        .contact-info { font-size: 9.5pt; color: #000; }
        
        /* Headings */
        h2 {
          font-family: 'Lato', sans-serif;
          text-transform: uppercase;
          font-size: 11pt;
          border-bottom: 1px solid #000;
          padding-bottom: 1px;
          margin-top: 12px;
          margin-bottom: 8px;
          letter-spacing: 1px;
          font-weight: 700;
          color: #000;
        }
        
        /* Items */
        .item { margin-bottom: 8px; }
        .item-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 11pt; color: #000; }
        .item-sub { display: flex; justify-content: space-between; font-style: italic; margin-bottom: 1px; font-size: 10pt; color: #222; }
        
        /* Lists */
        ul { margin: 1px 0 4px 16px; padding: 0; }
        li { margin-bottom: 1px; text-align: justify; color: #000; }

        /* Skills */
        .skills-grid div { margin-bottom: 2px; color: #000; }
      </style>
    </head>
    <body>
      <header>
        <h1>${fullName}</h1>
        <div class="contact-info">${contactParts}</div>
      </header>

      ${summary ? `<div class="section"><p>${formatText(summary)}</p></div>` : ""}

      ${renderSection("Experience", experienceHtml)}
      ${openSourceHtml ? renderSection("Open Source Contributions", openSourceHtml) : ""}
      ${projectsHtml ? renderSection("Projects", projectsHtml) : ""}
      ${renderSection("Education", educationHtml)}
      ${renderSection("Skills", skillsHtml)}
      ${certsHtml ? renderSection("Certifications", certsHtml) : ""}

    </body>
    </html>
  `;
}
