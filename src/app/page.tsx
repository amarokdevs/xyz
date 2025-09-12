
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, CheckCircle, File, Instagram, Youtube, Send, Globe } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Select a file to start.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFile = (selectedFile: File | null) => {
    if (isProcessing || !selectedFile) return;
    setFile(selectedFile);
    setStatus(`Ready: ${selectedFile.name}`);
    setProgress(0);
    setIsDone(false);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateFile(event.target.files?.[0] || null);
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    updateFile(event.dataTransfer.files?.[0] || null);
  }

  const base64ArrayBuffer = (arrayBuffer: ArrayBuffer) => {
    const base64abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = '', bytes = new Uint8Array(arrayBuffer);
    let i;
    const len = bytes.length;
    for (i = 2; i < len; i += 3) {
      result += base64abc[bytes[i - 2] >> 2];
      result += base64abc[((bytes[i - 2] & 3) << 4) | (bytes[i - 1] >> 4)];
      result += base64abc[((bytes[i - 1] & 15) << 2) | (bytes[i] >> 6)];
      result += base64abc[bytes[i] & 63];
    }
    if (i === len + 1) {
      result += base64abc[bytes[i - 2] >> 2];
      result += base64abc[(bytes[i - 2] & 3) << 4];
      result += "==";
    }
    if (i === len) {
      result += base64abc[bytes[i - 2] >> 2];
      result += base64abc[((bytes[i - 2] & 3) << 4) | (bytes[i - 1] >> 4)];
      result += base64abc[(bytes[i - 1] & 15) << 2];
      result += "=";
    }
    return result;
  }

  const generateHTML = async () => {
    if (!file) {
      setStatus('Please select a file first!');
      return;
    }

    setIsProcessing(true);
    setIsDone(false);
    setProgress(0);
    setStatus('Initializing...');

    const CHUNK_SIZE = 1024 * 512; // 512KB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let offset = 0;
    let chunkIndex = 0;
    let blobParts: Blob[] = [];

    const generatedPageStyle = `
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; flex-direction: column; background-color: #F5F5F5; color: #333; }
      .container { text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-width: 90%; }
      h2 { margin-top: 0; font-size: 24px; }
      p { word-break: break-all; }
      button { font-size: 1rem; padding: 12px 24px; border-radius: 8px; border: none; background-color: #ADD8E6; color: #333; cursor: pointer; transition: background-color 0.3s, transform 0.2s; font-weight: 600; }
      button:hover:not(:disabled) { background-color: #9ac9da; transform: translateY(-2px); }
      button:disabled { background-color: #ccc; cursor: not-allowed; }
      #progress-bar { width: 100%; height: 8px; background-color: #e0e0e0; border-radius: 4px; overflow: hidden; margin-top: 20px; display: none; }
      #progress-fill { width: 0%; height: 100%; background-color: #ADD8E6; transition: width 0.3s; }
    `;

    blobParts.push(new Blob([`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${file.name} - Embedded File</title><style>${generatedPageStyle}</style></head><body><div class="container">
    <h2>Download Your File</h2>
    <p><strong>File:</strong> ${file.name}</p>
    <button onclick="download()">Download</button>
    <div id="progress-bar"><div id="progress-fill"></div></div>
    </div>\n`], { type: "text/html" }));

    while (offset < file.size) {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      const b64 = base64ArrayBuffer(buffer);
      blobParts.push(new Blob([`<script type="application/base64-chunk">${b64}</script>\n`], { type: "text/html" }));

      offset += CHUNK_SIZE;
      chunkIndex++;
      
      const currentProgress = (chunkIndex / totalChunks) * 100;
      setProgress(currentProgress);
      setStatus(`Encoding chunk ${chunkIndex} of ${totalChunks}...`);
      
      await new Promise(r => setTimeout(r, 0));
    }

    const footerScript = `
    <script>
    function b64ToByteArray(b64) {
      const bin = atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return bytes;
    }

    async function download() {
      const button = document.querySelector('button');
      const progressBar = document.getElementById('progress-bar');
      const progressFill = document.getElementById('progress-fill');
      
      button.textContent = 'Decoding file...';
      button.disabled = true;
      progressBar.style.display = 'block';

      try {
        const chunkScripts = document.querySelectorAll('script[type="application/base64-chunk"]');
        const totalChunks = chunkScripts.length;
        const binaryArrays = [];
        
        for (let i = 0; i < totalChunks; i++) {
          const chunkText = chunkScripts[i].textContent;
          binaryArrays.push(b64ToByteArray(chunkText));
          chunkScripts[i].remove(); // Free up memory

          progressFill.style.width = ((i + 1) / totalChunks * 100) + '%';
          
          if (i % 10 === 0 || i === totalChunks - 1) {
            // Yield to the main thread to keep the UI responsive
            await new Promise(r => setTimeout(r, 0));
          }
        }
        
        button.textContent = 'Assembling file...';
        const blob = new Blob(binaryArrays, {type: "${file.type || 'application/octet-stream'}"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "${file.name}";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        button.innerHTML = '✅ Successfully Downloaded!';
        progressBar.style.display = 'none';
        progressFill.style.width = '0%';

      } catch (e) {
        button.textContent = 'Error Decoding';
        console.error(e);
        setTimeout(() => {
          button.textContent = 'Download';
          button.disabled = false;
          progressBar.style.display = 'none';
          progressFill.style.width = '0%';
        }, 3000);
      }
    }
    </script></body></html>`;

    blobParts.push(new Blob([footerScript], { type: "text/html" }));

    const finalBlob = new Blob(blobParts, { type: "text/html" });
    const url = URL.createObjectURL(finalBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus(`${file.name}.html has been generated and downloaded.`);
    setIsProcessing(false);
    setIsDone(true);
  };
  
  return (
    <>
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="animated-gradient"></div>
        <div className="content-container bg-white rounded-3xl shadow-xl p-8 sm:p-12 md:p-16 w-full max-w-4xl flex flex-col items-center">
            {/* Header */}
            <div className="text-center space-y-2 mb-8">
                <h1 className="text-4xl md:text-5xl font-medium text-gray-700">File to HTML</h1>
                <p className="text-gray-500 font-normal">Embed any file into a single, portable HTML document.</p>
            </div>

            {/* File Conversion Section */}
            <div className="w-full md:w-3/4 lg:w-2/3 space-y-6">
              <div 
                className={`group relative w-full h-40 border-2 border-dashed rounded-lg flex flex-col justify-center items-center transition-all duration-300 ${isProcessing ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer hover:border-black hover:bg-gray-50'}`}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleDrop}
              >
                <Input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={isProcessing}
                />
                <div className="text-center p-4">
                  <UploadCloud className={`mx-auto h-10 w-10 transition-colors duration-300 ${isProcessing ? 'text-gray-400' : 'text-gray-500 group-hover:text-black'}`} />
                  <p className="mt-3 text-sm text-gray-600">
                    <span className={`font-semibold ${isProcessing ? 'text-gray-500' : 'text-gray-600 group-hover:text-black'}`}>Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Your files are processed in-browser.</p>
                </div>
              </div>

              <div className="h-16 pt-2 text-center">
                {isProcessing ? (
                    <div className="space-y-3">
                        <Progress value={progress} className="w-full h-2.5" />
                        <p className="text-sm text-gray-500 animate-pulse">{status}</p>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                      {isDone ? (
                        <div className="flex items-center text-green-600 font-medium">
                          <CheckCircle className="h-5 w-5 mr-2"/>
                          <span>{status}</span>
                        </div>
                      ) : (
                        <p className="text-gray-500">{file ? file.name : 'Select a file to start.'}</p>
                      )}
                    </div>
                )}
              </div>
              
              <Button onClick={generateHTML} disabled={!file || isProcessing} size="lg" className="w-full text-white bg-black hover:bg-gray-800 py-4 px-6 rounded-full font-medium transition-transform transform hover:scale-105 shadow-sm text-base">
                {isProcessing ? 'Generating...' : (isDone ? 'Generate Another' : 'Generate & Download HTML')}
              </Button>
              <p className="text-center text-xs text-gray-500 mt-2">
                Created By Deepak Dev ❤️
              </p>
            </div>
        </div>
      </main>
    </>
  );
}
