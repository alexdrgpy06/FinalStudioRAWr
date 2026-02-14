const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, LevelFormat, ExternalHyperlink } = require('docx');
const fs = require('fs');

const doc = new Document({
    styles: {
        default: {
            document: {
                run: {
                    font: "Arial",
                    size: 22 // 11pt
                }
            }
        },
        paragraphStyles: [
            {
                id: "Title",
                name: "Title",
                basedOn: "Normal",
                run: {
                    size: 48,
                    bold: true,
                    color: "000000",
                    font: "Arial Black"
                },
                paragraph: {
                    spacing: { before: 0, after: 100 },
                    alignment: AlignmentType.CENTER
                }
            },
            {
                id: "Heading1",
                name: "Heading 1",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: {
                    size: 32,
                    bold: true,
                    color: "2E74B5",
                    font: "Arial",
                    allCaps: true
                },
                paragraph: {
                    spacing: { before: 300, after: 120 },
                    outlineLevel: 0,
                    border: {
                        bottom: {
                            color: "2E74B5",
                            space: 1,
                            style: "single",
                            size: 6
                        }
                    }
                }
            },
            {
                id: "Heading2",
                name: "Heading 2",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: {
                    size: 26,
                    bold: true,
                    color: "000000",
                    font: "Arial"
                },
                paragraph: {
                    spacing: { before: 200, after: 100 },
                    outlineLevel: 1
                }
            }
        ]
    },
    numbering: {
        config: [
            {
                reference: "bullet-list",
                levels: [
                    {
                        level: 0,
                        format: LevelFormat.BULLET,
                        text: "•",
                        alignment: AlignmentType.LEFT,
                        style: {
                            paragraph: {
                                indent: { left: 720, hanging: 360 }
                            }
                        }
                    }
                ]
            }
        ]
    },
    sections: [{
        properties: {
            page: {
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
            }
        },
        children: [
            new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("ALEJANDRO DANIEL RAMÍREZ GIMÉNEZ")] }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun("Asunción, Paraguay | +595 984 958 334 | "),
                    new TextRun({ text: "alexdrg06@gmail.com", color: "0000FF", underline: {} }),
                    new TextRun(" | "),
                    new ExternalHyperlink({
                        children: [new TextRun({ text: "LinkedIn Profile", color: "0000FF", underline: {} })],
                        link: "https://linkedin.com/in/alexdrgpy06"
                    })
                ]
            }),

            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Professional Summary")] }),
            new Paragraph({
                children: [
                    new TextRun("Multidisciplinary professional with over 15 years of experience in full-stack development, UI/UX design, applied AI, digital marketing, and audiovisual production. Expert in higher education consultancy (quality management, accreditation) and digital transformation (LMS implementation). Specialist in custom WordPress development, process automation (n8n, Zapier), and interactive product design. Proven track record leading innovative projects across education, private sectors, and social foundations, integrating technology with communication strategy and quality management.")
                ]
            }),

            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Technical Core Arsenal")] }),
            new Paragraph({ children: [new TextRun({ text: "Full-Stack Development: ", bold: true }), new TextRun("JavaScript (ES6+), TypeScript, Python (Django/Flask), Java (Spring Boot), PHP (Laravel/Symfony), Node.js (Express/NestJS), Ruby on Rails, PostgreSQL, MySQL, MongoDB, Redis.")] }),
            new Paragraph({ children: [new TextRun({ text: "AI & Machine Learning: ", bold: true }), new TextRun("GPT-4, Claude, Gemini, Llama, Qwen, LangChain, RAG systems, Transformers, FAISS, Stable Diffusion, Veo.")] }),
            new Paragraph({ children: [new TextRun({ text: "DevOps & Automation: ", bold: true }), new TextRun("Docker, Kubernetes (Basic), GitHub Actions, Jenkins, Ansible, Terraform, n8n, Zapier, Make, Airtable.")] }),
            new Paragraph({ children: [new TextRun({ text: "Design & Multimedia: ", bold: true }), new TextRun("UI/UX (Figma), Graphic Design (Adobe Suite), 3D (Blender), Video (DaVinci/Final Cut), OBS Studio.")] }),

            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Professional Experience")] }),
            
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Freelance Full-Stack Developer & Consultant | 2007 – Present")] }),
            new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("End-to-End Web Development: Full lifecycle management using WordPress, Drupal, and custom builds.")] }),
            new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("WordPress Security: Malware detection, recovery, and proactive hardening.")] }),
            new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Performance & SEO: Achieved significant organic growth via Core Web Vitals optimization and SEO audits.")] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Partner & Lead Developer | UFO Epic | 2017 – Present")] }),
            new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Software Engineering: Developed custom SaaS platforms using Node.js, React, Angular, and PostgreSQL.")] }),
            new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("API & Dashboard Architecture: Scalable API design and real-time BI dashboards.")] }),
            new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Technical Leadership: Supervised teams and enforced software engineering best practices.")] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Sub-Coordinator General & Technical Director | UNIDA School of Government | 2020 – 2023")] }),
            new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("EdTech Architecture: Managed technical coordination for government-focused online education.")] }),
            new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("LMS Implementation: Led setup and cloud support for Canvas LMS.")] }),
            new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Hybrid Infrastructure: Directed high-quality streaming and hybrid classroom production (OBS Studio).")] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Webmaster & Digital Marketing Lead | Universidad UNIDA | 2018 – 2019")] }),
            new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("SEO Success: Achieved +180% organic traffic growth through a complete site redesign.")] }),

            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Education")] }),
            new Paragraph({ children: [new TextRun({ text: "Licenciatura en Inteligencia Artificial y Robótica ", bold: true }), new TextRun("| UNIDA (2025 – Present)")] }),
            new Paragraph({ children: [new TextRun({ text: "Ingeniería en Sistemas ", bold: true }), new TextRun("| UNIDA (2018 – 2023, On Pause)")] }),
            new Paragraph({ children: [new TextRun({ text: "Bachiller Técnico en Electrónica ", bold: true }), new TextRun("| IPT (2005 – 2006)")] }),

            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Languages")] }),
            new Paragraph({ children: [new TextRun({ text: "Spanish/Guaraní: ", bold: true }), new TextRun("Native")] }),
            new Paragraph({ children: [new TextRun({ text: "English: ", bold: true }), new TextRun("Advanced (C1) / Professional Level")] }),
            new Paragraph({ children: [new TextRun({ text: "Portuguese: ", bold: true }), new TextRun("Advanced")] })
        ]
    }]
});

Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync("ALEX_MASTER_RESUME.docx", buffer);
    console.log("Master Resume saved to ALEX_MASTER_RESUME.docx");
});
