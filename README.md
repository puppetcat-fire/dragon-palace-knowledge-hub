# Dragon Palace Knowledge Hub 🏯

A self-hosted, offline-first knowledge sharing and collaboration platform built on the OpenClaw multi-agent architecture.

## 🌟 Features

- **Multi-agent Architecture**: Coordinated knowledge management with specialized agents (Xiaolongxia, Turtle PM, Crab General, Pearl Mother)
- **Hybrid Search**: Combines BM25 full-text search with vector similarity search using local embedding models
- **Knowledge Contribution System**: Collaborative knowledge building with contribution workflows
- **Time-aware Knowledge Network**: Integrates temporal relationships between knowledge events ("Light-up" events)
- **Offline-First**: Pure local operation with no external dependencies or cloud services required
- **Privacy-Focused**: All data stays on your machine, no data exfiltration

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/dragon-palace-knowledge-hub.git
cd dragon-palace-knowledge-hub

# Install dependencies (if needed for advanced features)
npm install

# Start the knowledge hub
chmod +x start.sh
./start.sh

# Access in your browser
http://localhost:8082
```

## 🏗️ Architecture

### Agent Roles
- **🦞 Xiaolongxia (Main)**: Primary knowledge coordinator and user interaction
- **🐢 Turtle PM**: Knowledge repository management and monitoring (runs every 5 minutes via cron)
- **🦀 Crab General**: Execution layer for knowledge organization, storage, and vector index maintenance
- **🐚 Pearl Mother**: Chief knowledge guardian responsible for wisdom preservation and insight generation

### Technical Stack
- **Search**: Hybrid BM25 + Vector Search (HNSW index)
- **Embedding Model**: `embeddinggemma-300m-qat-Q8_0` (local 768-dimensional vectors)
- **Storage**: Local file system with JSON-based knowledge representation
- **API**: RESTful endpoints for integration with other tools

## 🔗 Integration

The knowledge hub integrates seamlessly with:
- **Time Management System**: Track knowledge activities over time
- **Habit Tracker**: Correlate learning habits with knowledge acquisition
- **OpenClaw Ecosystem**: Works as part of the broader OpenClaw multi-agent system

## 📄 Documentation

- [Architecture Overview](docs/architecture.md)
- [API Reference](docs/api.md)
- [Agent Configuration](docs/agents.md)
- [Search Implementation](docs/search.md)

## 🤝 Contributing

Contributions are welcome! Please see our [Contribution Guidelines](CONTRIBUTING.md).

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built on the [OpenClaw](https://github.com/openclaw/openclaw) framework.
Inspired by knowledge management principles and collaborative learning systems.