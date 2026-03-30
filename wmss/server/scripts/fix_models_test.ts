import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, '../src/models');

const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.model.ts'));

files.forEach(file => {
    const filePath = path.join(modelsDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // 1. Update import
    if (content.includes("from 'mongoose';") && !content.includes('models,')) {
        content = content.replace("from 'mongoose';", "import { Schema, model, models, type Document, type Model } from 'mongoose';");
        // Remove original import if it was mixed (it usually is) -> actually easier to just replace known string
        // My previous tool used specific string.
        // Let's being robust:
        // Replace `import { ... } from 'mongoose'` with `import { ..., models } from 'mongoose'`
        content = content.replace(/import { ([^}]+) } from 'mongoose';/, (match, imports) => {
            if (imports.includes('models')) return match;
            return `import { ${imports}, models } from 'mongoose';`;
        });
    }

    // 2. Update export pattern
    // Pattern: export const XModel: Model<XDoc> = model<XDoc>('Name', schema);
    // or multi-line

    const regex = /export const (\w+): Model<(\w+)> = model<(\w+)>\(\s*'(\w+)',\s*(\w+)\s*\);?/s;

    // Note: My models use specific naming: PartnerModel, PartnerDocument. 
    // User model: export const UserModel: Model<UserDocument> = model<UserDocument>('User', userSchema);

    // Let's try to match generic pattern:
    // export const (\w+): Model<(\w+)> = model<(\w+)>\(

    content = content.replace(
        /export const (\w+): Model<(\w+)> = model<(\w+)>\(\s*(['"]\w+['"]),\s*(\w+)\s*\);/g,
        (match, modelName, docType, generics, modelStr, schemaName) => {
            // Extract inner model name from quotes
            const innerName = modelStr.replace(/['"]/g, '');
            return `export const ${modelName}: Model<${docType}> = (models.${innerName} as Model<${docType}>) || model<${generics}>(${modelStr}, ${schemaName});`;
        }
    );

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
});
