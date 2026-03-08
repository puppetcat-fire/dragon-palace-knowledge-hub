# Dragon Palace Knowledge Hub

围绕 `点亮事件` 构建的知识共建共享平台原型。

## 当前规则

- `点亮` 是事件，不是资格布尔值。
- 同一个用户可以在不同日期重复点亮同一个教程或节点。
- 节点分两种：
  - `personal`：个人节点，增删改查归所有者本人。
  - `collective`：集体节点，由点亮过该节点的人投票治理。
- 集体节点支持编辑、删除、拆分、合并提案。
- 知识不收费，节点可以挂材料和工具入口。

## 本地运行

```bash
npm install
npm start
```

打开 [http://localhost:8082](http://localhost:8082)。

## 主要接口

### `GET /api/hub`

返回平台快照，包括：

- 节点
- 点亮流
- 路径
- 治理提案
- 伙伴匹配
- 下一步推荐
- 材料入口

### `POST /api/illuminations`

手动提交一次点亮事件。

### `POST /api/integrations/time-tracker`

给时间记录仓使用的导入口。

这个入口会校验 `light-up event` 契约，并且：

- 只按 `source + externalEventId` 幂等
- 不按 `用户 + 教程` 去重

所以“今天做一次，明天再做一次”会被记录成两次点亮事件。

### `GET /api/contracts/light-up-event`

返回运行时契约：

- schema
- example
- 幂等规则
- 语义说明

### 节点治理接口

- `POST /api/nodes/:id/update`
- `POST /api/nodes/:id/delete`
- `POST /api/nodes/:id/split`
- `POST /api/nodes/merge`
- `POST /api/proposals/:id/votes`
- `POST /api/votes`

## 契约文件

- [light-up-event.schema.json](/Users/xiaob/Documents/dragon-palace-knowledge-hub/docs/light-up-event.schema.json)
- [light-up-event.example.json](/Users/xiaob/Documents/dragon-palace-knowledge-hub/docs/light-up-event.example.json)
- [time-tracker-contract.md](/Users/xiaob/Documents/dragon-palace-knowledge-hub/docs/time-tracker-contract.md)

## 推荐的事件格式

```json
{
  "version": "1.0",
  "source": "knowledge-habit-tracker",
  "externalEventId": "habit_2026-03-07_001",
  "displayName": "xiaob",
  "startedAt": "2026-03-07T10:00:00+08:00",
  "endedAt": "2026-03-07T11:10:00+08:00",
  "summary": "把一套流程录成了可复现教程",
  "nodeTitle": "录一段可复现的桌面教程",
  "nodeScope": "collective",
  "sequenceTitles": [
    "做完一件事后立刻记下原始步骤",
    "录一段可复现的桌面教程"
  ],
  "proofType": "artifact-backed"
}
```
