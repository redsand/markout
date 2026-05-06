# MarkOut Security Proof-of-Concept Examples (Safe Demonstrations)

Date: May 6, 2026  
Scope: Findings F1-F10 from `SECURITY_AUDIT_REPORT.md`

> These examples are intentionally non-malicious. They are for demonstrating risk only.

## F1 — Raw HTML passthrough in Markdown renderer
**Goal:** show that inline HTML could be preserved if raw HTML is allowed.

**Safe PoC markdown input:**
```markdown
Hello
<img src="x" onerror="alert(1)">
```

**Expected risky behavior (pre-fix):** HTML tag appears in rendered output and keeps event attribute.

---

## F2 — Cleanser preserves dangerous tags/attributes
**Goal:** show unsafe attributes can survive simplistic cleansing.

**Safe PoC compose HTML:**
```html
<a href="javascript:alert(1)" onclick="alert(1)">Click me</a>
```

**Expected risky behavior (pre-fix):** `href` and/or `onclick` survive cleansing and reach render stage.

---

## F3 — Unsafe HTML sink via `setAsync(Html)`
**Goal:** show sanitized-vs-unsanitized payload differences at sink.

**Safe PoC rendered HTML candidate:**
```html
<p>Hi <img src="x" onerror="alert(1)"></p>
```

**Expected risky behavior (pre-fix):** body set with event-bearing HTML if no sink guard exists.

---

## F4 — Custom CSS injection from roaming settings
**Goal:** show user CSS can materially change outbound rendering.

**Safe PoC stylesheet setting:**
```css
.notice { display: none; }
a.cta::before { content: "Verify account"; }
```

**Expected risky behavior (pre-fix):** message semantics visibly altered by untrusted CSS.

---

## F5 — Auto-render-on-send silent transformation
**Goal:** show message changes can happen without an explicit final review.

**Safe PoC:**
1. Enable autorender.
2. Compose body containing markdown like:
```markdown
# Header
This is **bold**
```
3. Send without pressing render manually.

**Expected risky behavior:** content transformed at send time without explicit visual diff confirmation.

---

## F6 — External URL privacy leak vectors
**Goal:** show remote resources can cause recipient-side network requests.

**Safe PoC markdown input:**
```markdown
![tracking-demo](https://example.com/pixel.png)
```

**Expected risky behavior:** recipient client may fetch remote image URL.

---

## F7 — Manifest/hosted asset trust concentration
**Goal:** show add-in logic is controlled by hosted endpoints in manifest.

**Safe PoC manifest edit (test env only):**
Change one source location URL to a controlled staging host.

**Expected risky behavior:** runtime behavior changes based on asset origin integrity.

---

## F8 — Dev CORS + source map exposure
**Goal:** show how permissive dev exposure broadens attack surface.

**Safe PoC check:**
Verify dev server response includes `Access-Control-Allow-Origin: *` and source maps are discoverable.

**Expected risky behavior:** easier cross-origin inspection in dev/test contexts.

---

## F9 — Render-state logic confusion/tampering
**Goal:** show toggle state can be confused by non-structured marker values.

**Safe PoC:**
Set custom property `mo-original` to string `"false"` manually, then toggle render.

**Expected risky behavior:** render/unrender flow can become inconsistent.

---

## F10 — Supply-chain hardening gaps
**Goal:** show transformation behavior depends on third-party package versions.

**Safe PoC:**
Demonstrate that changing parser/sanitizer dependency version in a branch alters output for same input corpus.

**Expected risky behavior:** security posture drifts with dependency updates if controls are weak.

---

## Demo notes for owner walkthrough
- Run all demonstrations in test tenants and test manifests only.
- Use non-production mailboxes.
- Do not send externally.
- Capture before/after screenshots and exact input/output snippets.
