import type { Request, Response } from 'express';
import { env } from '../config/env.js';

export const uploadImage = (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }

    // Construct public URL
    // Assuming uploads are served at /uploads
    const filePath = req.file.filename;
    // We are now constructing fullUrl dynamically below, so this line is less critical but good to keep updated or remove.
    // const url = `${env.clientUrl.replace(':5173', ':4001')}/uploads/${filePath}`;
    // Note: ideally we should return a relative path or a full path based on server config.
    // The server is at port 4000. clientUrl is 5173. 
    // Let's just return a relative path or construct it properly.
    // Actually, better to return the full URL if possible, or just the relative path.
    // Let's return the full URL assuming standard setup.
    // We can also assume the server URL is available in env, or reconstruct it from request.

    const protocol = req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}/uploads/${filePath}`;

    res.status(201).json({
        url: fullUrl,
        filename: filePath,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
};
