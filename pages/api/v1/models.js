import { SUPPORTED_MODELS } from '../../../lib/constants.js';

export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const models = SUPPORTED_MODELS.map(model => ({
        id: model,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'google'
    }));
    
    res.status(200).json({
        object: 'list',
        data: models
    });
} 