import React, { useState } from 'react';
import './App.css';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import 'pdfjs-dist/legacy/build/pdf.worker';
import masterConfigs from './config'
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.js';

async function extractTextItems(page) {
  const textContent = await page.getTextContent();
  return textContent.items.map(item => ({
    text: item.str.trim(),
    x: item.transform[4],
    y: item.transform[5], // Y position
  }));
}

function groupItemsByLines(items) {
  const grouped = [];
  items.forEach(item => {
    const found = grouped.find(group => Math.abs(group.y - item.y) < 5);
    if (found) {
      found.items.push(item);
    } else {
      grouped.push({ y: item.y, items: [item] });
    }
  });
  return grouped.map(group => ({
    ...group,
    items: group.items.sort((a, b) => a.x - b.x), // Sort items in a group by X position
  }));
}

// Function to determine if the line text matches the phrases based on the matching rule,
// considering case sensitivity and order
function isMatch(lineText, { phrases, rule, caseSensitive, enforceOrder }) {
  if (!caseSensitive) {
    lineText = lineText.toLowerCase();
    phrases = phrases.map(phrase => phrase.toLowerCase());
  }

  if (enforceOrder) {
    let lastIndex = 0;
    for (let phrase of phrases) {
      let index = lineText.indexOf(phrase, lastIndex);
      if (index === -1) return false; // Phrase not found or out of order
      lastIndex = index + phrase.length;
    }
    return true; // All phrases found in order
  } else {
    if (rule === "all") {
      return phrases.every(phrase => lineText.includes(phrase));
    } else { // "any" or default rule
      return phrases.some(phrase => lineText.includes(phrase));
    }
  }
}

function App() {
  const [text, setText] = useState('');
  const [selectedConfig, setSelectedConfig] = useState("Endowus");
  const [fileName, setFileName] = useState('');

  async function extractTextFromPdf(file) {
    const config = masterConfigs[selectedConfig];
    try {
      const reader = new FileReader();
      // Fetch the correct configuration based on the current selectedConfig state
      if (!config) {
        console.error('Configuration not found:', selectedConfig);
        return;
      }

      reader.onload = async (e) => {
        const typedarray = new Uint8Array(e.target.result);
        const pdfDoc = await pdfjsLib.getDocument({data: typedarray}).promise;
        let allExtractedFundNames = [];

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const items = await extractTextItems(page);
          const lines = groupItemsByLines(items);

          let extracting = false;
          let headerXPosition = null;

          for (const line of lines) {
            const lineText = line.items.map(item => item.text).join(" ");
            console.log(lineText)
            const triggerMatch = isMatch(lineText, config?.triggerConfig);
            const stopMatch = isMatch(lineText, config?.stopConfig);

            if(triggerMatch && extracting) {
              continue;
            }
            
            if (triggerMatch) {
              const fundNameItem = line.items.find(item => item.text.includes(config?.triggerConfig?.key));
              headerXPosition = fundNameItem ? fundNameItem.x : null;
              if (headerXPosition !== null) extracting = true; continue;
            }

            if (extracting && stopMatch) {
              extracting = false; continue;
            }

            if (extracting && headerXPosition !== null) {
              for (const item of line.items) {
                const { text, x } = item;
                console.log(item)
                if (Math.abs(x - headerXPosition) < 5) {
                  console.log(text, headerXPosition, x)
                  allExtractedFundNames.push(text);
                }
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
        <div>
          <label htmlFor="config-selector">Select Configuration:</label>
          <br />
          <select
            id="config-selector"
            onChange={(e) => setSelectedConfig(e.target.value)}
            value={selectedConfig}
          >
            {Object.keys(masterConfigs).map(configName => (
              <option key={configName} value={configName}>{configName}</option>
            ))}
          </select>
        </div>
        <div>
        <input
  type="file"
  accept="application/pdf"
  id="file-input"
  style={{ display: 'none' }}
  onChange={(e) => {
    if (e.target.files[0]) {
      setFileName(e.target.files[0].name); // Update the file name
      // Assuming you move the extractTextFromPdf call here or handle it separately as needed
    } else {
      setFileName(''); // Reset the file name if no file is selected
    }
  }}
/>
<label htmlFor="file-input" className="file-input-label">Choose PDF</label>
{fileName && <div className="file-name-display">{fileName}</div>}

        </div>
        <button
          onClick={() => {
            const fileInput = document.getElementById('file-input');
            if (fileInput && fileInput.files.length > 0) {
              extractTextFromPdf(fileInput.files[0]);
            }
          }}
        >
          Extract Text
        </button>
        <div className="extracted-text">
          <strong>Extracted Fund Names:</strong>
          <p>{text}</p>
        </div>
      </header>
    </div>
  );
  
  
        }
        
     export default App;
        
