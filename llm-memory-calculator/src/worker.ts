/**
 * Cloudflare Worker 入口点
 * 处理所有 HTTP 请求并服务 React 应用
 */

export interface Env {
  NODE_ENV?: string;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      // 基本的健康检查端点
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          environment: env.NODE_ENV || 'development'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 临时响应，稍后会被完整的静态资源服务替换
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>LLM Memory Calculator - Worker</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>LLM Memory Calculator</h1>
            <p>Cloudflare Worker is running!</p>
            <p>Environment: ${env.NODE_ENV || 'development'}</p>
            <p>Request URL: ${url.pathname}</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};