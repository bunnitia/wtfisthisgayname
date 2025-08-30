// Test script for gibberish generation function
function generateGibberishText(originalText) {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const vowels = 'aeiou';
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    
    return originalText.split('').map(char => {
        // Preserve spaces, punctuation, and numbers
        if (char === ' ' || /[.,!?;:'"()\[\]{}@#$%^&*+=<>\/\\|`~]/.test(char) || /[0-9]/.test(char)) {
            return char;
        }
        
        // For letters, generate random letters with some vowel/consonant pattern
        if (/[a-zA-Z]/.test(char)) {
            // 40% chance to use a vowel, 60% chance to use a consonant
            const isVowel = Math.random() < 0.4;
            const letterPool = isVowel ? vowels : consonants;
            return letterPool[Math.floor(Math.random() * letterPool.length)];
        }
        
        // For any other characters, return as is
        return char;
    }).join('');
}

// Test cases
const testMessages = [
    "i'm a barbie boy, in the barbie world, life in plastic. it's fantastic!",
    "Hello world! How are you today?",
    "This is a test message with numbers 123 and symbols @#$%",
    "Simple message",
    "A",
    "123",
    "!@#$%"
];

console.log("Testing gibberish generation function:\n");

testMessages.forEach((message, index) => {
    console.log(`Test ${index + 1}:`);
    console.log(`Original: "${message}"`);
    console.log(`Gibberish: "${generateGibberishText(message)}"`);
    console.log(`Length match: ${message.length === generateGibberishText(message).length ? '✓' : '✗'}`);
    console.log('');
});
