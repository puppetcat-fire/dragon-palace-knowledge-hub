// 龙宫知识共享库 API 接口
// 提供标准化的 RESTful API 供外部系统集成

class DragonPalaceAPI {
    constructor() {
        this.knowledgeBase = new Map();
        this.contributors = new Map();
        this.searchEngine = null;
    }

    // 知识贡献 API
    async contributeKnowledge(contribution) {
        const { 
            content, 
            contributor, 
            tags = [], 
            category = 'general',
            timestamp = Date.now()
        } = contribution;

        const knowledgeId = this.generateId();
        const knowledgeEntry = {
            id: knowledgeId,
            content,
            contributor,
            tags,
            category,
            timestamp,
            version: 1,
            status: 'active'
        };

        this.knowledgeBase.set(knowledgeId, knowledgeEntry);
        
        // 更新贡献者记录
        if (!this.contributors.has(contributor)) {
            this.contributors.set(contributor, {
                id: contributor,
                contributions: [],
                totalContributions: 0
            });
        }
        
        const contributorData = this.contributors.get(contributor);
        contributorData.contributions.push(knowledgeId);
        contributorData.totalContributions += 1;
        this.contributors.set(contributor, contributorData);

        // 触发向量索引更新
        await this.updateVectorIndex(knowledgeEntry);

        return { success: true, knowledgeId };
    }

    // 知识检索 API
    async searchKnowledge(query, options = {}) {
        const { 
            limit = 10, 
            categories = [], 
            contributors = [],
            timeRange = null
        } = options;

        if (this.searchEngine) {
            return await this.searchEngine.hybridSearch(
                query, 
                { limit, categories, contributors, timeRange }
            );
        }

        // 备用全文搜索
        return this.fallbackSearch(query, limit);
    }

    // 获取知识统计
    getKnowledgeStats() {
        return {
            totalKnowledge: this.knowledgeBase.size,
            totalContributors: this.contributors.size,
            categories: this.getCategoryDistribution(),
            recentActivity: this.getRecentActivity()
        };
    }

    // 知识版本管理
    async updateKnowledge(knowledgeId, newContent, contributor) {
        if (!this.knowledgeBase.has(knowledgeId)) {
            throw new Error('Knowledge not found');
        }

        const existing = this.knowledgeBase.get(knowledgeId);
        const updatedEntry = {
            ...existing,
            content: newContent,
            version: existing.version + 1,
            lastModified: Date.now(),
            lastModifier: contributor
        };

        this.knowledgeBase.set(knowledgeId, updatedEntry);
        await this.updateVectorIndex(updatedEntry);

        return { success: true, version: updatedEntry.version };
    }

    // 私有方法
    generateId() {
        return 'knowledge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async updateVectorIndex(entry) {
        // 集成现有的向量索引系统
        if (typeof window !== 'undefined' && window.VectorIndexBuilder) {
            await window.VectorIndexBuilder.indexDocument({
                id: entry.id,
                content: entry.content,
                metadata: {
                    contributor: entry.contributor,
                    category: entry.category,
                    tags: entry.tags,
                    timestamp: entry.timestamp
                }
            });
        }
    }

    getCategoryDistribution() {
        const distribution = new Map();
        for (const entry of this.knowledgeBase.values()) {
            const category = entry.category || 'uncategorized';
            distribution.set(category, (distribution.get(category) || 0) + 1);
        }
        return Object.fromEntries(distribution);
    }

    getRecentActivity() {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        let recentCount = 0;
        
        for (const entry of this.knowledgeBase.values()) {
            if (now - entry.timestamp < oneDay) {
                recentCount++;
            }
        }
        
        return recentCount;
    }

    fallbackSearch(query, limit) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        for (const entry of this.knowledgeBase.values()) {
            if (entry.content.toLowerCase().includes(queryLower)) {
                results.push(entry);
                if (results.length >= limit) break;
            }
        }
        
        return results.sort((a, b) => b.timestamp - a.timestamp);
    }
}

// 初始化全局API实例
if (typeof window !== 'undefined') {
    window.DragonPalaceAPI = new DragonPalaceAPI();
}

// 导出用于Node.js环境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DragonPalaceAPI;
}