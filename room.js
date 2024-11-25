const axios = require("axios");
const Papa = require("papaparse");

const { log } = console;
const encryptor = require('./encryption');
const { 
    ENCRYPTED_GITHUB_TOKEN, 
    REPO_OWNER, 
    REPO_NAME, 
    ROOM_DIR, 
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
async function getFileContent(roomId) {
  log("Retrieving file content from GitHub...");
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${ROOM_DIR}/${roomId}.json?ref=${BRANCH}`;
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
async function updateFileOnGitHub(content, sha, roomId) {
  log("Updating file on GitHub...");
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${ROOM_DIR}/${roomId}.json?ref=${BRANCH}`;
  // const encodedContent = Buffer.from(content).toString("base64");
  const encodedContent = Buffer.from(JSON.stringify(content, null, 2)).toString("base64");
  // log(content)
  // log(encodedContent)
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

// Main function to execute the process
async function saveChangeDescription(newSceneDescription, roomId) {
  try {

    log(`Retrieving Room ${roomId} file SHA for update...`);
    const fileInfoResponse = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${ROOM_DIR}/${roomId}.json?ref=${BRANCH}`,
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
    await updateFileOnGitHub(newSceneDescription, sha, roomId);
    log("Process completed successfully.");

  } catch (error) {
    log("Error in saveChanges function:", error.message);
  }
}

async function getRoom(roomId) {
  log(`fetching room Id ${roomId}`)
  try {
    const roomData = await getFileContent(roomId);
    if (!roomData) {
        throw new Error("Failed to retrieve file content.");
    }
    log(`roomData `, roomData)
    return { sceneDescription: roomData, limit:4, players: [] }
  } catch (error) {
    log(error)
    return  { sceneDescription: [], limit:4, players: [] }
  }
}

module.exports = {
  saveChangeDescription, getRoom
}