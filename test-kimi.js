// Kimi API 测试脚本
const fetch = require('node-fetch');

// 请在这里填写您的 Kimi API Key
const KIMI_API_KEY = 'sk-YWVsd3yPnEM5CXPV7c6rej17bbhRWfhCDm8IIrGqWdo8fiW1';

async function testKimiAPI() {
    console.log('🌙 开始测试 Kimi API...\n');
    
    try {
        console.log('📍 API 端点: https://api.moonshot.cn/v1/chat/completions');
        console.log('🔑 API Key: ' + KIMI_API_KEY.substring(0, 15) + '...\n');
        
        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${KIMI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'moonshot-v1-8k',
                messages: [
                    { role: 'user', content: '你好，请回复"连接成功"' }
                ],
                max_tokens: 50
            })
        });

        console.log('📡 HTTP 状态码:', response.status);
        console.log('📡 HTTP 状态:', response.statusText);
        console.log('');

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ 连接成功！\n');
            console.log('📊 返回数据:');
            console.log(JSON.stringify(data, null, 2));
            console.log('\n💬 AI 回复:', data.choices[0].message.content);
        } else {
            console.log('❌ 连接失败！\n');
            console.log('错误详情:');
            console.log(JSON.stringify(data, null, 2));
            
            if (data.error) {
                console.log('\n错误类型:', data.error.type);
                console.log('错误信息:', data.error.message);
            }
        }
        
    } catch (error) {
        console.log('❌ 发生错误！\n');
        console.log('错误类型:', error.name);
        console.log('错误信息:', error.message);
        
        if (error.code) {
            console.log('错误代码:', error.code);
        }
        
        console.log('\n可能的原因:');
        if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
            console.log('- 网络连接问题（可能需要特殊网络环境）');
        } else if (error.message.includes('getaddrinfo')) {
            console.log('- DNS 解析失败（无法访问 api.moonshot.cn）');
        } else if (error.message.includes('certificate')) {
            console.log('- SSL 证书问题');
        } else {
            console.log('- 未知错误，请检查网络和 API Key');
        }
    }
}

testKimiAPI();

