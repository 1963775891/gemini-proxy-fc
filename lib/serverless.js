// 阿里云函数计算或其他无服务器平台的兼容处理器
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let server;

export const handler = async (req, res, context) => {
    try {
        if (!server) {
            await app.prepare();
            server = createServer(async (req, res) => {
                try {
                    const parsedUrl = parse(req.url, true);
                    await handle(req, res, parsedUrl);
                } catch (err) {
                    console.error('Error occurred handling', req.url, err);
                    res.statusCode = 500;
                    res.end('internal server error');
                }
            });
        }

        return new Promise((resolve, reject) => {
            server.emit('request', req, res);
            res.on('finish', resolve);
            res.on('error', reject);
        });
    } catch (error) {
        console.error('Handler 错误:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: {
                    message: '函数执行错误',
                    type: 'server_error'
                }
            });
        }
        throw error;
    }
}; 