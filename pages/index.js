import React, { useRef, useEffect, useState } from "react";
import * as bodyPix from "@tensorflow-models/body-pix";
import * as tf from "@tensorflow/tfjs";

const modelConfig = {
  architecture: "MobileNetV1",
  outputStride: 16,
  multiplier: 1,
  quantBytes: 4,
};
export default function Home() {
  let outputContext, inputVideo, temporaryContext, temporaryCanvas, outputCanvas;

  const processedVid = useRef();
  const rawVideo = useRef();
  const startBtn = useRef();
  const closeBtn = useRef();
  const videoDownloadRef = useRef();
  const [model, setModel] = useState(null);
  const [link, setLink] = useState("");
  const [blob, setBlob] = useState();

  const segmentationConfig = {
    internalResolution: "full",
    segmentationThreshold: 0.1,
    scoreThreshold: 0.4,
  };

  useEffect(() => {
    if (model) return;
    bodyPix.load(modelConfig).then((m) => {
      setModel(m);
    });
  }, []);

  const startVideo = async () => {
    console.log("playing video...")
    rawVideo.current.play()
    inputVideo = rawVideo.current;
    await rawVideo.current.play().then(() => {
      transform()
      console.log("object")
    })
  }

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

  const stopVideo = () => {
    console.log("Hanging up the call ...");
    console.log(blob)

  };
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
              controls
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
}