import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ensurePdfFonts } from '../utils/pdfFonts';

/**
 * Enhanced PDF Export with Company Header
 * Supports Receipt, Delivery, Stocktake, and custom reports
 */
export function PDFExport({
  title = 'Report',
  fileName = 'report.pdf',
  columns = [],
  rows = [],
  className = '',
  onBeforeExport,
  // Enhanced options
  documentType = 'report', // 'receipt', 'delivery', 'stocktake', 'report'
  documentNumber = '',
  documentDate = new Date(),
  companyInfo = {
    name: 'Hệ Thống Quản Lý Kho',
    address: '',
    phone: '',
    email: ''
  },
  partnerInfo = null, // { name, address, phone }
  metadata = {}, // Additional info like total, notes, etc.
  showSignature = false,
}) {
  const handleExport = async () => {
    try {
      if (onBeforeExport) {
        await onBeforeExport();
      }

      const doc = new jsPDF('p', 'pt', 'a4');
      await ensurePdfFonts(doc);
      const family = (typeof window !== 'undefined' && window.__pdfFontFamily) || 'Inter';
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 40;

      // ===== COMPANY HEADER =====
      doc.setFont(family, 'bold');
      doc.setFontSize(18);
      doc.text(companyInfo.name, pageWidth / 2, currentY, { align: 'center' });
      currentY += 20;

      if (companyInfo.address || companyInfo.phone || companyInfo.email) {
        doc.setFont(family, 'normal');
        doc.setFontSize(10);
        const headerInfo = [
          companyInfo.address,
          companyInfo.phone && `ĐT: ${companyInfo.phone}`,
          companyInfo.email && `Email: ${companyInfo.email}`
        ].filter(Boolean).join(' | ');

        doc.text(headerInfo, pageWidth / 2, currentY, { align: 'center' });
        currentY += 25;
      } else {
        currentY += 10;
      }

      // ===== DOCUMENT TITLE =====
      doc.setFont(family, 'bold');
      doc.setFontSize(16);
      doc.text(title, pageWidth / 2, currentY, { align: 'center' });
      currentY += 18;

      // Document number and date
      if (documentNumber) {
        doc.setFont(family, 'normal');
        doc.setFontSize(10);
        doc.text(`Số: ${documentNumber}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;
      }

      if (documentDate) {
        doc.setFontSize(10);
        const dateStr = new Date(documentDate).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        doc.text(`Ngày: ${dateStr}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 25;
      } else {
        currentY += 15;
      }

      // ===== PARTNER INFO (for Receipt/Delivery) =====
      if (partnerInfo) {
        doc.setFont(family, 'bold');
        doc.setFontSize(11);
        const partnerLabel = documentType === 'receipt' ? 'Nhà cung cấp:' : 'Khách hàng:';
        doc.text(partnerLabel, 40, currentY);

        doc.setFont(family, 'normal');
        doc.setFontSize(10);
        currentY += 15;
        doc.text(`Tên: ${partnerInfo.name}`, 50, currentY);
        currentY += 15;

        if (partnerInfo.address) {
          doc.text(`Địa chỉ: ${partnerInfo.address}`, 50, currentY);
          currentY += 15;
        }

        if (partnerInfo.phone) {
          doc.text(`Điện thoại: ${partnerInfo.phone}`, 50, currentY);
          currentY += 15;
        }

        currentY += 10;
      }

      // ===== METADATA (Status, Notes, etc.) =====
      if (Object.keys(metadata).length > 0) {
        doc.setFont(family, 'normal');
        doc.setFontSize(10);

        Object.entries(metadata).forEach(([key, value]) => {
          if (value) {
            doc.text(`${key}: ${value}`, 40, currentY);
            currentY += 15;
          }
        });

        currentY += 10;
      }

      // ===== TABLE =====
      const tableRows = rows.map((row) =>
        columns.map((column) => {
          const rawValue =
            column.export && typeof column.export === 'function'
              ? column.export(row?.[column.key], row)
              : row?.[column.key];
          if (rawValue == null) return '';
          if (typeof rawValue === 'number') return rawValue.toLocaleString('vi-VN');
          return String(rawValue);
        }),
      );

      autoTable(doc, {
        head: [columns.map((column) => column.header ?? column.key)],
        body: tableRows,
        startY: currentY,
        theme: 'grid',
        styles: {
          halign: 'left',
          valign: 'middle',
          fontSize: 10,
          font: family,
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          font: family,
          fontStyle: 'bold',
        },
        bodyStyles: {
          font: family,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 255],
        },
        // Add footer row for totals if needed
        foot: metadata.total ? [[
          { content: 'Tổng cộng', colSpan: columns.length - 1, styles: { fontStyle: 'bold' } },
          { content: metadata.total, styles: { fontStyle: 'bold' } }
        ]] : undefined,
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: 0,
          fontStyle: 'bold'
        }
      });

      // ===== SIGNATURE SECTION =====
      if (showSignature) {
        const finalY = doc.lastAutoTable.finalY + 40;
        const signatureY = finalY;

        doc.setFont(family, 'normal');
        doc.setFontSize(10);

        // Left signature
        doc.text('Người lập phiếu', 80, signatureY, { align: 'center' });
        doc.text('(Ký, họ tên)', 80, signatureY + 15, { align: 'center' });

        // Middle signature (if applicable)
        if (documentType === 'receipt' || documentType === 'delivery') {
          doc.text('Người giao/nhận', pageWidth / 2, signatureY, { align: 'center' });
          doc.text('(Ký, họ tên)', pageWidth / 2, signatureY + 15, { align: 'center' });
        }

        // Right signature
        const rightX = pageWidth - 80;
        doc.text('Thủ kho', rightX, signatureY, { align: 'center' });
        doc.text('(Ký, họ tên)', rightX, signatureY + 15, { align: 'center' });
      }

      // ===== FOOTER =====
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont(family, 'normal');
        doc.setFontSize(8);
        doc.text(
          `Trang ${i} / ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 20,
          { align: 'center' }
        );
      }

      doc.save(fileName);
      toast.success('Xuất PDF thành công');
    } catch (error) {
      console.error('Failed to export PDF', error);
      toast.error('Xuất PDF thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className={`inline-flex items-center gap-2 rounded-md border border-indigo-500 px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10 ${className}`}
    >
      <FileDown className="h-4 w-4" />
      Xuất PDF
    </button>
  );
}

// Legacy component for backward compatibility
export function PDFButton(props) {
  return <PDFExport {...props} />;
}
