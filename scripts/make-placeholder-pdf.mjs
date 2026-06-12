// Generates a minimal valid one-page PDF used as the committed placeholder
// for template/survey/survey.pdf. Real projects replace it via `make survey`.
import { writeFileSync } from "node:fs";

const out = process.argv[2] ?? "template/survey/survey.pdf";
const text = "Survey skeleton - run `make survey` to build the real PDF.";

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
];
const stream = `BT /F1 12 Tf 72 770 Td (${text}) Tj ET`;
objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

const header = "%PDF-1.4\n";
let body = "";
const offsets = [];
let pos = Buffer.byteLength(header);
objects.forEach((obj, i) => {
  const s = `${i + 1} 0 obj\n${obj}\nendobj\n`;
  offsets.push(pos);
  body += s;
  pos += Buffer.byteLength(s);
});
let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const o of offsets) xref += `${String(o).padStart(10, "0")} 00000 n \n`;
const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;

writeFileSync(out, header + body + xref + trailer);
console.log("wrote", out);
