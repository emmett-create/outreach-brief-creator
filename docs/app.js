// ── System prompts ────────────────────────────────────────────────────────────

const OUTREACH_PROMPT = `You are an expert influencer outreach specialist for Agency Eight, an influencer marketing agency. Your job is to create a complete, professional influencer outreach campaign based on the brand materials provided.

Read the provided materials carefully — they contain everything you need: brand voice, product details, target audience, tone, etc. Use them to generate highly customized, on-brand outreach copy.

Generate exactly 11 messages in the following order. Separate each message with a line containing only "---" and start each with "## N. MESSAGE NAME" on its own line.

THE 11 MESSAGES:

## 1. INITIAL EMAIL OUTREACH
Subject line format: [Gifting Opportunity] [Benefit/Hook] from [BRAND]
- Greeting: "Hi [NAME],"
- 1-2 sentence brand intro (only if the creator may not know the brand)
- 2-3 sentences about the product with key benefits
- "We've been loving your content and would love to gift you [PRODUCT] to experience and share your take with your audience."
- Form link CTA (use provided form link or [INSERT FORM LINK])
- Email signature: Name / Title / Agency Eight / Location

## 2. EMAIL FOLLOW-UP #1 (3 days later)
Subject: Re: [same subject]
Brief friendly follow-up. Include form link. Email signature.

## 3. INITIAL DM OUTREACH (no form link)
Casual, concise. 2-3 sentences about product. End: "Let me know if you're interested and I can share next steps!"

## 4. DM FOLLOW-UP #1 (3 days after initial DM)
Brief follow-up. Include form link. Add: "If it's easier, feel free to send me your shipping and email info here."

## 5. IF THEY AGREE
"Amazing! Please fill out the form below..." Include form link.

## 6. IF THEY DECLINE
Gracious, warm. Keep door open for future campaigns.

## 7. IF THEY ASK FOR PAID (NOT OFFERING PAID)
Acknowledge interest. Explain gifting only. Still offer free gift. Include form link.

## 8. IF THEY ASK FOR PAID (ARE OFFERING PAID)
"We'd love to explore that! Feel free to reach out to [TEAM EMAIL] and someone from our team will be in touch."

## 9. FOLLOW-UP #2 — FORM NOT FILLED
"Hey [NAME]! We never got your info. If it's easier we can do a manual order, just send over your full name, address, and email address here and I'll get your order placed. LMK if you have any questions!"

## 10. ORDER CONFIRMED + BRIEF
Email version (with subject: Your [BRAND] [PRODUCT] Is On Its Way) + shorter DM version.
Products are on their way. Reference brand deck link: [INSERT BRAND DECK LINK]. Email signature for email version.

## 11. FOLLOW-UP TO POST
Casual check-in after delivery. Ask how they're liking the product. Ask to tag the brand if they share.

EMAIL SIGNATURE FORMAT:
[Manager Name]
[Manager Title]
Agency Eight
[Location]

Use [PLACEHOLDER] format for any values not found in the provided materials.`;

const BRIEF_PROMPT = `You are a visual content brief designer for Agency Eight, an influencer marketing agency. Create a complete, professional content brief as a self-contained HTML file based on the provided brand materials.

Read the materials carefully — use the actual brand voice, colors, product details, and messaging from the materials.

Output ONLY the complete HTML file. Start directly with <!DOCTYPE html>. Do not include any explanation before or after the HTML.

BRIEF STRUCTURE — 11 sections as a scrollable single-page document:

1. COVER: Brand name + "Content Guide" heading. Social handles and website. Full-width branded header using brand color.
2. BRAND INTRODUCTION: "We [mission]" headline. 3 short paragraphs: what brand does, mission/values, what makes them unique. 100-150 words.
3. PRODUCT OVERVIEW: Product name as headline. What they're receiving (bulleted). Main benefits. Two-column layout (text left, image placeholder right).
4. KEY FEATURES: 4 feature cards in 2x2 grid. Bold feature name + 2-3 sentence description each.
5. KEY TALKING POINTS: 3-4 messaging pillars. Bold headline + description. Include "Best for:" and "Perfect if you:" sections.
6. HOW TO USE: Numbered steps (3-5). Step number + title + description. Skip only if truly self-explanatory.
7. CONTENT GUIDELINES: "[Brand] & You" heading. Short intro. "Content We Love:" list of 5-7 specific ideas. Note about authenticity.
8. VIDEO CONTENT EXAMPLES: 6 video idea cards in 2x3 grid. Content type headline + description.
9. BRAND VOICE / AESTHETIC: 3 voice pillars in 3-column grid. Bold attribute + short descriptor. Closing tagline.
10. SHARING INFO: Hashtag suggestions (8-12 hashtags) + UTM link placeholder with instructions.
11. THANK YOU: "Thank you!" headline. Gratitude. Contact info placeholders. Social handles. Website.

DESIGN:
- max-width: 900px, centered, font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Use brand's actual color palette from provided materials (infer if not specified)
- Clean, generous white space; clear section separation
- Image placeholders: dashed border, gray background, instruction text
- All unknowns use [PLACEHOLDER] format
- Inline all CSS — no external stylesheets
- Print-friendly (no fixed positioning)`;

// ── State ─────────────────────────────────────────────────────────────────────

const API_URL   = 'https://api.anthropic.com/v1/messages';
const MODEL     = 'claude-sonnet-4-6';
let uploadedFiles = [];
let lastOutreachText     = '';
let lastOutreachBrand    = '';
let lastOutreachMessages = [];

function messagesToText(msgs) {
  return msgs.map(m =>
    `## ${m.num}. ${m.name}` +
    (m.subject ? `\nSubject: ${m.subject}` : '') +
    `\n\n${m.body}`
  ).join('\n\n---\n\n');
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', bindAll);

// ── File handling ─────────────────────────────────────────────────────────────

function handleFiles(files) {
  for (const file of files) {
    if (!file.name.match(/\.(txt|md|pdf)$/i)) {
      alert(`"${file.name}" is not supported. Please upload .txt, .md, or .pdf files.`);
      continue;
    }
    if (uploadedFiles.find(f => f.name === file.name)) continue;
    const reader = new FileReader();
    if (file.name.match(/\.pdf$/i)) {
      reader.onload = e => {
        const base64 = e.target.result.split(',')[1];
        uploadedFiles.push({ name: file.name, size: file.size, type: 'pdf', content: base64 });
        renderFileList();
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = e => {
        uploadedFiles.push({ name: file.name, size: file.size, type: 'text', content: e.target.result });
        renderFileList();
      };
      reader.readAsText(file);
    }
  }
}

function renderFileList() {
  const list = document.getElementById('file-list');
  if (uploadedFiles.length === 0) {
    list.classList.add('hidden');
    return;
  }
  list.classList.remove('hidden');
  list.innerHTML = uploadedFiles.map((f, i) => `
    <div class="file-item">
      <span class="file-icon">📄</span>
      <span class="file-name" title="${esc(f.name)}">${esc(f.name)}</span>
      <span class="file-size">${formatBytes(f.size)}</span>
      <button class="file-remove" data-i="${i}" title="Remove">✕</button>
    </div>`).join('');

  list.querySelectorAll('.file-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      uploadedFiles.splice(parseInt(btn.dataset.i), 1);
      renderFileList();
    });
  });
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Build user message ────────────────────────────────────────────────────────

function buildUserMessage(mode) {
  const brand     = document.getElementById('f-brand').value.trim();
  const formLink  = document.getElementById('f-form-link').value.trim();
  const teamEmail = document.getElementById('f-team-email').value.trim();
  const name      = document.getElementById('f-manager-name').value.trim();
  const title     = document.getElementById('f-manager-title').value.trim();
  const location  = document.getElementById('f-location').value.trim();
  const context   = document.getElementById('f-context').value.trim();

  const textFiles = uploadedFiles.filter(f => f.type !== 'pdf');
  const pdfFiles  = uploadedFiles.filter(f => f.type === 'pdf');

  let instruction = mode === 'outreach'
    ? 'Please create the complete 11-message outreach campaign using the provided brand materials.'
    : 'Please create the complete content brief HTML file using the provided brand materials.';

  if (textFiles.length > 0) {
    instruction += '\n\n--- BRAND MATERIALS ---';
    for (const f of textFiles) {
      instruction += `\n\n[FILE: ${f.name}]\n${f.content}`;
    }
    instruction += '\n--- END BRAND MATERIALS ---';
  }

  const details = [
    brand     ? 'Brand name: ' + brand         : '',
    formLink  ? 'Form link: ' + formLink        : '',
    teamEmail ? 'Team email for paid inquiries: ' + teamEmail : '',
    name      ? 'Manager name: ' + name         : '',
    title     ? 'Manager title: ' + title       : '',
    location  ? 'Location: ' + location         : '',
    context   ? 'Additional notes:\n' + context : '',
  ].filter(Boolean);

  if (details.length > 0) {
    instruction += '\n\n--- CAMPAIGN DETAILS ---\n' + details.join('\n');
  }

  if (uploadedFiles.length === 0 && details.length === 0) return null;

  const blocks = [];
  for (const f of pdfFiles) {
    blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.content } });
  }
  blocks.push({ type: 'text', text: instruction });
  return blocks;
}

// ── API ───────────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userMessage, maxTokens) {
  const apiKey = localStorage.getItem('a8_anthropic_key');
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${resp.status}`);
  }
  const data = await resp.json();
  return data.content[0].text;
}

// ── Generate ──────────────────────────────────────────────────────────────────

async function generateOutreach() {
  if (!checkApiKey()) return;
  const userMsg = buildUserMessage('outreach');
  if (!userMsg) { alert('Please upload at least one file or fill in some campaign details.'); return; }

  showLoading('Generating outreach copy… this takes about 30 seconds');
  setButtons(true);
  try {
    const text  = await callClaude(OUTREACH_PROMPT, userMsg, 8000);
    const brand = document.getElementById('f-brand').value.trim() || 'Campaign';
    lastOutreachText  = text;
    lastOutreachBrand = brand;
    renderOutreachMessages(text, brand);
  } catch (e) {
    showError(e.message);
  } finally {
    setButtons(false);
  }
}

async function generateBrief() {
  if (!checkApiKey()) return;
  const userMsg = buildUserMessage('brief');
  if (!userMsg) { alert('Please upload at least one file or fill in some campaign details.'); return; }

  showLoading('Generating content brief… this takes about 45 seconds');
  setButtons(true);
  try {
    const html  = await callClaude(BRIEF_PROMPT, userMsg, 16000);
    const brand = document.getElementById('f-brand').value.trim() || 'Brand';
    const clean = html.replace(/^```html\s*/i, '').replace(/\s*```$/, '').trim();
    showBriefDownload(clean, brand);
  } catch (e) {
    showError(e.message);
  } finally {
    setButtons(false);
  }
}

async function refineOutreach() {
  const input = document.getElementById('refine-input');
  const btn   = document.getElementById('refine-btn');
  const request = input ? input.value.trim() : '';
  if (!request) return;

  btn.disabled    = true;
  btn.textContent = 'Updating…';

  const userMsg = [{ type: 'text', text:
    `Here is the current outreach copy:\n\n${lastOutreachText}\n\n` +
    `Please make these changes: ${request}\n\n` +
    `Return the complete updated copy in the exact same format (## N. MESSAGE NAME headings, separated by ---).`
  }];

  try {
    const text = await callClaude(OUTREACH_PROMPT, userMsg, 8000);
    lastOutreachText = text;
    renderOutreachMessages(text, lastOutreachBrand);
  } catch (e) {
    btn.disabled    = false;
    btn.textContent = 'Apply';
    alert('Error: ' + e.message);
  }
}

// ── Render: outreach messages ─────────────────────────────────────────────────

function renderOutreachMessages(text, brand) {
  const sections = text.split(/\n---+\n/);
  const messages = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    const headingMatch = trimmed.match(/^##\s+(\d+)\.\s+(.+)/m);
    if (!headingMatch) {
      if (messages.length > 0) messages[messages.length - 1].body += '\n\n' + trimmed;
      continue;
    }
    const num   = headingMatch[1];
    const name  = headingMatch[2].trim();
    const after = trimmed.slice(trimmed.indexOf(headingMatch[0]) + headingMatch[0].length).trim();
    const subjectMatch = after.match(/^Subject:\s*(.+)/m);
    const subject = subjectMatch ? subjectMatch[1].trim() : '';
    const body    = subjectMatch ? after.replace(/^Subject:\s*.+\n?/, '').trim() : after;
    messages.push({ num, name, subject, body });
  }

  lastOutreachMessages = messages;

  const container = document.getElementById('messages-container');
  container.innerHTML = '';

  if (messages.length === 0) {
    const pre = document.createElement('pre');
    pre.style.cssText = 'white-space:pre-wrap;font-size:13px;color:#1a0000;line-height:1.6;';
    pre.textContent = text;
    container.appendChild(pre);
  } else {
    const toolbar = document.createElement('div');
    toolbar.className = 'msg-toolbar';

    const copyAllBtn = document.createElement('button');
    copyAllBtn.className = 'btn-copy-all';
    copyAllBtn.textContent = 'Copy All';
    copyAllBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(messagesToText(lastOutreachMessages)).then(() => {
        copyAllBtn.textContent = 'Copied!';
        setTimeout(() => { copyAllBtn.textContent = 'Copy All'; }, 2000);
      });
    });

    const toggleAllBtn = document.createElement('button');
    toggleAllBtn.className = 'btn-copy-all';
    toggleAllBtn.textContent = 'Expand All';
    toggleAllBtn.addEventListener('click', () => {
      const bodies  = container.querySelectorAll('.msg-body');
      const chevs   = container.querySelectorAll('.msg-chevron');
      const anyOpen = Array.from(bodies).some(b => b.style.display !== 'none');
      bodies.forEach(b  => b.style.display  = anyOpen ? 'none' : 'block');
      chevs.forEach(c   => c.textContent    = anyOpen ? '▼'    : '▲');
      toggleAllBtn.textContent = anyOpen ? 'Expand All' : 'Collapse All';
    });

    toolbar.appendChild(copyAllBtn);
    toolbar.appendChild(toggleAllBtn);
    container.appendChild(toolbar);

    messages.forEach((msg, idx) => container.appendChild(buildMsgCard(msg, idx === 0, idx)));

    const refineDiv = document.createElement('div');
    refineDiv.className = 'refine-area';
    refineDiv.innerHTML = `
      <div class="refine-label">Apply a change to all messages</div>
      <div class="refine-row">
        <input type="text" id="refine-input" class="refine-input" placeholder='e.g. "Make the DM messages shorter" or "Remove the Vogue mention"'>
        <button class="btn-refine" id="refine-btn">Apply to All</button>
      </div>`;
    container.appendChild(refineDiv);

    document.getElementById('refine-btn').addEventListener('click', refineOutreach);
    document.getElementById('refine-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') refineOutreach();
    });
  }

  showResults('Outreach Copy — ' + brand, messages.length + ' messages');
}

function buildMsgCard(msg, openByDefault, idx) {
  const card     = document.createElement('div');
  card.className = 'msg-card';

  card.innerHTML = `
    <div class="msg-card-hdr">
      <span class="msg-num">${msg.num}</span>
      <span class="msg-name">${esc(msg.name)}</span>
      <button class="btn-copy">Copy</button>
      <button class="btn-edit-msg">Edit</button>
      <span class="msg-chevron">${openByDefault ? '▲' : '▼'}</span>
    </div>
    <div class="msg-edit-area hidden">
      <div class="refine-row">
        <input type="text" class="refine-input msg-edit-input" placeholder='e.g. "Make this more casual" or "Shorten to 3 sentences"'>
        <button class="btn-refine msg-edit-apply">Apply</button>
        <button class="btn-edit-cancel">Cancel</button>
      </div>
    </div>
    <div class="msg-body"${openByDefault ? '' : ' style="display:none"'}>
      ${msg.subject ? `<div class="msg-subject">Subject: ${esc(msg.subject)}</div>` : ''}<span class="msg-body-text">${esc(msg.body)}</span>
    </div>`;

  const hdr       = card.querySelector('.msg-card-hdr');
  const body      = card.querySelector('.msg-body');
  const chev      = card.querySelector('.msg-chevron');
  const cpBtn     = card.querySelector('.btn-copy');
  const editBtn   = card.querySelector('.btn-edit-msg');
  const editArea  = card.querySelector('.msg-edit-area');
  const editInput = card.querySelector('.msg-edit-input');
  const applyBtn  = card.querySelector('.msg-edit-apply');
  const cancelBtn = card.querySelector('.btn-edit-cancel');

  hdr.addEventListener('click', e => {
    if (e.target === cpBtn || e.target === editBtn) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    chev.textContent   = open ? '▼' : '▲';
  });

  cpBtn.addEventListener('click', e => {
    e.stopPropagation();
    const copyStr = (msg.subject ? 'Subject: ' + msg.subject + '\n\n' : '') + msg.body;
    navigator.clipboard.writeText(copyStr).then(() => {
      cpBtn.textContent = 'Copied!';
      cpBtn.classList.add('copied');
      setTimeout(() => { cpBtn.textContent = 'Copy'; cpBtn.classList.remove('copied'); }, 2000);
    });
  });

  editBtn.addEventListener('click', e => {
    e.stopPropagation();
    editArea.classList.toggle('hidden');
    if (!editArea.classList.contains('hidden')) {
      body.style.display = 'block';
      chev.textContent   = '▲';
      editInput.focus();
    }
  });

  cancelBtn.addEventListener('click', e => {
    e.stopPropagation();
    editArea.classList.add('hidden');
    editInput.value = '';
  });

  const doEdit = async () => {
    const request = editInput.value.trim();
    if (!request) return;
    applyBtn.disabled    = true;
    applyBtn.textContent = 'Updating…';

    const msgText = `## ${msg.num}. ${msg.name}` +
      (msg.subject ? `\nSubject: ${msg.subject}` : '') +
      `\n\n${msg.body}`;

    const userMsg = [{ type: 'text', text:
      `Here is one outreach message:\n\n${msgText}\n\n` +
      `Please make these changes: ${request}\n\n` +
      `Return only this updated message in the same format, starting with ## ${msg.num}. on the first line.`
    }];

    try {
      const text    = await callClaude(OUTREACH_PROMPT, userMsg, 2000);
      const parsed  = parseOneMessage(text, msg.num, msg.name);
      msg.subject   = parsed.subject;
      msg.body      = parsed.body;
      msg.name      = parsed.name;

      const subjectEl = body.querySelector('.msg-subject');
      const bodyText  = body.querySelector('.msg-body-text');
      if (msg.subject) {
        if (subjectEl) subjectEl.textContent = 'Subject: ' + msg.subject;
        else body.insertAdjacentHTML('afterbegin', `<div class="msg-subject">Subject: ${esc(msg.subject)}</div>`);
      } else if (subjectEl) subjectEl.remove();
      bodyText.textContent = msg.body;

      lastOutreachMessages[idx] = msg;
      lastOutreachText = messagesToText(lastOutreachMessages);

      editArea.classList.add('hidden');
      editInput.value = '';
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      applyBtn.disabled    = false;
      applyBtn.textContent = 'Apply';
    }
  };

  applyBtn.addEventListener('click', e => { e.stopPropagation(); doEdit(); });
  editInput.addEventListener('keydown', e => { if (e.key === 'Enter') doEdit(); });

  return card;
}

function parseOneMessage(text, fallbackNum, fallbackName) {
  const headingMatch = text.match(/^##\s+(\d+)\.\s+(.+)/m);
  const name    = headingMatch ? headingMatch[2].trim() : fallbackName;
  const after   = headingMatch ? text.slice(text.indexOf(headingMatch[0]) + headingMatch[0].length).trim() : text.trim();
  const subMatch = after.match(/^Subject:\s*(.+)/m);
  const subject  = subMatch ? subMatch[1].trim() : '';
  const body     = subMatch ? after.replace(/^Subject:\s*.+\n?/, '').trim() : after;
  return { num: fallbackNum, name, subject, body };
}

// ── Render: content brief download ───────────────────────────────────────────

function showBriefDownload(html, brand) {
  const slug     = brand.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const filename = slug + '_Content_Brief.html';
  const blob     = new Blob([html], { type: 'text/html' });
  const url      = URL.createObjectURL(blob);

  const container = document.getElementById('messages-container');
  container.innerHTML = `
    <div class="brief-card">
      <div class="brief-icon">📄</div>
      <div class="brief-name">${esc(filename)}</div>
      <div class="brief-sub">Your content brief is ready. Download and open in any browser, or upload to Google Drive and share the link with creators.</div>
      <a class="btn-download" href="${url}" download="${filename}">⬇ Download Brief</a>
    </div>`;

  showResults('Content Brief — ' + brand, 'Ready to download');
}

// ── UI state ──────────────────────────────────────────────────────────────────

function showLoading(msg) {
  hide('output-empty'); hide('output-results'); show('output-loading');
  document.getElementById('loading-text').textContent = msg;
}
function showResults(title, meta) {
  hide('output-empty'); hide('output-loading'); show('output-results');
  document.getElementById('results-title').textContent = title;
  document.getElementById('results-meta').textContent  = meta;
}
function showError(msg) {
  hide('output-loading'); show('output-empty');
  document.getElementById('output-empty').innerHTML = `
    <div class="empty-icon">⚠</div>
    <div class="empty-title">Something went wrong</div>
    <div class="empty-sub" style="color:#f85149">${esc(msg)}</div>`;
}
function setButtons(disabled) {
  document.getElementById('btn-outreach').disabled = disabled;
  document.getElementById('btn-brief').disabled    = disabled;
}
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }
function esc(s)   { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── API key ───────────────────────────────────────────────────────────────────

function checkApiKey() {
  if (!localStorage.getItem('a8_anthropic_key')) {
    show('nokey-overlay'); return false;
  }
  return true;
}

// ── Bind events ───────────────────────────────────────────────────────────────

function bindAll() {
  document.getElementById('btn-outreach').addEventListener('click', generateOutreach);
  document.getElementById('btn-brief').addEventListener('click', generateBrief);

  // File upload
  const zone  = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');
  zone.addEventListener('click',      () => input.click());
  input.addEventListener('change',    () => { handleFiles(input.files); input.value = ''; });
  zone.addEventListener('dragover',   e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave',  () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop',       e => { e.preventDefault(); zone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

  // Settings
  document.getElementById('btn-settings').addEventListener('click', () => {
    const key = localStorage.getItem('a8_anthropic_key') || '';
    document.getElementById('f-api-key').value = key ? '••••••••••••' + key.slice(-4) : '';
    show('settings-overlay');
  });
  document.getElementById('settings-close').addEventListener('click',  () => hide('settings-overlay'));
  document.getElementById('settings-cancel').addEventListener('click', () => hide('settings-overlay'));
  document.getElementById('settings-overlay').addEventListener('click', e => {
    if (e.target.id === 'settings-overlay') hide('settings-overlay');
  });
  document.getElementById('settings-save').addEventListener('click', () => {
    const val = document.getElementById('f-api-key').value.trim();
    if (val && !val.startsWith('••')) localStorage.setItem('a8_anthropic_key', val);
    hide('settings-overlay');
  });

  // Persist manager details
  const savedFields = ['f-manager-name', 'f-manager-title', 'f-location', 'f-team-email'];
  savedFields.forEach(id => {
    const el  = document.getElementById(id);
    const val = localStorage.getItem('a8_' + id);
    if (val) el.value = val;
    el.addEventListener('blur', () => localStorage.setItem('a8_' + id, el.value.trim()));
  });

  // No-key modal
  document.getElementById('nokey-cancel').addEventListener('click',   () => hide('nokey-overlay'));
  document.getElementById('nokey-settings').addEventListener('click', () => {
    hide('nokey-overlay');
    document.getElementById('btn-settings').click();
  });
}
