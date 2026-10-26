const fs = require('fs/promises');
const path = require('path');

const authPath = path.join(process.cwd(), '.data', 'auth.json');

fs.rm(authPath, { force: true })
  .then(() => {
    console.log('Local auth settings dihapus. Login akan kembali memakai ADMIN_USERNAME dan ADMIN_PASSWORD_HASH dari .env.local.');
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
