// run this in your browser console to clear all localStorage
// localStorage.clear() should do it but lets be extra sure
console.log('clearing all localStorage...');

// clear all items one by one
Object.keys(localStorage).forEach(key => {
    localStorage.removeItem(key);
});

// and clear the whole thing
localStorage.clear();

console.log('localStorage cleared, reload the page'); 