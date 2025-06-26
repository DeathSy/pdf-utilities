import { spawn } from 'bun';
import { readdir, stat, writeFile } from 'fs/promises';
import { join, extname } from 'path';

interface PDFResult {
  filename: string;
  path: string;
  isLocked: boolean;
  error?: string;
  crackedPassword?: string;
}

const checkPDFLock = async (filePath: string): Promise<boolean> => {
  try {
    // Try to get PDF info using Ghostscript - encrypted PDFs will fail with specific error
    const process = spawn([
      'gs', 
      '-dNODISPLAY', 
      '-dQUIET', 
      '-dBATCH', 
      '-dNOPAUSE',
      '-dNOSAFER',
      '-sDEVICE=nullpage',
      '-sOutputFile=/dev/null',
      filePath
    ], {
      stderr: 'pipe'
    });
    
    const stderr = await new Response(process.stderr).text();
    const exitCode = await process.exited;
    
    // Check for password/encryption related errors in stderr
    const isPasswordProtected = stderr.includes('This file requires a password') ||
                               stderr.includes('Password required') ||
                               stderr.includes('InvalidPassword') ||
                               stderr.includes('PDF file is encrypted') ||
                               stderr.includes('Couldn\'t find trailer') ||
                               stderr.includes('This document is password protected') ||
                               (exitCode !== 0 && stderr.includes('Error'));
    
    return isPasswordProtected;
  } catch (error) {
    throw new Error(`Ghostscript error: ${error}`);
  }
};

const findPDFFiles = async (directory: string): Promise<string[]> => {
  const files: string[] = [];
  
  const scanDirectory = async (dir: string): Promise<void> => {
    try {
      const entries = await readdir(dir);
      
      for (const entry of entries) {
        // Skip hidden files and directories
        if (entry.startsWith('.')) continue;
        
        const fullPath = join(dir, entry);
        
        try {
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            console.log(`📂 Scanning directory: ${fullPath}`);
            await scanDirectory(fullPath);
          } else if (extname(entry).toLowerCase() === '.pdf') {
            console.log(`📄 Found PDF: ${fullPath}`);
            files.push(fullPath);
          }
        } catch (statError) {
          console.warn(`⚠️  Cannot access: ${fullPath} - ${statError}`);
          continue;
        }
      }
    } catch (readError) {
      console.warn(`⚠️  Cannot read directory: ${dir} - ${readError}`);
    }
  };
  
  console.log(`🔍 Starting scan from: ${directory}`);
  await scanDirectory(directory);
  console.log(`✅ Scan complete. Found ${files.length} PDF files total.`);
  return files;
};

const generateDatePasswords = (filename?: string): string[] => {
  const passwords: string[] = [];
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Extract potential dates from filename for priority testing
  const priorityPatterns: string[] = [];
  if (filename) {
    // Look for patterns like 01JAN25, 01JUN25, 19121985 in filename
    const dateMatches = filename.match(/\d{2}[A-Za-z]{3}\d{2,4}/g) || [];
    const numericMatches = filename.match(/\d{6,8}/g) || [];
    
    for (const match of [...dateMatches, ...numericMatches]) {
      priorityPatterns.push(match);
      // Also try variations
      if (match.length === 8) {
        priorityPatterns.push(match.substring(0, 6)); // DDMMYY
        priorityPatterns.push(match.substring(2)); // MMYYYY or YYYYMM
      }
    }
  }
  
  // Add priority patterns first
  passwords.push(...priorityPatterns);
  
  // Generate systematic date patterns for birthdate years (people 20-85 years old)
  const currentYear = new Date().getFullYear();
  const years = [];
  // Birth years for ages 20-85 (1940-2005)
  for (let age = 20; age <= 85; age++) {
    years.push(currentYear - age);
  }
  
  // Prioritize months with highest birth rates: September, October, August, then others
  const priorityMonths = [8, 9, 7]; // Sep=8, Oct=9, Aug=7 (0-indexed)
  const otherMonths = [0, 1, 2, 3, 4, 5, 6, 10, 11]; // Jan-Jul, Nov-Dec
  const monthOrder = [...priorityMonths, ...otherMonths];
  
  for (const year of years) {
    for (const monthIndex of monthOrder) {
      // Days 1-31, but prioritize common dates
      const days = [1, 12, 19, 15, 31, 30, 28, ...Array.from({length: 31}, (_, i) => i + 1)];
      
      for (const day of [...new Set(days)]) { // Remove duplicates
        if (day > 31) continue;
        const dayStr = day.toString().padStart(2, '0');
        
        // ddMMYYYY format
        passwords.push(`${dayStr}${months[monthIndex]}${year}`);
        
        // ddMMMYYYY format  
        passwords.push(`${dayStr}${monthNames[monthIndex]}${year}`);
        
        // Remove 2-digit year formats as requested
      }
    }
  }
  
  return [...new Set(passwords)]; // Remove duplicates
};

const tryPassword = async (filePath: string, password: string): Promise<boolean> => {
  try {
    const process = spawn([
      'gs',
      '-dNODISPLAY',
      '-dQUIET',
      '-dBATCH',
      '-dNOPAUSE',
      '-dNOSAFER',
      '-sDEVICE=nullpage',
      '-sOutputFile=/dev/null',
      `-sPDFPassword=${password}`,
      filePath
    ], {
      stderr: 'pipe'
    });
    
    const stderr = await new Response(process.stderr).text();
    const exitCode = await process.exited;
    
    // Success if no password errors and exit code is 0
    return exitCode === 0 && !stderr.includes('Password') && !stderr.includes('InvalidPassword');
  } catch (error) {
    return false;
  }
};

const crackPDFPasswordParallel = async (filePath: string, passwords: string[], startIndex: number, chunkSize: number): Promise<string | null> => {
  const chunk = passwords.slice(startIndex, startIndex + chunkSize);
  
  for (const password of chunk) {
    if (await tryPassword(filePath, password)) {
      return password;
    }
  }
  
  return null;
};

const crackPDFPassword = async (filePath: string): Promise<string | null> => {
  const filename = filePath.split('/').pop() || '';
  console.log(`🔓 Attempting to crack password for: ${filename}`);
  
  const passwords = generateDatePasswords(filename);
  console.log(`   📝 Generated ${passwords.length} password candidates (prioritized by filename patterns)`);
  
  const chunkSize = 100; // Process 100 passwords per chunk
  const maxConcurrency = 10; // Run up to 10 chunks in parallel
  let attemptCount = 0;
  
  // Process passwords in parallel chunks
  for (let i = 0; i < passwords.length; i += chunkSize * maxConcurrency) {
    const promises: Promise<string | null>[] = [];
    
    // Create parallel chunks
    for (let j = 0; j < maxConcurrency && (i + j * chunkSize) < passwords.length; j++) {
      const startIndex = i + j * chunkSize;
      promises.push(crackPDFPasswordParallel(filePath, passwords, startIndex, chunkSize));
    }
    
    // Log progress
    attemptCount += promises.length * chunkSize;
    const currentAttempt = Math.min(attemptCount, passwords.length);
    console.log(`   🔄 Testing passwords in parallel: ${currentAttempt}/${passwords.length} (${promises.length} chunks)`);
    
    // Wait for all chunks to complete or find a password
    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        console.log(`   ✅ Password found: ${result.value}`);
        return result.value;
      }
    }
  }
  
  console.log(`   ❌ Password not found after ${passwords.length} attempts`);
  return null;
};

const generateReport = (results: PDFResult[]): string => {
  const locked = results.filter(r => r.isLocked && !r.crackedPassword);
  const unlocked = results.filter(r => !r.isLocked);
  const cracked = results.filter(r => r.isLocked && r.crackedPassword);
  
  let report = '# PDF Password Protection Report\n\n';
  report += `**Total PDFs scanned:** ${results.length}\n`;
  report += `**Password Protected:** ${locked.length}\n`;
  report += `**Passwords Cracked:** ${cracked.length}\n`;
  report += `**Accessible:** ${unlocked.length}\n\n`;
  
  if (cracked.length > 0) {
    report += '## 🔓 Cracked Password Files\n\n';
    cracked.forEach(file => {
      report += `- \`${file.filename}\` - ${file.path}\n`;
      report += `  - **Password:** \`${file.crackedPassword}\`\n`;
    });
    report += '\n';
  }
  
  if (locked.length > 0) {
    report += '## 🔒 Still Password Protected Files\n\n';
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
  
  const locked = results.filter(r => r.isLocked && !r.crackedPassword);
  const unlocked = results.filter(r => !r.isLocked);
  const cracked = results.filter(r => r.isLocked && r.crackedPassword);
  
  console.log(`📊 Total PDFs: ${results.length}`);
  console.log(`🔒 Still Locked: ${locked.length}`);
  console.log(`🔓 Passwords Cracked: ${cracked.length}`);
  console.log(`🔓 Unlocked: ${unlocked.length}\n`);
  
  if (cracked.length > 0) {
    console.log('🔓 PASSWORDS CRACKED:');
    cracked.forEach(file => console.log(`   ${file.filename} - Password: ${file.crackedPassword}`));
    console.log('');
  }
  
  if (locked.length > 0) {
    console.log('🔒 STILL PASSWORD PROTECTED:');
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
  const crackPasswords = process.argv.includes('--crack');
  
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
        const result: PDFResult = {
          filename,
          path: filePath,
          isLocked
        };
        
        // Try to crack password if locked and --crack flag is provided
        if (isLocked && crackPasswords) {
          const crackedPassword = await crackPDFPassword(filePath);
          if (crackedPassword) {
            result.crackedPassword = crackedPassword;
          }
        }
        
        results.push(result);
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