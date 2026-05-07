import inlineCss from "inline-css";
import mdit from "markdown-it";
import { renderMarkdown, MO_CONTENT_PREFIX, MO_CONTENT_SUFFIX } from "../src/lib/renderer"
import { expect } from "chai";
import { JSDOM } from "jsdom"

const jsdom = new JSDOM()
global["DOMParser"] = jsdom.window.DOMParser;

async function vulnerableRender(markdown: string, css = "html {}") {
    const insecure = mdit({ html: true, breaks: false });
    const raw = `${MO_CONTENT_PREFIX()}${insecure.render(markdown)}${MO_CONTENT_SUFFIX()}`;

    const rendered = await inlineCss(raw, {
        extraCss: css,
        url: " ",
        removeStyleTags: true,
        removeLinkTags: true,
        removeHtmlSelectors: true,
    });

    const dom = new DOMParser().parseFromString(rendered, "text/html");
    return dom.body.innerHTML;
}

describe("renderer", () => {
    it("should generate HTML for basic markdown", async () => {
        const input = `# Example\nThis is a test`
        const expected = `<div class="mo">\n<h1>Example</h1>\n<p>This is a test</p>\n</div>\n`
        const output = await renderMarkdown({ markdown: input, css: "html {}" })

        expect(output).to.be.equal(expected)
    })

    it("should escape raw HTML in markdown input", async () => {
        const input = `# Example\nThis is a test with HTML elements\n<img src="http://example.com/img.png">`
        const expected = `<div class="mo">\n<h1>Example</h1>\n<p>This is a test with HTML elements\n&lt;img src="http://example.com/img.png"&gt;</p>\n</div>\n`
        const output = await renderMarkdown({ markdown: input, css: "html {}" })

        expect(output).to.be.equal(expected)
    })

    it("should strip dangerous protocols and css url usage", async () => {
        const input = `[click](javascript:alert(1))\n\n![img](https://example.com/a.png)`
        const output = await renderMarkdown({ markdown: input, css: "img{background-image:url(https://evil.test/x)}" })

        expect(output).to.not.contain("href=\"javascript:")
        expect(output).to.not.contain("background-image")
        expect(output).to.contain('<img src="https://example.com/a.png" alt="img">')
    })

    it("should preserve safe https and mailto links", async () => {
        const input = `[safe](https://example.com) and [mail](mailto:test@example.com)`
        const output = await renderMarkdown({ markdown: input, css: "html {}" })

        expect(output).to.contain('href="https://example.com"')
        expect(output).to.contain('href="mailto:test@example.com"')
    })

    it("should drop non-https link protocols such as http", async () => {
        const input = `[unsafe](http://example.com)`
        const output = await renderMarkdown({ markdown: input, css: "html {}" })

        expect(output).to.not.contain("href=\"http://example.com\"")
        expect(output).to.contain(">unsafe</a>")
    })

    it("should allow only approved hosts for remote assets", async () => {
        const input = `![safe](https://images.example.com/a.png) ![blocked](https://attacker.example/x.png)`
        const output = await renderMarkdown({ markdown: input, css: "html {}" })

        expect(output).to.contain('src="https://images.example.com/a.png"')
        expect(output).to.not.contain('src="https://attacker.example/x.png"')
    })

    it("should remove href values with encoded protocol bypasses", async () => {
        const input = `[x]( JAVASCRIPT:alert(1) ) [y](data:text/html,1)`
        const output = await renderMarkdown({ markdown: input, css: "html {}" })

        expect(output).to.not.contain("href=\" JAVASCRIPT")
        expect(output).to.not.contain("href=\"data:")
    })

    it("should remove risky inline css declarations while preserving safe styles", async () => {
        const payload = `![safe](https://images.example.com/pixel.png)`;
        const css = `img{display:none;visibility:hidden;opacity:0;position:absolute;pointer-events:none;border:1px solid #000}`;
        const output = await renderMarkdown({ markdown: payload, css });

        expect(output).to.not.contain("display: none");
        expect(output).to.not.contain("visibility: hidden");
        expect(output).to.not.contain("opacity: 0");
        expect(output).to.not.contain("position: absolute");
        expect(output).to.not.contain("pointer-events: none");
        expect(output).to.contain("border: 1px solid #000");
    })
})

describe("security PoC demonstrations", () => {
    it("shows F1 risk when sanitization is disabled", async () => {
        const payload = `Hello\n<img src=\"x\" onerror=\"alert(1)\">`;
        const vulnerable = await vulnerableRender(payload);
        const hardened = await renderMarkdown({ markdown: payload, css: "html {}" });

        expect(vulnerable).to.contain("onerror");
        expect(hardened).to.not.contain("<img");
        expect(hardened).to.contain("&lt;img");
    });

    it("shows F4/F6 risk when CSS sanitization is disabled", async () => {
        const payload = `![tracking-demo](https://images.example.com/pixel.png)`;
        const vulnerable = await vulnerableRender(payload, "img{background-image:url(https://attacker.example/pixel)}");
        const hardened = await renderMarkdown({ markdown: payload, css: "img{background-image:url(https://attacker.example/pixel)}" });

        expect(vulnerable).to.contain("background-image");
        expect(hardened).to.not.contain("background-image");
    });

    it("shows F2 risk when URL sanitization is disabled", async () => {
        const payload = `<a href=\"javascript:alert(1)\" onclick=\"alert(1)\">Click</a>`;
        const vulnerable = await vulnerableRender(payload);
        const hardened = await renderMarkdown({ markdown: payload, css: "html {}" });

        expect(vulnerable).to.contain("javascript:alert(1)");
        expect(vulnerable).to.contain("onclick");
        expect(hardened).to.not.contain("<a href=");
        expect(hardened).to.contain("&lt;a href=");
    });
});
