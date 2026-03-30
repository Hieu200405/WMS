import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: {
        filename: string;
        content: Buffer | string;
    }[];
}

/**
 * PRODUCTION-READY Email Service
 * Uses Nodemailer. If SMTP config is missing, it falls back to Simulation mode.
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
    // Check if real email is configured (Requires SMTP settings in env)
    const isConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    if (!isConfigured) {
        // SIMULATION MODE
        logger.info(`[EMAIL SIMULATION] Sending email to: ${options.to}`);
        logger.info(`[EMAIL SIMULATION] Subject: ${options.subject}`);

        await new Promise(resolve => setTimeout(resolve, 500));

        if (options.attachments && options.attachments.length > 0) {
            options.attachments.forEach(att => {
                logger.info(`[EMAIL SIMULATION] Attached file: ${att.filename} (${att.content.length} bytes)`);
            });
        }
        logger.info(`[EMAIL SIMULATION] Email SENT successfully (Simulated)`);
        return true;
    }

    // REAL EMAIL MODE
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'WMS System'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
            ...options
        });

        logger.info(`[EMAIL REAL] Email sent: ${info.messageId}`);
        return true;
    } catch (error) {
        logger.error(`[EMAIL REAL] Error sending email:`, error);
        return false;
    }
};

/**
 * Specifically for sending invoices
 */
export const sendInvoiceEmail = async (customerEmail: string, orderCode: string, pdfBuffer: Buffer) => {
    if (!customerEmail) {
        logger.warn(`No email address for customer on order ${orderCode}, skipping email.`);
        return;
    }

    await sendEmail({
        to: customerEmail,
        subject: `Hóa đơn mua hàng #${orderCode} - WMS System`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: auto;">
                <h2 style="color: #6366f1;">Cảm ơn bạn đã mua hàng!</h2>
                <p>Chào bạn,</p>
                <p>Chúng tôi gửi kèm hóa đơn cho đơn hàng <b>${orderCode}</b> đã được giao thành công.</p>
                <p>Mọi chi tiết về sản phẩm và bảo hành đã được đính kèm trong file PDF bên dưới.</p>
                <br/>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                     <p style="margin: 0; font-size: 14px; color: #475569;">Trạng thái đơn hàng: <b>Đã hoàn tất</b></p>
                </div>
                <br/>
                <hr style="border: 0; border-top: 1px solid #e2e8f0;"/>
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">Đây là email tự động từ hệ thống WMS. Vui lòng không phản hồi trực tiếp email này.</p>
            </div>
        `,
        attachments: [
            {
                filename: `Invoice_${orderCode}.pdf`,
                content: pdfBuffer
            }
        ]
    });
};
