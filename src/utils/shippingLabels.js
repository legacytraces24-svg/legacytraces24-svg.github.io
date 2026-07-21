// Generates printable shipping address labels (FROM left / TO right, one row
// per order) as a downloadable PDF or Word document. Used by AdminDashboard's
// "Export Labels" control, operating on whatever orders the caller passes in
// (typically the currently filtered list) so exporting a filtered subset
// works without any extra plumbing.

// jsPDF and docx are only imported dynamically inside each export function —
// both are large libraries, and AdminDashboard is already a lazy-loaded route,
// so eagerly importing them here would bloat every admin page load even when
// no export is ever triggered.

// Fixed sender — same on every parcel, never sourced from order data.
// Address is pre-broken into two fixed lines (street/area, then city–pincode
// state) rather than one long string — at ~54 characters the full string is
// wider than the label column, and letting it wrap/overflow automatically
// either broke "Coimbatore – 641045, Tamil Nadu" across two lines or, worse,
// ran text straight through into the TO column in the PDF export.
export const SENDER = {
    name: 'Legacy Traces',
    addressLines: [
        '20/60, Sakthi Nagar, Ramanathapuram,',
        'Coimbatore – 641045, Tamil Nadu',
    ],
    phone: '9360685192',
};

const addressLines = (address) =>
    (address || '').split(',').map(part => part.trim()).filter(Boolean);

const filename = (ext) => `shipping-labels-${new Date().toISOString().slice(0, 10)}.${ext}`;

export const exportLabelsAsPdf = async(orders) => {
    const { default: jsPDF } = await
    import ('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const gap = 10;
    const colWidth = (pageWidth - margin * 2 - gap) / 2;
    const lineHeight = 4.2;
    const fontSize = 9;

    doc.setFontSize(fontSize);
    let y = margin;

    const fromLines = ['FROM:', SENDER.name, ...SENDER.addressLines, `Tel: ${SENDER.phone}`];

    orders.forEach((order) => {
        // Split on commas first (so "Pincode: 641045" always starts its own
        // line, matching the on-screen/Word output) — splitTextToSize alone
        // only wraps by width, so it could keep "Pincode: …" glued onto the
        // previous line whenever there was room left on it.
        const addrParts = addressLines(order.Address);
        const toAddress = addrParts.length ?
            addrParts.flatMap(part => doc.splitTextToSize(part, colWidth)) : ['—'];
        const toLines = ['TO:', order.Name || 'N/A', ...toAddress, `Order ID: LT-${order.id}`, `Tel: ${order.Mobile || 'N/A'}`];
        const rowLines = Math.max(fromLines.length, toLines.length);
        const rowHeight = rowLines * lineHeight + 3;

        if (y + rowHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }

        const drawColumn = (lines, x) => {
            let cy = y;
            lines.forEach((line, i) => {
                doc.setFont('helvetica', i <= 1 ? 'bold' : 'normal');
                doc.text(line, x, cy);
                cy += lineHeight;
            });
        };

        drawColumn(fromLines, margin);
        drawColumn(toLines, margin + colWidth + gap);

        y += rowHeight;
        doc.setDrawColor(200);
        doc.line(margin, y - 1.5, pageWidth - margin, y - 1.5);
        y += 1;
    });

    doc.save(filename('pdf'));
};

export const exportLabelsAsWord = async(orders) => {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } = await
    import ('docx');
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const bottomBorder = { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' };
    // Row divider is drawn via each cell's own bottom border — docx has no
    // per-row border option, only per-cell.
    const cellStyle = {
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        borders: { top: noBorder, left: noBorder, right: noBorder, bottom: bottomBorder },
    };

    const rows = orders.map(order => {
        const fromCell = new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            ...cellStyle,
            children: [
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'FROM:', bold: true, size: 18 })] }),
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: SENDER.name, bold: true, size: 18 })] }),
                ...SENDER.addressLines.map(line =>
                    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: line, size: 18 })] })
                ),
                new Paragraph({ children: [new TextRun({ text: `Tel: ${SENDER.phone}`, size: 18 })] }),
            ],
        });

        const toCell = new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            ...cellStyle,
            children: [
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'TO:', bold: true, size: 18 })] }),
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: order.Name || 'N/A', bold: true, size: 18 })] }),
                ...addressLines(order.Address).map(line =>
                    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: line, size: 18 })] })
                ),

                new Paragraph({ children: [new TextRun({ text: `Tel: ${order.Mobile || 'N/A'}`, size: 18 })] }),
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: `Order ID: LT-${order.id}`, size: 18 })] }),
            ],
        });

        return new TableRow({ children: [fromCell, toCell] });
    });

    const doc = new Document({
        sections: [{
            children: [
                new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename('docx');
    a.click();
    URL.revokeObjectURL(url);
};