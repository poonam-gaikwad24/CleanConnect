import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface ToiletQrCodeProps {
  cleanConnectId: string;
  size?: number;
}

// Module 6: the QR is generated entirely client-side from the
// toilet's cleanConnectId — there is no backend QR endpoint, no
// stored QR image, and nothing resembling coordinates or geocoding
// anywhere in this component. It encodes a link back to this same
// app's existing /toilets/:id route (which already resolves either
// the Prisma id or the cleanConnectId — see toilet.service.ts), so
// scanning it is indistinguishable from a citizen typing that URL in
// by hand.
//
// window.location.origin (not a hardcoded domain, and not a new env
// var) is used as the base URL: it's already correct in both local
// dev (http://localhost:5173) and whatever domain this is deployed
// to, with zero configuration.
function ToiletQrCode({ cleanConnectId, size = 180 }: ToiletQrCodeProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const targetUrl = `${window.location.origin}/toilets/${cleanConnectId}`;

  function handleDownload() {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${cleanConnectId}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div className="card inline-flex flex-col items-center gap-2 p-4">
      <div ref={canvasRef}>
        <QRCodeCanvas value={targetUrl} size={size} level="M" includeMargin />
      </div>
      <p className="font-mono text-xs uppercase tracking-wide text-slate-700">{cleanConnectId}</p>
      <p className="max-w-[200px] break-all text-center text-xs text-slate-600">{targetUrl}</p>
      <button
        type="button"
        onClick={handleDownload}
        className="btn btn-secondary btn-sm"
      >
        Download QR
      </button>
    </div>
  );
}

export default ToiletQrCode;
