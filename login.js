const axios = require("axios");
const Papa = require("papaparse");
const bcrypt = require("bcrypt");
const { log } = console;
const encryptor = require('./encryption');
const { 
    ENCRYPTED_GITHUB_TOKEN, 
    REPO_OWNER, 
    REPO_NAME, 
    FILE_PATH, 
    BRANCH 
} = require("./config");

let GITHUB_TOKEN;

try {
    if (!ENCRYPTED_GITHUB_TOKEN) {
        throw new Error('ENCRYPTED_GITHUB_TOKEN is not configured');
    }
    GITHUB_TOKEN = encryptor.decrypt(ENCRYPTED_GITHUB_TOKEN);
    if (!GITHUB_TOKEN) {
        throw new Error('Failed to decrypt GITHUB_TOKEN');
    }
} catch (error) {
    console.error('Error initializing GitHub token:', error.message);
    process.exit(1);
}

// Function to get the file content from GitHub
async function getFileContent() {
  log("Retrieving file content from GitHub...");
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3.raw",
      },
    });
    log("File content retrieved successfully.");
    return response.data;
  } catch (error) {
    log("Error retrieving the file:", error.message);
    throw error;
  }
}

// Function to update the file on GitHub
async function updateFileOnGitHub(content, sha) {
  log("Updating file on GitHub...");
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  const encodedContent = Buffer.from(content).toString("base64");

  try {
    const response = await axios.put(
      url,
      {
        message: "Update UserID column",
        content: encodedContent,
        sha,
        branch: BRANCH,
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    log("File updated successfully:", response.data.commit.html_url);
  } catch (error) {
    log("Error updating the file:", error.message);
    throw error;
  }
}

// Function to hash passwords
// async function hashPasswords(csvData) {
//   log(`Hashing ${csvData.length} rows`);
//   return Promise.all(
//     csvData.map(async (row) => {
//       row.hash = await bcrypt.hash(row.password, 10);
//       return row;
//     })
//   );
// }

async function hashPassword(password) {
  try {
      const hashedPassword = await bcrypt.hash(password, 10);
      return hashedPassword;
  } catch (error) {
      console.error('Error hashing password:', error);
      throw error;
  }
}
// Main function to execute the process
async function saveChanges(hashedCsvData) {
  try {
    log("Starting the process...");

    // Convert back to CSV format
    const csvContent = Papa.unparse(hashedCsvData);
    log(csvContent);

    log("Retrieving file SHA for update...");
    const fileInfoResponse = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    const sha = fileInfoResponse.data.sha;
    log("File SHA retrieved:", sha);

    // Update the file on GitHub
    await updateFileOnGitHub(csvContent, sha);
    log("Process completed successfully.");

  } catch (error) {
    log("Error in saveChanges function:", error.message);
  }
}
async function loadUsers() {
  const csvData = await getFileContent();
  if (!csvData) {
      throw new Error("Failed to retrieve file content.");
  }

  const accountsCsv = Papa.parse(csvData, { header: true });
  const accounts = accountsCsv.data.filter(row => 
    Object.values(row).some(value => value !== '' && value !== undefined)
  );
  return accounts
}

// Function for user login
async function login(username, password) {
  log(`${username} logging in...`);
  try {
      const users = await loadUsers();
      const account = users.find(acc => acc.username === username);

      if (!account){
          log("Account not found.");
          return { isPasswordValid: false, account: undefined }
      }

      const isPasswordValid = await bcrypt.compare(password, account.hash);
      log(isPasswordValid ? "Login successful!" : "Invalid password.");
      return { isPasswordValid, account }

  } catch (error) {
      log("Error during login:", error.message);
      return { isPasswordValid: false, account: undefined }
  }
}

module.exports = {
    login, loadUsers, hashPassword, saveChanges
}