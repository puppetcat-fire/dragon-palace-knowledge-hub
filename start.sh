#!/bin/bash
# 龙宫知识共享库启动脚本

cd "$(dirname "$0")"

# 设置权限
chmod +x *.sh

# 启动知识共享库服务器
echo "🚀 启动龙宫知识共享库..."
echo "🌐 访问地址: http://localhost:8082"
echo "📚 知识共建平台已就绪！"

node server.js