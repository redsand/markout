import inlineCss from "inline-css";
import hljs from "highlight.js";
import mdit from "markdown-it";
import { getStylesheet } from "./config";

const SAFE_URL_PROTOCOLS = ["https:", "mailto:"];
const SAFE_IMAGE_HOSTS = new Set(["example.com", "images.example.com"]);
const FORBIDDEN_TAGS = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "link", "meta"]);

const md: mdit = mdit({
    html: false,
    breaks: false,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<pre class="hljs"><code>${hljs.highlight(lang, str).value}</code></pre>`;
            } catch (__) { }
        }

        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    }
})
    .use(require('markdown-it-footnote'))
    .use(require('markdown-it-emoji'));

export interface RenderOptions {
    markdown: string;
    css?: string;
}

export const MO_CONTENT_PREFIX = () => `<div class="mo">\n`
export const MO_CONTENT_SUFFIX = () => `</div>\n`

function sanitizeCss(css: string): string {
    return css
        .split("\n")
        .filter(line => !/url\s*\(|@import/i.test(line))
        .join("\n");
}

function sanitizeUrl(value: string, attrName?: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";

    const base = "https://markout.local";
    try {
        const url = new URL(trimmed, base);
        if (!SAFE_URL_PROTOCOLS.includes(url.protocol)) {
            return "";
        }

        if (trimmed.startsWith("/")) return "";

        if (attrName === "src" && !SAFE_IMAGE_HOSTS.has(url.hostname)) {
            return "";
        }

        return trimmed;
    } catch {
        return "";
    }
}


function sanitizeStyleValue(styleValue: string): string {
    const safeDeclarations: string[] = [];

    for (const decl of styleValue.split(";")) {
        const item = decl.trim();
        if (!item) continue;

        const [rawProp, ...rawValue] = item.split(":");
        if (!rawProp || rawValue.length === 0) continue;

        const prop = rawProp.trim().toLowerCase();
        const value = rawValue.join(":").trim().toLowerCase();

        if (/url\s*\(|expression\s*\(/i.test(value)) continue;
        if (prop === "content") continue;
        if (prop === "display" && value === "none") continue;
        if (prop === "visibility" && value === "hidden") continue;
        if (prop === "opacity" && value === "0") continue;
        if (prop === "pointer-events" && value === "none") continue;
        if (prop === "position" && (value === "fixed" || value === "absolute")) continue;

        safeDeclarations.push(`${rawProp.trim()}: ${rawValue.join(":").trim()}`);
    }

    return safeDeclarations.join("; ");
}

function sanitizeDom(root: Element): void {
    const elements = Array.from(root.querySelectorAll("*"));

    for (const el of elements) {
        const tag = el.tagName.toLowerCase();
        if (FORBIDDEN_TAGS.has(tag)) {
            el.remove();
            continue;
        }

        for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            const value = attr.value;

            if (name.startsWith("on") || name === "srcset" || name === "formaction") {
                el.removeAttribute(attr.name);
                continue;
            }

            if (name === "style") {
                const sanitizedStyle = sanitizeStyleValue(value);
                if (!sanitizedStyle) {
                    el.removeAttribute(attr.name);
                } else {
                    el.setAttribute(attr.name, sanitizedStyle);
                }
                continue;
            }

            if (name === "href" || name === "src") {
                const sanitized = sanitizeUrl(value, name);
                if (!sanitized) {
                    el.removeAttribute(attr.name);
                } else {
                    el.setAttribute(attr.name, sanitized);
                }
            }
        }
    }
}

export async function renderMarkdown({ markdown, css }: RenderOptions): Promise<string> {
    css = sanitizeCss(css || getStylesheet());

    const raw = `${MO_CONTENT_PREFIX()}${md.render(markdown)}${MO_CONTENT_SUFFIX()}`;

    const rendered = await inlineCss(raw, {
        extraCss: css,
        url: " ",
        removeStyleTags: true,
        removeLinkTags: true,
        removeHtmlSelectors: true,
    });

    const dom = new DOMParser().parseFromString(rendered, "text/html");
    sanitizeDom(dom.body);
    return dom.body.innerHTML;
}
