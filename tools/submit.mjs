// `npm run submit`: build with a fresh Build ID, write SUBMISSION.txt, zip source -> <studentId>_<Student_Name>.zip
import { execSync } from 'node:child_process';
import { writeFileSync, existsSync, rmSync } from 'node:fs';
import config from '../config.js';

const { studentId, studentName } = config;
if (!studentId || studentId === '00000000000' || !studentName || studentName === 'Your Name') {
  console.error('Set studentId and studentName in config.js before submitting.'); process.exit(1);
}
const buildId = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const zipName = `${studentId}_${studentName.trim().replace(/\s+/g, '_')}.zip`;
execSync('node tests/rules.test.mjs', { stdio: 'inherit' });
execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, BUILD_ID: buildId } });
writeFileSync('SUBMISSION.txt', `Student ID: ${studentId}\nName: ${studentName}\nGame: ${config.startGame}\nBuild ID: ${buildId}\n`);
if (existsSync(zipName)) rmSync(zipName);
execSync(`zip -r "${zipName}" . -x "node_modules/*" ".git/*" "*.zip" ".DS_Store"`, { stdio: 'inherit' });
console.log(`\nCreated ${zipName}\nBuild ID: ${buildId}\nDeploy ./dist (see DEPLOY.md) and check the bottom-left Build ID matches.`);
