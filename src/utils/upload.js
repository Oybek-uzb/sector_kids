const { extname, join } = require("path");
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

module.exports = {
  async uploadFile(file, publicFolder) {
    try {
      const fileExt = extname(file.name)
      const data = fs.readFileSync(file.path);
      const fileName = join(publicFolder, uuidv4() + fileExt);
      const newPath = join(strapi.dirs.static.public, 'uploads', fileName);
      fs.writeFileSync(newPath, data);
      return [true, fileName]
    } catch (err) {
      strapi.log.error('error in function uploadFaceLocal, error: ', err)
      return [false, '']
    }
  }
}
