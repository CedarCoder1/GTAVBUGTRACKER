const categoryNames = { universal: "Universal", online: "GTA Online", story: "Story mode" };
const platformNames = { ps5: "PS5 / Series", ps4: "PS4 / One", pc: "PC", legacy: "PS3 / 360" };
let reports = [];
let activeCategory = "all";
let activeVersion = "all";
const grid = document.querySelector("#bug-grid");
const emptyState = document.querySelector("#empty-state");
const versionFilters = document.querySelector("#version-filters");

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function parseReports(text) { return text.trim() ? JSON.parse(text) : []; }
function compareVersions(first, second) {
  if (first === "older") return second === "older" ? 0 : -1;
  if (second === "older") return 1;
  const firstParts = first.match(/\d+/g)?.map(Number) ?? [];
  const secondParts = second.match(/\d+/g)?.map(Number) ?? [];
  for (let index = 0; index < Math.max(firstParts.length, secondParts.length); index += 1) {
    const difference = (firstParts[index] ?? 0) - (secondParts[index] ?? 0);
    if (difference) return difference;
  }
  return first.localeCompare(second);
}
function renderVersionFilters() {
  const versions = [...new Set(reports.flatMap((report) => report.versions ?? []).filter(Boolean))].sort(compareVersions);
  const allButton = versionFilters.querySelector('[data-version="all"]');
  versionFilters.replaceChildren(versionFilters.querySelector(".filter-caption"), allButton);
  versions.forEach((version) => {
    const button = element("button", `version-chip ${activeVersion === version ? "selected" : ""}`, version === "older" ? "Older builds" : version);
    button.type = "button";
    button.dataset.version = version;
    versionFilters.append(button);
  });
  allButton.classList.toggle("selected", activeVersion === "all");
}
function youtubeId(value) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      return url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1] ?? null;
    }
  } catch { return null; }
  return null;
}
function renderReport(report, index) {
  const card = element("article", "bug-card");
  card.style.animationDelay = `${Math.min(index, 8) * 30}ms`;
  const row = element("div", "report-row");
  const details = element("div", "report-cell");
  details.append(element("h3", "", report.title), element("p", "report-description", report.description));
  if (report.example) details.append(element("span", "sample-tag", "Example record"));
  const mode = element("div", `category-tag ${report.category}`, categoryNames[report.category] ?? "Uncategorized");
  const patches = element("div", "patch-list");
  [...(report.versions ?? [])].sort((a, b) => compareVersions(b, a)).forEach((version, i) => {
    patches.append(element("span", `patch-tag ${i === 0 ? "latest" : ""}`, version === "older" ? "Older builds" : version));
  });
  if (!report.versions?.length) patches.append(element("span", "patch-tag", "Version unknown"));
  const platforms = element("div", "platform-tags", (report.platforms ?? []).map((platform) => platformNames[platform] ?? platform).join(" · ") || "Platform unknown");
  const status = element("div", `card-status ${report.status === "Confirmed" ? "confirmed" : ""}`, report.status ?? "Needs testing");
  const actions = element("div", "row-actions");
  const videoId = youtubeId(report.video);
  if (videoId) {
    const videoPanel = element("div", "video-panel");
    videoPanel.hidden = true;
    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`;
    frame.title = `${report.title} video`;
    frame.loading = "lazy";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    frame.allowFullscreen = true;
    videoPanel.append(frame);
    const watch = element("button", "watch-button", "▶ Watch");
    watch.type = "button";
    watch.setAttribute("aria-expanded", "false");
    watch.addEventListener("click", () => {
      videoPanel.hidden = !videoPanel.hidden;
      watch.setAttribute("aria-expanded", String(!videoPanel.hidden));
      watch.textContent = videoPanel.hidden ? "▶ Watch" : "× Close";
    });
    actions.append(watch);
    row.append(details, mode, patches, platforms, status, actions);
    card.append(row, videoPanel);
  } else {
    row.append(details, mode, patches, platforms, status, actions);
    card.append(row);
  }
  return card;
}
function visibleReports() {
  const query = document.querySelector("#search-input").value.trim().toLowerCase();
  const platforms = [...document.querySelectorAll("#platform-filters input:checked")].map((input) => input.value);
  const sort = document.querySelector("#sort-select").value;
  const visible = reports.filter((report) => {
    const modeMatch = activeCategory === "all" || report.category === activeCategory;
    const versionMatch = activeVersion === "all" || (report.versions ?? []).includes(activeVersion);
    const platformMatch = platforms.length === 0 || platforms.some((platform) => (report.platforms ?? []).includes(platform));
    const searchMatch = !query || `${report.title} ${report.description} ${categoryNames[report.category]} ${(report.versions ?? []).join(" ")}`.toLowerCase().includes(query);
    return modeMatch && versionMatch && platformMatch && searchMatch;
  });
  visible.sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "version-desc" || sort === "version-asc") {
      const newest = (report) => [...(report.versions ?? [])].sort(compareVersions).at(-1) ?? "";
      return compareVersions(newest(b), newest(a)) * (sort === "version-desc" ? 1 : -1);
    }
    return (b.created ?? 0) - (a.created ?? 0);
  });
  return visible;
}
function render() {
  const visible = visibleReports();
  grid.replaceChildren(...visible.map(renderReport));
  emptyState.hidden = visible.length > 0;
  document.querySelector("#result-count").textContent = String(visible.length).padStart(2, "0");
  document.querySelector("#all-count").textContent = String(reports.length).padStart(2, "0");
}
document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => {
  activeCategory = button.dataset.category;
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
  render();
}));
versionFilters.addEventListener("click", (event) => {
  const button = event.target.closest(".version-chip");
  if (!button) return;
  activeVersion = button.dataset.version;
  document.querySelectorAll(".version-chip").forEach((item) => item.classList.toggle("selected", item === button));
  render();
});
document.querySelectorAll("#platform-filters input").forEach((input) => input.addEventListener("change", render));
document.querySelector("#search-input").addEventListener("input", render);
document.querySelector("#sort-select").addEventListener("change", render);
document.querySelector("#clear-filters").addEventListener("click", () => {
  activeCategory = "all";
  activeVersion = "all";
  document.querySelector("#search-input").value = "";
  document.querySelectorAll("#platform-filters input").forEach((input) => { input.checked = false; });
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.category === "all"));
  document.querySelectorAll(".version-chip").forEach((item) => item.classList.toggle("selected", item.dataset.version === "all"));
  render();
});
fetch("./bugs.json")
  .then((response) => { if (!response.ok) throw new Error(`Could not load bugs.json (${response.status}).`); return response.text(); })
  .then((text) => { const data = parseReports(text); if (!Array.isArray(data)) throw new Error("bugs.json must contain a JSON array."); reports = data; renderVersionFilters(); render(); })
  .catch((error) => {
    document.querySelector("#load-error").hidden = false;
    document.querySelector("#load-error").textContent = `${error.message} Serve this folder over HTTP to load the data file.`;
  });