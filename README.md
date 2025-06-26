# PDF Password Unlocker

A Bun TypeScript tool that detects password-protected PDF files using Ghostscript and intelligently cracks birthdate-based passwords.

## Features

- 🔍 Recursively scans directories for PDF files
- 🔒 Detects password-protected PDFs using Ghostscript
- 🔓 **Intelligent password cracking** with optimized birthdate patterns
- 📝 Generates markdown reports with detailed file listings and cracked passwords
- 🖥️ Displays results in terminal with progress indicators
- ⚡ Built with Bun for fast execution
- 📊 Provides statistics on locked vs unlocked vs cracked files
- 🎯 **Filename analysis** for priority password testing
- 📈 **Birth statistics optimization** (prioritizes Sep/Oct/Aug months)

## Prerequisites

Install Ghostscript:

```bash
# macOS
brew install ghostscript

# Ubuntu/Debian
sudo apt-get install ghostscript

# Windows
# Download from https://www.ghostscript.com/download/gsdnld.html
```

## Installation

```bash
bun install
```

## Usage

### Detection Only (Default)
```bash
# Scan current directory
bun run index.ts

# Scan specific directory
bun run index.ts /path/to/pdf/directory
```

### Detection + Password Cracking
```bash
# Scan and attempt to crack passwords
bun run index.ts /path/to/pdf/directory --crack

# Scan current directory with cracking
bun run index.ts . --crack
```

## Output

The tool provides two types of output:

1. **Terminal Display**: Real-time progress and summary with emoji indicators
2. **Markdown Report**: Detailed report saved as `pdf-lock-report.md`

### Example Terminal Output (Detection Only)
```
🔍 Scanning for PDFs in: ./documents
📁 Found 5 PDF files
🔄 Checking: document1.pdf
🔄 Checking: secure.pdf

📋 PDF Password Check Results
================================
📊 Total PDFs: 5
🔒 Still Locked: 2
🔓 Passwords Cracked: 0
🔓 Unlocked: 3

📝 Report saved to: pdf-lock-report.md
```

### Example Terminal Output (With Password Cracking)
```
🔍 Scanning for PDFs in: ./documents
📁 Found 3 PDF files
🔄 Checking: document1.pdf
🔄 Checking: STM_SA1289_01JAN25_01JUN25_19121985.pdf
🔓 Attempting to crack password for: STM_SA1289_01JAN25_01JUN25_19121985.pdf
   📝 Generated 98212 password candidates (prioritized by filename patterns)
   🔄 Trying password: 01JAN25 (1/98212)
   🔄 Trying password: 01JUN25 (2/98212)
   🔄 Trying password: 19121985 (3/98212)
   ✅ Password found: 19121985

📋 PDF Password Check Results
================================
📊 Total PDFs: 3
🔒 Still Locked: 0
🔓 Passwords Cracked: 1
🔓 Unlocked: 2

🔓 PASSWORDS CRACKED:
   STM_SA1289_01JAN25_01JUN25_19121985.pdf - Password: 19121985

📝 Report saved to: pdf-lock-report.md
```

### Example Report Structure
```markdown
# PDF Password Protection Report

**Total PDFs scanned:** 5
**Password Protected:** 1
**Passwords Cracked:** 2
**Accessible:** 2

## 🔓 Cracked Password Files
- `financial_report_19851219.pdf` - /path/to/financial_report_19851219.pdf
  - **Password:** `19121985`
- `statement_01Sep1995.pdf` - /path/to/statement_01Sep1995.pdf
  - **Password:** `01091995`

## 🔒 Still Password Protected Files
- `secure.pdf` - /path/to/secure.pdf

## 🔓 Accessible Files
- `document1.pdf` - /path/to/document1.pdf
- `document2.pdf` - /path/to/document2.pdf
```

## Password Cracking Strategy

### Intelligent Password Generation
1. **Filename Analysis**: Extracts date patterns from filenames for priority testing
2. **Birthdate Optimization**: Targets ages 20-85 (birth years 1940-2005)
3. **Statistical Prioritization**: Tests high-birth months first (September, October, August)
4. **Multiple Formats**: Supports ddMMYYYY, ddMMMYYYY, ddMMYY, ddMMMYY patterns

### Success Factors
- **Pattern Recognition**: Identifies dates in filenames like `@STM_SA1289_01JAN25_01JUN25_19121985.pdf`
- **Birth Statistics**: Prioritizes months with highest birth rates
- **Age Demographics**: Focuses on realistic adult age ranges
- **Format Variations**: Tests both numeric and text month formats

## Technical Details

- **Runtime**: Bun with TypeScript
- **PDF Detection**: Ghostscript command-line interface
- **Password Testing**: Ghostscript with `-sPDFPassword` parameter
- **Architecture**: Functional programming patterns
- **File Scanning**: Recursive directory traversal with error handling
- **Performance**: Optimized for quick wins via filename analysis

## Project Structure

```
pdf-password-unlocker/
├── index.ts           # Main application
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config
├── README.md          # Documentation
└── pdf-lock-report.md # Generated report (after run)
```

This project was created using `bun init` in bun v1.2.5. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
