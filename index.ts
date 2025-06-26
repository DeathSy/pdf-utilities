import { spawn } from 'bun';
import { readdir, stat, writeFile } from 'fs/promises';
import { join, extname } from 'path';

interface PDFResult {
  filename: string;
  path: string;
  isLocked: boolean;
  error?: string;
}

const checkPDFLock = async (filePath: string): Promise<boolean> => {
  try {
    const process = spawn(['gs', '-dNODISPLAY', '-dQUIET', '-dBATCH', '-dNOPAUSE', '-c', 'quit', filePath]);
    const result = await process.exited;
    return result !== 0;
  } catch (error) {
    throw new Error(`Ghostscript error: ${error}`);
  }
};

const findPDFFiles = async (directory: string): Promise<string[]> => {
  const files: string[] = [];
  
  const scanDirectory = async (dir: string): Promise<void> => {
    const entries = await readdir(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (extname(entry).toLowerCase() === '.pdf') {
        files.push(fullPath);
      }
    }
  };
  
  await scanDirectory(directory);
  return files;
};

const generateReport = (results: PDFResult[]): string => {
  const locked = results.filter(r => r.isLocked);
  const unlocked = results.filter(r => !r.isLocked);
  
  let report = '# PDF Password Protection Report\n\n';
  report += `**Total PDFs scanned:** ${results.length}\n`;
  report += `**Password Protected:** ${locked.length}\n`;
  report += `**Accessible:** ${unlocked.length}\n\n`;
  
  if (locked.length > 0) {
    report += '## 🔒 Password Protected Files\n\n';
    locked.forEach(file => {
      report += `- \`${file.filename}\` - ${file.path}\n`;
    });
    report += '\n';
  }
  
  if (unlocked.length > 0) {
    report += '## 🔓 Accessible Files\n\n';
    unlocked.forEach(file => {
      report += `- \`${file.filename}\` - ${file.path}\n`;
    });
  }
  
  return report;
};

const displayResults = (results: PDFResult[]): void => {
  console.log('\n📋 PDF Password Check Results');
  console.log('================================');
  
  const locked = results.filter(r => r.isLocked);
  const unlocked = results.filter(r => !r.isLocked);
  
  console.log(`📊 Total PDFs: ${results.length}`);
  console.log(`🔒 Locked: ${locked.length}`);
  console.log(`🔓 Unlocked: ${unlocked.length}\n`);
  
  if (locked.length > 0) {
    console.log('🔒 PASSWORD PROTECTED:');
    locked.forEach(file => console.log(`   ${file.filename}`));
    console.log('');
  }
  
  if (unlocked.length > 0) {
    console.log('🔓 ACCESSIBLE:');
    unlocked.forEach(file => console.log(`   ${file.filename}`));
  }
};

const main = async (): Promise<void> => {
  const directory = process.argv[2] || './';
  
  try {
    console.log(`🔍 Scanning for PDFs in: ${directory}`);
    
    const pdfFiles = await findPDFFiles(directory);
    
    if (pdfFiles.length === 0) {
      console.log('❌ No PDF files found');
      return;
    }
    
    console.log(`📁 Found ${pdfFiles.length} PDF files`);
    
    const results: PDFResult[] = [];
    
    for (const filePath of pdfFiles) {
      const filename = filePath.split('/').pop() || filePath;
      console.log(`🔄 Checking: ${filename}`);
      
      try {
        const isLocked = await checkPDFLock(filePath);
        results.push({
          filename,
          path: filePath,
          isLocked
        });
      } catch (error) {
        results.push({
          filename,
          path: filePath,
          isLocked: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    displayResults(results);
    
    const report = generateReport(results);
    const reportPath = 'pdf-lock-report.md';
    await writeFile(reportPath, report);
    
    console.log(`\n📝 Report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
};

main();