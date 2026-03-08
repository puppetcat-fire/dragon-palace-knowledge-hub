const state = {
  hub: null,
};

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Request failed.");
  }
  return response.json();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function parseMaterials(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, purpose, merchant, link] = line.split("|").map((part) => part.trim());
      return { name, purpose, merchant, link };
    })
    .filter((item) => item.name);
}

function parseSequence(value) {
  return String(value || "")
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseChildNodes(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, summary, domain] = line.split("|").map((part) => part.trim());
      return { title, summary, domain };
    })
    .filter((item) => item.title);
}

function renderStats() {
  const container = document.getElementById("stats-grid");
  const template = document.getElementById("stat-card-template");
  const stats = [
    ["节点总数", state.hub.stats.totalNodes],
    ["个人节点", state.hub.stats.personalNodes],
    ["集体节点", state.hub.stats.collectiveNodes],
    ["点亮记录", state.hub.stats.totalIlluminations],
    ["开放提案", state.hub.stats.openProposals],
    ["材料入口", state.hub.stats.materialLinks],
  ];

  container.innerHTML = "";
  stats.forEach(([label, value]) => {
    const fragment = template.content.cloneNode(true);
    fragment.querySelector(".stat-label").textContent = label;
    fragment.querySelector(".stat-value").textContent = value;
    container.appendChild(fragment);
  });
}

function renderLoop() {
  document.getElementById("loop-list").innerHTML = state.hub.meta.loop
    .map((item) => `<span class="loop-chip">${escapeHtml(item)}</span>`)
    .join("");
}

function renderFeed() {
  const container = document.getElementById("feed-list");
  if (!state.hub.feed.length) {
    container.innerHTML = '<div class="empty-state">还没有点亮记录。</div>';
    return;
  }

  container.innerHTML = state.hub.feed
    .map(
      (item) => `
        <article class="feed-item">
          <div class="feed-meta">
            <span>${escapeHtml(item.userName)} · ${escapeHtml(item.userRole)}</span>
            <span>${formatDate(item.createdAt)}</span>
            <span class="proof-pill">${escapeHtml(item.proofType)}</span>
          </div>
          <h3>${escapeHtml(item.nodeTitle)}</h3>
          <p class="feed-summary">${escapeHtml(item.summary)}</p>
          <div class="path-route">
            ${item.sequenceTitles.map((title) => `<span class="path-chip">${escapeHtml(title)}</span>`).join("")}
          </div>
          <p class="card-row">开始：${formatDate(item.startedAt)} · 结束：${formatDate(item.endedAt)}</p>
          <p class="card-row">证明备注：${escapeHtml(item.artifactNote || "未填写")}</p>
        </article>
      `
    )
    .join("");
}

function renderRecommendations() {
  const container = document.getElementById("recommendations");
  container.innerHTML = state.hub.recommendations
    .map((item) => {
      const cards = item.nextNodes.length
        ? item.nextNodes
            .map(
              (next) => `
                <article class="recommend-card">
                  <h3>${escapeHtml(next.title)}</h3>
                  <p class="recommend-text">${escapeHtml(next.reason)}</p>
                  <div class="card-row">
                    <span>当前锚点：${escapeHtml(item.currentAnchor)}</span>
                    <span>推荐分：${next.score.toFixed(1)}</span>
                  </div>
                </article>
              `
            )
            .join("")
        : '<div class="empty-state">这个人当前没有新的推荐节点。</div>';

      return `<section><div class="card-row"><strong>${escapeHtml(item.userName)}</strong></div>${cards}</section>`;
    })
    .join("");
}

function renderPaths() {
  document.getElementById("paths").innerHTML = state.hub.paths
    .map(
      (path) => `
        <article class="path-card">
          <div class="card-row">
            <strong>被走了 ${path.count} 次</strong>
            <span>最近一次 ${formatDate(path.latestAt)}</span>
          </div>
          <div class="path-route">
            ${path.titles.map((title) => `<span class="path-chip">${escapeHtml(title)}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderNodes() {
  document.getElementById("node-grid").innerHTML = state.hub.nodes
    .map(
      (node) => `
        <article class="node-card">
          <div class="node-meta">
            <span>${escapeHtml(node.scope === "personal" ? "个人节点" : "集体节点")}</span>
            <span>${escapeHtml(node.domain)}</span>
            <span class="vote-pill">${node.helpfulVotes} 票</span>
            <span>${node.illuminationCount} 次点亮</span>
          </div>
          <h3>${escapeHtml(node.title)}</h3>
          <p class="node-summary">${escapeHtml(node.summary)}</p>
          <p class="card-row">${escapeHtml(node.governance)}</p>
          <p class="card-row">前置：${escapeHtml(node.prerequisites.join(" / ") || "无")}</p>
          <p class="card-row">下一爬：${escapeHtml(node.nextNodes.join(" / ") || "等待补全")}</p>
          <p class="card-row">点亮者：${node.illuminatorCount} 人 · 开放提案：${node.pendingProposalCount}</p>
          <div class="material-grid">
            ${(node.materials || [])
              .slice(0, 2)
              .map(
                (material) => `
                  <div class="material-row">
                    <div>
                      <strong>${escapeHtml(material.name)}</strong>
                      <div class="card-row">${escapeHtml(material.purpose || "材料入口")}</div>
                    </div>
                    <a class="buy-link" href="${escapeHtml(material.link || "#")}" target="_blank" rel="noreferrer">入口</a>
                  </div>
                `
              )
              .join("")}
          </div>
          <div class="hero-actions">
            <button class="vote-button" data-node-id="${escapeHtml(node.id)}">为节点投票</button>
            <button class="vote-button" data-delete-node-id="${escapeHtml(node.id)}">删除或发起删除提案</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderProposals() {
  const container = document.getElementById("proposal-list");
  if (!state.hub.proposals.length) {
    container.innerHTML = '<div class="empty-state">还没有治理提案。</div>';
    return;
  }

  container.innerHTML = state.hub.proposals
    .map(
      (proposal) => `
        <article class="feed-item">
          <div class="feed-meta">
            <span>${escapeHtml(proposal.nodeTitle)}</span>
            <span>${escapeHtml(proposal.actionType)}</span>
            <span class="proof-pill">${escapeHtml(proposal.status)}</span>
          </div>
          <h3>${escapeHtml(proposal.proposerName)} 发起的提案</h3>
          <p class="feed-summary">可投票人：${escapeHtml(proposal.eligibleVoterNames.join(" / ") || "提案发起人")}</p>
          <p class="card-row">赞成 ${proposal.approveCount} · 反对 ${proposal.rejectCount}</p>
          <div class="hero-actions">
            <button class="vote-button" data-proposal-id="${escapeHtml(proposal.id)}" data-decision="approve">赞成</button>
            <button class="vote-button" data-proposal-id="${escapeHtml(proposal.id)}" data-decision="reject">反对</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderPartners() {
  const container = document.getElementById("partner-list");
  if (!state.hub.partnerMatches.length) {
    container.innerHTML = '<div class="empty-state">还没有足够的共同行动数据。</div>';
    return;
  }

  container.innerHTML = state.hub.partnerMatches
    .map(
      (item) => `
        <article class="partner-card">
          <h3>${escapeHtml(item.leftUser)} × ${escapeHtml(item.rightUser)}</h3>
          <p class="partner-text">共同行动分 ${item.score}。重叠节点：${escapeHtml(item.sharedNodes.join(" / ") || "无")}。</p>
          <div class="card-row">桥接节点：${escapeHtml(item.bridgeNodes.join(" / ") || "等待更多路径")}</div>
        </article>
      `
    )
    .join("");
}

function renderTrust() {
  document.getElementById("trust-users").innerHTML = state.hub.trustUsers
    .map(
      (user) => `
        <article class="trust-card">
          <h3>${escapeHtml(user.displayName)}</h3>
          <p class="card-row">${escapeHtml(user.role)} · ${escapeHtml(user.verification)}</p>
          <p class="card-row">点亮 ${user.lightUps} 次 · 证明 ${user.proofs} 次 · 信任分 ${user.trustScore}</p>
        </article>
      `
    )
    .join("");

  document.getElementById("trust-rules").innerHTML = state.hub.trustRules
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function renderMaterials() {
  document.getElementById("material-list").innerHTML = state.hub.materials
    .map(
      (entry) => `
        <article class="material-card">
          <h3>${escapeHtml(entry.nodeTitle)}</h3>
          <div class="material-grid">
            ${entry.materials
              .map(
                (material) => `
                  <div class="material-row">
                    <div>
                      <strong>${escapeHtml(material.name)}</strong>
                      <div class="card-row">${escapeHtml(material.purpose || "材料入口")}</div>
                      <div class="card-row">${escapeHtml(material.merchant || "待设置商家")}</div>
                    </div>
                    <a class="buy-link" href="${escapeHtml(material.link || "#")}" target="_blank" rel="noreferrer">去看</a>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderIntegrations() {
  document.getElementById("integration-hooks").innerHTML = state.hub.integrationHooks
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function populateNodeSelectors() {
  const options = state.hub.nodes
    .map((node) => `<option value="${escapeHtml(node.id)}">${escapeHtml(node.title)} (${node.scope === "personal" ? "个人" : "集体"})</option>`)
    .join("");

  document.getElementById("update-node-id").innerHTML = options;
  document.getElementById("split-node-id").innerHTML = options;
  document.getElementById("merge-node-ids").innerHTML = options;
}

function renderAll() {
  renderLoop();
  renderStats();
  renderFeed();
  renderRecommendations();
  renderPaths();
  renderNodes();
  renderProposals();
  renderPartners();
  renderTrust();
  renderMaterials();
  renderIntegrations();
  populateNodeSelectors();
}

async function loadHub() {
  state.hub = await requestJson("/api/hub");
  renderAll();
}

function toIsoLocal(value) {
  return value ? new Date(value).toISOString() : null;
}

async function handleIlluminationSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = {
    displayName: formData.get("displayName"),
    role: formData.get("role"),
    nodeTitle: formData.get("nodeTitle"),
    nodeScope: formData.get("nodeScope"),
    nodeDomain: formData.get("nodeDomain"),
    nodeSummary: formData.get("nodeSummary"),
    summary: formData.get("summary"),
    sequenceTitles: parseSequence(formData.get("sequenceTitles")),
    proofType: formData.get("proofType"),
    artifactNote: formData.get("artifactNote"),
    materials: parseMaterials(formData.get("materials")),
    startedAt: toIsoLocal(formData.get("startedAt")),
    endedAt: toIsoLocal(formData.get("endedAt")),
  };

  state.hub = await requestJson("/api/illuminations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  event.currentTarget.reset();
  renderAll();
}

async function handleNodeUpdate(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const nodeId = formData.get("nodeId");
  const payload = {
    requesterDisplayName: formData.get("requesterDisplayName"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    domain: formData.get("domain"),
    materials: parseMaterials(formData.get("materials")),
  };

  const result = await requestJson(`/api/nodes/${nodeId}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  state.hub = result.snapshot;
  event.currentTarget.reset();
  renderAll();
}

async function handleNodeSplit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const nodeId = formData.get("nodeId");
  const payload = {
    requesterDisplayName: formData.get("requesterDisplayName"),
    childNodes: parseChildNodes(formData.get("childNodes")),
    replaceOriginal: formData.get("replaceOriginal") === "on",
  };

  const result = await requestJson(`/api/nodes/${nodeId}/split`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  state.hub = result.snapshot;
  event.currentTarget.reset();
  renderAll();
}

async function handleNodeMerge(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const select = document.getElementById("merge-node-ids");
  const sourceNodeIds = [...select.selectedOptions].map((option) => option.value);
  const payload = {
    requesterDisplayName: formData.get("requesterDisplayName"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    domain: formData.get("domain"),
    sourceNodeIds,
  };

  const result = await requestJson("/api/nodes/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  state.hub = result.snapshot;
  event.currentTarget.reset();
  renderAll();
}

async function handleNodeGridClick(event) {
  const voteButton = event.target.closest("[data-node-id]");
  if (voteButton) {
    const voterName = window.prompt("投票前留个名字，系统只统计真实人。");
    if (!voterName) {
      return;
    }

    state.hub = await requestJson("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodeId: voteButton.dataset.nodeId,
        voterName,
      }),
    });

    renderAll();
    return;
  }

  const deleteButton = event.target.closest("[data-delete-node-id]");
  if (!deleteButton) {
    return;
  }

  const requesterDisplayName = window.prompt("删除个人节点，或为集体节点发起删除提案。请输入你的名字。");
  if (!requesterDisplayName) {
    return;
  }

  const result = await requestJson(`/api/nodes/${deleteButton.dataset.deleteNodeId}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requesterDisplayName }),
  });

  state.hub = result.snapshot;
  renderAll();
}

async function handleProposalClick(event) {
  const button = event.target.closest("[data-proposal-id]");
  if (!button) {
    return;
  }

  const voterName = window.prompt("请输入你的名字。只有点亮过该集体节点的人可以投票。");
  if (!voterName) {
    return;
  }

  state.hub = await requestJson(`/api/proposals/${button.dataset.proposalId}/votes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      voterName,
      decision: button.dataset.decision,
    }),
  });

  renderAll();
}

async function handleReset() {
  state.hub = await requestJson("/api/reset", { method: "POST" });
  renderAll();
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadHub();
  document.getElementById("illumination-form").addEventListener("submit", handleIlluminationSubmit);
  document.getElementById("node-update-form").addEventListener("submit", handleNodeUpdate);
  document.getElementById("node-split-form").addEventListener("submit", handleNodeSplit);
  document.getElementById("node-merge-form").addEventListener("submit", handleNodeMerge);
  document.getElementById("node-grid").addEventListener("click", handleNodeGridClick);
  document.getElementById("proposal-list").addEventListener("click", handleProposalClick);
  document.getElementById("reset-demo").addEventListener("click", handleReset);
});
