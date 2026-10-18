// Resize local uploads before storing them; every failure rejects instead of hanging.
export function imageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)
      return reject(new Error("Choose an image smaller than 10 MB."));
    const url = URL.createObjectURL(file),
      img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be opened."));
    };
    img.onload = () => {
      try {
        const ratio = Math.min(1, 800 / img.width, 800 / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      } catch {
        reject(new Error("Could not process the image."));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.src = url;
  });
}
