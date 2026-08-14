export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) { const mammoth = await import("mammoth"); const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() }); return result.value.trim(); }
  if (name.endsWith(".pdf")) { const pdfjs = await import("pdfjs-dist"); pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString(); const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; const pages: string[] = []; for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) { const page = await document.getPage(pageNumber); const content = await page.getTextContent(); pages.push(content.items.map((item) => "str" in item ? String(item.str) : "").join(" ").replace(/\s+/gu, " ").trim()); } return pages.join("\n\n").trim(); }
  throw new Error("仅支持 .docx、.pdf，或直接粘贴简历文本。");
}
