// script.js
document.getElementById('processBtn').addEventListener('click', async () => {
  const files = [...document.getElementById('fileInput').files];
  const action = document.getElementById('action').value;
  const output = document.getElementById('output');

  if (!files.length) {
    alert('Please select files!');
    return;
  }

  output.innerHTML = 'Processing... Please wait.';
  let resultFiles = [];

  try {
    if (action === 'merge') {
      const mergedBlob = await mergePDFs(files);
      resultFiles.push({ name: 'merged.pdf', blob: mergedBlob });
    } else if (action === 'split') {
      const splitBlobs = await splitPDF(files[0]);
      splitBlobs.forEach((b, i) => resultFiles.push({ name: `page_${i+1}.pdf`, blob: b }));
    } else if (action === 'compress') {
      for (let f of files) {
        const compressedBlob = await compressImage(f);
        resultFiles.push({ name: f.name, blob: compressedBlob });
      }
    } else if (action === 'convert') {
      const pdfBlob = await imageToPDF(files);
      resultFiles.push({ name: 'converted.pdf', blob: pdfBlob });
    }

    // Create ZIP
    const zip = new JSZip();
    resultFiles.forEach(f => zip.file(f.name, f.blob));
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    output.innerHTML = `<a href="${url}" download="output.zip">Download ZIP</a>`;
  } catch (e) {
    output.innerHTML = 'Error processing files: ' + e.message;
  }
});
