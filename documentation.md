### Remove Character from video in Nextjs


## Introduction

This article demonstrates how a human character can be extracted from a video using nextjs and tensorflow.

## Codesandbox

Check the sandbox demo on  [Codesandbox](/).

<CodeSandbox
title="mergevideos"
id=" "
/>

You can also get the project github repo using [Github](/).

## Prerequisites

Entry-level javascript and React/Nextjs knowledge.

## Setting Up the Sample Project

In your respective folder, create a new net js app using `npx create-next-app removePerson` in your terminal.
Head to your project root directory `cd removePerson`
 

We will begin by setting up [Cloudinary](https://cloudinary.com/?ap=em) intergrationin our next js backend. We will it to configure the cloudinary media file upload procedure.

Create your own cloudinary account using [Link](https://cloudinary.com/console) and log into it. Each cloudinary user account will have a dash board containing enviroment variable keys which are neccessary for the cloudinary intergration in our project.

In your project directory, start by including Cloudinary in your project dependancies `npm insstall cloudinary`
 create a new file named `.env` and paste the following code. Fill the blanks with your environment variables from cloudinary dashboard.

```
CLOUDINARY_CLOUD_NAME =

CLOUDINARY_API_KEY =

CLOUDINARY_API_SECRET =
```

Restart your project: `npm run dev`.

In the `pages/api` folder, create a new file named `upload.js`. 
Start by configuring the environment keys and libraries.

```
var cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
```

Create a handler function to execute the POST request. The function will receive media file data and post it to the cloudinary website. It then captures the media file's cloudinary link and send it back as a response.

```
export default async function handler(req, res) {
    if (req.method === "POST") {
        let url = ""
        try {
            let fileStr = req.body.data;
            const uploadedResponse = await cloudinary.uploader.upload_large(
                fileStr,
                {
                    resource_type: "video",
                    chunk_size: 6000000,
                }
            );
            url = uploadedResponse.url
        } catch (error) {
            res.status(500).json({ error: "Something wrong" });
        }

        res.status(200).json({data: url});
    }
}
```

 

The code above concludes our backend.

Before we proceed to the front end, we need to install the necessary dependancies: `npm install @tensorflow-models/body-pix @tensorflow/tfjs`.

In the `pages/index` folder, start by includingthe necessary imports.

```
import React, { useRef, useEffect, useState } from "react";
import * as bodyPix from "@tensorflow-models/body-pix";
import * as tf from "@tensorflow/tfjs";

```

Our bodyPix model configuration will be used to load a MobileNetV1 architecture with a 0.75 multiplier which is preferrable flexible for lower end  GPUs. As for the outputStrides, multiplier and quantBytes, the higher the settings number, the better the segmentation accuracy at the cost of processing speed.

```
const modelConfig = {
  architecture: "MobileNetV1",
  outputStride: 16,
  multiplier: 1,
  quantBytes: 4,
};
```
Declare the following variables. We will use them as we move on:
```
let outputContext, inputVideo, temporaryContext, temporaryCanvas, outputCanvas;

  const processedVid = useRef();
  const rawVideo = useRef();
  const startBtn = useRef();
  const closeBtn = useRef();
  const videoDownloadRef = useRef();
  const [model, setModel] = useState(null);
  const [link, setLink] = useState("");
  const [blob, setBlob] = useState();
```
Next let's configure the segmentation model.

```
  const segmentationConfig = {
    internalResolution: "full",
    segmentationThreshold: 0.1,
    scoreThreshold: 0.4,
    flipHorizontal: true,
    maxDetections: 1,
  };
```

In the code above, the higher the internalResolution the the more accurate the model at the cost of slower prediction times. 
The segmentation threshold is the minimum confident threshold before each pixel is considered part of a human body.
The score threshold is the minimum confident threshold to recognize entire human body.

Next , we load the bodyPix model with our configuration iside a useEffext hook

```
  useEffect(() => {
    if (model) return;
    bodyPix.load(modelConfig).then((m) => {
      setModel(m);
    });
  }, []);
```

Create a function `startVideo` that will triger the video element to play

```
  const startVideo = async () => {
    console.log("playing video...")
    rawVideo.current.play()
    inputVideo = rawVideo.current;
    await rawVideo.current.play().then(() => {
      transform()
      console.log("object")
    })
  }
```
The function above also triggers the `transform` function.
```
  let transform = () => {
    // let ;
    outputCanvas = processedVid.current;
    outputContext = outputCanvas.getContext("2d");

    temporaryCanvas = document.createElement("canvas");
    temporaryCanvas.setAttribute("width", 800);
    temporaryCanvas.setAttribute("height", 450);

    temporaryContext = temporaryCanvas.getContext("2d");

    computeFrame();
  };
```

 Here we assign our variables to the dom canvas element and another to a temporary canvas, then trigger the `computeFrame` function.

 ```
   let computeFrame = () => {
    // console.log(inputVideo.videoWidth)
    temporaryContext.drawImage(
      inputVideo,
      0,
      0,
      inputVideo.videoWidth,
      inputVideo.videoHeight
    );

    let frame = temporaryContext.getImageData(
      0,
      0,
      inputVideo.videoWidth,
      inputVideo.videoHeight
    );

    model.segmentPerson(frame, segmentationConfig).then((segmentation) => {
      let output_img = outputContext.getImageData(
        0,
        0,
        inputVideo.videoWidth,
        inputVideo.videoHeight
      );

      for (let x = 0; x < inputVideo.videoWidth; x++) {
        for (let y = 0; y < inputVideo.videoHeight; y++) {
          let n = x + y * inputVideo.videoWidth;
          if (segmentation.data[n] == 0) {
            output_img.data[n * 4] = frame.data[n * 4]; // R
            output_img.data[n * 4 + 1] = frame.data[n * 4 + 1]; // G
            output_img.data[n * 4 + 2] = frame.data[n * 4 + 2]; // B
            output_img.data[n * 4 + 3] = frame.data[n * 4 + 3]; // A
          }
        }
      }
      // console.log(segmentation);
      outputContext.putImageData(output_img, 0, 0);
      setTimeout(computeFrame, 0);
    });
    const chunks = [];
    const cnv = processedVid.current;
    const stream = cnv.captureStream();
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = e => setBlob(new Blob(chunks, { type: 'video/webm' }));
    rec.start();
    setTimeout(() => rec.stop(), 10000);
}
```
The `computeFrame` function will first draw the current video frame on the temporary canvas using the draw image method. It then uses the `getImageData` method to get pixel data on the canvas. We then call a `segmentPerson` method using the current image data  on the canvas and configuration for analyzation. We iterate through exery pixel using a nested loop and use an index variable n to access the pixels. We then use an if statement to check if the current pixel is not part of a Human then we'll copy the pixel data from the video to the output canvas. The updating process will be skipped incase the pixels are not human. The index are multiplied by 4 because each of the pixel has 4 datas, the RGB and the alpha, accumulating to 4 array spaces. Finally, put the result in the output canvas. 

To record our final video, we create an array `chunks` which we will populate wour processed canvas frames using a media stream to creat a blob.

The final function required will be the `uploadVideo` function which will convert the blob to base64 format using a file reader and post it to the backend for cloudinary upload.

```
"pages/index"

function readFile(file) {
    console.log("readFile()=>", file);
    return new Promise(function (resolve, reject) {
      let fr = new FileReader();

      fr.onload = function () {
        resolve(fr.result);
      };

      fr.onerror = function () {
        reject(fr);
      };

      fr.readAsDataURL(file);
    });
  }

  const uploadVideo = async (base64) => {
    console.log("uploading to backend...");
    await readFile(blob).then((encoded_file) => {
      try {
        fetch('/api/upload', {
          method: 'POST',
          body: JSON.stringify({ data: encoded_file }),
          headers: { 'Content-Type': 'application/json' },
        })
          .then((response) => response.json())
          .then((data) => {
            setLink(data.data);
          });
      } catch (error) {
        console.error(error);
      }
    });
};
```

Finally, use the code below in your return statement to design your UI.

```
"pages/index"

return (
    <>
      <div className="container">
        <div className="header">
          <h1 className="heading">
            Remove character from video
          </h1>
        </div>
        <div className="row">
          <div className="column">
            <video
              id="video"
              width="800px"
              src="sample.mp4"
              autoPlay
              ref={rawVideo}
              loop
              muted
            />
          </div>
          <div className="column">
            {link ?
              <h4><a href={link}>Get Copy</a></h4>
              :
              <img id="loading" width="50" height="30" src="https://mir-s3-cdn-cf.behance.net/project_modules/disp/f1055231234507.564a1d234bfb6.gif" />
            }
            <br />
            <canvas className="display" width={800} height={450} ref={processedVid}></canvas>
          </div>
        </div>
        <div className="buttons">
          <button className="button" ref={startBtn} onClick={startVideo}>
            Process Video
          </button>

          <button className="button" onClick={uploadVideo}>
            <a ref={videoDownloadRef}>
              Stop and upload
            </a>
          </button>
        </div>
      </div>
    </>
)
```
The code above results in the following. Check the css in the github repo.
![complete UI](https://res.cloudinary.com/dogjmmett/image/upload/v1649057806/UI_bpiazp.png "complete UI")

Our project is complete. Ensure to go throught the article to enjoy the experience.