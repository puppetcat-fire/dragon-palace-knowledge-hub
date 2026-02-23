// 龙宫知识共享库 - 贡献系统
class KnowledgeContributionSystem {
    constructor() {
        this.contributions = [];
        this.reviewQueue = [];
        this.knowledgeGraph = new Map();
    }

    // 知识贡献接口
    contributeKnowledge(contribution) {
        const contributionRecord = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            contributor: contribution.contributor || 'anonymous',
            type: contribution.type, // 'insight', 'correction', 'expansion', 'new_topic'
            content: contribution.content,
            references: contribution.references || [],
            status: 'pending_review',
            knowledgeNetwork: contribution.knowledgeNetwork || null
        };

        this.contributions.push(contributionRecord);
        this.addToReviewQueue(contributionRecord);
        
        // 触发蚌娘进行知识珍珠化处理
        this.triggerPearlProcessing(contributionRecord);
        
        return contributionRecord.id;
    }

    // 蚌娘知识珍珠化处理
    triggerPearlProcessing(contribution) {
        // 模拟蚌娘的智慧提炼过程
        const pearl = {
            original: contribution.content,
            refined: this.refineKnowledge(contribution.content),
            insights: this.extractInsights(contribution.content),
            connections: this.findKnowledgeConnections(contribution)
        };
        
        contribution.pearl = pearl;
        console.log('🐚 蚌娘已将知识转化为珍珠:', pearl.refined);
    }

    // 知识提炼
    refineKnowledge(content) {
        // 这里可以集成更复杂的NLP处理
        return content.trim().replace(/\s+/g, ' ');
    }

    // 提取洞察
    extractInsights(content) {
        // 基于内容提取关键洞察点
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        return sentences.slice(0, 3); // 返回前3个句子作为洞察
    }

    // 寻找知识连接
    findKnowledgeConnections(contribution) {
        // 利用现有的向量索引技术栈寻找相关知识
        const existingKnowledge = this.getAllKnowledge();
        const connections = [];
        
        // 这里可以集成混合搜索(BM25 + 向量搜索)
        existingKnowledge.forEach(knowledge => {
            if (this.calculateSimilarity(contribution.content, knowledge.content) > 0.7) {
                connections.push({
                    targetId: knowledge.id,
                    similarity: this.calculateSimilarity(contribution.content, knowledge.content),
                    relationship: 'related'
                });
            }
        });
        
        return connections;
    }

    // 审核队列管理
    addToReviewQueue(contribution) {
        this.reviewQueue.push(contribution);
        console.log('📝 新知识贡献已加入审核队列');
    }

    // 龟丞相审核流程
    reviewContribution(contributionId, decision) {
        const contribution = this.contributions.find(c => c.id === contributionId);
        if (!contribution) return false;

        if (decision === 'approved') {
            contribution.status = 'published';
            this.integrateIntoKnowledgeBase(contribution);
            console.log('🐢 龟丞相已批准知识贡献，已集成到知识库');
        } else if (decision === 'rejected') {
            contribution.status = 'rejected';
            console.log('🐢 龟丞相拒绝了知识贡献');
        } else if (decision === 'needs_revision') {
            contribution.status = 'needs_revision';
            console.log('🐢 龟丞相要求修订知识贡献');
        }

        // 从审核队列中移除
        this.reviewQueue = this.reviewQueue.filter(c => c.id !== contributionId);
        return true;
    }

    // 集成到知识库
    integrateIntoKnowledgeBase(contribution) {
        // 更新知识图谱
        this.updateKnowledgeGraph(contribution);
        
        // 通知蟹将更新向量索引
        this.notifyCrabGeneralToUpdateIndex(contribution);
    }

    // 更新知识图谱
    updateKnowledgeGraph(contribution) {
        this.knowledgeGraph.set(contribution.id, {
            content: contribution.content,
            pearl: contribution.pearl,
            connections: contribution.pearl.connections,
            timestamp: contribution.timestamp
        });
    }

    // 通知蟹将更新索引
    notifyCrabGeneralToUpdateIndex(contribution) {
        console.log('🦀 通知龙宫宝库蟹将更新向量索引...');
        // 这里可以调用蟹将的API或触发相应的索引更新任务
    }

    // 获取所有知识
    getAllKnowledge() {
        return this.contributions.filter(c => c.status === 'published');
    }

    // 相似度计算（简化版）
    calculateSimilarity(text1, text2) {
        // 简单的文本相似度计算，实际应用中可以使用向量嵌入
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }

    // 生成唯一ID
    generateId() {
        return 'k' + Date.now() + Math.random().toString(36).substr(2, 9);
    }

    // 知识检索接口
    searchKnowledge(query) {
        const allKnowledge = this.getAllKnowledge();
        const results = allKnowledge
            .map(knowledge => ({
                ...knowledge,
                relevance: this.calculateSimilarity(query, knowledge.content)
            }))
            .filter(result => result.relevance > 0.3)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 10);

        return results;
    }
}

// 初始化知识贡献系统
const knowledgeHub = new KnowledgeContributionSystem();

// 全局访问点
window.knowledgeHub = knowledgeHub;

console.log('🐉 龙宫知识共享库贡献系统已初始化');