/**
 * Utility to process uploaded signature images:
 * - Removes white paper, off-white, light gray, and checkerboard backgrounds
 * - Smooths stroke edges with anti-aliasing
 * - Converts the result to a genuine transparent PNG File
 */
export const processSignatureImage = (file) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a === 0) continue;

            // Perceived luminance
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));

            // Pure white or very light paper/checkerboard square:
            if (lum >= 200) {
              data[i + 3] = 0;
            } else if (maxDiff < 30 && lum >= 160) {
              // Neutral light gray (like gray squares in fake checkerboard or gray paper)
              data[i + 3] = 0;
            } else if (lum > 115) {
              // Anti-aliased edge smoothing so ink edges are soft and clean
              const threshold = (maxDiff < 30) ? 160 : 200;
              const factor = Math.max(0, Math.min(1, (threshold - lum) / (threshold - 115)));
              data[i + 3] = Math.round(a * factor);
            }
          }

          ctx.putImageData(imgData, 0, 0);

          canvas.toBlob((blob) => {
            if (blob) {
              const baseName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "signature";
              const cleanFile = new File([blob], `${baseName}.png`, { type: "image/png" });
              resolve(cleanFile);
            } else {
              resolve(file);
            }
          }, 'image/png');
        } catch (err) {
          console.error('Error processing signature transparency:', err);
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};
