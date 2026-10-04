'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function SpacemanVtuber() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Speech bubble states
  const [bubbleText, setBubbleText] = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep track of smoothed animation states (lerped values)
  const animState = useRef({
    // Body translations
    bodyX: 0,
    bodyY: 0,
    bodyTilt: 0,
    
    // Head translations & rotation
    headX: 0,
    headY: 0,
    headTilt: 0,

    // Eye gaze offsets & blinking
    eyeGazeX: 0,
    eyeGazeY: 0,
    leftBlink: 0,  // 0 = open, 1 = closed
    rightBlink: 0, // 0 = open, 1 = closed

    // Left Arm / Hand
    leftHandX: 180, // Default idle position
    leftHandY: 380,
    leftHandZ: 0,
    leftHandAngle: 0,
    leftElbowX: 120,
    leftElbowY: 350,
    leftHandTracked: false,
    leftHandPoints: Array.from({ length: 21 }, () => ({ x: 180, y: 380, z: 0 })),

    // Right Arm / Hand
    rightHandX: 460, // Default idle position
    rightHandY: 380,
    rightHandZ: 0,
    rightHandAngle: 0,
    rightElbowX: 520,
    rightElbowY: 350,
    rightHandTracked: false,
    rightHandPoints: Array.from({ length: 21 }, () => ({ x: 460, y: 380, z: 0 })),
  });

  // Keep track of target coordinates updated from events
  const targetState = useRef({
    bodyX: 0,
    bodyY: 0,
    bodyTilt: 0,
    headX: 0,
    headY: 0,
    headTilt: 0,
    eyeGazeX: 0,
    eyeGazeY: 0,
    leftBlink: 0,
    rightBlink: 0,

    leftHandX: 180,
    leftHandY: 380,
    leftHandZ: 0,
    leftHandAngle: 0,
    leftElbowX: 120,
    leftElbowY: 350,
    leftHandTracked: false,
    leftHandPoints: Array.from({ length: 21 }, () => ({ x: 180, y: 380, z: 0 })),

    rightHandX: 460,
    rightHandY: 380,
    rightHandZ: 0,
    rightHandAngle: 0,
    rightElbowX: 520,
    rightElbowY: 350,
    rightHandTracked: false,
    rightHandPoints: Array.from({ length: 21 }, () => ({ x: 460, y: 380, z: 0 })),
  });

  // Track time elapsed for idle animation (breathing, floating)
  const timeRef = useRef(0);

  useEffect(() => {
    // 1. Listen for tracking update events from MediaPipe holistic
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      if (!data) return;

      const { poseLandmarks, leftHandLandmarks, rightHandLandmarks, faceLandmarks } = data;

      // Coordinate converter helper: Map 0..1 from MediaPipe to SVG 640x480
      // Mirror X coordinates by calculating: (1 - x) * 640
      const getCoord = (landmark: { x: number; y: number; z?: number }) => {
        if (!landmark) return { x: 320, y: 240, z: 0 };
        return {
          x: (1 - landmark.x) * 640,
          y: landmark.y * 480,
          z: landmark.z || 0
        };
      };

      // --- 1. Process Body and Head Pose ---
      if (poseLandmarks && poseLandmarks.length > 12) {
        const leftShoulder = getCoord(poseLandmarks[11]);
        const rightShoulder = getCoord(poseLandmarks[12]);
        const nose = getCoord(poseLandmarks[0]);
        const leftEar = getCoord(poseLandmarks[7]);
        const rightEar = getCoord(poseLandmarks[8]);

        // Shoulder Mid-point
        const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
        const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

        // Calculate Body tilt (angle of shoulders)
        const dX_sh = rightShoulder.x - leftShoulder.x;
        const dY_sh = rightShoulder.y - leftShoulder.y;
        const shAngle = Math.atan2(dY_sh, dX_sh) * (180 / Math.PI);

        // Map body deviation from center (default midShoulder is around 320, 280)
        targetState.current.bodyX = 0; // Lock body in place
        targetState.current.bodyY = 0; // Lock body in place
        targetState.current.bodyTilt = 0; // Lock body in place

        // Head tilt based on ear line
        if (leftEar && rightEar) {
          const dX_ear = rightEar.x - leftEar.x;
          const dY_ear = rightEar.y - leftEar.y;
          targetState.current.headTilt = Math.atan2(dY_ear, dX_ear) * (180 / Math.PI);
        } else {
          targetState.current.headTilt = shAngle;
        }

        // --- 2. Process Left Arm & Elbow (if available) ---
        const leftElbow = getCoord(poseLandmarks[13]);
        targetState.current.leftElbowX = leftElbow.x;
        targetState.current.leftElbowY = leftElbow.y;

        // --- 3. Process Right Arm & Elbow (if available) ---
        const rightElbow = getCoord(poseLandmarks[14]);
        targetState.current.rightElbowX = rightElbow.x;
        targetState.current.rightElbowY = rightElbow.y;
      }

      // --- 4. Process Left Hand ---
      if (leftHandLandmarks && leftHandLandmarks.length === 21) {
        targetState.current.leftHandTracked = true;
        const wrist = getCoord(leftHandLandmarks[0]);
        const knuckle = getCoord(leftHandLandmarks[5]); // base of index finger

        targetState.current.leftHandX = wrist.x;
        targetState.current.leftHandY = wrist.y;
        targetState.current.leftHandZ = wrist.z;

        const angle = Math.atan2(knuckle.y - wrist.y, knuckle.x - wrist.x) * (180 / Math.PI) + 90;
        targetState.current.leftHandAngle = angle;
        
        for (let i = 0; i < 21; i++) {
          targetState.current.leftHandPoints[i] = getCoord(leftHandLandmarks[i]);
        }
      } else {
        targetState.current.leftHandTracked = false;
      }

      // --- 5. Process Right Hand ---
      if (rightHandLandmarks && rightHandLandmarks.length === 21) {
        targetState.current.rightHandTracked = true;
        const wrist = getCoord(rightHandLandmarks[0]);
        const knuckle = getCoord(rightHandLandmarks[5]);

        targetState.current.rightHandX = wrist.x;
        targetState.current.rightHandY = wrist.y;
        targetState.current.rightHandZ = wrist.z;

        const angle = Math.atan2(knuckle.y - wrist.y, knuckle.x - wrist.x) * (180 / Math.PI) + 90;
        targetState.current.rightHandAngle = angle;
        
        for (let i = 0; i < 21; i++) {
          targetState.current.rightHandPoints[i] = getCoord(rightHandLandmarks[i]);
        }
      } else {
        targetState.current.rightHandTracked = false;
      }

      // --- 6. Process Face (Blinks & Eye Gaze) ---
      if (faceLandmarks && faceLandmarks.length > 380) {
        // Blink detection using eyelid distances normalized by eye corners
        const lTop = faceLandmarks[159];
        const lBot = faceLandmarks[145];
        const lLeft = faceLandmarks[33];
        const lRight = faceLandmarks[133];

        const leftDist = Math.hypot(lTop.x - lBot.x, lTop.y - lBot.y);
        const leftRef = Math.hypot(lLeft.x - lRight.x, lLeft.y - lRight.y);
        const leftRatio = leftDist / leftRef;

        const rTop = faceLandmarks[386];
        const rBot = faceLandmarks[374];
        const rLeft = faceLandmarks[362];
        const rRight = faceLandmarks[263];

        const rightDist = Math.hypot(rTop.x - rBot.x, rTop.y - rBot.y);
        const rightRef = Math.hypot(rLeft.x - rRight.x, rLeft.y - rRight.y);
        const rightRatio = rightDist / rightRef;

        targetState.current.leftBlink = leftRatio < 0.12 ? 1 : 0;
        targetState.current.rightBlink = rightRatio < 0.12 ? 1 : 0;

        // Eye gaze tracking (look direction)
        const leftPupil = faceLandmarks[468];
        const rightPupil = faceLandmarks[473];

        if (leftPupil && rightPupil) {
          const pupilX = (leftPupil.x + rightPupil.x) / 2;
          const eyeCenterX = (lLeft.x + lRight.x + rLeft.x + rRight.x) / 4;
          const deltaX = pupilX - eyeCenterX;
          targetState.current.eyeGazeX = -deltaX * 350;

          const pupilY = (leftPupil.y + rightPupil.y) / 2;
          const eyeCenterY = (lTop.y + lBot.y + rTop.y + rBot.y) / 4;
          const deltaY = pupilY - eyeCenterY;
          targetState.current.eyeGazeY = deltaY * 300;
        }
      }
    };

    window.addEventListener('vtuber-update', handleUpdate);

    // --- 2. Listen for Correct Gesture Event ---
    const motivationalWords = [
      "Good job!",
      "Doing well!",
      "Magaling!",
      "Galing!",
      "Wow!",
      "Tama!",
      "Awesome!",
      "Napakahusay!",
      "Keep it up!",
      "Superb!",
      "Perfect!",
      "Tumpak!"
    ];

    let lastTriggerTime = 0;

    const handleCorrectGesture = () => {
      const now = Date.now();
      if (now - lastTriggerTime < 3500) return; // 3.5s cooldown
      lastTriggerTime = now;

      // Select random motivational word
      const word = motivationalWords[Math.floor(Math.random() * motivationalWords.length)];
      setBubbleText(word);
      setBubbleVisible(true);

      // Hide bubble after 2.2 seconds
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => {
        setBubbleVisible(false);
      }, 2200);
    };

    window.addEventListener('vtuber-correct-gesture', handleCorrectGesture);

    // --- 2.5 Listen for Emotion Hint ---
    const handleEmotionHint = (e: any) => {
      setBubbleText('Make a ' + (e.detail?.emotion || 'correct') + ' face!');
      setBubbleVisible(true);

      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => {
        setBubbleVisible(false);
      }, 3000);
    };
    window.addEventListener('vtuber-emotion-hint', handleEmotionHint);

    // --- 3. High-performance Animation Render Loop (60 FPS) ---
    let frameId = 0;
    const lerp = (start: number, end: number, amt: number) => start + (end - start) * amt;

    const render = () => {
      timeRef.current += 0.055;
      const t = timeRef.current;

      // Subtle breathing oscillations
      const breatheOffset = Math.sin(t) * 3;
      const floatOffset = Math.cos(t * 0.5) * 6;

      const state = animState.current;
      const targets = targetState.current;

      // Lerp Body State
      state.bodyX = lerp(state.bodyX, targets.bodyX, 0.35);
      state.bodyY = lerp(state.bodyY, targets.bodyY + breatheOffset, 0.35);
      state.bodyTilt = lerp(state.bodyTilt, targets.bodyTilt, 0.35);

      // Lock Head to Body translation to keep it intact, only allowing rotation (tilting)
      state.headX = state.bodyX;
      state.headY = state.bodyY;
      state.headTilt = lerp(state.headTilt, targets.headTilt, 0.38);

      // Lerp Eyes
      state.eyeGazeX = lerp(state.eyeGazeX, targets.eyeGazeX, 0.45);
      state.eyeGazeY = lerp(state.eyeGazeY, targets.eyeGazeY, 0.45);
      state.leftBlink = lerp(state.leftBlink, targets.leftBlink, 0.5);
      state.rightBlink = lerp(state.rightBlink, targets.rightBlink, 0.5);

      // Calculate relative Shoulder Anchors on Body (used for limits)
      const getRotatedPoint = (px: number, py: number, cx: number, cy: number, angleDeg: number) => {
        const rad = angleDeg * Math.PI / 180;
        const s = Math.sin(rad);
        const c = Math.cos(rad);
        return {
          x: c * (px - cx) - s * (py - cy) + cx,
          y: s * (px - cx) + c * (py - cy) + cy
        };
      };

      const bodyCenterY = 380 + state.bodyY + floatOffset;
      const bodyCenterX = 320 + state.bodyX;

      const shL_rel = getRotatedPoint(265 + state.bodyX, 330 + state.bodyY + floatOffset, bodyCenterX, bodyCenterY, state.bodyTilt);
      const shR_rel = getRotatedPoint(375 + state.bodyX, 330 + state.bodyY + floatOffset, bodyCenterX, bodyCenterY, state.bodyTilt);

      // Limit Arm / Hand extension range to prevent hands from flying away from the body
      const maxArmLength = 145; // Capped radius to keep gloves intact on body

      // Helper to generate a relaxed fist pose relative to wrist
      const getIdleFingers = (wristX: number, wristY: number, angleDeg: number, isRight: boolean) => {
        const rad = angleDeg * Math.PI / 180;
        const s = Math.sin(rad);
        const c = Math.cos(rad);
        const sign = isRight ? -1 : 1;
        const p = Array.from({ length: 21 }, () => ({ x: wristX, y: wristY, z: 0 }));
        
        // Basic relaxed palm/fist geometry
        const localOffsets = [
          [0,0], [15*sign, -5], [25*sign, -15], [20*sign, -25], [10*sign, -20], // Thumb
          [-5*sign, -25], [-10*sign, -35], [-5*sign, -40], [5*sign, -35], // Index
          [-15*sign, -20], [-25*sign, -30], [-20*sign, -35], [-10*sign, -30], // Middle
          [-20*sign, -15], [-30*sign, -20], [-25*sign, -25], [-15*sign, -20], // Ring
          [-22*sign, -8], [-35*sign, -10], [-30*sign, -15], [-20*sign, -10]  // Pinky
        ];
        
        for (let i = 0; i < 21; i++) {
          const lx = localOffsets[i][0];
          const ly = localOffsets[i][1];
          p[i].x = wristX + c * lx - s * ly;
          p[i].y = wristY + s * lx + c * ly;
        }
        return p;
      };

      // Left Arm / Hand Lerp
      state.leftHandTracked = targets.leftHandTracked;
      let targetHandLX = targets.leftHandX;
      let targetHandLY = targets.leftHandY;
      let targetLeftPoints = targets.leftHandPoints;
      
      if (!targets.leftHandTracked) {
        targetHandLX = 180 + state.bodyX - Math.sin(state.bodyTilt * Math.PI / 180) * 50;
        targetHandLY = 380 + state.bodyY + floatOffset + Math.cos(state.bodyTilt * Math.PI / 180) * 10;
        targetLeftPoints = getIdleFingers(targetHandLX, targetHandLY, state.bodyTilt, false);
      }
      
      state.leftHandX = lerp(state.leftHandX, targetHandLX, 0.45);
      state.leftHandY = lerp(state.leftHandY, targetHandLY, 0.45);
      state.leftHandAngle = lerp(state.leftHandAngle, targets.leftHandTracked ? targets.leftHandAngle : state.bodyTilt, 0.45);
      state.leftHandZ = lerp(state.leftHandZ, targets.leftHandTracked ? targets.leftHandZ : 0, 0.45);

      for (let i = 0; i < 21; i++) {
        state.leftHandPoints[i].x = lerp(state.leftHandPoints[i].x, targetLeftPoints[i].x, 0.55);
        state.leftHandPoints[i].y = lerp(state.leftHandPoints[i].y, targetLeftPoints[i].y, 0.55);
        state.leftHandPoints[i].z = lerp(state.leftHandPoints[i].z, targetLeftPoints[i].z, 0.55);
      }

      // Apply Left Arm Length Constraint (Keep Hand intact with Shoulder)
      const dxL = state.leftHandX - shL_rel.x;
      const dyL = state.leftHandY - shL_rel.y;
      const distL = Math.hypot(dxL, dyL);
      if (distL > maxArmLength) {
        state.leftHandX = shL_rel.x + (dxL / distL) * maxArmLength;
        state.leftHandY = shL_rel.y + (dyL / distL) * maxArmLength;
      }

      // Compute Left Elbow position procedurally (Keeps sleeves intact and prevents weird bends)
      const midLX = (shL_rel.x + state.leftHandX) / 2;
      const midLY = (shL_rel.y + state.leftHandY) / 2;
      state.leftElbowX = midLX - 24; // bend outwards
      state.leftElbowY = midLY + 18; // bend downwards

      // Right Arm / Hand Lerp
      state.rightHandTracked = targets.rightHandTracked;
      let targetHandRX = targets.rightHandX;
      let targetHandRY = targets.rightHandY;
      let targetRightPoints = targets.rightHandPoints;

      if (!targets.rightHandTracked) {
        targetHandRX = 460 + state.bodyX + Math.sin(state.bodyTilt * Math.PI / 180) * 50;
        targetHandRY = 380 + state.bodyY + floatOffset + Math.cos(state.bodyTilt * Math.PI / 180) * 10;
        targetRightPoints = getIdleFingers(targetHandRX, targetHandRY, state.bodyTilt, true);
      }

      state.rightHandX = lerp(state.rightHandX, targetHandRX, 0.45);
      state.rightHandY = lerp(state.rightHandY, targetHandRY, 0.45);
      state.rightHandAngle = lerp(state.rightHandAngle, targets.rightHandTracked ? targets.rightHandAngle : state.bodyTilt, 0.45);
      state.rightHandZ = lerp(state.rightHandZ, targets.rightHandTracked ? targets.rightHandZ : 0, 0.45);

      for (let i = 0; i < 21; i++) {
        state.rightHandPoints[i].x = lerp(state.rightHandPoints[i].x, targetRightPoints[i].x, 0.55);
        state.rightHandPoints[i].y = lerp(state.rightHandPoints[i].y, targetRightPoints[i].y, 0.55);
        state.rightHandPoints[i].z = lerp(state.rightHandPoints[i].z, targetRightPoints[i].z, 0.55);
      }

      // Apply Right Arm Length Constraint (Keep Hand intact with Shoulder)
      const dxR = state.rightHandX - shR_rel.x;
      const dyR = state.rightHandY - shR_rel.y;
      const distR = Math.hypot(dxR, dyR);
      if (distR > maxArmLength) {
        state.rightHandX = shR_rel.x + (dxR / distR) * maxArmLength;
        state.rightHandY = shR_rel.y + (dyR / distR) * maxArmLength;
      }

      // Compute Right Elbow position procedurally
      const midRX = (shR_rel.x + state.rightHandX) / 2;
      const midRY = (shR_rel.y + state.rightHandY) / 2;
      state.rightElbowX = midRX + 24; // bend outwards
      state.rightElbowY = midRY + 18; // bend downwards

      // --- 4. DOM Updates ---
      const dom = containerRef.current;
      if (dom) {
        const bodyEl = dom.querySelector('#v-body') as SVGGraphicsElement;
        if (bodyEl) {
          bodyEl.style.transform = `translate(${state.bodyX}px, ${state.bodyY + floatOffset}px) rotate(${state.bodyTilt}deg)`;
        }

        const headEl = dom.querySelector('#v-head') as SVGGraphicsElement;
        if (headEl) {
          headEl.style.transform = `translate(${state.headX}px, ${state.headY + floatOffset * 1.15}px) rotate(${state.headTilt}deg)`;
        }

        const eyeLeftEl = dom.querySelector('#v-eye-l') as SVGGraphicsElement;
        const eyeRightEl = dom.querySelector('#v-eye-r') as SVGGraphicsElement;

        const lookX = Math.min(Math.max(state.eyeGazeX, -16), 16);
        const lookY = Math.min(Math.max(state.eyeGazeY, -10), 10);

        if (eyeLeftEl) {
          const blinkScale = 1 - state.leftBlink * 0.92;
          eyeLeftEl.style.transform = `translate(${lookX}px, ${lookY}px) scaleY(${blinkScale})`;
        }
        if (eyeRightEl) {
          const blinkScale = 1 - state.rightBlink * 0.92;
          eyeRightEl.style.transform = `translate(${lookX}px, ${lookY}px) scaleY(${blinkScale})`;
        }

        // Update Arm Bezier Curves
        const armL_El = dom.querySelector('#v-arm-l') as SVGPathElement;
        if (armL_El) {
          armL_El.setAttribute('d', `M ${shL_rel.x} ${shL_rel.y} Q ${state.leftElbowX} ${state.leftElbowY} ${state.leftHandX} ${state.leftHandY}`);
        }

        const armR_El = dom.querySelector('#v-arm-r') as SVGPathElement;
        if (armR_El) {
          armR_El.setAttribute('d', `M ${shR_rel.x} ${shR_rel.y} Q ${state.rightElbowX} ${state.rightElbowY} ${state.rightHandX} ${state.rightHandY}`);
        }

        // Generate SVG 'd' paths for fingers
        const buildFingersPath = (pts: {x:number,y:number}[]) => {
          if (!pts || pts.length < 21) return '';
          // Palm Base Polygon
          let d = `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[5].x} ${pts[5].y} L ${pts[9].x} ${pts[9].y} L ${pts[13].x} ${pts[13].y} L ${pts[17].x} ${pts[17].y} Z `;
          // Digits
          const fingers = [
            [1, 2, 3, 4],       // Thumb
            [5, 6, 7, 8],       // Index
            [9, 10, 11, 12],    // Middle
            [13, 14, 15, 16],   // Ring
            [17, 18, 19, 20]    // Pinky
          ];
          for (const f of fingers) {
            d += `M ${pts[f[0]].x} ${pts[f[0]].y} `;
            for (let i = 1; i < f.length; i++) {
              d += `L ${pts[f[i]].x} ${pts[f[i]].y} `;
            }
          }
          return d;
        };

        const dl = buildFingersPath(state.leftHandPoints);
        const lBase = dom.querySelector('#v-hand-l-path') as SVGPathElement;
        const lInner = dom.querySelector('#v-hand-l-path-inner') as SVGPathElement;
        if (lBase) lBase.setAttribute('d', dl);
        if (lInner) lInner.setAttribute('d', dl);

        const dr = buildFingersPath(state.rightHandPoints);
        const rBase = dom.querySelector('#v-hand-r-path') as SVGPathElement;
        const rInner = dom.querySelector('#v-hand-r-path-inner') as SVGPathElement;
        if (rBase) rBase.setAttribute('d', dr);
        if (rInner) rInner.setAttribute('d', dr);
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('vtuber-update', handleUpdate);
      window.removeEventListener('vtuber-correct-gesture', handleCorrectGesture);
      window.removeEventListener('vtuber-emotion-hint', handleEmotionHint);
      cancelAnimationFrame(frameId);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center overflow-visible bg-transparent"
    >
      {/* Dynamic Speech Bubble (Centered above helmet) */}
      {bubbleVisible && (
        <div className="absolute top-[8%] left-1/2 transform -translate-x-1/2 bg-white text-purple-950 px-4 py-2 rounded-2xl shadow-2xl text-[10px] md:text-[11px] font-black border-2 border-fuchsia-400 select-none animate-bounce flex items-center space-x-1.5 z-50 whitespace-nowrap">
          <span>🚀</span>
          <span className="uppercase tracking-wider">{bubbleText}</span>
          <span>✨</span>
          {/* Speech bubble pointer pointing down to head */}
          <div className="absolute bottom-[-8px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-t-[8px] border-t-white border-x-[6px] border-x-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]" />
        </div>
      )}

      {/* Interactive SVG Spaceman Avatar */}
      <svg 
        className="w-full h-full max-w-[640px] max-h-[480px] z-10 drop-shadow-[0_10px_20px_rgba(147,51,234,0.3)] overflow-visible"
        viewBox="0 0 640 480" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <radialGradient id="visorGradient" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="35%" stopColor="#1e3a8a" />
            <stop offset="85%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          <linearGradient id="cuffGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="cyberGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ================= BACKGROUND TANK / BACKPACK ================= */}
        <g id="v-body" className="origin-[320px_380px]">
          {/* Life support tank (rendered behind body) */}
          <rect x="235" y="310" width="28" height="120" rx="14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" />
          <rect x="377" y="310" width="28" height="120" rx="14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" />
          {/* Colored pipe connection indicators */}
          <circle cx="249" cy="330" r="5" fill="#f43f5e" />
          <circle cx="391" cy="330" r="5" fill="#06b6d4" />

          {/* ================= SPACESUIT BODY ================= */}
          {/* Main Torso */}
          <path 
            d="M 255 330 C 235 345, 235 440, 255 455 C 275 465, 365 465, 385 455 C 405 440, 405 345, 385 330 Z" 
            fill="url(#bodyGradient)" 
            stroke="#cbd5e1" 
            strokeWidth="3.5" 
          />

          {/* Collar / Neck Seal */}
          <ellipse cx="320" cy="312" rx="36" ry="11" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
          <rect x="302" y="298" width="36" height="14" rx="4" fill="#94a3b8" />

          {/* Chest Control Panel */}
          <rect x="290" y="338" width="60" height="52" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          {/* Panel Buttons */}
          <circle cx="304" cy="352" r="5" fill="#f43f5e" className="animate-pulse" />
          <circle cx="320" cy="352" r="5" fill="#3b82f6" />
          <circle cx="336" cy="352" r="5" fill="#eab308" />
          {/* Status Sliders */}
          <rect x="300" y="366" width="40" height="6" rx="2" fill="#475569" />
          <rect x="300" y="366" width="26" height="6" rx="2" fill="#10b981" />
          <rect x="300" y="377" width="40" height="6" rx="2" fill="#475569" />
          <rect x="300" y="377" width="14" height="6" rx="2" fill="#a855f7" />

          {/* Signo Chest Patch Logo */}
          <circle cx="265" cy="385" r="11" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
          <path d="M 261 387 L 265 380 L 269 387 Z" fill="#38bdf8" />
          <circle cx="265" cy="382" r="1.5" fill="#ffffff" />
        </g>

        {/* ================= SPACESUIT ARMS (BEZIER PATHS) ================= */}
        {/* Draw arms as thick white lines using quadratic curves */}
        {/* Left Arm sleeve */}
        <path 
          id="v-arm-l" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="28" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        {/* Inner shadow/stroke for 3D depth */}
        <path 
          id="v-arm-l" 
          fill="none" 
          stroke="#f1f5f9" 
          strokeWidth="22" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          opacity="0.9"
        />

        {/* Right Arm sleeve */}
        <path 
          id="v-arm-r" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="28" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          id="v-arm-r" 
          fill="none" 
          stroke="#f1f5f9" 
          strokeWidth="22" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          opacity="0.9"
        />

        {/* ================= HELMET & FACE (HEAD) ================= */}
        <g id="v-head" className="origin-[320px_280px]">
          {/* Main Helmet Dome */}
          <circle cx="320" cy="220" r="70" fill="url(#bodyGradient)" stroke="#cbd5e1" strokeWidth="4" />
          
          {/* Outer Glass Visor Shield */}
          <ellipse cx="320" cy="225" rx="54" ry="38" fill="url(#visorGradient)" stroke="#94a3b8" strokeWidth="3" />
          
          {/* Glowing Digital Eyes (inside visor) */}
          <g id="v-eyes" className="origin-[320px_225px]">
            {/* Left Eye LED */}
            <ellipse 
              id="v-eye-l" 
              cx="298" 
              cy="225" 
              rx="7" 
              ry="7" 
              fill="#22d3ee" 
              filter="url(#cyberGlow)" 
              className="origin-[298px_225px]"
            />
            {/* Right Eye LED */}
            <ellipse 
              id="v-eye-r" 
              cx="342" 
              cy="225" 
              rx="7" 
              ry="7" 
              fill="#22d3ee" 
              filter="url(#cyberGlow)" 
              className="origin-[342px_225px]"
            />
          </g>

          {/* Visor Glare / Highlight Curve */}
          <path 
            d="M 280 200 C 300 192, 340 192, 360 200 C 340 196, 300 196, 280 200 Z" 
            fill="#ffffff" 
            opacity="0.25" 
          />
          <path 
            d="M 272 215 C 270 225, 274 235, 278 240 C 275 235, 272 225, 272 215 Z" 
            fill="#ffffff" 
            opacity="0.15" 
          />
        </g>

        {/* ================= GLOVES / HANDS ================= */}
        {/* Left Skeletal Hand */}
        <path 
          id="v-hand-l-path" 
          fill="#cbd5e1" 
          stroke="#94a3b8" 
          strokeWidth="11" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          id="v-hand-l-path-inner" 
          fill="#f1f5f9" 
          stroke="#f1f5f9" 
          strokeWidth="7" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          opacity="0.9"
        />

        {/* Right Skeletal Hand */}
        <path 
          id="v-hand-r-path" 
          fill="#cbd5e1" 
          stroke="#94a3b8" 
          strokeWidth="11" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          id="v-hand-r-path-inner" 
          fill="#f1f5f9" 
          stroke="#f1f5f9" 
          strokeWidth="7" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          opacity="0.9"
        />
      </svg>
    </div>
  );
}
