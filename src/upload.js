"use strict";
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const s3 = new AWS.S3();
const imageType = "image/png";
const bucket = process.env.Bucket;
const chromium = require("chrome-aws-lambda");
const fs = require("fs");

module.exports.handler = async (event, context, callback) => {
  let requestBody = JSON.parse(event.body);
  let domainUrl = requestBody.domainUrl;
  let domainName = requestBody.domainName;
  let browser = null;
  let objectId = uuidv4();
  let objectKey = `${domainName}-${objectId}.png`;

  browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  let page = await browser.newPage();
  await page.goto(domainUrl || "https://example.com", {
    waitUntil: "networkidle0",
  });
  const buffer = await page.screenshot();
  await page.close();
  await browser.close();

  await uploadToS3(buffer, objectKey).then(function (response) {
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(objectKey),
    });
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
