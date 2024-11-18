const axios = require("axios");
const Papa = require("papaparse");
const bcrypt = require("bcrypt");
const { log } = console;
const { GITHUB_TOKEN, REPO_OWNER, REPO_NAME, FILE_PATH, BRANCH } = require("./config");

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
async function hashPasswords(csvData) {
  log(`Hashing ${csvData.length} rows`);
  return Promise.all(
    csvData.map(async (row) => {
      row.hash = await bcrypt.hash(row.password, 10);
      return row;
    })
  );
}

// Main function to execute the process
async function main() {
  try {
    log("Starting the process...");

    // Step 1: Get file content from GitHub
    const csvData = await getFileContent();
    if (!csvData) throw new Error("Failed to retrieve file content.");

    const csvParsed = Papa.parse(csvData, { header: true });

    // Add new user
    csvParsed.data.push({
      id: (csvParsed.data.length + 1).toString(),
      username: "steve",
      password: "asdasd",
    });

    // Hash passwords
    const hashedCsvData = await hashPasswords(csvParsed.data);

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

    // Test login
    login("steve", "asdasd");
  } catch (error) {
    log("Error in main function:", error.message);
  }
}

// Function for user login
async function login(username, password) {
    log(`${username} logging in...`);
  try {
    const csvData = await getFileContent();
    if (!csvData) {
        throw new Error("Failed to retrieve file content.");
    }

    const accountsCsv = Papa.parse(csvData, { header: true });
    const account = accountsCsv.data.find((acc) => acc.username === username);

    if (!account) {
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
    login
}