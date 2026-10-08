const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = 'urukundo_unsigned';

export const uploadImage = async (file: File, userId: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `urukundo/profiles/${userId}`);
  formData.append('public_id', `photo_${userId}_${Date.now()}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) throw new Error('Upload échoué');
  const data = await response.json();
  return data.secure_url;
};

// Force un recadrage propre (proportionnel, visage centré) à l'affichage,
// quelle que soit la transformation déjà présente dans l'URL stockée —
// certains presets d'upload appliquent un redimensionnement non proportionnel
// ("stretch") que CSS (object-cover) ne peut pas corriger après coup puisque
// l'image livrée est déjà déformée.
export const cloudinaryUrl = (url: string, width: number, height: number): string => {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const before = url.slice(0, idx + marker.length);
  const segments = url.slice(idx + marker.length).split('/');
  const looksLikeTransform = /^[a-z]+_[^/,]+(,[a-z]+_[^/,]+)*$/.test(segments[0] || '') && !/^v\d+$/.test(segments[0] || '');
  if (looksLikeTransform) segments.shift();
  return `${before}c_fill,g_auto,w_${width},h_${height},q_auto,f_auto/${segments.join('/')}`;
};
