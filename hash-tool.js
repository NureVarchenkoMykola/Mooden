const bcrypt = require('bcrypt');

const password = process.argv[2]; 

if (!password) {
    console.log('Помилка: Будь ласка, вкажіть пароль.');
    console.log('Приклад: node hash-tool.js мій_пароль_123');
    process.exit(1);
}

const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Помилка при створенні хешу:', err);
        return;
    }
    
    console.log('\n--- ГЕНЕРАТОР ХЕШІВ MOODEN ---');
    console.log('Оригінальний пароль:', password);
    console.log('Готовий хеш для БД:', hash);
    console.log('------------------------------\n');
});