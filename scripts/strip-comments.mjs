import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace multiline JSDoc comments with 1-liners
    content = content.replace(/\/\*\*([\s\S]*?)\*\//g, (match, inner) => {
      let lines = inner.split('\n');
      let firstLine = lines.find(l => l.match(/\*\s+[a-zA-Z]/));
      if (firstLine) {
        let text = firstLine.replace(/\*\s+/, '').trim();
        return `// ${text}`;
      }
      return '';
    });
    
    // Replace standalone line comments that are just empty or decorative
    content = content.replace(/\/\/\s*-+\s*\n/g, '');
    
    fs.writeFileSync(filePath, content);
  }
});
console.log("Comments stripped!");
