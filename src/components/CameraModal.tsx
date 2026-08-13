import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Check, SwitchCamera, AlertCircle, Upload } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { processUploadedFile } from '../utils/canvasHelper';

interface CameraModalProps {
  onCapturePhoto: (dataUrl: string, fileName: string) => void;
  onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  onCapturePhoto,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Start webcam stream
  const startCamera = async (facing: 'user' | 'environment') => {
    setIsLoading(true);
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1024 },
          height: { ideal: 1024 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    soundManager.playClick();
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  const handleTakeSnap = () => {
    if (!videoRef.current) return;
    soundManager.playSnap();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;

      // Mirror front camera photo so text/face looks natural
      if (facingMode === 'user') {
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedUrl(dataUrl);
    }
  };

  const handleRetake = () => {
    soundManager.playClick();
    setCapturedUrl(null);
  };

  const handleConfirmPhoto = async () => {
    if (!capturedUrl) return;
    soundManager.playVictory();
    
    // Convert dataUrl to a blob/file and compress
    try {
      const res = await fetch(capturedUrl);
      const blob = await res.blob();
      const file = new File([blob], `kamera-puzzle-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const processedUrl = await processUploadedFile(file);
      onCapturePhoto(processedUrl, `Foto Kamera (${new Date().toLocaleTimeString()})`);
    } catch {
      onCapturePhoto(capturedUrl, `Foto Kamera (${new Date().toLocaleTimeString()})`);
    }
  };

  const handleFallbackFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    soundManager.playSnap();
    const dataUrl = await processUploadedFile(file);
    onCapturePhoto(dataUrl, file.name.replace(/\.[^/.]+$/, ''));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 font-['Pixelify_Sans',sans-serif]">
      <div className="pixel-box max-w-md w-full p-4 sm:p-5 relative flex flex-col items-center text-center max-h-[95vh] overflow-hidden">
        
        {/* Hidden Fallback File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFallbackFileUpload}
          className="hidden"
        />

        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            if (stream) stream.getTracks().forEach((track) => track.stop());
            onClose();
          }}
          className="absolute top-3 right-3 pixel-btn-dark p-1 text-xs font-bold cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-1.5 text-theme-title text-xs font-bold uppercase mb-1">
          <Camera className="w-4 h-4" />
          <span>KAMERA PIXEL</span>
        </div>

        <h2 className="font-pixel-title text-sm sm:text-base text-theme-title mb-3">
          AMBIL FOTO KAMERA
        </h2>

        {/* Camera Display Box */}
        <div className="w-full aspect-square pixel-box-inner overflow-hidden relative mb-4 bg-black flex items-center justify-center">
          {/* Flash animation layer */}
          {isFlashing && <div className="absolute inset-0 bg-white z-30 animate-ping" />}

          {capturedUrl ? (
            /* Snap Preview */
            <img
              src={capturedUrl}
              alt="Snapshot"
              className="w-full h-full object-cover"
            />
          ) : cameraError ? (
            /* Error Fallback */
            <div className="p-4 flex flex-col items-center justify-center text-center text-red-400">
              <AlertCircle className="w-8 h-8 mb-2 animate-bounce" />
              <p className="text-xs mb-3 font-bold">{cameraError}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="pixel-btn-green px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>PILIH DARI GALERI / KAMERA HP</span>
              </button>
            </div>
          ) : (
            /* Live Stream Video */
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 text-white text-xs font-bold gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Membuka Kamera...</span>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center justify-center gap-2">
          {capturedUrl ? (
            <>
              <button
                onClick={handleRetake}
                className="pixel-btn-dark px-3 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ULANGI</span>
              </button>

              <button
                onClick={handleConfirmPhoto}
                className="pixel-btn-green px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer flex-1 justify-center"
              >
                <Check className="w-4 h-4" />
                <span>PAKAI FOTO INI</span>
              </button>
            </>
          ) : cameraError ? (
            <button
              onClick={() => startCamera(facingMode)}
              className="pixel-btn-dark px-3 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>COBA LAGI</span>
            </button>
          ) : (
            <>
              <button
                onClick={toggleFacingMode}
                title="Ganti Kamera Depan/Belakang"
                className="pixel-btn-dark p-2 text-xs font-bold cursor-pointer"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>

              <button
                onClick={handleTakeSnap}
                disabled={isLoading}
                className="pixel-btn-green py-2 px-5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer flex-1"
              >
                <Camera className="w-4 h-4" />
                <span>AMBIL FOTO 📸</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
