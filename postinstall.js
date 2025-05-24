const { execSync } = require('child_process');
const path = require('path');

console.log('Running postinstall script...');

try {
  // Install frontend dependencies
  console.log('Installing frontend dependencies...');
  execSync('cd frontend && npm install', { stdio: 'inherit' });

  // Install backend dependencies
  console.log('Installing backend dependencies...');
  execSync('cd backend && npm install', { stdio: 'inherit' });

  console.log('Postinstall completed successfully!');
} catch (error) {
  console.error('Error during postinstall:', error);
  process.exit(1);
} 