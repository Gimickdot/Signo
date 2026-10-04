'use client'

import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as tf from "@tensorflow/tfjs";
import * as cam from '@mediapipe/camera_utils';
import * as holistics from '@mediapipe/holistic';
import { drawConnectors } from '@mediapipe/drawing_utils';

let holisticInstance: any = null;

export default function EmotionTestPage() {
  const webcamRef = useRef<Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const emotionNetRef = useRef<tf.LayersModel | null>(null);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  
  const [emotionProbs, setEmotionProbs] = useState<{ [key: string]: number }>({
    happy: 0,
    sad: 0,
    angry: 0,
    neutral: 0
  });
  const [predictedEmotion, setPredictedEmotion] = useState<string>('neutral');

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        const loadedEmotionModel = await tf.loadLayersModel('/fsl/emotion_model/model.json');
        emotionNetRef.current = loadedEmotionModel;
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Error loading emotion model:', error);
        setModelError(error instanceof Error ? error.message : String(error));
      }
    };
    loadModel();
  }, []);

  const onResults = (results: any) => {
    if (!canvasRef.current || !webcamRef.current || !webcamRef.current.video) return;

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (canvasCtx) {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.translate(canvasRef.current.width, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (results.faceLandmarks) {
        drawConnectors(canvasCtx, results.faceLandmarks, holistics.FACEMESH_TESSELATION, {
          color: '#C0C0C070',
          lineWidth: 1
        });
      }
      canvasCtx.restore();
    }

      if (results.faceLandmarks && emotionNetRef.current) {
        // Heuristic Emotion Detection using FaceMesh Landmarks
        const lm = results.faceLandmarks;
        
        // Helper to calculate euclidean distance
        const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        
        const faceWidth = dist(lm[234], lm[454]); // Left and right edges of face
        const faceHeight = dist(lm[10], lm[152]); // Top of head to chin
        
        const mouthCenterY = (lm[13].y + lm[14].y) / 2;
        const mouthCornersY = (lm[61].y + lm[291].y) / 2;
        
        // BUGFIX: Normalize the smile curve by face height so it doesn't explode when close to camera
        const normSmileCurve = (mouthCenterY - mouthCornersY) / faceHeight; 

        // Inner Brow Distance (Furrow)
        const innerBrowDist = dist(lm[107], lm[336]) / faceWidth;
        
        // Eyebrow distance to eyes
        const leftBrowEyeDist = dist(lm[107], lm[159]);
        const rightBrowEyeDist = dist(lm[336], lm[386]);
        const normBrowEyeDist = (leftBrowEyeDist + rightBrowEyeDist) / (2 * faceHeight);

        // Expose debug metrics to window for the UI
        (window as any).debugMetrics = { normSmileCurve, innerBrowDist, normBrowEyeDist };

        // Probabilities
        let happy = 0, sad = 0, neutral = 100;

        // Happy: Subtle smile (corners curve up)
        if (normSmileCurve > 0.01) {
            happy += (normSmileCurve - 0.01) * 20000;
        }
        
        // Sad: Frown (mouth corners curve down)
        if (normSmileCurve < -0.005) {
            sad += (-0.005 - normSmileCurve) * 20000;
        }

        const total = happy + sad + neutral;
        const probsArray = [happy/total, sad/total, neutral/total];
        
        const emotions = ['happy', 'sad', 'neutral'];
        let maxProbIndex = probsArray.indexOf(Math.max(...probsArray));
        
        setPredictedEmotion(emotions[maxProbIndex]);
        setEmotionProbs({
          happy: probsArray[0],
          sad: probsArray[1],
          angry: 0,
          neutral: probsArray[2]
        });
      }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!holisticInstance) {
      holisticInstance = new holistics.Holistic({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });
      holisticInstance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    }

    holisticInstance.onResults(onResults);

    let camera: cam.Camera | null = null;
    if (webcamRef.current && webcamRef.current.video) {
      camera = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current && webcamRef.current.video) {
            await holisticInstance.send({ image: webcamRef.current.video });
          }
        },
        width: 640,
        height: 480
      });
      camera.start();
    }

    return () => {
      if (camera) {
        camera.stop();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-fuchsia-400">Emotion Model Tester</h1>
          <div className="flex gap-4">
            <div className="text-white bg-black/50 p-2 rounded text-xs font-mono">
              Smile: {(typeof window !== 'undefined' ? (window as any).debugMetrics?.normSmileCurve || 0 : 0).toFixed(4)} <br/>
              BrowGap: {(typeof window !== 'undefined' ? (window as any).debugMetrics?.innerBrowDist || 0 : 0).toFixed(4)} <br/>
              EyeDist: {(typeof window !== 'undefined' ? (window as any).debugMetrics?.normBrowEyeDist || 0 : 0).toFixed(4)}
            </div>
            <button 
              onClick={() => { (window as any).useNormalized = (window as any).useNormalized === false ? true : false; }}
              className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-lg text-sm font-bold"
            >
              Toggle Normalization
            </button>
            <a href="/" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold">Back to Game</a>
          </div>
        </div>
        
        {modelError && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-lg border border-red-500/30">
            {modelError}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-white/10">
            <Webcam
              ref={webcamRef}
              className="absolute inset-0 w-full h-full object-cover z-0"
              mirrored={true}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover z-10"
            />
            {!isModelLoaded && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                <span className="text-white font-bold animate-pulse">Loading Model...</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-6 bg-white/5 p-6 rounded-xl border border-white/10 shadow-xl">
            <h2 className="text-xl font-bold uppercase tracking-widest text-white/50 mb-4">Real-time Probabilities</h2>
            
            <div className="text-center py-6 bg-black/30 rounded-xl mb-4 border border-white/5">
              <p className="text-sm text-white/50 uppercase tracking-widest mb-2">Detected Emotion</p>
              <p className="text-5xl font-black uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                {predictedEmotion}
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              {['happy', 'sad', 'neutral'].map((emotion) => {
                const prob = emotionProbs[emotion as keyof typeof emotionProbs] || 0;
                const percentage = Math.round(prob * 100);
                const isDominant = predictedEmotion === emotion;
                
                return (
                  <div key={emotion} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span className={`uppercase tracking-wider ${isDominant ? 'text-fuchsia-400' : 'text-white/60'}`}>
                        {emotion}
                      </span>
                      <span className={isDominant ? 'text-white' : 'text-white/40'}>
                        {percentage}%
                      </span>
                    </div>
                    <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full transition-all duration-100 ease-linear ${isDominant ? 'bg-fuchsia-500 shadow-[0_0_10px_#d946ef]' : 'bg-white/20'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
