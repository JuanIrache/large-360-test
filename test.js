const goproTelemetry = require(`gopro-telemetry`);
const gpmfExtract = require(`gpmf-extract`);
const path = require('path');
const { promises, createReadStream, writeFileSync } = require('fs');
const { readdir } = promises;

const directoryPath = path.join('./', 'videos');

const run = async () => {
  const files = await readdir(directoryPath);
  for (const file of files) {
    const fileExt = file.split('.').pop();
    if (fileExt == 360) {
      console.log(file + ' found');
      const fileName = file.split('.').shift();
      const filePath = path.join(directoryPath, file);
      const jsonPath = path.join(directoryPath, fileName + '.json');

      const bufferAppender = (filePath, chunkSize) => mp4boxFile => {
        const stream = createReadStream(filePath, { highWaterMark: chunkSize });
        console.log('Created bufferAppender stream');
        let bytesRead = 0;
        stream.on('end', mp4boxFile.flush);
        stream.on('data', chunk => {
          console.log('Chunk read');
          const arrayBuffer = new Uint8Array(chunk).buffer;
          arrayBuffer.fileStart = bytesRead;
          mp4boxFile.appendBuffer(arrayBuffer);
          bytesRead += chunk.length;
          //console.log('Chunk length: ' + chunk.length);
        });
        stream.resume();
      };

      // This is not waiting for the result of the async (Promise) function it creates!
      const fileData = (async () => {
        await bufferAppender(filePath, 500 * 1024 * 1204);
      })();

      ///////////////////////////////////////////////////////////////////////////

      // This will return a Promise that you can await. It will return a value when you use 'resolve' with whatever content you want
      const alternativeBufferAppender = (filePath, chunkSize) =>
        new Promise((resolve, reject) => {
          // mp4boxFile is not defined. Not sure what it should be here. Just creating an empty object to avoid crashes
          const stream = createReadStream(filePath, {
            highWaterMark: chunkSize
          });
          console.log('Created bufferAppender stream');
          let bytesRead = 0;
          stream.on('end', () => {
            // If this is the end of your file, use resolve here with the retrieved data
            const data =
              'replace this variable with the one you are storing your data in';
            resolve(data);
            // mp4boxFile.flush();
          });
          stream.on('data', chunk => {
            console.log('Chunk read');
            const arrayBuffer = new Uint8Array(chunk).buffer;
            arrayBuffer.fileStart = bytesRead;
            // mp4boxFile.appendBuffer(arrayBuffer);
            bytesRead += chunk.length;
            //console.log('Chunk length: ' + chunk.length);
          });
          stream.resume();
        });

      // We can await the result of the Promise that alternativeBufferAppender returns because we are insidy async code (the run() function)
      const alternativeFileData = await alternativeBufferAppender(
        filePath,
        500 * 1024 * 1204
      );
      // This should now contain something useful, whatever the Promise returns

      ///////////////////////////////////////////////////////////////////////////

      console.log('running gpmfExtract with', fileData);
      try {
        const extracted = await gpmfExtract(fileData);
        const telemetry = await goproTelemetry(extracted);
        writeFileSync(jsonPath, JSON.stringify(telemetry));
        console.log('Telemetry for ' + file + ' saved to JSON');
      } catch (error) {
        console.error(error);
      }
    }
  }
};

run();
