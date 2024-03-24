import React, { useState } from 'react';
import './App.css';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import 'pdfjs-dist/legacy/build/pdf.worker';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.js';

async function extractTextItems(page) {
  const textContent = await page.getTextContent();
  return textContent.items.map(item => ({
    text: item.str.trim(),
    x: item.transform[4],
  }));
}

function App() {
  const [text, setText] = useState('');

async function extractTextFromPdf(file) {
  try {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const typedarray = new Uint8Array(e.target.result);
      const pdfDoc = await pdfjsLib.getDocument({data: typedarray}).promise;
      let allExtractedFundNames = []; // Store extracted fund names
      let headerXPosition = null; // X position of "Fund name"
      let extracting = false; // Indicates if we are currently extracting fund names

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const items = await extractTextItems(page); // Custom function to extract text items

        for (let i = 0; i < items.length; i++) {
          const { text, x } = items[i];

          // Check if we encounter "Fund name", indicating a new table or section start
          if (!extracting && text.includes("Fund name")) {
            extracting = true; // Start extracting fund names
            headerXPosition = x; // Set the X position for the current table
            continue; // Skip this iteration as "Fund name" is not an actual fund name
          }

          // Stop condition for the current table extraction
          if (extracting && (text.includes("Total") || text.includes("No assets"))) {
            extracting = false; // Stop extracting fund names
            continue; // Move to the next item
          }

          // Extract fund names if we are within a table and the text aligns with the "Fund name" header
          if (extracting && headerXPosition !== null && Math.abs(x - headerXPosition) < 5) {
            let fundName = text;
            // Logic to handle cell wrapping and continuation of fund names
            if (i + 1 < items.length && items[i + 1].text.trim() !== "") {
              console.log(items[i])
              if (Math.abs(items[i].x - items[i + 1].x) < 5) {
                fundName += ` ${items[i + 1].text.trim()}`;
                i++; // Skip the next item since it's been processed
              }
            }

            // Exclude headers and other non-fund names explicitly
            if (!fundName.includes("Asset class") && !fundName.includes("Units")) {
              allExtractedFundNames.push(fundName);
            }
          }
        }
      }

      setText(allExtractedFundNames.join(", "));
    };

    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    setText('Failed to load PDF.');
  }
}


  

  return (
    <div className="App">
      <header className="App-header">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            if (e.target.files.length > 0) {
              extractTextFromPdf(e.target.files[0]);
            }
          }}
        />
        <div style={{ textAlign: 'left', maxWidth: '80%', marginTop: '20px', wordBreak: 'break-word' }}>
          <strong>Extracted Fund Names:</strong> <p>{text}</p>
        </div>
      </header>
    </div>
  );
}

export default App;