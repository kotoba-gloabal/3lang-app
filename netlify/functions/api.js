const https = require('https');

exports.handler = async function(event, context) {
  // CORS（通信許可）の設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 事前確認（OPTIONS）リクエストへの返答
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // POST以外のリクエストは弾く
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const service = body.service;

    // ------------------------------------
    // ① Azure音声認識のトークン発行
    // ------------------------------------
    if (service === 'azure-token') {
      const region = process.env.AZURE_SPEECH_REGION;
      const key = process.env.AZURE_SPEECH_KEY;
      
      const token = await getAzureToken(region, key);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ token: token, region: region })
      };
    } 
    // ------------------------------------
    // ② Gemini AIへのアドバイス要求
    // ------------------------------------
    else if (service === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      const promptData = body.data;
      
      const geminiResponse = await callGemini(apiKey, promptData);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(geminiResponse)
      };
    } 
    else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown service' }) };
    }

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};

// ==========================================
// 補助関数：Azureと直接通信する
// ==========================================
function getAzureToken(region, key) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${region}.api.cognitive.microsoft.com`,
      path: '/sts/v1.0/issueToken',
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': 0
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Azure token failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

// ==========================================
// 補助関数：Gemini APIと直接通信する
// ==========================================
function callGemini(apiKey, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Gemini failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}