const fs = require('fs');

const envContent = `GROQ_API_KEY = ${process.env.GROQ_API_KEY || ''}
unsplash_Access_Key = ${process.env.unsplash_Access_Key || ''}
unsplash_Secret_key = ${process.env.unsplash_Secret_key || ''}
`;

fs.writeFileSync('env.txt', envContent.trim());
console.log('Successfully generated env.txt from Render environment variables!');
