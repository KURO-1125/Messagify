const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Running postinstall script...');

function runCommand(command, cwd) {
  try {
    console.log(`Running command: ${command} in ${cwd}`);
    execSync(command, { 
      stdio: 'inherit',
      cwd: cwd
    });
    return true;
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error);
    return false;
  }
}

try {
  // Ensure node_modules exists
  if (!fs.existsSync('node_modules')) {
    console.log('Installing root dependencies...');
    runCommand('npm install', process.cwd());
  }

  // Install frontend dependencies
  console.log('Installing frontend dependencies...');
  if (!runCommand('npm install', path.join(process.cwd(), 'frontend'))) {
    throw new Error('Failed to install frontend dependencies');
  }

  // Install backend dependencies
  console.log('Installing backend dependencies...');
  if (!runCommand('npm install', path.join(process.cwd(), 'backend'))) {
    throw new Error('Failed to install backend dependencies');
  }

  console.log('Postinstall completed successfully!');
} catch (error) {
  console.error('Error during postinstall:', error);
  process.exit(1);
} 