'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, CheckCircle } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Click or drag a file to start.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFile = (selectedFile: File | null) => {
    if (isProcessing || !selectedFile) return;
    setFile(selectedFile);
    setStatus(`Ready to process: ${selectedFile.name}`);
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
      
      button.textContent = 'Decoding...';
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
        
        const blob = new Blob(binaryArrays, {type: "${file.type || 'application/octet-stream'}"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "${file.name}";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        button.textContent = 'Download Complete!';
      } catch (e) {
        button.textContent = 'Error Decoding';
        console.error(e);
      } finally {
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
    <main className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden border-none">
        <CardHeader className="bg-card p-6 border-b">
          <CardTitle className="text-3xl font-bold text-center text-foreground">File To HTML Converter</CardTitle>
          <CardDescription className="text-center text-muted-foreground pt-2">Embed any file into a single, portable HTML document.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div 
            className={`relative w-full h-48 border-2 border-dashed rounded-lg flex flex-col justify-center items-center transition-all duration-300 ${isProcessing ? 'cursor-not-allowed bg-secondary' : 'cursor-pointer hover:border-primary hover:bg-accent'}`}
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
              <UploadCloud className={`mx-auto h-12 w-12 transition-colors duration-300 ${isProcessing ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
              <p className="mt-4 text-sm text-foreground">
                <span className={`font-semibold ${isProcessing ? 'text-muted-foreground' : 'text-primary'}`}>Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">Unlimited file size. Your files are processed in-browser.</p>
            </div>
          </div>

          <div className="h-16 pt-2 text-center">
            {isProcessing ? (
                <div className="space-y-3">
                    <Progress value={progress} className="w-full h-2.5" />
                    <p className="text-sm text-muted-foreground animate-pulse">{status}</p>
                </div>
            ) : (
                <div className="flex items-center justify-center h-full">
                  {isDone ? (
                    <div className="flex items-center text-green-600 font-medium">
                      <CheckCircle className="h-5 w-5 mr-2"/>
                      <span>{status}</span>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{status}</p>
                  )}
                </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-6 bg-secondary/50">
          <Button onClick={generateHTML} disabled={!file || isProcessing} size="lg" className="w-full font-bold text-base rounded-xl shadow-lg">
            {isProcessing ? 'Generating...' : (isDone ? 'Generate Another File' : 'Generate & Download HTML')}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
