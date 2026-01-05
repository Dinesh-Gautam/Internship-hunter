export interface ResumeFont {
  id: string;
  label: string;
  bodyFamily: string;
  headingFamily: string;
  googleFontUrl: string;
}

export const RESUME_FONTS: ResumeFont[] = [
  {
    id: "classic",
    label: "Classic (Garamond & Lato)",
    bodyFamily: "'Cormorant Garamond', serif",
    headingFamily: "'Lato', sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Lato:wght@400;700&display=swap",
  },
  {
    id: "modern",
    label: "Modern (Roboto)",
    bodyFamily: "'Roboto', sans-serif",
    headingFamily: "'Roboto', sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
  },
  {
    id: "professional",
    label: "Professional (Open Sans)",
    bodyFamily: "'Open Sans', sans-serif",
    headingFamily: "'Open Sans', sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap",
  },
  {
    id: "elegant",
    label: "Elegant (Merriweather)",
    bodyFamily: "'Merriweather', serif",
    headingFamily: "'Merriweather', serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap",
  },
  {
    id: "clean",
    label: "Clean (Lato)",
    bodyFamily: "'Lato', sans-serif",
    headingFamily: "'Lato', sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap",
  },
  {
    id: "minimal",
    label: "Minimal (Inter)",
    bodyFamily: "'Inter', sans-serif",
    headingFamily: "'Inter', sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap",
  },
];

export interface ResumeData {
  fullName: string;
  contact: {
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    location?: string;
  };
  summary: string;
  education: Array<{
    institution: string;
    degree: string;
    location?: string;
    date: string;
    details?: string[];
  }>;
  experience: Array<{
    company: string;
    role: string;
    location?: string;
    date: string;
    details: string[];
  }>;
  projects?: Array<{
    name: string;
    link?: string;
    technologies?: string;
    date?: string;
    details: string[];
  }>;
  openSource?: Array<{
    name: string;
    role?: string;
    link: string;
    details: string[];
  }>;
  skills: {
    languages?: string[];
    frameworks?: string[];
    tools?: string[];
    softSkills?: string[];
  };
  certifications?: Array<{
    name: string;
    issuer: string;
    date?: string;
  }>;
}

export function generateResumeHtml(
  data: ResumeData,
  fontId: string = "classic"
): string {
  const {
    fullName,
    contact,
    summary,
    education,
    experience,
    projects,
    skills,
    certifications,
    openSource,
  } = data;

  const selectedFont =
    RESUME_FONTS.find((f) => f.id === fontId) || RESUME_FONTS[0];

  // Helper to parse simple markdown bold and links to HTML
  const formatText = (text: string) => {
    if (!text) return "";
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Regex for [text](url) -> <a href="url">text</a>
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank">$1</a>'
      );
    return formatted;
  };

  // Helpers to safely render lists
  const renderList = (items?: string[]) => {
    if (!items || items.length === 0) return "";
    const listItems = items
      .map((item) => `<li>${formatText(item)}</li>`)
      .join("");
    // Add contenteditable to UL so the whole list is editable, but individual LI editing is cleaner if we just enable it on the body/sections
    // For fine-grained control, we might wrap these, but for "simple" WYSIWYG, we'll rely on the top-level contenteditable
    return `<ul>${listItems}</ul>`;
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
    contact.location,
    contact.linkedin && `<a href="${contact.linkedin}">LinkedIn</a>`,
    contact.github && `<a href="${contact.github}">GitHub</a>`,
    contact.portfolio && `<a href="${contact.portfolio}">Portfolio</a>`,
  ]
    .filter(Boolean)
    .join(" | ");

  const educationHtml = education
    .map(
      (edu) => `
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
  `
    )
    .join("");

  const experienceHtml = experience
    .map(
      (exp) => `
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
  `
    )
    .join("");

  const projectsHtml = projects
    ? projects
        .map(
          (proj) => `
    <div class="item">
      <div class="item-header">
        <span>${proj.name} ${
            proj.link
              ? `<a href="${proj.link}" style="font-weight:normal; font-size: 0.9em;">[Link]</a>`
              : ""
          }</span>
        <span>${proj.date || ""}</span>
      </div>
      ${
        proj.technologies
          ? `<div class="item-sub"><i>Technologies: ${formatText(
              proj.technologies
            )}</i></div>`
          : ""
      }
      ${renderList(proj.details)}
    </div>
  `
        )
        .join("")
    : "";

  const openSourceHtml = openSource
    ? openSource
        .map(
          (os) => `
    <div class="item">
      <div class="item-header">
        <span>${os.name} ${
            os.link
              ? `<a href="${os.link}" style="font-weight:normal; font-size: 0.9em;">[Link]</a>`
              : ""
          }</span>
        <span>${os.role || ""}</span>
      </div>
      ${renderList(os.details)}
    </div>
  `
        )
        .join("")
    : "";

  const skillsHtml = `
    <div class="skills-grid">
      ${
        skills.languages && skills.languages.length
          ? `<div><strong>Languages:</strong> ${formatText(
              skills.languages.join(", ")
            )}</div>`
          : ""
      }
      ${
        skills.frameworks && skills.frameworks.length
          ? `<div><strong>Frameworks:</strong> ${formatText(
              skills.frameworks.join(", ")
            )}</div>`
          : ""
      }
      ${
        skills.tools && skills.tools.length
          ? `<div><strong>Tools:</strong> ${formatText(
              skills.tools.join(", ")
            )}</div>`
          : ""
      }
      ${
        skills.softSkills && skills.softSkills.length
          ? `<div><strong>Soft Skills:</strong> ${formatText(
              skills.softSkills.join(", ")
            )}</div>`
          : ""
      }
    </div>
  `;

  const certsHtml = certifications
    ? certifications
        .map(
          (cert) => `
    <div class="item-header">
       <span>${cert.name} - ${cert.issuer}</span>
       <span>${cert.date || ""}</span>
    </div>
  `
        )
        .join("")
    : "";

  // Important: We wrap the body content in a div that will be treated as the root for editing if needed,
  // but the final PDF needs the full HTML structure including <style>.
  // To make this "WYSIWYG", we will render the whole HTML in an iframe or just inject the style and body.
  // For this helper, we return the full string as before.

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${fullName} - Resume</title>
      <link href="${selectedFont.googleFontUrl}" rel="stylesheet">
      <style>
        :root {
            --font-body: ${selectedFont.bodyFamily};
            --font-heading: ${selectedFont.headingFamily};
        }
        body {
          font-family: var(--font-body);
          line-height: 1.25; 
          color: #000; /* Darker black */
          width: 8.5in !important;
          height: 11.85in !important;
          margin: 0 auto;
          padding: 20px;
          font-size: 10pt;
          font-weight: 400;
          background: white; /* Ensure white background for PDF */
        }
        
        a { color: #000; text-decoration: none; }
        
        /* Header */
        header { text-align: center; margin-bottom: 15px; }
        h1 { font-family: var(--font-heading); text-transform: uppercase; letter-spacing: 2px; font-size: 22pt; margin: 0 0 5px 0; color: #000; }
        .contact-info { font-size: 9.5pt; color: #000; }
        
        /* Headings */
        h2 {
          font-family: var(--font-heading);
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
        .item-sub { display: flex; justify-content: space-between; font-style: italic; margin-bottom: 1px; font-size: 9pt; color: #222; }
        
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

      ${
        summary
          ? `<div class="section"><p>${formatText(summary)}</p></div>`
          : ""
      }

      ${renderSection("Experience", experienceHtml)}
      ${
        (openSource && openSource.length > 0) ||
        (projects && projects.length > 0)
          ? renderSection(
              openSource &&
                openSource.length > 0 &&
                projects &&
                projects.length > 0
                ? "Projects & Open Source"
                : openSource && openSource.length > 0
                ? "Open Source"
                : "Projects",
              (openSourceHtml || "") + (projectsHtml || "")
            )
          : ""
      }
      ${renderSection("Education", educationHtml)}
      ${renderSection("Skills", skillsHtml)}
      ${certsHtml ? renderSection("Certifications", certsHtml) : ""}

    </body>
    </html>
  `;
}
