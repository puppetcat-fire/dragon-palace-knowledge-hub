const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 8082;

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// API 路由
app.use(express.json());

// 知识贡献API
app.post('/api/contribute', (req, res) => {
    const contribution = req.body;
    const timestamp = new Date().toISOString();
    
    // 保存贡献到本地存储
    const contributionsFile = path.join(__dirname, 'data', 'contributions.json');
    let contributions = [];
    
    try {
        if (fs.existsSync(contributionsFile)) {
            const data = fs.readFileSync(contributionsFile, 'utf8');
            contributions = JSON.parse(data);
        }
    } catch (error) {
        console.log('No existing contributions file, creating new one');
    }
    
    contributions.push({
        ...contribution,
        id: Date.now().toString(),
        timestamp: timestamp,
        status: 'pending_review'
    });
    
    fs.writeFileSync(contributionsFile, JSON.stringify(contributions, null, 2));
    res.json({ success: true, message: 'Contribution submitted successfully' });
});

// 获取知识库内容
app.get('/api/knowledge', (req, res) => {
    const knowledgeFile = path.join(__dirname, 'data', 'knowledge-base.json');
    try {
        if (fs.existsSync(knowledgeFile)) {
            const data = fs.readFileSync(knowledgeFile, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json({ knowledge: [] });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load knowledge base' });
    }
});

// 搜索API
app.get('/api/search', (req, res) => {
    const query = req.query.q;
    // 这里会调用现有的混合搜索技术栈
    // 暂时返回模拟结果
    res.json({
        results: [
            { id: '1', title: 'Knowledge Sharing Platform', content: 'Main platform for collaborative knowledge building', relevance: 0.95 },
            { id: '2', title: 'Dragon Palace Architecture', content: 'Multi-agent system architecture for knowledge management', relevance: 0.87 }
        ]
    });
});

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

app.listen(PORT, () => {
    console.log(`🐉 Dragon Palace Knowledge Hub running on http://localhost:${PORT}`);
    console.log('龙宫知识共享库已启动 - 访问 http://localhost:8082');
});