// utils.js

async function mergePDFs(files) {
  const mergedPdf = await PDFLib.PDFDocument.create();
  for (let file of files) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  const mergedBytes = await mergedPdf.save();
  return new Blob([mergedBytes], { type: 'application/pdf' });
}

async function splitPDF(file) {
  const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer());
  const pages = pdf.getPageCount();
  const pdfs = [];
  for (let i = 0; i < pages; i++) {
    const newPdf = await PDFLib.PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(copiedPage);
    const bytes = await newPdf.save();
    pdfs.push(new Blob([bytes], { type: 'application/pdf' }));
  }
  return pdfs;
}

function compressImage(file, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => resolve(blob),
        file.type,
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

async function imageToPDF(files) {
  const pdfDoc = await PDFLib.PDFDocument.create();
  for (let file of files) {
    const imgBytes = await file.arrayBuffer();
    let img;
    if (file.type === 'image/png') {
      img = await pdfDoc.embedPng(imgBytes);
    } else {
      img = await pdfDoc.embedJpg(imgBytes);
    }
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
