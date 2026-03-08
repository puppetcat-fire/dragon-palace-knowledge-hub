const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8082;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "hub.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const LIGHT_UP_EVENT_EXAMPLE = {
  version: "1.0",
  source: "knowledge-habit-tracker",
  externalEventId: "habit_2026-03-07_001",
  displayName: "xiaob",
  role: "maker",
  startedAt: "2026-03-07T10:00:00+08:00",
  endedAt: "2026-03-07T11:10:00+08:00",
  summary: "把一套流程录成了可复现教程",
  nodeTitle: "录一段可复现的桌面教程",
  nodeScope: "collective",
  nodeDomain: "knowledge-share",
  sequenceTitles: [
    "做完一件事后立刻记下原始步骤",
    "录一段可复现的桌面教程"
  ],
  proofType: "artifact-backed",
  artifactNote: "附录屏和步骤文档",
  materials: [
    {
      name: "USB 麦克风",
      purpose: "录讲解",
      merchant: "创作设备馆",
      link: "https://merchant.example/mic"
    }
  ],
  tags: ["tutorial", "desk-demo"]
};

const LIGHT_UP_EVENT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://dragon-palace.local/contracts/light-up-event.schema.json",
  title: "LightUpEvent",
  type: "object",
  additionalProperties: true,
  required: ["version", "source", "externalEventId", "displayName", "nodeTitle", "summary"],
  properties: {
    version: { type: "string", const: "1.0" },
    source: { type: "string", minLength: 1 },
    externalEventId: { type: "string", minLength: 1 },
    displayName: { type: "string", minLength: 1 },
    role: { type: "string" },
    startedAt: { type: "string", format: "date-time" },
    endedAt: { type: "string", format: "date-time" },
    summary: { type: "string", minLength: 1 },
    nodeTitle: { type: "string", minLength: 1 },
    nodeScope: { type: "string", enum: ["personal", "collective"] },
    nodeDomain: { type: "string" },
    nodeSummary: { type: "string" },
    sequenceTitles: {
      type: "array",
      items: { type: "string", minLength: 1 }
    },
    proofType: {
      type: "string",
      enum: ["self-claim", "observed", "artifact-backed", "peer-backed"]
    },
    artifactNote: { type: "string" },
    materials: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1 },
          purpose: { type: "string" },
          merchant: { type: "string" },
          link: { type: "string" }
        }
      }
    },
    tags: {
      type: "array",
      items: { type: "string" }
    }
  }
};

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function mergeMaterials(currentMaterials = [], incomingMaterials = []) {
  const seen = new Set(currentMaterials.map((item) => normalizeText(item.name)));
  const merged = [...currentMaterials];

  incomingMaterials.forEach((item) => {
    if (!item || !item.name) {
      return;
    }

    const normalized = normalizeText(item.name);
    if (!seen.has(normalized)) {
      merged.push({
        name: item.name.trim(),
        purpose: String(item.purpose || "").trim(),
        merchant: String(item.merchant || "").trim(),
        link: String(item.link || "").trim(),
      });
      seen.add(normalized);
    }
  });

  return merged;
}

function getVerificationRank(level) {
  const ranks = {
    "self-claim": 0,
    observed: 1,
    "artifact-backed": 2,
    "peer-backed": 3,
  };

  return ranks[level] ?? 0;
}

function buildDefaultHub() {
  return {
    version: 1,
    createdAt: "2026-03-07T12:00:00.000Z",
    updatedAt: "2026-03-07T12:00:00.000Z",
    users: [
      {
        id: "user_linxi",
        displayName: "林汐",
        role: "流程整理者",
        verification: "artifact-backed",
        proofs: 3,
        joinedAt: "2026-03-01T08:00:00.000Z",
      },
      {
        id: "user_zhoudao",
        displayName: "周岛",
        role: "空间共建者",
        verification: "peer-backed",
        proofs: 2,
        joinedAt: "2026-03-02T09:15:00.000Z",
      },
      {
        id: "user_qiye",
        displayName: "柒野",
        role: "时间实验者",
        verification: "observed",
        proofs: 1,
        joinedAt: "2026-03-03T10:30:00.000Z",
      },
    ],
    nodes: [
      {
        id: "node_capture_steps",
        title: "做完一件事后立刻记下原始步骤",
        domain: "knowledge-capture",
        summary: "把刚做完的动作、坑点和材料先留下来，避免经验在当天蒸发。",
        prerequisiteIds: [],
        materials: [
          {
            name: "A5 网格笔记本",
            purpose: "快速记录步骤和坑点",
            merchant: "自营文具",
            link: "https://merchant.example/notebook",
          },
          {
            name: "桌面计时器",
            purpose: "记录真实花费时间",
            merchant: "时间实验室",
            link: "https://merchant.example/timer",
          },
        ],
      },
      {
        id: "node_record_demo",
        title: "录一段可复现的桌面教程",
        domain: "knowledge-share",
        summary: "把做事过程录成他人可直接跟做的演示片段。",
        prerequisiteIds: ["node_capture_steps"],
        materials: [
          {
            name: "USB 麦克风",
            purpose: "录清楚讲解和操作意图",
            merchant: "创作设备馆",
            link: "https://merchant.example/mic",
          },
          {
            name: "桌面补光灯",
            purpose: "保证手作和桌面演示可看清",
            merchant: "创作设备馆",
            link: "https://merchant.example/light",
          },
        ],
      },
      {
        id: "node_publish_playbook",
        title: "把教程整理成可爬的知识节点",
        domain: "knowledge-share",
        summary: "把演示、步骤、材料和常见错误整理成可搜索、可投票、可推荐的节点。",
        prerequisiteIds: ["node_capture_steps", "node_record_demo"],
        materials: [
          {
            name: "标签打印机",
            purpose: "给材料箱和节点版本做实体标记",
            merchant: "办公实验站",
            link: "https://merchant.example/label-printer",
          },
        ],
      },
      {
        id: "node_host_session",
        title: "组织一次 20 分钟共建分享",
        domain: "community",
        summary: "让刚点亮的人现场带一个小分享，让节点变成公共经验。",
        prerequisiteIds: ["node_publish_playbook"],
        materials: [
          {
            name: "便携白板",
            purpose: "现场画出节点关系和分工",
            merchant: "办公实验站",
            link: "https://merchant.example/whiteboard",
          },
          {
            name: "番茄钟",
            purpose: "把分享时间控制在轻量可持续范围内",
            merchant: "时间实验室",
            link: "https://merchant.example/pomodoro",
          },
        ],
      },
      {
        id: "node_material_station",
        title: "给节点配置材料清单和购买入口",
        domain: "commerce",
        summary: "知识不收费，但材料、工具和替代品可以跟节点一起出现。",
        prerequisiteIds: ["node_publish_playbook"],
        materials: [
          {
            name: "透明收纳箱",
            purpose: "给节点配套材料做实体归档",
            merchant: "办公实验站",
            link: "https://merchant.example/storage-box",
          },
        ],
      },
      {
        id: "node_time_sync",
        title: "把时间投入映射成点亮记录",
        domain: "time-tracking",
        summary: "把时间管理仓里的投入数据，映射到真实做成了什么节点。",
        prerequisiteIds: ["node_capture_steps"],
        materials: [
          {
            name: "NFC 贴纸",
            purpose: "把线下材料箱和线上节点快速关联",
            merchant: "时间实验室",
            link: "https://merchant.example/nfc",
          },
        ],
      },
    ],
    edges: [
      {
        id: "edge_steps_demo",
        sourceId: "node_capture_steps",
        targetId: "node_record_demo",
        type: "prerequisite",
        strength: 4,
      },
      {
        id: "edge_demo_publish",
        sourceId: "node_record_demo",
        targetId: "node_publish_playbook",
        type: "prerequisite",
        strength: 5,
      },
      {
        id: "edge_publish_session",
        sourceId: "node_publish_playbook",
        targetId: "node_host_session",
        type: "prerequisite",
        strength: 4,
      },
      {
        id: "edge_publish_material",
        sourceId: "node_publish_playbook",
        targetId: "node_material_station",
        type: "prerequisite",
        strength: 4,
      },
      {
        id: "edge_steps_time",
        sourceId: "node_capture_steps",
        targetId: "node_time_sync",
        type: "prerequisite",
        strength: 3,
      },
    ],
    illuminations: [
      {
        id: "illumination_1",
        userId: "user_linxi",
        nodeId: "node_publish_playbook",
        summary: "把一次桌面录屏拆成了步骤卡、材料卡和常见错误提示。",
        proofType: "artifact-backed",
        artifactNote: "附了录屏、文档和版本记录。",
        sequence: ["node_capture_steps", "node_record_demo", "node_publish_playbook"],
        createdAt: "2026-03-04T11:20:00.000Z",
      },
      {
        id: "illumination_2",
        userId: "user_zhoudao",
        nodeId: "node_host_session",
        summary: "把整理好的节点拿去做了 20 分钟午间分享，现场有人继续补了材料替代方案。",
        proofType: "peer-backed",
        artifactNote: "有现场签名和二次补充。",
        sequence: ["node_publish_playbook", "node_material_station", "node_host_session"],
        createdAt: "2026-03-05T07:40:00.000Z",
      },
      {
        id: "illumination_3",
        userId: "user_qiye",
        nodeId: "node_time_sync",
        summary: "把时间记录里的专注时段映射成了点亮记录，能看到时间最终落成了什么。",
        proofType: "observed",
        artifactNote: "展示了时间日志和对应节点。",
        sequence: ["node_capture_steps", "node_time_sync"],
        createdAt: "2026-03-06T13:10:00.000Z",
      },
    ],
    votes: [
      {
        id: "vote_1",
        nodeId: "node_publish_playbook",
        voterName: "清岚",
        createdAt: "2026-03-05T12:00:00.000Z",
      },
      {
        id: "vote_2",
        nodeId: "node_publish_playbook",
        voterName: "舟洲",
        createdAt: "2026-03-05T16:00:00.000Z",
      },
      {
        id: "vote_3",
        nodeId: "node_material_station",
        voterName: "小树",
        createdAt: "2026-03-06T10:00:00.000Z",
      },
      {
        id: "vote_4",
        nodeId: "node_host_session",
        voterName: "知北",
        createdAt: "2026-03-06T17:30:00.000Z",
      },
    ],
  };
}

function buildFreshHub() {
  return {
    version: 2,
    createdAt: "2026-03-07T12:00:00.000Z",
    updatedAt: "2026-03-07T12:00:00.000Z",
    users: [
      { id: "user_linxi", displayName: "林汐", role: "流程整理者", verification: "artifact-backed", proofs: 3, joinedAt: "2026-03-01T08:00:00.000Z" },
      { id: "user_zhoudao", displayName: "周岛", role: "空间共建者", verification: "peer-backed", proofs: 2, joinedAt: "2026-03-02T09:15:00.000Z" },
      { id: "user_qiye", displayName: "柒野", role: "时间实验者", verification: "observed", proofs: 1, joinedAt: "2026-03-03T10:30:00.000Z" },
    ],
    nodes: [
      { id: "node_capture_steps", title: "做完一件事后立刻记下原始步骤", domain: "knowledge-capture", summary: "先把动作、坑点和材料留下来，避免经验蒸发。", scope: "collective", ownerUserId: null, prerequisiteIds: [], materials: [{ name: "A5 网格本", purpose: "记录步骤", merchant: "自营文具", link: "https://merchant.example/notebook" }], archivedAt: null },
      { id: "node_record_demo", title: "录一段可复现的桌面教程", domain: "knowledge-share", summary: "把过程录成后来者可以直接跟做的演示片段。", scope: "collective", ownerUserId: null, prerequisiteIds: ["node_capture_steps"], materials: [{ name: "USB 麦克风", purpose: "录清楚讲解", merchant: "创作设备馆", link: "https://merchant.example/mic" }], archivedAt: null },
      { id: "node_publish_playbook", title: "把教程整理成可爬的知识节点", domain: "knowledge-share", summary: "把步骤、材料、坑点和替代方案整理成节点。", scope: "collective", ownerUserId: null, prerequisiteIds: ["node_capture_steps", "node_record_demo"], materials: [{ name: "标签打印机", purpose: "标记材料箱和节点版本", merchant: "办公实验站", link: "https://merchant.example/label-printer" }], archivedAt: null },
      { id: "node_host_session", title: "组织一次 20 分钟共建分享", domain: "community", summary: "让刚点亮的人带一场轻量分享，让经验变成公共经验。", scope: "collective", ownerUserId: null, prerequisiteIds: ["node_publish_playbook"], materials: [{ name: "便携白板", purpose: "画出节点关系和分工", merchant: "办公实验站", link: "https://merchant.example/whiteboard" }], archivedAt: null },
      { id: "node_material_station", title: "给节点配置材料清单和购买入口", domain: "commerce", summary: "知识免费，但材料和工具可以跟着节点出现。", scope: "collective", ownerUserId: null, prerequisiteIds: ["node_publish_playbook"], materials: [{ name: "透明收纳箱", purpose: "给节点配套材料归档", merchant: "办公实验站", link: "https://merchant.example/storage-box" }], archivedAt: null },
      { id: "node_time_sync", title: "把时间投入映射成点亮事件", domain: "time-tracking", summary: "把时间记录仓里的投入映射成真实做成了什么。", scope: "personal", ownerUserId: "user_qiye", prerequisiteIds: ["node_capture_steps"], materials: [{ name: "NFC 贴纸", purpose: "把线下材料和线上节点关联", merchant: "时间实验室", link: "https://merchant.example/nfc" }], archivedAt: null },
    ],
    edges: [
      { id: "edge_steps_demo", sourceId: "node_capture_steps", targetId: "node_record_demo", type: "prerequisite", strength: 4 },
      { id: "edge_demo_publish", sourceId: "node_record_demo", targetId: "node_publish_playbook", type: "prerequisite", strength: 5 },
      { id: "edge_publish_session", sourceId: "node_publish_playbook", targetId: "node_host_session", type: "prerequisite", strength: 4 },
      { id: "edge_publish_material", sourceId: "node_publish_playbook", targetId: "node_material_station", type: "prerequisite", strength: 4 },
      { id: "edge_steps_time", sourceId: "node_capture_steps", targetId: "node_time_sync", type: "prerequisite", strength: 3 },
    ],
    illuminations: [
      { id: "illumination_1", externalEventId: "habit_2026-03-04_001", source: "knowledge-habit-tracker", userId: "user_linxi", nodeId: "node_publish_playbook", summary: "把一段录屏拆成了步骤卡、材料卡和常见错误提示。", proofType: "artifact-backed", artifactNote: "附了录屏、文档和版本记录。", sequence: ["node_capture_steps", "node_record_demo", "node_publish_playbook"], startedAt: "2026-03-04T10:10:00.000Z", endedAt: "2026-03-04T11:20:00.000Z", createdAt: "2026-03-04T11:20:00.000Z" },
      { id: "illumination_2", externalEventId: "habit_2026-03-05_001", source: "knowledge-habit-tracker", userId: "user_zhoudao", nodeId: "node_host_session", summary: "把整理好的节点拿去做了午间分享。", proofType: "peer-backed", artifactNote: "有现场签名和二次补充。", sequence: ["node_publish_playbook", "node_material_station", "node_host_session"], startedAt: "2026-03-05T07:20:00.000Z", endedAt: "2026-03-05T07:40:00.000Z", createdAt: "2026-03-05T07:40:00.000Z" },
      { id: "illumination_3", externalEventId: "habit_2026-03-06_001", source: "knowledge-habit-tracker", userId: "user_qiye", nodeId: "node_time_sync", summary: "把时间日志映射成了点亮记录。", proofType: "observed", artifactNote: "展示了时间日志和对应节点。", sequence: ["node_capture_steps", "node_time_sync"], startedAt: "2026-03-06T12:10:00.000Z", endedAt: "2026-03-06T13:10:00.000Z", createdAt: "2026-03-06T13:10:00.000Z" },
      { id: "illumination_4", externalEventId: "habit_2026-03-07_002", source: "knowledge-habit-tracker", userId: "user_linxi", nodeId: "node_record_demo", summary: "第二天又录了一版更短的桌面教程。", proofType: "artifact-backed", artifactNote: "保留了新版录屏和素材清单。", sequence: ["node_capture_steps", "node_record_demo"], startedAt: "2026-03-07T08:20:00.000Z", endedAt: "2026-03-07T08:55:00.000Z", createdAt: "2026-03-07T08:55:00.000Z" },
    ],
    votes: [
      { id: "vote_1", nodeId: "node_publish_playbook", voterName: "清岚", createdAt: "2026-03-05T12:00:00.000Z" },
      { id: "vote_2", nodeId: "node_publish_playbook", voterName: "舟洲", createdAt: "2026-03-05T16:00:00.000Z" },
      { id: "vote_3", nodeId: "node_material_station", voterName: "小树", createdAt: "2026-03-06T10:00:00.000Z" },
      { id: "vote_4", nodeId: "node_host_session", voterName: "知北", createdAt: "2026-03-06T17:30:00.000Z" },
    ],
    proposals: [
      {
        id: "proposal_seed_split",
        nodeId: "node_publish_playbook",
        actionType: "split",
        proposerUserId: "user_linxi",
        status: "open",
        draft: {
          replaceOriginal: false,
          childNodes: [
            { title: "整理教程的步骤卡", summary: "把教程拆成最小可跟做的步骤卡。", domain: "knowledge-share" },
            { title: "整理教程的坑点卡", summary: "把常见错误和修复方式单独整理出来。", domain: "knowledge-share" }
          ]
        },
        votes: [{ userId: "user_linxi", decision: "approve", createdAt: "2026-03-07T09:10:00.000Z" }],
        createdAt: "2026-03-07T09:00:00.000Z",
        updatedAt: "2026-03-07T09:10:00.000Z"
      }
    ]
  };
}

function ensureHubFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    writeJson(DATA_FILE, buildFreshHub());
  }
}

function readHub() {
  ensureHubFile();
  const data = readJson(DATA_FILE);
  const changed = migrateHub(data);
  if (changed) {
    writeHub(data);
  }
  return data;
}

function writeHub(data) {
  data.updatedAt = new Date().toISOString();
  writeJson(DATA_FILE, data);
}

function migrateHub(data) {
  let changed = false;
  data.version = data.version || 1;

  if (!Array.isArray(data.proposals)) {
    data.proposals = [];
    changed = true;
  }

  data.nodes.forEach((node) => {
    if (!node.scope) {
      node.scope = node.id === "node_time_sync" ? "personal" : "collective";
      changed = true;
    }

    if (node.scope === "personal" && !("ownerUserId" in node)) {
      node.ownerUserId = "user_qiye";
      changed = true;
    }

    if (node.scope === "collective" && node.ownerUserId) {
      node.ownerUserId = null;
      changed = true;
    }

    if (!("archivedAt" in node)) {
      node.archivedAt = null;
      changed = true;
    }
  });

  data.illuminations.forEach((illumination) => {
    if (!("externalEventId" in illumination)) {
      illumination.externalEventId = null;
      changed = true;
    }

    if (!("source" in illumination)) {
      illumination.source = "manual";
      changed = true;
    }
  });

  if (data.proposals.length === 0) {
    data.proposals.push({
      id: "proposal_seed_split",
      nodeId: "node_publish_playbook",
      actionType: "split",
      proposerUserId: "user_linxi",
      status: "open",
      draft: {
        replaceOriginal: false,
        childNodes: [
          {
            title: "整理教程的步骤卡",
            summary: "把教程拆成最小可跟做的步骤卡。",
            domain: "knowledge-share",
          },
          {
            title: "整理教程的坑点卡",
            summary: "把常见错误和修复方式单独整理出来。",
            domain: "knowledge-share",
          },
        ],
      },
      votes: [
        {
          userId: "user_linxi",
          decision: "approve",
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    changed = true;
  }

  if (changed) {
    data.version = 2;
  }

  return changed;
}

function getActiveNodes(data) {
  return data.nodes.filter((node) => !node.archivedAt);
}

function getNodeById(data, nodeId) {
  return data.nodes.find((node) => node.id === nodeId);
}

function getIlluminatorIds(data, nodeId) {
  return dedupe(
    data.illuminations
      .filter((item) => item.nodeId === nodeId || (item.sequence || []).includes(nodeId))
      .map((item) => item.userId)
  );
}

function getEligibleVoterIds(data, proposal) {
  const illuminators = getIlluminatorIds(data, proposal.nodeId);
  if (illuminators.length > 0) {
    return illuminators;
  }
  return proposal.proposerUserId ? [proposal.proposerUserId] : [];
}

function isNodeOwner(node, userId) {
  return Boolean(node && node.scope === "personal" && node.ownerUserId === userId);
}

function archiveNode(data, nodeId) {
  const node = getNodeById(data, nodeId);
  if (node && !node.archivedAt) {
    node.archivedAt = new Date().toISOString();
  }
}

function rewireEdgesForReplacement(data, oldNodeId, firstNodeId, lastNodeId) {
  data.edges.forEach((edge) => {
    if (edge.sourceId === oldNodeId) {
      edge.sourceId = lastNodeId;
    }
    if (edge.targetId === oldNodeId) {
      edge.targetId = firstNodeId;
    }
  });
}

function applyNodeEdit(node, draft = {}) {
  if (draft.title) {
    node.title = String(draft.title).trim();
  }
  if (draft.summary) {
    node.summary = String(draft.summary).trim();
  }
  if (draft.domain) {
    node.domain = String(draft.domain).trim();
  }
  if (Array.isArray(draft.materials) && draft.materials.length > 0) {
    node.materials = mergeMaterials([], draft.materials);
  }
}

function applySplitNode(data, node, draft = {}) {
  const childNodes = Array.isArray(draft.childNodes) ? draft.childNodes : [];
  if (childNodes.length < 2) {
    throw new Error("Split requires at least two child nodes.");
  }

  const created = childNodes.map((child) =>
    ensureNode(data, {
      title: child.title,
      summary: child.summary,
      domain: child.domain || node.domain,
      scope: node.scope,
      ownerUserId: node.ownerUserId,
      materials: child.materials || [],
    })
  );

  created.forEach((childNode, index) => {
    if (index === 0) {
      childNode.prerequisiteIds = dedupe([...(node.prerequisiteIds || []), ...(childNode.prerequisiteIds || [])]);
    }
    if (index < created.length - 1) {
      ensureEdge(data, childNode.id, created[index + 1].id, "sequence");
    }
  });

  if (draft.replaceOriginal) {
    rewireEdgesForReplacement(data, node.id, created[0].id, created[created.length - 1].id);
    archiveNode(data, node.id);
  }
}

function applyMergeNodes(data, sourceNodes, draft = {}) {
  const mergedNode = ensureNode(data, {
    title: draft.title,
    summary: draft.summary || sourceNodes.map((node) => node.summary).join(" "),
    domain: draft.domain || sourceNodes[0].domain,
    scope: sourceNodes[0].scope,
    ownerUserId: sourceNodes[0].ownerUserId,
    materials: sourceNodes.flatMap((node) => node.materials || []),
    prerequisiteIds: sourceNodes.flatMap((node) => node.prerequisiteIds || []),
  });

  sourceNodes.forEach((node) => {
    rewireEdgesForReplacement(data, node.id, mergedNode.id, mergedNode.id);
    archiveNode(data, node.id);
  });
}

function createProposal(data, payload) {
  const proposal = {
    id: createId("proposal"),
    nodeId: payload.nodeId,
    actionType: payload.actionType,
    proposerUserId: payload.proposerUserId,
    status: "open",
    draft: payload.draft || {},
    votes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.proposals.push(proposal);
  return proposal;
}

function applyProposal(data, proposal) {
  const node = getNodeById(data, proposal.nodeId);
  if (!node) {
    throw new Error("Node not found for proposal.");
  }

  if (proposal.actionType === "edit") {
    applyNodeEdit(node, proposal.draft);
    return;
  }

  if (proposal.actionType === "delete") {
    archiveNode(data, node.id);
    return;
  }

  if (proposal.actionType === "split") {
    applySplitNode(data, node, proposal.draft);
    return;
  }

  if (proposal.actionType === "merge") {
    const sourceIds = dedupe([node.id, ...(proposal.draft.sourceNodeIds || [])]);
    const sourceNodes = sourceIds.map((id) => getNodeById(data, id)).filter(Boolean);
    applyMergeNodes(data, sourceNodes, proposal.draft);
  }
}

function evaluateProposal(data, proposal) {
  const eligibleVoterIds = getEligibleVoterIds(data, proposal);
  const approveCount = proposal.votes.filter((vote) => vote.decision === "approve").length;
  const rejectCount = proposal.votes.filter((vote) => vote.decision === "reject").length;
  const majority = Math.floor(eligibleVoterIds.length / 2) + 1;

  if (approveCount >= majority) {
    applyProposal(data, proposal);
    proposal.status = "approved";
    proposal.updatedAt = new Date().toISOString();
    return;
  }

  if (rejectCount >= majority) {
    proposal.status = "rejected";
    proposal.updatedAt = new Date().toISOString();
  }
}

function parseMaterials(materials) {
  if (!Array.isArray(materials)) {
    return [];
  }

  return materials
    .map((item) => ({
      name: String(item.name || "").trim(),
      purpose: String(item.purpose || "").trim(),
      merchant: String(item.merchant || "").trim(),
      link: String(item.link || "").trim(),
    }))
    .filter((item) => item.name);
}

function isValidDateTime(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validateLightUpEventContract(payload = {}) {
  const errors = [];

  if (String(payload.version || "") !== "1.0") {
    errors.push("version must be exactly '1.0'.");
  }

  if (!String(payload.source || "").trim()) {
    errors.push("source is required.");
  }

  if (!String(payload.externalEventId || "").trim()) {
    errors.push("externalEventId is required for integration imports.");
  }

  if (!String(payload.displayName || "").trim()) {
    errors.push("displayName is required.");
  }

  if (!String(payload.nodeTitle || "").trim()) {
    errors.push("nodeTitle is required.");
  }

  if (!String(payload.summary || "").trim()) {
    errors.push("summary is required.");
  }

  if (payload.nodeScope && !["personal", "collective"].includes(payload.nodeScope)) {
    errors.push("nodeScope must be either 'personal' or 'collective'.");
  }

  if (payload.proofType && !["self-claim", "observed", "artifact-backed", "peer-backed"].includes(payload.proofType)) {
    errors.push("proofType must be one of self-claim, observed, artifact-backed, peer-backed.");
  }

  if (payload.startedAt && !isValidDateTime(payload.startedAt)) {
    errors.push("startedAt must be a valid ISO 8601 datetime.");
  }

  if (payload.endedAt && !isValidDateTime(payload.endedAt)) {
    errors.push("endedAt must be a valid ISO 8601 datetime.");
  }

  if (payload.startedAt && payload.endedAt && Date.parse(payload.startedAt) > Date.parse(payload.endedAt)) {
    errors.push("startedAt cannot be later than endedAt.");
  }

  if (payload.sequenceTitles && !Array.isArray(payload.sequenceTitles)) {
    errors.push("sequenceTitles must be an array of strings.");
  }

  if (Array.isArray(payload.sequenceTitles) && payload.sequenceTitles.some((item) => !String(item || "").trim())) {
    errors.push("sequenceTitles cannot contain empty values.");
  }

  if (payload.materials && !Array.isArray(payload.materials)) {
    errors.push("materials must be an array.");
  }

  if (Array.isArray(payload.materials)) {
    payload.materials.forEach((item, index) => {
      if (!item || !String(item.name || "").trim()) {
        errors.push(`materials[${index}].name is required.`);
      }
    });
  }

  return errors;
}

function ensureNode(data, payload = {}) {
  const title = String(payload.title || "").trim();
  if (!title) {
    return null;
  }

  const scope = payload.scope === "personal" ? "personal" : "collective";
  const ownerUserId = scope === "personal" ? payload.ownerUserId || null : null;
  const normalizedTitle = normalizeText(title);
  let node = getActiveNodes(data).find((item) => {
    if (normalizeText(item.title) !== normalizedTitle) {
      return false;
    }

    if (item.scope !== scope) {
      return false;
    }

    if (scope === "personal") {
      return item.ownerUserId === ownerUserId;
    }

    return true;
  });

  if (!node) {
    node = {
      id: createId("node"),
      title,
      domain: String(payload.domain || "general").trim(),
      summary: String(payload.summary || "待补充节点说明。").trim(),
        scope,
        ownerUserId,
        prerequisiteIds: dedupe(payload.prerequisiteIds || []),
        materials: mergeMaterials([], payload.materials || []),
        archivedAt: null,
      };
    data.nodes.push(node);
    return node;
  }

  if (!node.summary && payload.summary) {
    node.summary = String(payload.summary).trim();
  }

  if ((!node.domain || node.domain === "general") && payload.domain) {
    node.domain = String(payload.domain).trim();
  }

  node.prerequisiteIds = dedupe([...(node.prerequisiteIds || []), ...(payload.prerequisiteIds || [])]);
  node.materials = mergeMaterials(node.materials, payload.materials || []);
  return node;
}

function upsertUser(data, payload = {}) {
  const displayName = String(payload.displayName || "").trim();
  const role = String(payload.role || "共建成员").trim();
  const proofType = String(payload.proofType || "self-claim").trim();

  let user = data.users.find((item) => normalizeText(item.displayName) === normalizeText(displayName));

  if (!user) {
    user = {
      id: createId("user"),
      displayName,
      role,
      verification: proofType,
      proofs: getVerificationRank(proofType) > 0 ? 1 : 0,
      joinedAt: new Date().toISOString(),
    };
    data.users.push(user);
    return user;
  }

  if (role && user.role !== role) {
    user.role = role;
  }

  if (getVerificationRank(proofType) > getVerificationRank(user.verification)) {
    user.verification = proofType;
  }

  if (getVerificationRank(proofType) > 0) {
    user.proofs += 1;
  }

  return user;
}

function ensureEdge(data, sourceId, targetId, type = "sequence") {
  if (!sourceId || !targetId || sourceId === targetId) {
    return;
  }

  const existingEdge = data.edges.find(
    (edge) => edge.sourceId === sourceId && edge.targetId === targetId && edge.type === type
  );

  if (existingEdge) {
    existingEdge.strength = (existingEdge.strength || 1) + 1;
    return;
  }

  data.edges.push({
    id: createId("edge"),
    sourceId,
    targetId,
    type,
    strength: 1,
  });
}

function getNodeTouchCount(illuminations, nodeId) {
  return illuminations.filter(
    (item) => item.nodeId === nodeId || (item.sequence || []).includes(nodeId)
  ).length;
}

function buildPartnerMatches(data, nodeLookup) {
  const userNodeSets = new Map();
  const illuminationByUser = new Map();

  data.users.forEach((user) => {
    userNodeSets.set(user.id, new Set());
    illuminationByUser.set(user.id, []);
  });

  data.illuminations.forEach((illumination) => {
    const set = userNodeSets.get(illumination.userId) || new Set();
    (illumination.sequence || [illumination.nodeId]).forEach((nodeId) => set.add(nodeId));
    userNodeSets.set(illumination.userId, set);

    const records = illuminationByUser.get(illumination.userId) || [];
    records.push(illumination);
    illuminationByUser.set(illumination.userId, records);
  });

  const matches = [];
  for (let index = 0; index < data.users.length; index += 1) {
    for (let offset = index + 1; offset < data.users.length; offset += 1) {
      const leftUser = data.users[index];
      const rightUser = data.users[offset];
      const leftSet = userNodeSets.get(leftUser.id) || new Set();
      const rightSet = userNodeSets.get(rightUser.id) || new Set();

      const sharedNodes = [...leftSet].filter((nodeId) => rightSet.has(nodeId));
      const adjacentNodes = data.edges.filter(
        (edge) =>
          (leftSet.has(edge.sourceId) && rightSet.has(edge.targetId)) ||
          (rightSet.has(edge.sourceId) && leftSet.has(edge.targetId))
      );

      const score = sharedNodes.length * 2 + adjacentNodes.length;
      if (score === 0) {
        continue;
      }

      matches.push({
        pairId: `${leftUser.id}-${rightUser.id}`,
        leftUser: leftUser.displayName,
        rightUser: rightUser.displayName,
        score,
        sharedNodes: sharedNodes.map((nodeId) => nodeLookup.get(nodeId)?.title).filter(Boolean),
        bridgeNodes: adjacentNodes
          .map((edge) => nodeLookup.get(edge.targetId)?.title || nodeLookup.get(edge.sourceId)?.title)
          .filter(Boolean),
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 6);
}

function buildRecommendationsForUser(data, nodeLookup, user) {
  const userIlluminations = data.illuminations
    .filter((item) => item.userId === user.id)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  const touchedNodes = new Set();
  userIlluminations.forEach((item) => {
    (item.sequence || [item.nodeId]).forEach((nodeId) => touchedNodes.add(nodeId));
  });

  const lastSequence = userIlluminations[0]?.sequence || [];
  const lastNodeId = lastSequence[lastSequence.length - 1] || userIlluminations[0]?.nodeId;

  const candidateScores = getActiveNodes(data)
    .filter((node) => !touchedNodes.has(node.id))
    .map((node) => {
      const prerequisiteReady = (node.prerequisiteIds || []).every((nodeId) => touchedNodes.has(nodeId));
      const directEdge = data.edges.find(
        (edge) => edge.sourceId === lastNodeId && edge.targetId === node.id
      );
      const helpfulScore = data.votes.filter((vote) => vote.nodeId === node.id).length;
      const illuminationCount = getNodeTouchCount(data.illuminations, node.id);
      const score =
        (prerequisiteReady ? 4 : 0) +
        (directEdge ? (directEdge.strength || 1) + 2 : 0) +
        helpfulScore +
        illuminationCount * 0.5;

      return {
        id: node.id,
        title: node.title,
        reason: prerequisiteReady
          ? "你已经满足前置条件，可以直接往上爬。"
          : "这条路被社区频繁走到，值得提前关注。",
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  return {
    userName: user.displayName,
    currentAnchor: nodeLookup.get(lastNodeId)?.title || "从第一步点亮开始",
    nextNodes: candidateScores,
  };
}

function buildSnapshot(data) {
  const nodeLookup = new Map(data.nodes.map((node) => [node.id, node]));
  const voteCountByNode = new Map();

  data.votes.forEach((vote) => {
    voteCountByNode.set(vote.nodeId, (voteCountByNode.get(vote.nodeId) || 0) + 1);
  });

  const nodes = data.nodes
    .map((node) => {
      const outgoingEdges = data.edges.filter((edge) => edge.sourceId === node.id);
      const incomingEdges = data.edges.filter((edge) => edge.targetId === node.id);
      const illuminationCount = getNodeTouchCount(data.illuminations, node.id);

      return {
        ...node,
        helpfulVotes: voteCountByNode.get(node.id) || 0,
        illuminationCount,
        prerequisites: (node.prerequisiteIds || [])
          .map((nodeId) => nodeLookup.get(nodeId)?.title)
          .filter(Boolean),
        nextNodes: outgoingEdges
          .map((edge) => nodeLookup.get(edge.targetId)?.title)
          .filter(Boolean),
        discoveredFrom: incomingEdges
          .map((edge) => nodeLookup.get(edge.sourceId)?.title)
          .filter(Boolean),
      };
    })
    .sort((left, right) => {
      const leftScore = left.helpfulVotes * 2 + left.illuminationCount;
      const rightScore = right.helpfulVotes * 2 + right.illuminationCount;
      return rightScore - leftScore;
    });

  const feed = data.illuminations
    .map((illumination) => {
      const user = data.users.find((item) => item.id === illumination.userId);
      const node = nodeLookup.get(illumination.nodeId);
      return {
        ...illumination,
        userName: user?.displayName || "匿名成员",
        userRole: user?.role || "共建成员",
        nodeTitle: node?.title || "未命名节点",
        sequenceTitles: (illumination.sequence || [])
          .map((nodeId) => nodeLookup.get(nodeId)?.title)
          .filter(Boolean),
      };
    })
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  const pathRegistry = new Map();
  feed.forEach((item) => {
    const key = item.sequenceTitles.join(" -> ");
    if (!key) {
      return;
    }

    if (!pathRegistry.has(key)) {
      pathRegistry.set(key, {
        id: createId("path"),
        titles: item.sequenceTitles,
        count: 0,
        latestAt: item.createdAt,
      });
    }

    const record = pathRegistry.get(key);
    record.count += 1;
    if (new Date(item.createdAt) > new Date(record.latestAt)) {
      record.latestAt = item.createdAt;
    }
  });

  const trustUsers = data.users
    .map((user) => {
      const lightUps = data.illuminations.filter((item) => item.userId === user.id).length;
      const trustScore = lightUps * 2 + user.proofs + getVerificationRank(user.verification) * 2;
      return {
        ...user,
        lightUps,
        trustScore,
      };
    })
    .sort((left, right) => right.trustScore - left.trustScore);

  const partnerMatches = buildPartnerMatches(data, nodeLookup);
  const recommendations = trustUsers.map((user) => buildRecommendationsForUser(data, nodeLookup, user));

  const materials = nodes
    .filter((node) => (node.materials || []).length > 0)
    .map((node) => ({
      nodeId: node.id,
      nodeTitle: node.title,
      materials: node.materials,
    }));

  return {
    meta: {
      name: "Dragon Palace Knowledge Hub",
      updatedAt: data.updatedAt,
      loop: [
        "时间先投进自己真正想做的事。",
        "做成一次可复现行为，就记成一次点亮。",
        "系统根据前后依赖和社区投票，推荐下一步该爬的节点。",
      ],
    },
    stats: {
      totalNodes: data.nodes.length,
      totalIlluminations: data.illuminations.length,
      verifiedPeople: trustUsers.filter((user) => getVerificationRank(user.verification) > 0).length,
      activePaths: pathRegistry.size,
      materialLinks: materials.reduce((count, item) => count + item.materials.length, 0),
    },
    nodes,
    feed,
    paths: [...pathRegistry.values()].sort((left, right) => right.count - left.count),
    partnerMatches,
    recommendations,
    trustUsers,
    materials,
    trustRules: [
      "点亮是纯用户行为，但默认要求留下姓名和最小证明信息。",
      "证明优先级从低到高是：自述、被观察到、带作品、同伴共签。",
      "系统只卖材料和工具，不卖知识本身。",
      "节点越常被真实用户点亮和投票，越应该被推荐给后来者。",
    ],
    integrationHooks: [
      "时间管理仓可把专注时段、项目记录、完成证据映射成点亮事件。",
      "节点材料可以挂带货链接，形成非知识收费的佣金模式。",
      "相邻节点上的共同行动者会被识别成天然伙伴，推动社交和协作。",
    ],
  };
}

function buildSnapshotV2(data) {
  const activeNodes = getActiveNodes(data);
  const nodeLookup = new Map(activeNodes.map((node) => [node.id, node]));
  const userLookup = new Map(data.users.map((user) => [user.id, user]));
  const proposalsSource = Array.isArray(data.proposals) ? data.proposals : [];
  const voteCountByNode = new Map();

  data.votes.forEach((vote) => {
    voteCountByNode.set(vote.nodeId, (voteCountByNode.get(vote.nodeId) || 0) + 1);
  });

  const nodes = activeNodes
    .map((node) => {
      const outgoingEdges = data.edges.filter(
        (edge) => edge.sourceId === node.id && nodeLookup.has(edge.targetId)
      );
      const incomingEdges = data.edges.filter(
        (edge) => edge.targetId === node.id && nodeLookup.has(edge.sourceId)
      );
      const illuminatorIds = getIlluminatorIds(data, node.id);
      return {
        ...node,
        ownerName: userLookup.get(node.ownerUserId)?.displayName || null,
        helpfulVotes: voteCountByNode.get(node.id) || 0,
        illuminationCount: getNodeTouchCount(data.illuminations, node.id),
        illuminatorCount: illuminatorIds.length,
        prerequisites: (node.prerequisiteIds || [])
          .map((nodeId) => nodeLookup.get(nodeId)?.title)
          .filter(Boolean),
        nextNodes: outgoingEdges
          .map((edge) => nodeLookup.get(edge.targetId)?.title)
          .filter(Boolean),
        discoveredFrom: incomingEdges
          .map((edge) => nodeLookup.get(edge.sourceId)?.title)
          .filter(Boolean),
        governance:
          node.scope === "personal"
            ? `Personal node owned by ${userLookup.get(node.ownerUserId)?.displayName || "unknown"}`
            : `Collective node governed by ${illuminatorIds.length} illuminators`,
        pendingProposalCount: proposalsSource.filter(
          (proposal) => proposal.nodeId === node.id && proposal.status === "open"
        ).length,
      };
    })
    .sort((left, right) => {
      const leftScore = left.helpfulVotes * 2 + left.illuminationCount;
      const rightScore = right.helpfulVotes * 2 + right.illuminationCount;
      return rightScore - leftScore;
    });

  const feed = data.illuminations
    .map((illumination) => ({
      ...illumination,
      userName: userLookup.get(illumination.userId)?.displayName || "Unknown member",
      userRole: userLookup.get(illumination.userId)?.role || "Member",
      nodeTitle: nodeLookup.get(illumination.nodeId)?.title || "Archived node",
      sequenceTitles: (illumination.sequence || [])
        .map((nodeId) => nodeLookup.get(nodeId)?.title)
        .filter(Boolean),
    }))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  const pathRegistry = new Map();
  feed.forEach((item) => {
    const key = item.sequenceTitles.join(" -> ");
    if (!key) {
      return;
    }

    if (!pathRegistry.has(key)) {
      pathRegistry.set(key, {
        id: createId("path"),
        titles: item.sequenceTitles,
        count: 0,
        latestAt: item.createdAt,
      });
    }

    const record = pathRegistry.get(key);
    record.count += 1;
    if (new Date(item.createdAt) > new Date(record.latestAt)) {
      record.latestAt = item.createdAt;
    }
  });

  const trustUsers = data.users
    .map((user) => {
      const lightUps = data.illuminations.filter((item) => item.userId === user.id).length;
      return {
        ...user,
        lightUps,
        trustScore: lightUps * 2 + user.proofs + getVerificationRank(user.verification) * 2,
      };
    })
    .sort((left, right) => right.trustScore - left.trustScore);

  const proposals = proposalsSource
    .map((proposal) => ({
      ...proposal,
      nodeTitle: nodeLookup.get(proposal.nodeId)?.title || "Archived node",
      proposerName: userLookup.get(proposal.proposerUserId)?.displayName || "Unknown member",
      approveCount: proposal.votes.filter((vote) => vote.decision === "approve").length,
      rejectCount: proposal.votes.filter((vote) => vote.decision === "reject").length,
      eligibleVoterNames: getEligibleVoterIds(data, proposal)
        .map((userId) => userLookup.get(userId)?.displayName)
        .filter(Boolean),
    }))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  const materials = nodes
    .filter((node) => (node.materials || []).length > 0)
    .map((node) => ({
      nodeId: node.id,
      nodeTitle: node.title,
      materials: node.materials,
    }));

  return {
    meta: {
      name: "Dragon Palace Knowledge Hub",
      updatedAt: data.updatedAt,
      loop: [
        "Time first goes into what people actually want to do.",
        "Each real repetition becomes a light-up event, even for the same tutorial on different days.",
        "The platform turns those events into governed nodes, partner discovery, and next-step recommendations.",
      ],
    },
    stats: {
      totalNodes: nodes.length,
      personalNodes: nodes.filter((node) => node.scope === "personal").length,
      collectiveNodes: nodes.filter((node) => node.scope === "collective").length,
      totalIlluminations: data.illuminations.length,
      verifiedPeople: trustUsers.filter((user) => getVerificationRank(user.verification) > 0).length,
      activePaths: pathRegistry.size,
      materialLinks: materials.reduce((count, item) => count + item.materials.length, 0),
      openProposals: proposals.filter((proposal) => proposal.status === "open").length,
    },
    nodes,
    feed,
    paths: [...pathRegistry.values()].sort((left, right) => right.count - left.count),
    proposals,
    partnerMatches: buildPartnerMatches(data, nodeLookup),
    recommendations: trustUsers.map((user) => buildRecommendationsForUser(data, nodeLookup, user)),
    trustUsers,
    materials,
    trustRules: [
      "A light-up is an event, not a boolean badge. The same user can light the same tutorial again tomorrow.",
      "Personal nodes are owned by one person for direct CRUD.",
      "Collective nodes are changed by illuminator voting, including edits, splits, merges, and deletion.",
      "Knowledge stays free. Materials and tools can carry affiliate links.",
    ],
    integrationHooks: [
      "The time tracker sends events.",
      "This platform turns events into nodes, relationships, and governance.",
      "Votes from real illuminators keep collective nodes alive and correct.",
    ],
  };
}

app.get("/api/hub", (_req, res) => {
  const data = readHub();
  res.json(buildSnapshotV2(data));
});

app.get("/api/contracts/light-up-event", (_req, res) => {
  res.json({
    name: "light-up-event",
    version: "1.0",
    schema: LIGHT_UP_EVENT_SCHEMA,
    example: LIGHT_UP_EVENT_EXAMPLE,
    idempotency: "source + externalEventId",
    semantics: [
      "A light-up is an event, not a permanent badge.",
      "The same user may light the same tutorial again on another day.",
      "The integration layer should dedupe only repeated imports of the same upstream event."
    ]
  });
});

app.post("/api/illuminations", (req, res) => {
  const displayName = String(req.body.displayName || "").trim();
  const nodeTitle = String(req.body.nodeTitle || "").trim();
  const summary = String(req.body.summary || "").trim();

  if (!displayName || !nodeTitle || !summary) {
    res.status(400).json({ error: "displayName, nodeTitle, summary are required." });
    return;
  }

  const data = readHub();
  const proofType = String(req.body.proofType || "self-claim").trim();
  const user = upsertUser(data, {
    displayName,
    role: req.body.role,
    proofType,
  });

  const externalEventId = String(req.body.externalEventId || "").trim();
  const source = String(req.body.source || "manual").trim();
  if (externalEventId) {
    const existingEvent = data.illuminations.find(
      (illumination) =>
        illumination.externalEventId === externalEventId && normalizeText(illumination.source) === normalizeText(source)
    );
    if (existingEvent) {
      res.status(409).json({ error: "This external event has already been imported." });
      return;
    }
  }

  const primaryNode = ensureNode(data, {
    title: nodeTitle,
    summary: req.body.nodeSummary,
    domain: req.body.nodeDomain,
    scope: req.body.nodeScope || "collective",
    ownerUserId: req.body.nodeScope === "personal" ? user.id : null,
    materials: parseMaterials(req.body.materials),
  });

  const sequenceTitles = Array.isArray(req.body.sequenceTitles) ? req.body.sequenceTitles : [];
  const sequenceNodes = sequenceTitles
    .map((title) =>
      ensureNode(data, {
        title,
        domain: req.body.nodeDomain,
        scope:
          normalizeText(title) === normalizeText(nodeTitle)
            ? req.body.nodeScope || "collective"
            : "collective",
        ownerUserId:
          normalizeText(title) === normalizeText(nodeTitle) && req.body.nodeScope === "personal"
            ? user.id
            : null,
      })
    )
    .filter(Boolean);

  if (!sequenceNodes.find((item) => item.id === primaryNode.id)) {
    sequenceNodes.push(primaryNode);
  }

  const sequenceIds = dedupe(sequenceNodes.map((item) => item.id));
  sequenceIds.forEach((nodeId, index) => {
    if (index < sequenceIds.length - 1) {
      ensureEdge(data, nodeId, sequenceIds[index + 1], "sequence");
    }
  });

  data.illuminations.push({
    id: createId("illumination"),
    externalEventId: externalEventId || null,
    source,
    userId: user.id,
    nodeId: primaryNode.id,
    summary,
    proofType,
    artifactNote: String(req.body.artifactNote || "").trim(),
    sequence: sequenceIds,
    startedAt: String(req.body.startedAt || "").trim() || null,
    endedAt: String(req.body.endedAt || "").trim() || null,
    createdAt: new Date().toISOString(),
  });

  writeHub(data);
  res.status(201).json(buildSnapshotV2(data));
});

app.post("/api/integrations/time-tracker", (req, res) => {
  req.body.source = req.body.source || "knowledge-habit-tracker";
  req.body.version = req.body.version || "1.0";

  const contractErrors = validateLightUpEventContract(req.body);
  if (contractErrors.length > 0) {
    res.status(400).json({
      error: "Payload does not match the light-up event contract.",
      details: contractErrors,
      contract: "/api/contracts/light-up-event"
    });
    return;
  }

  const displayName = String(req.body.displayName || "").trim();
  const nodeTitle = String(req.body.nodeTitle || "").trim();
  const summary = String(req.body.summary || "").trim();

  if (!displayName || !nodeTitle || !summary) {
    res.status(400).json({ error: "displayName, nodeTitle, summary are required." });
    return;
  }

  const data = readHub();
  const user = upsertUser(data, {
    displayName,
    role: req.body.role,
    proofType: req.body.proofType,
  });

  const externalEventId = String(req.body.externalEventId || "").trim();
  const source = String(req.body.source || "knowledge-habit-tracker").trim();
  if (externalEventId) {
    const existingEvent = data.illuminations.find(
      (illumination) =>
        illumination.externalEventId === externalEventId && normalizeText(illumination.source) === normalizeText(source)
    );
    if (existingEvent) {
      res.status(409).json({ error: "This external event has already been imported." });
      return;
    }
  }

  const primaryNode = ensureNode(data, {
    title: nodeTitle,
    summary: req.body.nodeSummary,
    domain: req.body.nodeDomain,
    scope: req.body.nodeScope || "collective",
    ownerUserId: req.body.nodeScope === "personal" ? user.id : null,
    materials: parseMaterials(req.body.materials),
  });

  const sequenceTitles = Array.isArray(req.body.sequenceTitles) ? req.body.sequenceTitles : [];
  const sequenceIds = dedupe(
    sequenceTitles
      .map((title) =>
        ensureNode(data, {
          title,
          scope: normalizeText(title) === normalizeText(nodeTitle) ? req.body.nodeScope || "collective" : "collective",
          ownerUserId:
            normalizeText(title) === normalizeText(nodeTitle) && req.body.nodeScope === "personal"
              ? user.id
              : null,
        })?.id
      )
      .concat(primaryNode.id)
  );

  sequenceIds.forEach((nodeId, index) => {
    if (index < sequenceIds.length - 1) {
      ensureEdge(data, nodeId, sequenceIds[index + 1], "sequence");
    }
  });

  data.illuminations.push({
    id: createId("illumination"),
    externalEventId: externalEventId || null,
    source,
    userId: user.id,
    nodeId: primaryNode.id,
    summary,
    proofType: String(req.body.proofType || "self-claim").trim(),
    artifactNote: String(req.body.artifactNote || "").trim(),
    sequence: sequenceIds,
    startedAt: String(req.body.startedAt || "").trim() || null,
    endedAt: String(req.body.endedAt || "").trim() || null,
    createdAt: new Date().toISOString(),
  });

  writeHub(data);
  res.status(201).json(buildSnapshotV2(data));
});

app.post("/api/nodes/:id/update", (req, res) => {
  const requesterName = String(req.body.requesterDisplayName || "").trim();
  if (!requesterName) {
    res.status(400).json({ error: "requesterDisplayName is required." });
    return;
  }

  const data = readHub();
  const node = getNodeById(data, req.params.id);
  if (!node || node.archivedAt) {
    res.status(404).json({ error: "Node not found." });
    return;
  }

  const user = upsertUser(data, { displayName: requesterName, role: req.body.requesterRole });
  const draft = {
    title: req.body.title,
    summary: req.body.summary,
    domain: req.body.domain,
    materials: parseMaterials(req.body.materials),
  };

  if (isNodeOwner(node, user.id)) {
    applyNodeEdit(node, draft);
    writeHub(data);
    res.json({ mode: "applied", snapshot: buildSnapshotV2(data) });
    return;
  }

  if (node.scope !== "collective") {
    res.status(403).json({ error: "Only the owner can update this personal node." });
    return;
  }

  const illuminatorIds = getIlluminatorIds(data, node.id);
  if (illuminatorIds.length > 0 && !illuminatorIds.includes(user.id)) {
    res.status(403).json({ error: "Only illuminators of this collective node can propose changes." });
    return;
  }

  const proposal = createProposal(data, {
    nodeId: node.id,
    actionType: "edit",
    proposerUserId: user.id,
    draft,
  });
  proposal.votes.push({ userId: user.id, decision: "approve", createdAt: new Date().toISOString() });
  evaluateProposal(data, proposal);
  writeHub(data);
  res.status(201).json({ mode: "proposal", proposalId: proposal.id, snapshot: buildSnapshotV2(data) });
});

app.post("/api/nodes/:id/delete", (req, res) => {
  const requesterName = String(req.body.requesterDisplayName || "").trim();
  if (!requesterName) {
    res.status(400).json({ error: "requesterDisplayName is required." });
    return;
  }

  const data = readHub();
  const node = getNodeById(data, req.params.id);
  if (!node || node.archivedAt) {
    res.status(404).json({ error: "Node not found." });
    return;
  }

  const user = upsertUser(data, { displayName: requesterName });
  if (isNodeOwner(node, user.id)) {
    archiveNode(data, node.id);
    writeHub(data);
    res.json({ mode: "applied", snapshot: buildSnapshotV2(data) });
    return;
  }

  if (node.scope !== "collective") {
    res.status(403).json({ error: "Only the owner can delete this personal node." });
    return;
  }

  const illuminatorIds = getIlluminatorIds(data, node.id);
  if (illuminatorIds.length > 0 && !illuminatorIds.includes(user.id)) {
    res.status(403).json({ error: "Only illuminators of this collective node can propose deletion." });
    return;
  }

  const proposal = createProposal(data, {
    nodeId: node.id,
    actionType: "delete",
    proposerUserId: user.id,
    draft: {},
  });
  proposal.votes.push({ userId: user.id, decision: "approve", createdAt: new Date().toISOString() });
  evaluateProposal(data, proposal);
  writeHub(data);
  res.status(201).json({ mode: "proposal", proposalId: proposal.id, snapshot: buildSnapshotV2(data) });
});

app.post("/api/nodes/:id/split", (req, res) => {
  const requesterName = String(req.body.requesterDisplayName || "").trim();
  const childNodes = Array.isArray(req.body.childNodes) ? req.body.childNodes : [];
  if (!requesterName || childNodes.length < 2) {
    res.status(400).json({ error: "requesterDisplayName and at least two childNodes are required." });
    return;
  }

  const data = readHub();
  const node = getNodeById(data, req.params.id);
  if (!node || node.archivedAt) {
    res.status(404).json({ error: "Node not found." });
    return;
  }

  const user = upsertUser(data, { displayName: requesterName });
  const draft = { childNodes, replaceOriginal: Boolean(req.body.replaceOriginal) };

  if (isNodeOwner(node, user.id)) {
    applySplitNode(data, node, draft);
    writeHub(data);
    res.json({ mode: "applied", snapshot: buildSnapshotV2(data) });
    return;
  }

  if (node.scope !== "collective") {
    res.status(403).json({ error: "Only the owner can split this personal node." });
    return;
  }

  const illuminatorIds = getIlluminatorIds(data, node.id);
  if (illuminatorIds.length > 0 && !illuminatorIds.includes(user.id)) {
    res.status(403).json({ error: "Only illuminators of this collective node can propose a split." });
    return;
  }

  const proposal = createProposal(data, {
    nodeId: node.id,
    actionType: "split",
    proposerUserId: user.id,
    draft,
  });
  proposal.votes.push({ userId: user.id, decision: "approve", createdAt: new Date().toISOString() });
  evaluateProposal(data, proposal);
  writeHub(data);
  res.status(201).json({ mode: "proposal", proposalId: proposal.id, snapshot: buildSnapshotV2(data) });
});

app.post("/api/nodes/merge", (req, res) => {
  const requesterName = String(req.body.requesterDisplayName || "").trim();
  const sourceNodeIds = dedupe(req.body.sourceNodeIds || []);
  if (!requesterName || sourceNodeIds.length < 2) {
    res.status(400).json({ error: "requesterDisplayName and at least two sourceNodeIds are required." });
    return;
  }

  const data = readHub();
  const sourceNodes = sourceNodeIds.map((nodeId) => getNodeById(data, nodeId)).filter(Boolean);
  if (sourceNodes.length < 2 || sourceNodes.some((node) => node.archivedAt)) {
    res.status(404).json({ error: "Merge nodes not found." });
    return;
  }

  const scopes = dedupe(sourceNodes.map((node) => node.scope));
  if (scopes.length > 1) {
    res.status(400).json({ error: "Cannot merge personal and collective nodes together." });
    return;
  }

  const user = upsertUser(data, { displayName: requesterName });
  const draft = {
    title: req.body.title,
    summary: req.body.summary,
    domain: req.body.domain,
    sourceNodeIds,
  };

  if (sourceNodes[0].scope === "personal") {
    if (!sourceNodes.every((node) => node.ownerUserId === user.id)) {
      res.status(403).json({ error: "You can only merge personal nodes that you own." });
      return;
    }

    applyMergeNodes(data, sourceNodes, draft);
    writeHub(data);
    res.json({ mode: "applied", snapshot: buildSnapshotV2(data) });
    return;
  }

  if (
    !sourceNodes.every((node) => {
      const illuminatorIds = getIlluminatorIds(data, node.id);
      return illuminatorIds.length === 0 || illuminatorIds.includes(user.id);
    })
  ) {
    res.status(403).json({ error: "Only illuminators can propose collective merges." });
    return;
  }

  const proposal = createProposal(data, {
    nodeId: sourceNodes[0].id,
    actionType: "merge",
    proposerUserId: user.id,
    draft,
  });
  proposal.votes.push({ userId: user.id, decision: "approve", createdAt: new Date().toISOString() });
  evaluateProposal(data, proposal);
  writeHub(data);
  res.status(201).json({ mode: "proposal", proposalId: proposal.id, snapshot: buildSnapshotV2(data) });
});

app.post("/api/proposals/:id/votes", (req, res) => {
  const voterName = String(req.body.voterName || "").trim();
  const decision = req.body.decision === "reject" ? "reject" : "approve";
  if (!voterName) {
    res.status(400).json({ error: "voterName is required." });
    return;
  }

  const data = readHub();
  const proposal = data.proposals.find((item) => item.id === req.params.id);
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found." });
    return;
  }

  if (proposal.status !== "open") {
    res.status(400).json({ error: "Proposal is already closed." });
    return;
  }

  const user = upsertUser(data, { displayName: voterName });
  const eligibleVoterIds = getEligibleVoterIds(data, proposal);
  if (!eligibleVoterIds.includes(user.id)) {
    res.status(403).json({ error: "Only illuminators of this collective node can vote on this proposal." });
    return;
  }

  proposal.votes = proposal.votes.filter((vote) => vote.userId !== user.id);
  proposal.votes.push({ userId: user.id, decision, createdAt: new Date().toISOString() });
  proposal.updatedAt = new Date().toISOString();
  evaluateProposal(data, proposal);
  writeHub(data);
  res.json(buildSnapshotV2(data));
});

app.post("/api/votes", (req, res) => {
  const voterName = String(req.body.voterName || "").trim();
  const nodeId = String(req.body.nodeId || "").trim();

  if (!voterName || !nodeId) {
    res.status(400).json({ error: "voterName and nodeId are required." });
    return;
  }

  const data = readHub();
  const nodeExists = getActiveNodes(data).some((node) => node.id === nodeId);
  if (!nodeExists) {
    res.status(404).json({ error: "Node not found." });
    return;
  }

  const existingVote = data.votes.find(
    (vote) =>
      vote.nodeId === nodeId && normalizeText(vote.voterName) === normalizeText(voterName)
  );

  if (!existingVote) {
    data.votes.push({
      id: createId("vote"),
      nodeId,
      voterName,
      createdAt: new Date().toISOString(),
    });
    writeHub(data);
  }

  res.json(buildSnapshotV2(data));
});

app.post("/api/reset", (_req, res) => {
  const freshData = buildFreshHub();
  writeHub(freshData);
  res.json(buildSnapshotV2(freshData));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

ensureHubFile();

app.listen(PORT, () => {
  console.log(`Dragon Palace Knowledge Hub running on http://localhost:${PORT}`);
});
