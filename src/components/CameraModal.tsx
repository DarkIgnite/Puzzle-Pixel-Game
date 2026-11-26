import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Check, SwitchCamera, AlertCircle, Upload, Timer } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { processUploadedFile } from '../utils/canvasHelper';

interface CameraModalProps {
  onCapturePhoto: (dataUrl: string, fileName: string) => void;
  onClose: () => void;
  /** Foto langsung dipakai otomatis sesaat setelah diambil */
  autoUse?: boolean;
  /** Jika diisi, muncul tombol untuk main tanpa foto baru */
  onSkip?: () => void;
}

/** Jeda sebelum foto dipakai otomatis, supaya sempat menekan "ULANGI" */
const AUTO_USE_DELAY_MS = 2000;

export const CameraModal: React.FC<CameraModalProps> = ({
  onCapturePhoto,
  onClose,
  autoUse = false,
  onSkip,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const isOpenRef = useRef(true);
  const isConfirmingRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTimer, setSelectedTimer] = useState<number>(0); // 0 (off), 3, 5, 10 seconds
  const [countdown, setCountdown] = useState<number | null>(null);

  const cancelCountdown = () => {
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  };

  // Matikan kamera & batalkan permintaan kamera yang masih berjalan
  const stopStream = () => {
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Start webcam stream
  const startCamera = async (facing: 'user' | 'environment') => {
    setIsLoading(true);
    setCameraError(null);
    cancelCountdown();
    stopStream();
    const request = requestRef.current;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1024 },
          height: { ideal: 1024 },
        },
        audio: false,
      });

      // Modal sudah ditutup atau kamera sudah diganti: matikan lagi
      if (request !== requestRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => { });
      }
      setIsLoading(false);
    } catch (err) {
      if (request !== requestRef.current) return;
      console.error('Camera access error:', err);
      setCameraError('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      cancelCountdown();
      stopStream();
    };
  }, [facingMode]);

  // Setelah "ULANGI", elemen video dibuat ulang, jadi stream dipasang lagi
  useEffect(() => {
    if (!capturedUrl && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => { });
    }
  }, [capturedUrl]);

  useEffect(() => {
    isOpenRef.current = true;
    return () => {
      isOpenRef.current = false;
    };
  }, []);

  // Mode otomatis: setelah foto diambil, langsung dipakai
  useEffect(() => {
    if (!autoUse || !capturedUrl) return;
    const timer = window.setTimeout(handleConfirmPhoto, AUTO_USE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoUse, capturedUrl]);

  const toggleFacingMode = () => {
    soundManager.playClick();
    cancelCountdown();
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  const takeSnap = () => {
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

  const handleStartCapture = () => {
    if (countdown !== null) {
      cancelCountdown();
      soundManager.playClick();
      return;
    }

    if (selectedTimer === 0) {
      takeSnap();
      return;
    }

    let remaining = selectedTimer;
    setCountdown(remaining);
    soundManager.playClick();

    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownIntervalRef.current !== null) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);
        takeSnap();
      } else {
        setCountdown(remaining);
        soundManager.playClick();
      }
    }, 1000);
  };

  const handleRetake = () => {
    soundManager.playClick();
    cancelCountdown();
    setCapturedUrl(null);
  };

  const handleConfirmPhoto = async () => {
    // Cegah foto dipakai dua kali (tombol ditekan saat hitungan otomatis)
    if (!capturedUrl || isConfirmingRef.current) return;
    isConfirmingRef.current = true;
    soundManager.playSnap();

    // Convert dataUrl to a blob/file and compress
    let finalUrl = capturedUrl;
    try {
      const res = await fetch(capturedUrl);
      const blob = await res.blob();
      const file = new File([blob], `kamera-puzzle-${Date.now()}.jpg`, { type: 'image/jpeg' });
      finalUrl = await processUploadedFile(file);
    } catch {
      // Pakai foto asli jika kompresi gagal
    }
    // Modal sudah ditutup selagi foto diproses: batalkan
    if (!isOpenRef.current) return;
    onCapturePhoto(finalUrl, `Foto Kamera (${new Date().toLocaleTimeString()})`);
  };

  const handleFallbackFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    soundManager.playSnap();
    try {
      const dataUrl = await processUploadedFile(file);
      onCapturePhoto(dataUrl, file.name.replace(/\.[^/.]+$/, ''));
    } catch {
      setCameraError('Foto itu tidak bisa dibaca. Coba pilih file JPG atau PNG.');
    }
    e.target.value = '';
  };

  const timerOptions = [
    { value: 0, label: 'Off' },
    { value: 3, label: '3s' },
    { value: 5, label: '5s' },
    { value: 10, label: '10s' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 font-['Pixelify_Sans',sans-serif]">
      <div className="pixel-box max-w-md w-full p-4 sm:p-5 [@media(max-height:500px)]:!p-2.5 [@media(max-height:500px)]:!max-w-2xl [@media(max-height:500px)]:grid [@media(max-height:500px)]:grid-cols-[auto_minmax(0,1fr)] [@media(max-height:500px)]:grid-rows-[repeat(4,auto)_1fr] [@media(max-height:500px)]:gap-x-3 relative flex flex-col items-center text-center max-h-[95dvh] overflow-y-auto">

        {/* Hidden Fallback File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFallbackFileUpload}
          className="hidden"
        />

        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            cancelCountdown();
            stopStream();
            onClose();
          }}
          aria-label="Tutup kamera"
          className="absolute top-3 right-3 pixel-btn-dark p-1 text-xs font-bold cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-1.5 text-theme-title text-xs font-bold uppercase mb-1 [@media(max-height:500px)]:hidden">
          <Camera className="w-4 h-4" />
          <span>KAMERA PIXEL</span>
        </div>

        <h2 className="font-pixel-title text-sm sm:text-base text-theme-title mb-2 [@media(max-height:500px)]:text-xs [@media(max-height:500px)]:col-start-2 [@media(max-height:500px)]:min-h-8 [@media(max-height:500px)]:px-8">
          AMBIL FOTO KAMERA
        </h2>

        {/* Timer Selection Bar (only when live camera and not yet captured) */}
        {!capturedUrl && !cameraError && (
          <div className="w-full shrink-0 flex items-center justify-between px-2.5 py-1.5 mb-3 pixel-box-inner text-xs [@media(max-height:500px)]:mb-2 [@media(max-height:500px)]:py-1 [@media(max-height:500px)]:col-start-2">
            <div className="flex items-center gap-1.5 text-theme-sub text-[11px] font-bold">
              <Timer className="w-3.5 h-3.5 text-theme-title" />
              <span>TIMER:</span>
            </div>
            <div className="flex items-center gap-1">
              {timerOptions.map((opt) => (
                <button
                  key={opt.value}
                  disabled={countdown !== null}
                  onClick={() => {
                    soundManager.playClick();
                    setSelectedTimer(opt.value);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-all ${
                    selectedTimer === opt.value
                      ? 'pixel-btn-green'
                      : 'pixel-btn-dark opacity-75 hover:opacity-100'
                  } ${countdown !== null ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Camera Display Box */}
        <div className="w-[min(100%,55dvh)] [@media(max-height:500px)]:w-[min(75dvh,45vw)] [@media(max-height:500px)]:col-start-1 [@media(max-height:500px)]:row-start-1 [@media(max-height:500px)]:row-span-5 shrink-0 aspect-square pixel-box-inner overflow-hidden relative mb-4 [@media(max-height:500px)]:mb-0 bg-black flex items-center justify-center">
          {/* Flash animation layer */}
          {isFlashing && <div className="absolute inset-0 bg-white z-30 animate-ping" />}

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-20 h-20 flex items-center justify-center animate-pulse">
                <span className="font-pixel-title text-3xl sm:text-4xl text-amber-300 drop-shadow-[0_2px_8px_rgba(245,199,84,0.9)]">
                  {countdown}
                </span>
              </div>
              <span className="mt-2.5 px-2.5 py-0.5 bg-black/85 border border-amber-400/60 text-amber-200 text-[11px] font-pixel-title tracking-wider">
                SIAP-SIAP!
              </span>
            </div>
          )}

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
                <span>PILIH FOTO DARI PERANGKAT</span>
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

        {autoUse && capturedUrl && (
          <p role="status" className="text-sm font-bold text-theme-title mb-3 [@media(max-height:500px)]:mb-2 [@media(max-height:500px)]:col-start-2">
            Foto siap! Puzzle dimulai otomatis...
          </p>
        )}

        {/* Action Controls */}
        <div className="w-full flex items-center justify-center gap-2 [@media(max-height:500px)]:col-start-2">
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
                <span>{autoUse ? 'MAIN SEKARANG' : 'PAKAI FOTO INI'}</span>
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
                disabled={countdown !== null}
                title="Ganti Kamera Depan/Belakang"
                className={`pixel-btn-dark p-2 text-xs font-bold cursor-pointer ${
                  countdown !== null ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <SwitchCamera className="w-4 h-4" />
              </button>

              <button
                onClick={handleStartCapture}
                disabled={isLoading}
                className={`py-2 px-5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer flex-1 transition-all ${
                  countdown !== null
                    ? 'pixel-btn-dark border-red-500 text-red-300'
                    : 'pixel-btn-green'
                }`}
              >
                {countdown !== null ? (
                  <>
                    <X className="w-4 h-4 text-red-400" />
                    <span>BATAL ({countdown}s)</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>
                      AMBIL FOTO {selectedTimer > 0 ? `(${selectedTimer}s)` : ''}
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {onSkip && !capturedUrl && (
          <button
            onClick={() => {
              soundManager.playClick();
              cancelCountdown();
              onSkip();
            }}
            className="mt-3 [@media(max-height:500px)]:mt-2 w-full shrink-0 pixel-btn px-3 py-2.5 [@media(max-height:500px)]:py-1.5 [@media(max-height:500px)]:col-start-2 text-xs font-bold cursor-pointer"
          >
            LEWATI, PAKAI GAMBAR YANG ADA
          </button>
        )}

      </div>
    </div>
  );
};

