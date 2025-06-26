# PDF Password Unlocker

A Bun TypeScript tool that detects password-protected PDF files using Ghostscript and generates detailed reports.

## Features

- 🔍 Recursively scans directories for PDF files
- 🔒 Detects password-protected PDFs using Ghostscript
- 📝 Generates markdown reports with detailed file listings
- 🖥️ Displays results in terminal with progress indicators
- ⚡ Built with Bun for fast execution
- 📊 Provides statistics on locked vs unlocked files

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

### Scan current directory
```bash
bun run index.ts
```

### Scan specific directory
```bash
bun run index.ts /path/to/pdf/directory
```

## Output

The tool provides two types of output:

1. **Terminal Display**: Real-time progress and summary with emoji indicators
2. **Markdown Report**: Detailed report saved as `pdf-lock-report.md`

### Example Terminal Output
```
🔍 Scanning for PDFs in: ./documents
📁 Found 5 PDF files
🔄 Checking: document1.pdf
🔄 Checking: secure.pdf

📋 PDF Password Check Results
================================
📊 Total PDFs: 5
🔒 Locked: 2
🔓 Unlocked: 3

📝 Report saved to: pdf-lock-report.md
```

### Example Report Structure
```markdown
# PDF Password Protection Report

**Total PDFs scanned:** 5
**Password Protected:** 2
**Accessible:** 3

## 🔒 Password Protected Files
- `secure.pdf` - /path/to/secure.pdf
- `protected.pdf` - /path/to/protected.pdf

## 🔓 Accessible Files
- `document1.pdf` - /path/to/document1.pdf
- `document2.pdf` - /path/to/document2.pdf
- `document3.pdf` - /path/to/document3.pdf
```

## Technical Details

- **Runtime**: Bun with TypeScript
- **PDF Detection**: Ghostscript command-line interface
- **Architecture**: Functional programming patterns
- **File Scanning**: Recursive directory traversal
- **Error Handling**: Graceful error reporting for corrupted files

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
