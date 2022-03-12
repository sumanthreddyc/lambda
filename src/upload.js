"use strict";

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const s3 = new AWS.S3();
const width = 200;
const height = 200;
const imageType = "image/png";
const bucket = process.env.Bucket;
const chromium = require("chrome-aws-lambda");
const fs = require("fs");

module.exports.handler = async (event, context, callback) => {
  let requestBody = JSON.parse(event.body);
  let domainUrl = requestBody.domainUrl;
  let result = null;
  let browser = null;
  let objectId = uuidv4();
  let objectKey = `resize-${width}x${height}-${objectId}.png`;
  // await page.goto("https://www.scrapehero.com/");
  // await page.screenshot({ path: "./image.jpg", type: "jpeg" });
  // await page.close();
  // await browser.close();

  browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  let page = await browser.newPage();
  console.log("domainUrl:", domainUrl);

  await page.goto(domainUrl || "https://example.com");
  await page.screenshot({ path: "/tmp/image.jpg", type: "jpeg" });
  console.log("screenshot captured");
  await page.close();
  await browser.close();

  const fileName = "/tmp/image.jpg";

  fs.readFile(fileName, (err, data) => {
    if (err) throw err;
    console.log("data:", data);
    uploadToS3(data, objectKey)
      .then(function (response) {
        console.log(`Image ${objectKey} was uploaed and resized`);
        callback(null, {
          statusCode: 200,
          body: JSON.stringify(objectKey),
        });
      })
      .catch((error) => console.log(error));
  });
};

/**
 * @param {*} data
 * @param {string} key
 */
function uploadToS3(data, key) {
  return s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: imageType,
    })
    .promise();
}
