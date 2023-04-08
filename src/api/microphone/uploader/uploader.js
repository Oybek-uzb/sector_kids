const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const {PayloadTooLargeError} = require('@strapi/utils').errors;
const { extension } = require('mime-types');
const {pipeline} = require("stream");


const sizeLimitImage = parseInt(process.env.IMAGE_UPLOAD_MAX_SIZE);
const sizeLimitVideo = parseInt(process.env.VIDEO_UPLOAD_MAX_SIZE);
const sizeLimitFile = parseInt(process.env.UPLOAD_MAX_SIZE);
const UPLOADS_FOLDER_NAME = 'uploads'
const verifySize = (file) => {
  const isVideo = file.mime.search('video')
  const isImage = file.mime.search('image')
  if ((file.size > sizeLimitImage) && (isImage > -1))  throw new PayloadTooLargeError(`Too large image, max size is ${sizeLimitImage / 1000000} MB`);
  else if ((file.size > sizeLimitVideo) && (isVideo > -1)) throw new PayloadTooLargeError(`Too large video, max size is ${sizeLimitVideo / 1000000} MB`);
  else if (file.size > sizeLimitFile) throw new PayloadTooLargeError(`Too large file, max size is ${sizeLimitFile / 1000000} MB`);
};

const uploadPath = path.resolve(strapi.dirs.static.public, UPLOADS_FOLDER_NAME);
const generateFileName = (name) => {
  return `${name}_${new Date().toISOString()}`
};


if (!fse.pathExistsSync(uploadPath)) {
  throw new Error(
    `The upload folder (${uploadPath}) doesn't exist or is not accessible. Please make sure it exists.`
  );
}


const formatFileInfo = async function(file) {
  let ext = path.extname(file.name);
  if (!ext) {
    ext = `.${extension(file.type)}`;
  }
  const basename = path.basename(file.name, ext);
  return {
    name: basename,
    file: file.name,
    hash: generateFileName(basename),
    ext,
    mime: file.type,
    size: file.size,
    stream: fs.createReadStream(file.path)
  }
}

module.exports = {
  async fileData (file) {
    const currentFile = await formatFileInfo(file)
    return currentFile
  },
  async uploadStream(file, folder) {
    const _uploadPath = path.resolve(strapi.dirs.static.public, `${UPLOADS_FOLDER_NAME + '/' + folder}`);
    return new Promise( (resolve, reject) => {
      pipeline(
        file.stream,
        fs.createWriteStream(path.join(_uploadPath, `${file.hash}${file.ext}`)),
        async (err) => {
          if (err) return reject(err);
          delete file.stream


          const _path = path.join(_uploadPath, `${file.hash}${file.ext}`)
          file.url = `/${folder}/${file.hash}${file.ext}`;

          resolve(file);
        }
      );
    });
  },
}
