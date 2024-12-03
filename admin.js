const {loadUsers, hashPassword, saveChanges} = require("./login.js")
const readline = require('readline');
const encryptor = require('./encryption');
const { v4: uuidv4 } = require('uuid');

let users = [];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});


function showMenu() {
    console.log("\n==== User Management Menu ====");
    console.log("1. Create User");
    console.log("2. View Users");
    console.log("3. Update User");
    console.log("4. Delete User");
    console.log("5. Encrypt String");
    console.log("6. Decrypt String");
    console.log("7. Save and Exit");
    rl.question("Select an option: ", handleMenuSelection);
}

function handleMenuSelection(option) {
    switch (option) {
        case '1':
            createUser();
            break;
        case '2':
            viewUsers();
            break;
        case '3':
            updateUser();
            break;
        case '4':
            deleteUser();
            break;
        case '5':
            encryptString();
            break;
        case '6':
            decryptString();
            break;
        case '7':
            console.log("Saving and exiting...");
            saveChanges(users);
            rl.close();
            break;
        default:
            console.log("Invalid option. Please try again.");
            showMenu();
    }
}

// Add these new functions
function encryptString() {
    rl.question("Enter string to encrypt: ", (text) => {
        if (!text.trim()) {
            console.log("String cannot be empty.");
            showMenu();
            return;
        }

        try {
            const encrypted = encryptor.encrypt(text.trim());
            console.log("\nOriginal text:", text);
            console.log("Encrypted string:", encrypted);
            console.log("\nKeep this string safe - you'll need it for decryption!");
        } catch (error) {
            console.error("Encryption failed:", error.message);
        }
        
        showMenu();
    });
}

function decryptString() {
    rl.question("Enter encrypted string to decrypt: ", (encryptedText) => {
        if (!encryptedText.trim()) {
            console.log("Encrypted string cannot be empty.");
            showMenu();
            return;
        }

        try {
            const decrypted = encryptor.decrypt(encryptedText.trim());
            console.log("\nEncrypted string:", encryptedText);
            console.log("Decrypted text:", decrypted);
        } catch (error) {
            console.error("Decryption failed:", error.message);
        }
        
        showMenu();
    });
}

function createUser() {
    rl.question("Enter username: ", async (username) => {  // Make this async
        if (!username.trim()) {
            console.log("Username cannot be empty.");
            showMenu();
            return;
        }

        rl.question("Enter password: ", async (password) => {  // Make this async
            if (!password.trim()) {
                console.log("Password cannot be empty.");
                showMenu();
                return;
            }

            try {
                // Wait for the hash to complete
                const hashedPassword = await hashPassword(password.trim());
                
                // Add the new user with the hashed password
                users.push({ 
                    id: uuidv4(), 
                    username: username.trim(),
                    hash: hashedPassword
                });
                
                console.log(`User '${username}' added successfully.`);
                showMenu();
            } catch (error) {
                console.error('Error creating user:', error);
                showMenu();
            }
        });
    });
}

function viewUsers() {
    console.log("\n==== User List ====");
    if (users.length === 0) {
        console.log("No users found.");
    } else {
        users.forEach((user) => console.log(`ID: ${user.id}, Name: ${user.username}`));
    }
    showMenu();
}

async function updateUser() {
    rl.question("Enter user ID to update: ", async (id) => {
        const user = users.find((u) => u.id === id); // Remove parseInt since UUID is string
        if (user) {
            rl.question(`Enter new username (current: ${user.username}, press enter to keep): `, (newUserName) => {
                // Keep old username if nothing entered
                const updatedUsername = newUserName.trim() || user.username;
                
                rl.question("Enter new password (press enter to keep current): ", async (newPassword) => {
                    try {
                        // Only update what changed
                        user.username = updatedUsername;
                        if (newPassword.trim()) {
                            user.hash = await hashPassword(newPassword.trim());
                            console.log("Password updated");
                        }
                        
                        console.log(`User ID ${id} updated successfully.`);
                        showMenu();
                    } catch (error) {
                        console.error("Error updating user:", error);
                        showMenu();
                    }
                });
            });
        } else {
            console.log(`User with ID ${id} not found.`);
            showMenu();
        }
    });
}

function deleteUser() {
    rl.question("Enter user ID to delete: ", (id) => {
        const index = users.findIndex((u) => u.id === id);
        if (index !== -1) {
            const deletedUser = users.splice(index, 1);
            console.log(`User '${deletedUser[0].username}' deleted successfully.`);
        } else {
            console.log(`User with ID ${id} not found.`);
        }
        showMenu();
    });
}

// Load users and start the menu
async function init() {
    try {
        users = await loadUsers();
        // console.log(users);
        showMenu();
    } catch (error) {
        console.error('Error loading users:', error);
        process.exit(1);
    }
}

// Call the init function
init();
