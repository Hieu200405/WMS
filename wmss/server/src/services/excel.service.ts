import ExcelJS from 'exceljs';
import type { Response } from 'express';

export const exportToExcel = async (
    res: Response,
    fileName: string,
    columns: { header: string; key: string; width?: number }[],
    data: any[]
) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    worksheet.columns = columns;

    // Add rows
    worksheet.addRows(data);

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Set response headers
    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
        'Content-Disposition',
        `attachment; filename=${fileName}-${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
};
