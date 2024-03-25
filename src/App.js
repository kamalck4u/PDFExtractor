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


function groupItemsByWrapped(items) {
  const wrappedItems = [];
  let previousItem = null;

  items.forEach((item, index) => {
    // Skip merging for empty text, but still add it to the result as it might be needed for spacing
    if (item.text.trim() === '') {
      wrappedItems.push(item);
      return;
    }

    // If there's a previous item with the same x position, merge this item's text with the previous one
    if (previousItem && item.x === previousItem.x) {
      previousItem.text += ` ${item.text}`; // Add a space between merged texts
      // Do not push the current item to wrappedItems as its text is already added to the previousItem
    } else {
      // If it doesn't match the merge condition, just push it to the result
      wrappedItems.push(item);
      previousItem = item; // Update the previousItem to the current one for the next iteration
    }
  });

  return wrappedItems;
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
  const [extractedHoldings, setExtractedHoldings] = useState([]);

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
        let extractedHoldings = [];

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const items = await extractTextItems(page);
          const wrappedItems = groupItemsByWrapped(items); 
          const lines = groupItemsByLines(wrappedItems);
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
                if (Math.abs(x - headerXPosition) < 5) {
                  extractedHoldings.push(text);
                }
              }
            }
          }
        }
    
      const uniqueHoldings = extractedHoldings.filter((name, index, self) => name.trim() !== '' && self.indexOf(name) === index);
      setExtractedHoldings(uniqueHoldings);    
      console.log(uniqueHoldings)
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
        <div className="config-selector">
          <label htmlFor="config-selector">Select Configuration:</label>
          <span />
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
        <div className="file-input-container">
          <input
            type="file"
            accept="application/pdf"
            id="file-input"
            className="file-input"
            onChange={(e) => {
              if (e.target.files[0]) {
                setFileName(e.target.files[0].name);
              } else {
                setFileName('');
              }
            }}
          />
          <label htmlFor="file-input" className="file-input-label">Choose PDF</label>
          {fileName && <div className="file-name-display">{fileName}</div>}
        </div>
        <button className="extract-button" onClick={() => {
          const fileInput = document.getElementById('file-input');
          if (fileInput && fileInput.files.length > 0) {
            extractTextFromPdf(fileInput.files[0]);
          }
        }}>
          Extract Text
        </button>
        <div className="extracted-text">
          <strong>Extracted Fund Names:</strong>
          {extractedHoldings.map((holding, index) => (
            <div key={index}>{holding} <hr /> </div>
            
          ))}
        </div>
        <p>{text}</p>
      </header>
    </div>
  );
  
  
  
        }
        
     export default App;
        
