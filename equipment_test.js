function seededRandom(seed) {
    let value = seed;
    return function () {
        value = (value * 16807) % 2147483647; // Simple LCG algorithm
        return (value - 1) / 2147483646; // Normalize to [0, 1)
    };
}

function getHashCode(str) {
    let hash = 0;

    // If the string is empty, return 0
    if (str.length === 0) return hash;

    // Loop through each character in the string
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i); // Get the character code
        hash = (hash << 5) - hash + char; // Hashing function
        hash |= 0; // Convert to a 32-bit integer
    }

    return hash;
}
function equipmentNameEval(playerId, equipmentId) {
    const rng = seededRandom(getHashCode(playerId))
    return eval(equipmentId)
}
const player1 = "player1"
const player2 = "player2"
const gun = "'gun'+rng()"

console.log(equipmentNameEval(player1,gun))
console.log(equipmentNameEval(player2,gun))
console.log(equipmentNameEval(player1,gun))
console.log(equipmentNameEval(player2,gun))
