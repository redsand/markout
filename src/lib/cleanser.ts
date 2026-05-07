const FORBIDDEN_TAGS = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "link", "meta"]);
const SAFE_PROTOCOLS = new Set(["https:", "mailto:"]);

export function cleanse(text: string): string {
    const dom = new DOMParser().parseFromString(`${text}`, "text/html")

    const lines = [].concat(...toArray(dom.body.childNodes).map(node => cleanseNode(dom, node)))

    return lines.join("").trim()
}

function cleanseNode(dom: Document, node: Node): string[] {
    switch (node.nodeType) {
        case dom.ELEMENT_NODE:
            return cleanseElement(dom, node as Element)
        case dom.TEXT_NODE:
            return [cleanseText(dom, node.textContent)]
        default:
            return [node.textContent]
    }
}

function sanitizeElement(el: Element): string {
    const clone = el.cloneNode(true) as Element;
    const nodes = [clone, ...Array.from(clone.querySelectorAll("*"))];

    for (const node of nodes) {
        const tag = node.tagName.toLowerCase();
        if (FORBIDDEN_TAGS.has(tag)) {
            node.remove();
            continue;
        }

        for (const attr of Array.from(node.attributes)) {
            const name = attr.name.toLowerCase();
            const value = attr.value.trim();

            if (name.startsWith("on") || name === "srcset") {
                node.removeAttribute(attr.name);
                continue;
            }

            if (name === "href" || name === "src") {
                try {
                    const url = new URL(value, "https://markout.local");
                    if (!SAFE_PROTOCOLS.has(url.protocol) || value.startsWith("/")) {
                        node.removeAttribute(attr.name);
                    }
                } catch {
                    node.removeAttribute(attr.name);
                }
            }
        }
    }

    return clone.outerHTML;
}

function cleanseElement(dom: Document, el: Element): string[] {
    switch (el.tagName.toLowerCase()) {
        case "script":
        case "style":
        case "iframe":
        case "object":
        case "embed":
        case "svg":
        case "math":
        case "link":
        case "meta":
            return []
        case "br":
            return [];
        case "a":
            if (el.innerHTML === el.getAttribute("href"))
                return [el.getAttribute("href")]
            return [sanitizeElement(el)]
        case "img":
            return [sanitizeElement(el).replace(/\n+/g, '\n')]
        case "div":
        case "p":
            return [...cleanseElementContainer(dom, el), "\n"]
        case "span":
            return cleanseElementContainer(dom, el);
        default:
            return [sanitizeElement(el)]
    }
}

function cleanseElementContainer(dom: Document, container: Element): string[] {
    if (container.id && container.id.split("").every(c => c.charCodeAt(0) < 128))
        return [sanitizeElement(container)];

    return [].concat(...toArray(container.childNodes).map(node => cleanseNode(dom, node)))
}

function cleanseText(dom: Document, text: string): string {
    const container = dom.createElement("span");
    container.innerHTML = text.replace(/[\u007F-\u009F]/g, "").replace(/[\u00a0]/g, " ");
    if (!container.innerHTML.trim()) return ""

    return container.textContent
        .replace(/^(\r?\n)+/, "\n")
        .replace(/(\r?\n)+$/, "\n")
        .replace(/(.+)[\r\n]+(.+)/g, "$1 $2")
}

interface Collection<T> {
    length: number;
    item(index: number): T;
}

function toArray<T extends Node>(nodes: NodeListOf<T>): T[] {
    const arr = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
        arr[i] = nodes.item(i)
    }

    return arr
}
