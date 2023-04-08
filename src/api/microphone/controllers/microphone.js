'use strict';

/**
 * microphone controller
 */
const {fileData, uploadStream} = require('../uploader/uploader.js');



const { createCoreController } = require('@strapi/strapi').factories;
const valueRequired = (data, ctx, name) => {
  if (!data)  throw {error: customError(ctx, `${name} is empty`)}
}
const customError = (ctx, log, status) => {
  return ctx.send({
    success: false,
    message: log
  }, 400);
}

module.exports = createCoreController('api::microphone.microphone', ({strapi}) => ({
  async create(ctx) {
    const {body, files} = ctx.request
    const {childID, name, date} = body
    const {file} = files
    if (file.type.search('audio') === -1) return customError(ctx, 'file type is not audio');

    try {
      valueRequired(childID, ctx,'childID')
      valueRequired(name, ctx,'name')
      valueRequired(date, ctx,'date')
      valueRequired(file, ctx,'file')
    }catch (e ){
      return e;
    }
    const _fileData = await fileData(file)
    const _ = await uploadStream(_fileData, 'records')
    const microphone = await strapi.entityService.create('api::microphone.microphone', {
      data: {
        name,
        child: childID,
        path: _.url,
        date,
        size: _.size,
      }
    })
    return microphone
  }
}));
