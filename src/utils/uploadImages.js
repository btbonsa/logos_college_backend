const cloud = require('../config/cloudinary');

async function uploadIMage(file, folder = "logos-college-registration") {
    if (!file || !Buffer.isBuffer(file.buffer)) {
        return Promise.reject(new Error('An image file is required'));
    }
    return new Promise((resolve, reject) => {
        const stream = cloud.uploader.upload_stream({
            folder,
            resource_type: 'image',
        },
            (error, result) => {
                if (error) return reject(error);
                if (!result?.secure_url) {
                    return reject(new Error('Cloudinary did not return a secure image URL'));
                }
                return resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }

        )
        stream.end(file.buffer);
    })

}

async function deleteImage(publicId) {
    return await cloud.uploader.destroy(publicId, { resource_type: 'image' });

}


module.exports = {
    uploadIMage,
    deleteImage
}